'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'

export interface TeacherStudent {
  id: string
  name: string
  email: string
  gradeLevel: string
  groupName: string
  courses: { id: string; title: string; subject: string; progress?: number }[]
  averageGrade: number | null
  status: 'active' | 'at_risk'
  joinedDate: string
}

/**
 * Obtener todos los estudiantes que pertenecen a los cursos del docente actual.
 */
export async function getTeacherStudents(): Promise<TeacherStudent[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('No autorizado')
    }

    const adminClient = createAdminClient()

    // 1. Obtener cursos activos asignados a este profesor
    const { data: courses, error: coursesError } = await adminClient
      .from('courses')
      .select('id, title, subject, grade_level, group_name')
      .eq('teacher_id', user.id)
      .eq('status', 'active')

    if (coursesError) throw coursesError

    if (!courses || courses.length === 0) {
      return []
    }

    const teacherCourseIds = courses.map(c => c.id)

    // 2. Obtener las matrículas desde student_courses
    const { data: enrollments, error: enrollError } = await adminClient
      .from('student_courses')
      .select('student_id, course_id')
      .in('course_id', teacherCourseIds)

    const enrollmentsByStudent = new Map<string, string[]>()
    if (!enrollError && enrollments) {
      enrollments.forEach(e => {
        const list = enrollmentsByStudent.get(e.student_id) || []
        list.push(e.course_id)
        enrollmentsByStudent.set(e.student_id, list)
      })
    }

    // 3. Obtener todos los estudiantes activos
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('*, roles!inner(name)')
      .eq('roles.name', 'student')
      .eq('status', 'active')

    if (profilesError) throw profilesError

    if (!profiles || profiles.length === 0) {
      return []
    }

    // 4. Filtrar perfiles que coincidan estrictamente vía student_courses
    const matchingProfiles: any[] = profiles.filter(p => enrollmentsByStudent.has(p.id))

    if (matchingProfiles.length === 0) {
      return []
    }

    const studentIds = matchingProfiles.map(p => p.id)

    // 5. Obtener los promedios definitivos de los estudiantes en los cursos de este docente
    const { data: periodGrades, error: gradesError } = await adminClient
      .from('student_period_grades')
      .select('student_id, course_id, final_grade')
      .in('student_id', studentIds)
      .in('course_id', teacherCourseIds)

    const gradesByStudent = new Map<string, { final_grade: number; course_id: string }[]>()
    if (!gradesError && periodGrades) {
      periodGrades.forEach(g => {
        const studentGrades = gradesByStudent.get(g.student_id) || []
        studentGrades.push({
          final_grade: Number(g.final_grade),
          course_id: g.course_id
        })
        gradesByStudent.set(g.student_id, studentGrades)
      })
    }

    // Fetch progress to compute progress percentage per course
    // a. Get all modules for these courses
    const { data: dbModules } = await adminClient
      .from('course_modules')
      .select('id, course_id')
      .in('course_id', teacherCourseIds)
    const moduleIds = dbModules?.map(m => m.id) || []

    // b. Get all lessons and resources for these modules
    let dbLessons: any[] = []
    let dbResources: any[] = []
    if (moduleIds.length > 0) {
      const { data: lessonsData } = await adminClient
        .from('lessons')
        .select('id, module_id')
        .in('module_id', moduleIds)
      dbLessons = lessonsData || []

      const { data: resourcesData } = await adminClient
        .from('resources')
        .select('id, module_id')
        .in('module_id', moduleIds)
      dbResources = resourcesData || []
    }

    // Map module_id -> course_id
    const moduleCourseMap = new Map<string, string>()
    dbModules?.forEach(m => {
      moduleCourseMap.set(m.id, m.course_id)
    })

    // Map lesson_id -> course_id
    const lessonCourseMap = new Map<string, string>()
    dbLessons?.forEach(l => {
      const courseId = moduleCourseMap.get(l.module_id)
      if (courseId) {
        lessonCourseMap.set(l.id, courseId)
      }
    })

    // Map resource_id -> course_id
    const resourceCourseMap = new Map<string, string>()
    dbResources?.forEach(r => {
      const courseId = moduleCourseMap.get(r.module_id)
      if (courseId) {
        resourceCourseMap.set(r.id, courseId)
      }
    })

    // Count total items per course (lessons + resources)
    const totalItemsPerCourse = new Map<string, number>()
    dbLessons?.forEach(l => {
      const courseId = lessonCourseMap.get(l.id)
      if (courseId) {
        totalItemsPerCourse.set(courseId, (totalItemsPerCourse.get(courseId) || 0) + 1)
      }
    })
    dbResources?.forEach(r => {
      const courseId = resourceCourseMap.get(r.id)
      if (courseId) {
        totalItemsPerCourse.set(courseId, (totalItemsPerCourse.get(courseId) || 0) + 1)
      }
    })

    // c. Fetch progress for all matching students in these lessons where completed is true
    let progressData: any[] = []
    if (dbLessons.length > 0 && studentIds.length > 0) {
      const lessonIds = dbLessons.map(l => l.id)
      const { data } = await adminClient
        .from('student_progress')
        .select('student_id, lesson_id')
        .eq('completed', true)
        .in('student_id', studentIds)
        .in('lesson_id', lessonIds)
      progressData = data || []
    }

    // d. Fetch progress for all matching students in these resources where completed is true
    let progressResourcesData: any[] = []
    if (dbResources.length > 0 && studentIds.length > 0) {
      const resourceIds = dbResources.map(r => r.id)
      const { data } = await adminClient
        .from('student_resource_progress')
        .select('student_id, resource_id')
        .eq('completed', true)
        .in('student_id', studentIds)
        .in('resource_id', resourceIds)
      progressResourcesData = data || []
    }

    // Map student_id -> course_id -> completed_items_count
    const completedItemsMap = new Map<string, Map<string, number>>()
    progressData.forEach(p => {
      const courseId = lessonCourseMap.get(p.lesson_id)
      if (courseId) {
        if (!completedItemsMap.has(p.student_id)) {
          completedItemsMap.set(p.student_id, new Map<string, number>())
        }
        const courseMap = completedItemsMap.get(p.student_id)!
        courseMap.set(courseId, (courseMap.get(courseId) || 0) + 1)
      }
    })
    progressResourcesData.forEach(p => {
      const courseId = resourceCourseMap.get(p.resource_id)
      if (courseId) {
        if (!completedItemsMap.has(p.student_id)) {
          completedItemsMap.set(p.student_id, new Map<string, number>())
        }
        const courseMap = completedItemsMap.get(p.student_id)!
        courseMap.set(courseId, (courseMap.get(courseId) || 0) + 1)
      }
    })

    // 6. Construir lista final de estudiantes
    return matchingProfiles.map(p => {
      const studentGrades = gradesByStudent.get(p.id) || []
      
      // Calcular promedio del docente para este alumno
      let averageGrade: number | null = null
      let isAtRisk = false

      if (studentGrades.length > 0) {
        const sum = studentGrades.reduce((acc, curr) => acc + curr.final_grade, 0)
        averageGrade = Math.round((sum / studentGrades.length) * 100) / 100
        isAtRisk = averageGrade < 3.0 || studentGrades.some(g => g.final_grade < 3.0)
      }

      // Obtener cursos asociados estrictamente inscritos
      const enrolledCourseIds = enrollmentsByStudent.get(p.id) || []
      const studentCoursesData = courses.filter(c => enrolledCourseIds.includes(c.id))

      const studentCourses = studentCoursesData.map(c => {
        const total = totalItemsPerCourse.get(c.id) || 0
        const completed = completedItemsMap.get(p.id)?.get(c.id) || 0
        const progress = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0

        return {
          id: c.id,
          title: c.title,
          subject: c.subject,
          progress
        }
      })

      const cleanFirstName = (p.first_name || 'estudiante').toLowerCase().replace(/\s+/g, '')
      const cleanLastName = (p.last_name || 'nuevo').toLowerCase().replace(/\s+/g, '')
      const fallbackEmail = `${cleanFirstName}.${cleanLastName}@estudiante.ensuny.edu.co`

      return {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        email: p.email || fallbackEmail,
        gradeLevel: p.grade_level || '8°',
        groupName: p.group_name || '1',
        courses: studentCourses,
        averageGrade,
        status: isAtRisk ? 'at_risk' : 'active',
        joinedDate: new Date(p.created_at).toISOString().split('T')[0]
      }
    })

  } catch (error) {
    console.error('Error al obtener estudiantes del docente, usando fallback:', error)
    
    // Fallback de desarrollo / demo
    return [
      {
        id: 's-1',
        name: 'Ana María Torres',
        email: 'a.torres@estudiante.ensuny.edu.co',
        gradeLevel: '8°',
        groupName: '1',
        courses: [
          { id: 'c1', title: 'Física I - 8°', subject: 'Ciencias Exactas', progress: 85 },
          { id: 'c2', title: 'Matemáticas - 8°', subject: 'Ciencias Exactas', progress: 60 }
        ],
        averageGrade: 4.55,
        status: 'active',
        joinedDate: '2025-01-20'
      },
      {
        id: 's-2',
        name: 'José Daniel Ramírez',
        email: 'j.ramirez@estudiante.ensuny.edu.co',
        gradeLevel: '8°',
        groupName: '1',
        courses: [
          { id: 'c1', title: 'Física I - 8°', subject: 'Ciencias Exactas', progress: 40 },
          { id: 'c2', title: 'Matemáticas - 8°', subject: 'Ciencias Exactas', progress: 25 }
        ],
        averageGrade: 3.80,
        status: 'active',
        joinedDate: '2025-01-22'
      },
      {
        id: 's-3',
        name: 'Luis Alfredo Sandoval',
        email: 'l.sandoval@estudiante.ensuny.edu.co',
        gradeLevel: '9°',
        groupName: '2',
        courses: [
          { id: 'c3', title: 'Química General - 9°', subject: 'Ciencias Exactas', progress: 70 }
        ],
        averageGrade: 4.10,
        status: 'active',
        joinedDate: '2024-01-15'
      },
      {
        id: 's-4',
        name: 'María Camila Herrera',
        email: 'm.herrera@estudiante.ensuny.edu.co',
        gradeLevel: '10°',
        groupName: '2',
        courses: [
          { id: 'c4', title: 'Trigonometría - 10°', subject: 'Matemáticas', progress: 15 }
        ],
        averageGrade: 2.85,
        status: 'at_risk',
        joinedDate: '2024-02-05'
      },
      {
        id: 's-5',
        name: 'Kevin Martinez',
        email: 'kevin@estudiante.ensuny.edu.co',
        gradeLevel: '11°',
        groupName: '1',
        courses: [
          { id: 'c5', title: 'Física Avanzada - 11°', subject: 'Ciencias Exactas', progress: 95 }
        ],
        averageGrade: 4.65,
        status: 'active',
        joinedDate: '2023-01-10'
      }
    ]
  }
}

/**
 * Enviar mensaje masivo o individual a estudiante(s).
 */
export async function sendStudentMessage(studentId: string | 'all', subject: string, message: string) {
  // Simular envío de mensaje con demora
  await new Promise(resolve => setTimeout(resolve, 800))
  console.log(`Mensaje enviado a: ${studentId}`, { subject, message })
  return { success: true }
}
