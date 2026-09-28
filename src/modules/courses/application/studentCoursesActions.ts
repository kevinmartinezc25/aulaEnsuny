'use server'

import { createAdminClient, createClient } from '@/core/config/supabase/server'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'

export interface EnrolledCourseData {
  id: string
  slug?: string
  title: string
  description?: string
  banner_url?: string
  subject?: string
}

export interface StudentDashboardCoursesResult {
  studentName: string
  courses: EnrolledCourseData[]
  profileId: string | null
}

/**
 * Obtiene los cursos matriculados del estudiante y su nombre para el Campus Virtual,
 * resolviendo la sesión tanto si es Supabase Auth como si es la sesión del portal por documento.
 */
export async function getStudentDashboardCourses(): Promise<StudentDashboardCoursesResult> {
  const adminClient = createAdminClient()
  const authClient = await createClient()

  const { data: { user } } = await authClient.auth.getUser()
  const planillaSession = !user ? await getPlanillaStudentSession() : null

  let studentId = user?.id || planillaSession?.profileId || null
  let studentName = planillaSession?.fullName || ''

  if (!studentId && planillaSession?.documentId) {
    const cleanDoc = planillaSession.documentId.replace(/[^0-9a-zA-Z]/g, '')
    const { data: dir } = await adminClient
      .from('student_directory')
      .select('profile_id, first_name, last_name')
      .or(`document_id.eq.${planillaSession.documentId},document_id.eq.${cleanDoc}`)
      .maybeSingle()
    if (dir?.profile_id) {
      studentId = dir.profile_id
      if (!studentName) studentName = `${dir.first_name || ''} ${dir.last_name || ''}`.trim()
    } else {
      const { data: details } = await adminClient
        .from('student_details')
        .select('student_id')
        .or(`document_number.eq.${planillaSession.documentId},document_number.eq.${cleanDoc}`)
        .maybeSingle()
      if (details?.student_id) studentId = details.student_id
    }
  }

  if (studentId && !studentName) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', studentId)
      .maybeSingle()
    if (profile) {
      studentName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    }
  }

  if (!studentId) {
    return {
      studentName: studentName || 'Estudiante',
      courses: [],
      profileId: null
    }
  }

  // Buscar cursos en student_courses
  const { data: enrollments, error } = await adminClient
    .from('student_courses')
    .select('course_id')
    .eq('student_id', studentId)

  if (error || !enrollments || enrollments.length === 0) {
    return {
      studentName: studentName || 'Estudiante',
      courses: [],
      profileId: studentId
    }
  }

  const courseIds = enrollments.map(e => e.course_id)
  const { data: courses } = await adminClient
    .from('courses')
    .select('id, slug, title, description, banner_url, subject')
    .in('id', courseIds)
    .eq('status', 'active')

  return {
    studentName: studentName || 'Estudiante',
    courses: courses || [],
    profileId: studentId
  }
}

export interface CourseVirtualGrade {
  courseId: string
  courseSlug: string
  courseTitle: string
  courseSubject: string
  teacherName: string
  averageGrade: number | null
  performance: string
  activities: { activityName: string; score: number; type: string }[]
}

export interface VirtualGradesOverviewResult {
  courses: CourseVirtualGrade[]
  generalAverage: number | null
}

export async function getStudentVirtualGradesOverview(): Promise<VirtualGradesOverviewResult> {
  const adminClient = createAdminClient()
  const { profileId, courses } = await getStudentDashboardCourses()

  if (!profileId || courses.length === 0) {
    return { courses: [], generalAverage: null }
  }

  const courseIds = courses.map(c => c.id)

  // Fetch teachers for these courses
  const { data: courseTeachers } = await adminClient
    .from('courses')
    .select('id, teacher_id, profiles(first_name, last_name)')
    .in('id', courseIds)

  // Fetch all graded activities for the student in these courses
  // 1. Quizzes
  const { data: quizzes } = await adminClient
    .from('quizzes')
    .select('id, title, lesson_id, lessons(module_id, course_modules(course_id))')
    .in('lessons.course_modules.course_id', courseIds)

  const quizIds = (quizzes || []).map(q => q.id)
  
  const { data: attempts } = await adminClient
    .from('quiz_attempts')
    .select('quiz_id, score, started_at')
    .eq('student_id', profileId)
    .in('quiz_id', quizIds)

  // 2. Tasks/Assignments from student_lesson_grades
  const { data: lessonGrades } = await adminClient
    .from('student_lesson_grades')
    .select('lesson_id, grade, grade_type, lessons(title, module_id, course_modules(course_id))')
    .eq('student_id', profileId)
    .in('lessons.course_modules.course_id', courseIds)

  const coursesGradesMap: Record<string, CourseVirtualGrade> = {}

  for (const course of courses) {
    const teacherData = courseTeachers?.find(t => t.id === course.id)?.profiles as any
    const teacherName = teacherData ? `${teacherData.first_name || ''} ${teacherData.last_name || ''}`.trim() : 'Docente asignado'

    coursesGradesMap[course.id] = {
      courseId: course.id,
      courseSlug: course.slug || '',
      courseTitle: course.title,
      courseSubject: course.subject || 'GENERAL',
      teacherName,
      averageGrade: null,
      performance: '-',
      activities: []
    }
  }

  // Map Quiz attempts
  if (quizzes && attempts) {
    quizzes.forEach(q => {
      const courseId = (q.lessons as any)?.course_modules?.course_id
      if (courseId && coursesGradesMap[courseId]) {
        const att = attempts
          .filter(a => a.quiz_id === q.id)
          .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
        
        if (att && att.score !== null && att.score !== undefined) {
          coursesGradesMap[courseId].activities.push({
            activityName: q.title || 'Quiz',
            score: Number(att.score),
            type: 'quiz'
          })
        }
      }
    })
  }

  // Map Lesson Grades
  if (lessonGrades) {
    lessonGrades.forEach(g => {
      const courseId = (g.lessons as any)?.course_modules?.course_id
      if (courseId && coursesGradesMap[courseId]) {
        if (g.grade !== null && g.grade !== undefined) {
          coursesGradesMap[courseId].activities.push({
            activityName: (g.lessons as any)?.title || 'Actividad',
            score: Number(g.grade),
            type: g.grade_type || 'task'
          })
        }
      }
    })
  }

  // Calculate averages
  const finalCourses = Object.values(coursesGradesMap)
  let sumAllAverages = 0
  let coursesWithAverage = 0

  for (const course of finalCourses) {
    if (course.activities.length > 0) {
      const sum = course.activities.reduce((acc, curr) => acc + curr.score, 0)
      const avg = Number((sum / course.activities.length).toFixed(1))
      course.averageGrade = avg
      
      if (avg >= 4.6) course.performance = 'Superior'
      else if (avg >= 4.0) course.performance = 'Alto'
      else if (avg >= 3.0) course.performance = 'Básico'
      else course.performance = 'Bajo'

      sumAllAverages += avg
      coursesWithAverage++
    }
  }

  const generalAverage = coursesWithAverage > 0 
    ? Number((sumAllAverages / coursesWithAverage).toFixed(2)) 
    : null

  return {
    courses: finalCourses,
    generalAverage
  }
}
