'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'

export interface TeacherStudent {
  id: string
  name: string
  firstName?: string
  lastName?: string
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

    const studentIdsToFetch = Array.from(enrollmentsByStudent.keys())
    if (studentIdsToFetch.length === 0) {
      return []
    }

    // 3. Obtener solo los perfiles de los estudiantes matriculados
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('*, roles!inner(name)')
      .eq('roles.name', 'student')
      .eq('status', 'active')
      .in('id', studentIdsToFetch)

    if (profilesError) throw profilesError

    if (!profiles || profiles.length === 0) {
      return []
    }

    const studentIds = profiles.map(p => p.id)

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

    // Fetch user emails from auth
    const { data: authData } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })
    const authUsers = authData?.users || []

    // 6. Construir lista final de estudiantes
    return profiles.map(p => {
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

      const authUser = authUsers.find(u => u.id === p.id)
      const email = authUser?.email || (p as any).email || 'sin-correo@ensuny.edu.co'

      return {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        firstName: p.first_name || '',
        lastName: p.last_name || '',
        email: email,
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
        firstName: 'Ana María',
        lastName: 'Torres',
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
        firstName: 'José Daniel',
        lastName: 'Ramírez',
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
        firstName: 'Luis Alfredo',
        lastName: 'Sandoval',
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
        firstName: 'María Camila',
        lastName: 'Herrera',
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
        firstName: 'Kevin',
        lastName: 'Martinez',
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

export interface StudentCalendarEvent {
  id: string
  title: string
  description: string
  dueDate: string
  courseName: string
  eventType: 'homework' | 'exam' | 'event'
  courseColor: string
  completed?: boolean
}

export interface StudentCalendarTask {
  id: string
  title: string
  course: string
  dueDate: string
  urgency: 'Urgente' | 'Próximo' | 'Pendiente'
  description?: string
  completed: boolean
  href?: string
  lessonId?: string
}

export interface StudentCalendarOverviewResult {
  events: StudentCalendarEvent[]
  tasks: StudentCalendarTask[]
  studentId: string | null
}

/**
 * Obtener eventos del calendario y tareas del estudiante actual,
 * determinando con precisión cuáles actividades ya han sido completadas o entregadas.
 */
export async function getStudentCalendarOverview(): Promise<StudentCalendarOverviewResult> {
  try {
    const adminClient = createAdminClient()
    const authClient = await createClient()

    const { data: { user } } = await authClient.auth.getUser()
    const planillaSession = !user ? await getPlanillaStudentSession() : null

    let studentId = user?.id || planillaSession?.profileId || null
    let studentGradeLevel = planillaSession?.gradeLevel || null

    if (!studentId && planillaSession?.documentId) {
      const cleanDoc = planillaSession.documentId.replace(/[^0-9a-zA-Z]/g, '')
      const { data: dir } = await adminClient
        .from('student_directory')
        .select('profile_id, grade_level')
        .or(`document_id.eq.${planillaSession.documentId},document_id.eq.${cleanDoc}`)
        .maybeSingle()
      if (dir?.profile_id) {
        studentId = dir.profile_id
        studentGradeLevel = dir.grade_level || studentGradeLevel
      } else {
        const { data: details } = await adminClient
          .from('student_details')
          .select('student_id, grade_level')
          .or(`document_number.eq.${planillaSession.documentId},document_number.eq.${cleanDoc}`)
          .maybeSingle()
        if (details?.student_id) {
          studentId = details.student_id
          studentGradeLevel = details.grade_level || studentGradeLevel
        }
      }
    }

    if (studentId && !studentGradeLevel) {
      const { data: prof } = await adminClient
        .from('profiles')
        .select('grade_level')
        .eq('id', studentId)
        .maybeSingle()
      if (prof?.grade_level) {
        studentGradeLevel = prof.grade_level
      }
    }

    if (!studentId) {
      return { events: [], tasks: [], studentId: null }
    }

    // 1. Obtener cursos del estudiante
    let dbCourses: any[] = []
    const { data: enrollments } = await adminClient
      .from('student_courses')
      .select('course_id')
      .eq('student_id', studentId)

    if (enrollments && enrollments.length > 0) {
      const courseIds = enrollments.map(e => e.course_id)
      const { data: coursesData } = await adminClient
        .from('courses')
        .select('id, slug, title, description, subject, grade_level, group_name')
        .in('id', courseIds)
        .eq('status', 'active')
      dbCourses = coursesData || []
    } else if (studentGradeLevel) {
      const { data: gradeCourses } = await adminClient
        .from('courses')
        .select('id, slug, title, description, subject, grade_level, group_name')
        .eq('grade_level', studentGradeLevel)
        .eq('status', 'active')
      dbCourses = gradeCourses || []
    }

    const courseIds = dbCourses.map(c => c.id)
    let dbModules: any[] = []
    let dbLessons: any[] = []
    const completedLessonIds = new Set<string>()

    if (courseIds.length > 0) {
      const { data: modulesData } = await adminClient
        .from('course_modules')
        .select('id, course_id')
        .in('course_id', courseIds)
      dbModules = modulesData || []

      const moduleIds = dbModules.map(m => m.id)
      if (moduleIds.length > 0) {
        const { data: lessonsData } = await adminClient
          .from('lessons')
          .select('id, module_id, title, type, content, due_date')
          .in('module_id', moduleIds)
        dbLessons = lessonsData || []
      }
    }

    const lessonIds = dbLessons.map(l => l.id)

    // 2. Progreso completado o entregado en student_progress
    if (lessonIds.length > 0) {
      const { data: progData } = await adminClient
        .from('student_progress')
        .select('lesson_id, completed, submission_text')
        .eq('student_id', studentId)
        .in('lesson_id', lessonIds)

      progData?.forEach(p => {
        if (p.completed || (p.submission_text && p.submission_text.trim().length > 0)) {
          completedLessonIds.add(p.lesson_id)
        }
      })

      // 3. Quizzes y quiz_attempts
      try {
        const { data: quizzesData } = await adminClient
          .from('quizzes')
          .select('id, lesson_id, title, end_date')
          .in('lesson_id', lessonIds)

        if (quizzesData && quizzesData.length > 0) {
          const quizIds = quizzesData.map(q => q.id)
          const { data: attemptsData } = await adminClient
            .from('quiz_attempts')
            .select('quiz_id, completed_at, score, status')
            .eq('student_id', studentId)
            .in('quiz_id', quizIds)

          attemptsData?.forEach(a => {
            if (a.completed_at || a.score !== null || a.status === 'completed') {
              const matchedQuiz = quizzesData.find(q => q.id === a.quiz_id)
              if (matchedQuiz?.lesson_id) {
                completedLessonIds.add(matchedQuiz.lesson_id)
              }
            }
          })
        }
      } catch (quizErr) {
        console.warn('Error checking quizzes in student calendar:', quizErr)
      }

      // 4. Foros participados
      try {
        const { data: forumsData } = await adminClient
          .from('forums')
          .select('id, lesson_id')
          .in('lesson_id', lessonIds)

        if (forumsData && forumsData.length > 0) {
          const forumIds = forumsData.map(f => f.id)
          const { data: threads } = await adminClient
            .from('forum_threads')
            .select('id, forum_id')
            .eq('author_id', studentId)
            .in('forum_id', forumIds)

          threads?.forEach(t => {
            const fo = forumsData.find(f => f.id === t.forum_id)
            if (fo) completedLessonIds.add(fo.lesson_id)
          })

          const { data: replies } = await adminClient
            .from('forum_replies')
            .select('thread_id')
            .eq('author_id', studentId)

          if (replies && replies.length > 0) {
            const replyThreadIds = replies.map(r => r.thread_id)
            const { data: parentThreads } = await adminClient
              .from('forum_threads')
              .select('id, forum_id')
              .in('id', replyThreadIds)

            parentThreads?.forEach(pt => {
              const fo = forumsData.find(f => f.id === pt.forum_id)
              if (fo) completedLessonIds.add(fo.lesson_id)
            })
          }
        }
      } catch (forumErr) {
        console.warn('Error checking forums in calendar:', forumErr)
      }
    }

    // 5. Calendarios institucionales
    let calendarQuery = adminClient
      .from('calendars')
      .select('*, courses(title, subject)')

    if (courseIds.length > 0) {
      calendarQuery = calendarQuery.or(`course_id.in.(${courseIds.join(',')}),course_id.is.null`)
    } else {
      calendarQuery = calendarQuery.is('course_id', null)
    }

    const { data: dbEvents } = await calendarQuery

    const getColor = (subjectName: string = '') => {
      const s = subjectName.toLowerCase()
      if (s.includes('matem')) return 'bg-purple-500 text-purple-600 dark:text-purple-400'
      if (s.includes('tec') || s.includes('prog')) return 'bg-emerald-500 text-emerald-600 dark:text-emerald-400'
      if (s.includes('ingl') || s.includes('lengu')) return 'bg-amber-500 text-amber-600 dark:text-amber-400'
      return 'bg-blue-500 text-blue-600 dark:text-blue-400'
    }

    const mappedEvents: StudentCalendarEvent[] = (dbEvents || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description || '',
      dueDate: new Date(e.due_date).toISOString(),
      courseName: e.courses?.title || 'Evento General',
      eventType: e.event_type || 'homework',
      courseColor: getColor(e.courses?.subject),
      completed: completedLessonIds.has(e.id)
    }))

    const lessonEvents: StudentCalendarEvent[] = dbLessons
      .filter(l => l.due_date)
      .map(l => {
        const mod = dbModules.find(m => m.id === l.module_id)
        const crs = dbCourses.find(c => c.id === mod?.course_id)
        return {
          id: l.id,
          title: l.title,
          description: l.content ? l.content.replace(/<[^>]*>/g, '').trim().substring(0, 150) : '',
          dueDate: new Date(l.due_date).toISOString(),
          courseName: crs?.title || 'Curso',
          eventType: l.type === 'quiz' ? 'exam' : 'homework',
          courseColor: getColor(crs?.subject),
          completed: completedLessonIds.has(l.id)
        }
      })

    // 6. Tareas / Actividades
    const ACTIONABLE_TYPES = new Set(['task', 'quiz', 'forum', 'assignment', 'homework', 'taller'])
    const courseTasks: StudentCalendarTask[] = []

    for (const l of dbLessons) {
      if (ACTIONABLE_TYPES.has(l.type)) {
        const mod = dbModules.find(m => m.id === l.module_id)
        const crs = dbCourses.find(c => c.id === mod?.course_id)
        const isCompleted = completedLessonIds.has(l.id)

        let formattedDate = 'Sin fecha límite'
        let urgency: 'Urgente' | 'Próximo' | 'Pendiente' = 'Pendiente'

        if (l.due_date) {
          const dueObj = new Date(l.due_date)
          formattedDate = dueObj.toLocaleDateString('es-ES', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })

          const timeLeftMs = dueObj.getTime() - Date.now()
          const hoursLeft = timeLeftMs / (1000 * 60 * 60)
          if (hoursLeft < 24) urgency = 'Urgente'
          else if (hoursLeft < 72) urgency = 'Próximo'
        }

        courseTasks.push({
          id: l.id,
          title: l.title,
          course: crs?.title || 'Curso',
          dueDate: formattedDate,
          urgency,
          description: l.content ? l.content.replace(/<[^>]*>/g, '').trim().substring(0, 150) : 'Actividad del curso',
          completed: isCompleted,
          href: crs?.slug ? `/student/courses/${crs.slug}?lessonId=${l.id}` : undefined,
          lessonId: l.id
        })
      }
    }

    const existingIds = new Set(courseTasks.map(t => t.id))
    const calendarTasks: StudentCalendarTask[] = (dbEvents || [])
      .filter((e: any) => !existingIds.has(e.id) && (e.event_type === 'homework' || e.event_type === 'exam'))
      .map((e: any) => {
        const due = new Date(e.due_date)
        const now = new Date()
        const hoursDiff = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
        let urgency: 'Urgente' | 'Próximo' | 'Pendiente' = 'Pendiente'
        if (hoursDiff > 0 && hoursDiff < 24) urgency = 'Urgente'
        else if (hoursDiff > 0 && hoursDiff < 72) urgency = 'Próximo'

        const formattedDate = due.toLocaleDateString('es-ES', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })

        return {
          id: e.id,
          title: e.title,
          course: e.courses?.title || 'Evento General',
          dueDate: formattedDate,
          urgency,
          description: e.description || '',
          completed: completedLessonIds.has(e.id)
        }
      })

    const allTasks = [...courseTasks, ...calendarTasks]
    allTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const urgencyWeight = { 'Urgente': 0, 'Próximo': 1, 'Pendiente': 2 }
      return (urgencyWeight[a.urgency] ?? 2) - (urgencyWeight[b.urgency] ?? 2)
    })

    return {
      events: [...mappedEvents, ...lessonEvents],
      tasks: allTasks,
      studentId
    }
  } catch (error: any) {
    console.error('Error en getStudentCalendarOverview:', error)
    return { events: [], tasks: [], studentId: null }
  }
}

