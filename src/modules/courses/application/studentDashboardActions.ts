'use server'

import { createAdminClient, createClient } from '@/core/config/supabase/server'
import { getStudentDashboardCourses } from './studentCoursesActions'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { getStudentLatestAnnouncements } from './announcementActions'

export interface DashboardCourse {
  id: string
  slug?: string
  title: string
  topic: string
  progress: number
  category: string
  color: string
  bgColor: string
  textColor: string
  image?: string
  gradeLevel?: string | null
}

export interface DashboardTask {
  id: string
  title: string
  course: string
  dueDate: string
  urgency: 'Urgente' | 'Próximo' | 'Pendiente'
  status: 'Pendiente' | 'Entregado' | 'Calificado'
  type?: string
  href?: string
}

export interface DashboardAchievement {
  id: string
  title: string
  description: string
  date: string
  iconType: string // we send string instead of React node
}

export interface DashboardCalendarEvent {
  date: string  // 'YYYY-MM-DD'
  title: string
  type: 'quiz' | 'task' | 'forum' | 'event'
}

export interface StudentDashboardFullData {
  studentName: string
  courses: DashboardCourse[]
  tasks: DashboardTask[]
  calendarEvents: DashboardCalendarEvent[]
  achievements: DashboardAchievement[]
  progressPercentage: number
  isPortalSession: boolean
  latestAnnouncements: any[]
}