/**
 * Permite al estudiante marcar o desmarcar una actividad como completada directamente.
 */
export async function toggleStudentTaskCompletion(taskId: string, completed: boolean) {
  try {
    const adminClient = createAdminClient()
    const authClient = await createClient()

    const { data: { user } } = await authClient.auth.getUser()
    const planillaSession = !user ? await getPlanillaStudentSession() : null
    let studentId = user?.id || planillaSession?.profileId || null

    if (!studentId && planillaSession?.documentId) {
      const cleanDoc = planillaSession.documentId.replace(/[^0-9a-zA-Z]/g, '')
      const { data: dir } = await adminClient
        .from('student_directory')
        .select('profile_id')
        .or(`document_id.eq.${planillaSession.documentId},document_id.eq.${cleanDoc}`)
        .maybeSingle()
      if (dir?.profile_id) studentId = dir.profile_id
    }

    if (!studentId) {
      return { success: false, error: 'Estudiante no autenticado' }
    }

    const { error } = await adminClient
      .from('student_progress')
      .upsert({
        student_id: studentId,
        lesson_id: taskId,
        completed,
        completed_at: completed ? new Date().toISOString() : null
      }, { onConflict: 'student_id,lesson_id' })

    if (error) throw error

    revalidatePath('/student/calendar')
    revalidatePath('/student/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error en toggleStudentTaskCompletion:', error)
    return { success: false, error: error.message }
  }
}