export async function getStudentDashboardFullData(): Promise<StudentDashboardFullData> {
  const adminClient = createAdminClient()
  const authClient = await createClient()

  const { data: { user } } = await authClient.auth.getUser()
  const isPortalSession = !user

  const result: StudentDashboardFullData = {
    studentName: 'Estudiante',
    courses: [],
    tasks: [],
    calendarEvents: [],
    achievements: [],
    progressPercentage: 0,
    isPortalSession,
    latestAnnouncements: []
  }

  if (isPortalSession) {
    const portalRes = await getStudentDashboardCourses()
    if (portalRes.studentName && portalRes.studentName !== 'Estudiante') {
      result.studentName = portalRes.studentName.split(' ')[0] || portalRes.studentName
    }
    if (portalRes.courses && portalRes.courses.length > 0) {
      result.courses = portalRes.courses.map((c: any) => {
        const subject = (c.subject || 'GENERAL').toUpperCase()
        let color = 'bg-blue-500', bgColor = 'bg-blue-50/50 dark:bg-blue-950/20', textColor = 'text-blue-600 dark:text-blue-400'
        if (subject.includes('MATEM')) { color = 'bg-purple-500'; bgColor = 'bg-purple-50/50 dark:bg-purple-950/20'; textColor = 'text-purple-600 dark:text-purple-400' }
        else if (subject.includes('TEC') || subject.includes('PROG')) { color = 'bg-emerald-500'; bgColor = 'bg-emerald-50/50 dark:bg-emerald-950/20'; textColor = 'text-emerald-600 dark:text-emerald-400' }
        else if (subject.includes('INGL') || subject.includes('LENGU')) { color = 'bg-amber-500'; bgColor = 'bg-amber-50/50 dark:bg-amber-950/20'; textColor = 'text-amber-600 dark:text-amber-400' }
        return {
          id: c.id, slug: c.slug, title: c.title, topic: c.description || 'Sin descripción',
          progress: 0, category: subject, color, bgColor, textColor,
          image: c.banner_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=300'
        }
      })
    }
    return result
  }

  // Normal Supabase session
  const { data: profile } = await adminClient.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (profile) result.studentName = profile.first_name || 'Estudiante'
  else if (user.user_metadata?.first_name) result.studentName = user.user_metadata.first_name

  // Fetch courses
  const { data: enrolledData } = await adminClient.from('student_courses').select('course_id').eq('student_id', user.id)
  let dbCourses: any[] = []
  if (enrolledData && enrolledData.length > 0) {
    const courseIds = enrolledData.map((e: any) => e.course_id)
    const { data: coursesData } = await adminClient.from('courses').select('*').in('id', courseIds).eq('status', 'active')
    dbCourses = coursesData || []
  }

  const courseIds = dbCourses.map((c: any) => c.id)
  let dbModules: any[] = [], dbLessons: any[] = [], dbResources: any[] = []
  let courseForums: any[] = [], courseQuizzes: any[] = [], dbLessonGrades: any[] = [], dbQuizAttempts: any[] = []
  let progressData: any[] = []
  let completedLessonIds = new Set<string>()
  let completedResourceIds = new Set<string>()
  let dbTasks: any[] = []
  let dbAchievements: any[] = []

  if (courseIds.length > 0) {
    // Parallelize heavy independent fetches
    const [
      modulesRes, tasksRes, achievementsRes, announcementsRes
    ] = await Promise.all([
      adminClient.from('course_modules').select('id, course_id').in('course_id', courseIds),
      adminClient.from('calendars').select('*, courses(title)').gte('due_date', new Date().toISOString()).order('due_date', { ascending: true }).or(`course_id.in.(${courseIds.join(',')}),course_id.is.null`),
      adminClient.from('student_achievements').select('*, achievements(*)').eq('student_id', user.id),
      getStudentLatestAnnouncements(user.id, courseIds).catch(() => [])
    ])
    
    dbModules = modulesRes.data || []
    dbTasks = tasksRes.data || []
    dbAchievements = achievementsRes.data || []
    result.latestAnnouncements = announcementsRes || []
  } else {
    // If no courses, just get global events and achievements
    const [tasksRes, achievementsRes] = await Promise.all([
      adminClient.from('calendars').select('*, courses(title)').gte('due_date', new Date().toISOString()).order('due_date', { ascending: true }).is('course_id', null),
      adminClient.from('student_achievements').select('*, achievements(*)').eq('student_id', user.id)
    ])
    dbTasks = tasksRes.data || []
    dbAchievements = achievementsRes.data || []
  }

  const moduleIds = dbModules.map(m => m.id)
  if (moduleIds.length > 0) {
    const [lessonsRes, resourcesRes] = await Promise.all([
      adminClient.from('lessons').select('id, module_id, title, type, due_date, created_at').in('module_id', moduleIds),
      adminClient.from('resources').select('id, module_id').in('module_id', moduleIds)
    ])
    dbLessons = lessonsRes.data || []
    dbResources = resourcesRes.data || []

    const lessonIds = dbLessons.map(l => l.id)
    const resourceIds = dbResources.map(r => r.id)

    const parallelQueries = []
    
    if (lessonIds.length > 0) {
      parallelQueries.push(
        adminClient.from('student_progress').select('lesson_id, completed, submission_text').eq('student_id', user.id).in('lesson_id', lessonIds)
      )
      parallelQueries.push(
        adminClient.from('forums').select('id, lesson_id, due_date, is_graded, forum_type').in('lesson_id', lessonIds)
      )
      parallelQueries.push(
        adminClient.from('quizzes').select('id, lesson_id, title, end_date').in('lesson_id', lessonIds)
      )
      parallelQueries.push(
        adminClient.from('student_lesson_grades').select('lesson_id, grade, score').eq('student_id', user.id).in('lesson_id', lessonIds)
      )
    } else {
      parallelQueries.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }))
    }

    if (resourceIds.length > 0) {
      parallelQueries.push(
        adminClient.from('student_resource_progress').select('resource_id').eq('student_id', user.id).eq('completed', true).in('resource_id', resourceIds)
      )
    } else {
      parallelQueries.push(Promise.resolve({ data: [] }))
    }

    const [
      progressDataRes,
      forumsDataRes,
      quizzesDataRes,
      gradesRes,
      progressResourcesDataRes
    ] = await Promise.all(parallelQueries)

    progressData = progressDataRes.data || []
    courseForums = forumsDataRes.data || []
    courseQuizzes = quizzesDataRes.data || []
    dbLessonGrades = gradesRes.data || []

    completedLessonIds = new Set(progressData.filter((p: any) => p.completed).map((p: any) => p.lesson_id))
    completedResourceIds = new Set((progressResourcesDataRes.data || []).map((p: any) => p.resource_id))

    if (courseQuizzes.length > 0) {
      const { data: attemptsRes } = await adminClient.from('quiz_attempts').select('quiz_id, score, status, completed_at').eq('student_id', user.id).in('quiz_id', courseQuizzes.map(q => q.id))
      dbQuizAttempts = attemptsRes || []
    }

    // Actualizar completedLessonIds
    dbLessonGrades.forEach(g => { if (g.grade !== null || g.score !== null) completedLessonIds.add(g.lesson_id) })
    dbQuizAttempts.forEach(qa => {
      if (qa.completed_at || qa.status === 'completed' || qa.score !== null) {
        const quizObj = courseQuizzes.find(q => q.id === qa.quiz_id)
        if (quizObj) completedLessonIds.add(quizObj.lesson_id)
      }
    })

    const forumIds = courseForums.map(f => f.id)
    if (forumIds.length > 0) {
      const [studentThreadsRes, allThreadsRes] = await Promise.all([
        adminClient.from('forum_threads').select('forum_id').eq('author_id', user.id).in('forum_id', forumIds),
        adminClient.from('forum_threads').select('id, forum_id').in('forum_id', forumIds)
      ])
      const studentThreads = studentThreadsRes.data || []
      const allThreads = allThreadsRes.data || []

      const studentThreadForumIds = new Set(studentThreads.map(t => t.forum_id))
      studentThreadForumIds.forEach(forumId => {
        const forumObj = courseForums.find(f => f.id === forumId)
        if (forumObj) completedLessonIds.add(forumObj.lesson_id)
      })

      const threadIds = allThreads.map(t => t.id)
      if (threadIds.length > 0) {
        const { data: studentReplies } = await adminClient.from('forum_replies').select('thread_id').eq('author_id', user.id).in('thread_id', threadIds)
        if (studentReplies) {
          studentReplies.forEach(r => {
            const thread = allThreads.find(t => t.id === r.thread_id)
            if (thread) {
              const forumObj = courseForums.find(f => f.id === thread.forum_id)
              if (forumObj) completedLessonIds.add(forumObj.lesson_id)
            }
          })
        }
      }
    }
  }

  // Mapear cursos
  result.courses = dbCourses.map((c: any): DashboardCourse => {
    const subject = (c.subject || 'GENERAL').toUpperCase()
    let color = 'bg-blue-500', bgColor = 'bg-blue-50/50 dark:bg-blue-950/20', textColor = 'text-blue-600 dark:text-blue-400'
    if (subject.includes('MATEM')) { color = 'bg-purple-500'; bgColor = 'bg-purple-50/50 dark:bg-purple-950/20'; textColor = 'text-purple-600 dark:text-purple-400' }
    else if (subject.includes('TEC') || subject.includes('PROG')) { color = 'bg-emerald-500'; bgColor = 'bg-emerald-50/50 dark:bg-emerald-950/20'; textColor = 'text-emerald-600 dark:text-emerald-400' }
    else if (subject.includes('INGL') || subject.includes('LENGU')) { color = 'bg-amber-500'; bgColor = 'bg-amber-50/50 dark:bg-amber-950/20'; textColor = 'text-amber-600 dark:text-amber-400' }

    const courseModules = dbModules.filter(m => m.course_id === c.id)
    const courseModuleIds = new Set(courseModules.map(m => m.id))
    const courseLessons = dbLessons.filter(l => courseModuleIds.has(l.module_id))
    const courseResources = dbResources.filter(r => courseModuleIds.has(r.module_id))

    const totalItems = courseLessons.length + courseResources.length
    const completedItems = courseLessons.filter(l => completedLessonIds.has(l.id)).length +
                           courseResources.filter(r => completedResourceIds.has(r.id)).length
    const courseProgress = totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0

    return {
      id: c.id, slug: c.slug, title: c.title, topic: c.description || 'Sin descripción',
      progress: courseProgress, category: subject, color, bgColor, textColor,
      image: c.banner_url || '', gradeLevel: c.grade_level || null,
    }
  })

  // Mapear tareas (Course lessons)
  const ACTIONABLE_TYPES = new Set(['task', 'quiz', 'forum', 'assignment', 'homework'])
  const coursePendingTasks: DashboardTask[] = []

  for (const l of dbLessons) {
    if (ACTIONABLE_TYPES.has(l.type)) {
      const mod = dbModules.find(m => m.id === l.module_id)
      const crs = dbCourses.find(c => c.id === mod?.course_id)
      const forumObj = courseForums.find((f: any) => f.lesson_id === l.id)
      const quizObj = courseQuizzes.find((q: any) => q.lesson_id === l.id)
      const gradeObj = dbLessonGrades.find((g: any) => g.lesson_id === l.id)
      const quizAttempt = quizObj ? dbQuizAttempts.find((qa: any) => qa.quiz_id === quizObj.id) : null
      const progObj = (progressData || []).find((p: any) => p.lesson_id === l.id)

      let status: 'Pendiente' | 'Entregado' | 'Calificado' = 'Pendiente'
      if (gradeObj && (gradeObj.grade !== null || gradeObj.score !== null)) { status = 'Calificado' }
      else if (quizAttempt && quizAttempt.score !== null && quizAttempt.score !== undefined) { status = 'Calificado' }
      else if (
        (progObj && (progObj.completed || (progObj.submission_text && progObj.submission_text.trim().length > 0))) ||
        (quizAttempt && (quizAttempt.completed_at || quizAttempt.status === 'completed')) ||
        completedLessonIds.has(l.id)
      ) { status = 'Entregado' }
      else { status = 'Pendiente' }

      if (status === 'Calificado') continue

      let rawDueDate: string | null = l.due_date || null
      if (!rawDueDate && l.type === 'forum' && forumObj?.due_date) rawDueDate = forumObj.due_date
      if (!rawDueDate && l.type === 'quiz' && quizObj?.end_date) rawDueDate = quizObj.end_date

      let formattedDate = 'Sin fecha límite'
      let urgency: 'Urgente' | 'Próximo' | 'Pendiente' = 'Pendiente'
      const isNonGradedForum = l.type === 'forum' && !forumObj?.is_graded

      if (rawDueDate) {
        const dueDateObj = new Date(rawDueDate)
        formattedDate = dueDateObj.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        const hoursLeft = (dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60)
        
        if (status === 'Entregado') urgency = 'Pendiente'
        else if (isNonGradedForum) urgency = 'Pendiente'
        else if (hoursLeft < 24) urgency = 'Urgente'
        else if (hoursLeft < 72) urgency = 'Próximo'
      }

      coursePendingTasks.push({
        id: l.id, title: l.title, course: crs?.title || 'Curso',
        dueDate: formattedDate, urgency, status, type: l.type,
        href: crs?.slug ? `/student/courses/${crs.slug}?lessonId=${l.id}` : undefined
      })
    }
  }

  // Mapear eventos de calendario tabla
  const calendarPendingTasks = dbTasks.filter((t: any) => !coursePendingTasks.some(pt => pt.id === t.id)).map((t: any): DashboardTask => {
    const dueDateObj = new Date(t.due_date)
    const formattedDate = dueDateObj.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    const isForumTask = t.event_type === 'forum' || t.title?.toLowerCase().includes('foro')
    const hoursLeft = (dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60)
    let urgency: 'Urgente' | 'Próximo' | 'Pendiente' = 'Pendiente'
    if (!isForumTask) {
      if (hoursLeft < 24) urgency = 'Urgente'
      else if (hoursLeft < 72) urgency = 'Próximo'
    }
    return {
      id: t.id, title: t.title, course: t.courses?.title || 'Evento General',
      dueDate: formattedDate, urgency, status: 'Pendiente', type: t.event_type || 'homework', href: '/student/calendar'
    }
  })

  result.tasks = [...coursePendingTasks, ...calendarPendingTasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'Pendiente' ? -1 : 1
    const urgencyWeight = { 'Urgente': 0, 'Próximo': 1, 'Pendiente': 2 }
    return (urgencyWeight[a.urgency] ?? 2) - (urgencyWeight[b.urgency] ?? 2)
  })

  // Eventos de calendario
  const calEventsArr: DashboardCalendarEvent[] = []
  const toDateStr = (iso: string) => iso.substring(0, 10)
  dbTasks.forEach((t: any) => calEventsArr.push({ date: toDateStr(t.due_date), title: t.title, type: 'task' }))
  courseQuizzes.forEach((q: any) => { if (q.end_date) calEventsArr.push({ date: toDateStr(q.end_date), title: q.title, type: 'quiz' }) })
  courseForums.forEach((f: any) => { if (f.due_date) calEventsArr.push({ date: toDateStr(f.due_date), title: f.title, type: 'forum' }) })
  result.calendarEvents = calEventsArr

  // Achievements
  result.achievements = dbAchievements.map((sa: any): DashboardAchievement => {
    const ach = sa.achievements
    const formattedDate = new Date(sa.awarded_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    return { id: sa.id, title: ach.title, description: ach.description, date: formattedDate, iconType: ach.badge_icon || 'award' }
  })

  // Global Progress
  const countableLessons = dbLessons.filter(l => {
    const forumObj = courseForums.find(f => f.lesson_id === l.id)
    if (forumObj && forumObj.forum_type === 'qa' && !forumObj.is_graded) return false
    return true
  })
  const totalAllItems = countableLessons.length + dbResources.length
  const completedAllItems = countableLessons.filter(l => completedLessonIds.has(l.id)).length + dbResources.filter(r => completedResourceIds.has(r.id)).length
  result.progressPercentage = totalAllItems > 0 ? Math.min(100, Math.round((completedAllItems / totalAllItems) * 100)) : 0

  return result
}
