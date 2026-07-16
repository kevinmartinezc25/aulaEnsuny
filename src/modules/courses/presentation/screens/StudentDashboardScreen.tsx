'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle, Award, TrendingUp, Flame, Rocket, Code2, AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Zap, Megaphone, Bell, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/core/config/supabase/client'
import { getStudentLatestAnnouncements } from '../../application/announcementActions'

interface Course {
  id: string
  title: string
  topic: string
  progress: number
  category: string
  color: string
  bgColor: string
  textColor: string
  image: string
}

interface Task {
  id: string
  title: string
  course: string
  dueDate: string
  urgency: 'Urgente' | 'Próximo' | 'Pendiente'
  type?: string
}

interface Achievement {
  id: string
  title: string
  description: string
  date: string
  icon: React.ReactNode
  iconBg: string
}

interface CalendarEvent {
  date: string  // 'YYYY-MM-DD'
  title: string
  type: 'quiz' | 'task' | 'forum' | 'event'
}

export function StudentDashboardScreen() {
  const [studentName, setStudentName] = useState('Estudiante')
  const [courses, setCourses] = useState<Course[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [statsData, setStatsData] = useState<any[]>([])
  const [latestAnnouncements, setLatestAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Calendar state — always starts on the real current month
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth()) // 0-based
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])

  const activeCoursesMock: Course[] = [
    {
      id: 'fisica-1',
      title: 'Física I',
      topic: 'Leyes de Newton',
      progress: 80,
      category: 'FÍSICA',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=300',
    },
    {
      id: 'mate-1',
      title: 'Matemáticas I',
      topic: 'Funciones cuadráticas',
      progress: 65,
      category: 'MATEMÁTICAS',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50/50 dark:bg-purple-950/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=300',
    },
    {
      id: 'prog-1',
      title: 'Programación',
      topic: 'Python desde cero',
      progress: 40,
      category: 'TECNOLOGÍA',
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=300',
    },
    {
      id: 'ingles-1',
      title: 'Inglés I',
      topic: 'Past Simple Tense',
      progress: 30,
      category: 'INGLÉS',
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50/50 dark:bg-amber-950/20',
      textColor: 'text-amber-600 dark:text-amber-400',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ca1ad?auto=format&fit=crop&q=80&w=300',
    },
  ]

  const pendingTasksMock: Task[] = [
    {
      id: 'task-1',
      title: 'Taller: Movimiento Rectilíneo Uniforme',
      course: 'Física I',
      dueDate: 'Hoy, 6:00 PM',
      urgency: 'Urgente',
      type: 'homework',
    },
    {
      id: 'task-2',
      title: 'Quiz de Álgebra',
      course: 'Matemáticas I',
      dueDate: 'Mañana, 11:59 PM',
      urgency: 'Próximo',
      type: 'quiz',
    },
    {
      id: 'task-3',
      title: 'Proyecto: Calculadora en Python',
      course: 'Programación',
      dueDate: 'Viernes, 11:59 PM',
      urgency: 'Próximo',
      type: 'homework',
    },
    {
      id: 'task-4',
      title: 'Reading Comprehension',
      course: 'Inglés I',
      dueDate: 'Lunes, 11:59 PM',
      urgency: 'Pendiente',
      type: 'homework',
    },
  ]

  const recentAchievementsMock: Achievement[] = [
    {
      id: 'ach-1',
      title: 'Racha de 7 días',
      description: '¡Sigue así!',
      date: '21 may',
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      iconBg: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      id: 'ach-2',
      title: 'Explorador STEM',
      description: 'Nivel 12 alcanzado',
      date: '20 may',
      icon: <Rocket className="h-5 w-5 text-indigo-500" />,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/30',
    },
    {
      id: 'ach-3',
      title: 'Programador Inicial',
      description: 'Completaste 5 proyectos',
      date: '18 may',
      icon: <Code2 className="h-5 w-5 text-emerald-500" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      id: 'ach-4',
      title: 'Maestro del Álgebra',
      description: 'Completaste el módulo',
      date: '15 may',
      icon: <BookOpen className="h-5 w-5 text-blue-500" />,
      iconBg: 'bg-blue-50 dark:bg-blue-950/30',
    },
  ]

  // ── Dynamic calendar grid ─────────────────────────────────────────────────
  const buildCalendarGrid = () => {
    const today = new Date()
    const firstDay = new Date(calYear, calMonth, 1)
    // Monday-based week: getDay() returns 0=Sun→shift to Mon-first
    let startDow = firstDay.getDay() // 0 Sun … 6 Sat
    startDow = startDow === 0 ? 6 : startDow - 1 // Mon=0 … Sun=6

    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate()

    const cells: { day: number; currentMonth: boolean; isToday: boolean; dateStr: string }[] = []

    // Leading days from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const m = calMonth === 0 ? 11 : calMonth - 1
      const y = calMonth === 0 ? calYear - 1 : calYear
      cells.push({ day: d, currentMonth: false, isToday: false, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === d
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ day: d, currentMonth: true, isToday, dateStr })
    }

    // Trailing days to fill complete rows (multiple of 7)
    const trailing = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
    for (let d = 1; d <= trailing; d++) {
      const m = calMonth === 11 ? 0 : calMonth + 1
      const y = calMonth === 11 ? calYear + 1 : calYear
      cells.push({ day: d, currentMonth: false, isToday: false, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
    }

    return cells
  }

  const calendarGrid = buildCalendarGrid()

  // Map events by date for quick lookup
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  calendarEvents.forEach(ev => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = []
    eventsByDate[ev.date].push(ev)
  })

  // Month navigation
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  // Upcoming events (next 5 from today)
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const upcomingEvents = calendarEvents
    .filter(ev => ev.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  useEffect(() => {
    async function loadStudentData() {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) return parts.pop()?.split(';').shift()
        return null
      }

      if (isDemoMode) {
        const demoCookie = getCookie('aulaensuny-demo-session')
        if (demoCookie) {
          try {
            const session = JSON.parse(decodeURIComponent(demoCookie))
            setStudentName(session.first_name || 'Estudiante')
          } catch (e) {
            console.error(e)
          }
        }
        setCourses(activeCoursesMock)
        setTasks(pendingTasksMock)
        setAchievements(recentAchievementsMock)
        setStatsData([
          { title: 'Cursos activos', value: '4', linkText: 'Ver todos', href: '/student/dashboard', icon: BookOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
          { title: 'Actividades pendientes', value: '4', linkText: 'Ver tareas', href: '/student/calendar', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
          { title: 'Progreso general', value: '54%', linkText: 'Ver progreso', href: '/student/dashboard', icon: TrendingUp, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' },
        ])
        // Demo calendar events: use dates relative to today
        const t = new Date()
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const add = (days: number) => { const d = new Date(t); d.setDate(d.getDate() + days); return d }
        setCalendarEvents([
          { date: fmt(add(1)), title: 'Quiz de Álgebra', type: 'quiz' },
          { date: fmt(add(3)), title: 'Entrega: Taller MRU', type: 'task' },
          { date: fmt(add(5)), title: 'Foro: Leyes de Newton', type: 'forum' },
          { date: fmt(add(7)), title: 'Proyecto Python', type: 'task' },
          { date: fmt(add(10)), title: 'Examen Parcial Física', type: 'quiz' },
        ])
        // Fetch latest mock announcements
        try {
          const mockLatest = await getStudentLatestAnnouncements('stu-demo-id')
          setLatestAnnouncements(mockLatest)
        } catch (e) {
          console.error(e)
        }
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profile) {
            setStudentName(profile.first_name || 'Estudiante')
          } else if (user.user_metadata?.first_name) {
            setStudentName(user.user_metadata.first_name)
          }

          // Fetch courses explicitly enrolled via student_courses (no grade-level fallback)
          let dbCourses: any[] = []
          try {
            const { data: enrolledData, error: enrollErr } = await supabase
              .from('student_courses')
              .select('course_id')
              .eq('student_id', user.id)

            if (!enrollErr && enrolledData && enrolledData.length > 0) {
              const courseIds = enrolledData.map(e => e.course_id)
              const { data, error: coursesErr } = await supabase
                .from('courses')
                .select('*')
                .in('id', courseIds)
                .eq('status', 'active')
              if (!coursesErr && data) {
                dbCourses = data
              }
            }
          } catch (e) {
            console.warn('Error cargando cursos del estudiante:', e)
          }

          // Fetch progress details for all active courses
          const courseIds = dbCourses.map(c => c.id)
          let dbModules: any[] = []
          let dbLessons: any[] = []
          let dbResources: any[] = []
          let completedLessonIds = new Set<string>()
          let completedResourceIds = new Set<string>()

          if (courseIds.length > 0) {
            const { data: modulesData } = await supabase
              .from('course_modules')
              .select('id, course_id')
              .in('course_id', courseIds)
            dbModules = modulesData || []

            const moduleIds = dbModules.map(m => m.id)
            if (moduleIds.length > 0) {
              const { data: lessonsData } = await supabase
                .from('lessons')
                .select('id, module_id')
                .in('module_id', moduleIds)
              dbLessons = lessonsData || []

              const { data: resourcesData } = await supabase
                .from('resources')
                .select('id, module_id')
                .in('module_id', moduleIds)
              dbResources = resourcesData || []

              const { data: progressData } = await supabase
                .from('student_progress')
                .select('lesson_id')
                .eq('student_id', user.id)
                .eq('completed', true)
                .in('lesson_id', dbLessons.map(l => l.id))
              completedLessonIds = new Set((progressData || []).map(p => p.lesson_id))

              // Fetch student resource progress completions
              const resourceIds = dbResources.map(r => r.id)
              if (resourceIds.length > 0) {
                try {
                  const { data: progressResourcesData } = await supabase
                    .from('student_resource_progress')
                    .select('resource_id')
                    .eq('student_id', user.id)
                    .eq('completed', true)
                    .in('resource_id', resourceIds)
                  completedResourceIds = new Set((progressResourcesData || []).map(p => p.resource_id))
                } catch (e) {
                  console.warn('Could not select student_resource_progress:', e)
                }
              }



              // Fetch student forum interactions to auto-complete forums they participated in
              const lessonIds = dbLessons.map(l => l.id)
              if (lessonIds.length > 0) {
                const { data: forumsData } = await supabase
                  .from('forums')
                  .select('id, lesson_id')
                  .in('lesson_id', lessonIds)
                const courseForums = forumsData || []

                const forumIds = courseForums.map(f => f.id)
                if (forumIds.length > 0) {
                  // Get threads created by this student
                  const { data: studentThreads } = await supabase
                    .from('forum_threads')
                    .select('forum_id')
                    .eq('author_id', user.id)
                    .in('forum_id', forumIds)

                  const studentThreadForumIds = new Set(studentThreads?.map(t => t.forum_id) || [])

                  // Get all thread IDs in these forums
                  const { data: allThreads } = await supabase
                    .from('forum_threads')
                    .select('id, forum_id')
                    .in('forum_id', forumIds)

                  const threadIds = allThreads?.map(t => t.id) || []
                  if (threadIds.length > 0) {
                    const { data: studentReplies } = await supabase
                      .from('forum_replies')
                      .select('thread_id')
                      .eq('author_id', user.id)
                      .in('thread_id', threadIds)

                    if (studentReplies) {
                      studentReplies.forEach(r => {
                        const thread = allThreads?.find(t => t.id === r.thread_id)
                        if (thread) {
                          const forumObj = courseForums.find(f => f.id === thread.forum_id)
                          if (forumObj) {
                            completedLessonIds.add(forumObj.lesson_id)
                          }
                        }
                      })
                    }
                  }

                  // Also add from thread creations
                  studentThreadForumIds.forEach(forumId => {
                    const forumObj = courseForums.find(f => f.id === forumId)
                    if (forumObj) {
                      completedLessonIds.add(forumObj.lesson_id)
                    }
                  })
                }
              }
            }
          }

          const mapDbCourse = (c: any): Course => {
            const subject = (c.subject || 'GENERAL').toUpperCase()
            let color = 'bg-blue-500'
            let bgColor = 'bg-blue-50/50 dark:bg-blue-950/20'
            let textColor = 'text-blue-600 dark:text-blue-400'

            if (subject.includes('MATEM')) {
              color = 'bg-purple-500'
              bgColor = 'bg-purple-50/50 dark:bg-purple-950/20'
              textColor = 'text-purple-600 dark:text-purple-400'
            } else if (subject.includes('TEC') || subject.includes('PROG')) {
              color = 'bg-emerald-500'
              bgColor = 'bg-emerald-50/50 dark:bg-emerald-950/20'
              textColor = 'text-emerald-600 dark:text-emerald-400'
            } else if (subject.includes('INGL') || subject.includes('LENGU')) {
              color = 'bg-amber-500'
              bgColor = 'bg-amber-50/50 dark:bg-amber-950/20'
              textColor = 'text-amber-600 dark:text-amber-400'
            }

            const courseModules = dbModules.filter(m => m.course_id === c.id)
            const courseModuleIds = new Set(courseModules.map(m => m.id))
            const courseLessons = dbLessons.filter(l => courseModuleIds.has(l.module_id))
            const courseResources = dbResources.filter(r => courseModuleIds.has(r.module_id))

            const totalItems = courseLessons.length + courseResources.length
            const completedItems = courseLessons.filter(l => completedLessonIds.has(l.id)).length +
                                   courseResources.filter(r => completedResourceIds.has(r.id)).length
            const courseProgress = totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0

            return {
              id: c.id,
              title: c.title,
              topic: c.description || 'Sin descripción',
              progress: courseProgress,
              category: subject,
              color,
              bgColor,
              textColor,
              image: c.banner_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=300',
            }
          }

          const mappedCourses = dbCourses.map(mapDbCourse)
          setCourses(mappedCourses)

          // Fetch pending tasks from calendars table
          let tasksQuery = supabase
            .from('calendars')
            .select('*, courses(title)')
            .gte('due_date', new Date().toISOString())
            .order('due_date', { ascending: true })

          if (courseIds.length > 0) {
            tasksQuery = tasksQuery.or(`course_id.in.(${courseIds.join(',')}),course_id.is.null`)
          } else {
            tasksQuery = tasksQuery.is('course_id', null)
          }

          const { data: dbTasks } = await tasksQuery

          const mapDbTask = (t: any): Task => {
            const dueDateObj = new Date(t.due_date)
            const formattedDate = dueDateObj.toLocaleDateString('es-ES', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })

            const timeLeftMs = dueDateObj.getTime() - Date.now()
            const hoursLeft = timeLeftMs / (1000 * 60 * 60)
            let urgency: 'Urgente' | 'Próximo' | 'Pendiente' = 'Pendiente'
            if (hoursLeft < 24) {
              urgency = 'Urgente'
            } else if (hoursLeft < 72) {
              urgency = 'Próximo'
            }

            return {
              id: t.id,
              title: t.title,
              course: t.courses?.title || 'Evento General',
              dueDate: formattedDate,
              urgency,
              type: t.event_type || 'homework'
            }
          }

          const mappedTasks = (dbTasks || []).map(mapDbTask)
          setTasks(mappedTasks)

          // ── Calendar events: from calendars table + quiz end dates + forum deadlines ──
          const calEventsArr: CalendarEvent[] = []
          const toDateStr = (iso: string) => iso.substring(0, 10)

            // 1. From calendars table (tasks/events created by teacher)
            ; (dbTasks || []).forEach((t: any) => {
              calEventsArr.push({ date: toDateStr(t.due_date), title: t.title, type: 'task' })
            })

          // 2. Quiz end dates
          if (courseIds.length > 0) {
            try {
              const moduleIds2 = dbModules.map(m => m.id)
              if (moduleIds2.length > 0) {
                const { data: quizLessons } = await supabase
                  .from('lessons')
                  .select('id')
                  .in('module_id', moduleIds2)
                const lessonIds2 = (quizLessons || []).map((l: any) => l.id)
                if (lessonIds2.length > 0) {
                  const { data: quizzesData } = await supabase
                    .from('quizzes')
                    .select('title, end_date')
                    .in('lesson_id', lessonIds2)
                    .not('end_date', 'is', null)
                    ; (quizzesData || []).forEach((q: any) => {
                      if (q.end_date) {
                        calEventsArr.push({ date: toDateStr(q.end_date), title: q.title, type: 'quiz' })
                      }
                    })
                }
              }
            } catch (e) { console.warn('Could not load quiz dates:', e) }
          }

          // 3. Forum deadlines (forums with due_date column, if it exists)
          try {
            const lessonIds3 = dbLessons.map((l: any) => l.id)
            if (lessonIds3.length > 0) {
              const { data: forumsWithDue } = await supabase
                .from('forums')
                .select('title, due_date')
                .in('lesson_id', lessonIds3)
                .not('due_date', 'is', null)
                ; (forumsWithDue || []).forEach((f: any) => {
                  if (f.due_date) {
                    calEventsArr.push({ date: toDateStr(f.due_date), title: f.title, type: 'forum' })
                  }
                })
            }
          } catch (e) { console.warn('Forum due_date not available:', e) }

          setCalendarEvents(calEventsArr)

          // Fetch achievements
          const { data: dbAchievements } = await supabase
            .from('student_achievements')
            .select('*, achievements(*)')
            .eq('student_id', user.id)

          const mapDbAchievement = (sa: any): Achievement => {
            const ach = sa.achievements
            const dateObj = new Date(sa.awarded_at)
            const formattedDate = dateObj.toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short'
            })

            let iconBg = 'bg-blue-50 dark:bg-blue-950/30'
            if (ach.badge_icon === 'flame') iconBg = 'bg-orange-50 dark:bg-orange-950/30'
            else if (ach.badge_icon === 'rocket') iconBg = 'bg-indigo-50 dark:bg-indigo-950/30'
            else if (ach.badge_icon === 'code2' || ach.badge_icon === 'code') iconBg = 'bg-emerald-50 dark:bg-emerald-950/30'

            const getIcon = (iconName: string) => {
              switch (iconName) {
                case 'flame': return <Flame className="h-5 w-5 text-orange-500" />
                case 'rocket': return <Rocket className="h-5 w-5 text-indigo-500" />
                case 'code':
                case 'code2': return <Code2 className="h-5 w-5 text-emerald-500" />
                default: return <Award className="h-5 w-5 text-blue-500" />
              }
            }

            return {
              id: sa.id,
              title: ach.title,
              description: ach.description,
              date: formattedDate,
              icon: getIcon(ach.badge_icon),
              iconBg
            }
          }

          const mappedAchievements = (dbAchievements || []).map(mapDbAchievement)
          setAchievements(mappedAchievements)

          // Calculate overall progress across all active courses
          const totalAllItems = dbLessons.length + dbResources.length
          const completedAllItems = dbLessons.filter(l => completedLessonIds.has(l.id)).length +
                                    dbResources.filter(r => completedResourceIds.has(r.id)).length
          const progressPercentage = totalAllItems > 0 ? Math.min(100, Math.round((completedAllItems / totalAllItems) * 100)) : 0

          setStatsData([
            { title: 'Cursos activos', value: String(mappedCourses.length), linkText: 'Ver todos', href: '/student/dashboard', icon: BookOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
            { title: 'Actividades pendientes', value: String(mappedTasks.length), linkText: 'Ver tareas', href: '/student/calendar', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
            { title: 'Progreso general', value: `${progressPercentage}%`, linkText: 'Ver progreso', href: '/student/dashboard', icon: TrendingUp, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' },
          ])

          // Fetch latest announcements
          try {
            const latest = await getStudentLatestAnnouncements(user.id)
            setLatestAnnouncements(latest || [])
          } catch (e) {
            console.error('Error fetching student dashboard announcements:', e)
          }
        }
      } catch (err) {
        console.error('Error al cargar datos del estudiante:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStudentData()
  }, [])

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Saludo */}
      <div className="space-y-1">
        <div className="flex flex-row items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            ¡Hola, {studentName}!
          </h1>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30 w-fit">
            Estudiante
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-base">
          Qué bueno verte de nuevo. Sigue aprendiendo.
        </p>
      </div>

      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-6 w-10 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
              <div className="mt-4 border-t border-slate-50 pt-3 dark:border-slate-800/40">
                <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))
        ) : (
          statsData.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-50 pt-3 dark:border-slate-800/40 text-left">
                  <Link
                    href={stat.href}
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    {stat.linkText}
                  </Link>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Layout Principal splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Columna Izquierda: Cursos y Tareas (2/3 ancho) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Cursos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Mis cursos
              </h2>
              <div className="flex items-center gap-3">
                <Link href="/student/join-course" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F4E31] hover:underline dark:text-[#388E59]">
                  <PlusCircle className="h-3.5 w-3.5" /> Unirse a un curso
                </Link>
                <Link href="/student/dashboard" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-0.5">
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Grid/Scroll de Cursos */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 overflow-hidden animate-pulse">
                    <div className="h-36 w-full bg-slate-100 dark:bg-slate-800" />
                    <div className="p-5 space-y-4">
                      <div className="space-y-2">
                        <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3.5 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                      </div>
                      <div className="space-y-2 pt-2">
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                      </div>
                      <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-slate-800/80 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center dark:border-slate-800/60 dark:bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-4">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Sin cursos registrados</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Aún no tienes cursos asignados para tu grado. Puedes solicitar acceso usando un código de invitación o contactar al administrador.
                </p>
                <Link href="/student/join-course" className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F4E31] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#153823]">
                  <PlusCircle className="h-4 w-4" /> Unirse a un curso
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {courses.map((course, idx) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.08 }}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 dark:border-slate-800/60 dark:bg-slate-900"
                  >
                    {/* Banner Image */}
                    <div className="h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      {/* Badge */}
                      <span className={`absolute top-4 left-4 rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wider text-white ${course.color}`}>
                        {course.category}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex-1 text-left space-y-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-sm text-slate-400 dark:text-slate-500 line-clamp-1">
                          {course.topic}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 dark:text-slate-500 font-medium">Progreso</span>
                          <span className="text-slate-800 dark:text-slate-200 font-semibold">{course.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${course.progress}%` }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className={`h-full rounded-full ${course.color}`}
                          />
                        </div>
                      </div>

                      {/* Button */}
                      <div className="mt-6">
                        <Link
                          href={`/student/courses/${course.id}`}
                          className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${course.bgColor} ${course.textColor} hover:opacity-90 active:scale-[0.98]`}
                        >
                          <span>Continuar</span>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Últimas Novedades */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                📢 Últimas Novedades
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 animate-pulse h-32" />
                ))}
              </div>
            ) : latestAnnouncements.length === 0 ? (
              <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center dark:border-slate-800/60 dark:bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No hay novedades recientes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {latestAnnouncements.map((ann) => {
                  let typeColor = 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                  if (ann.type === 'urgent') typeColor = 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                  else if (ann.type === 'reminder') typeColor = 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'

                  return (
                    <div
                      key={ann.id}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.01)] text-left flex flex-col justify-between dark:border-slate-800/60 dark:bg-slate-900 hover:shadow-[0_12px_35px_rgb(0,0,0,0.02)] transition-shadow"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${typeColor}`}>
                            {ann.type === 'urgent' ? 'Urgente' : ann.type === 'reminder' ? 'Recordatorio' : 'Anuncio'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold truncate max-w-[100px]">{ann.courseTitle}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                          {ann.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: ann.content }} />
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                        <span>{new Date(ann.publishAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        <Link
                          href={`/student/courses/${ann.courseId}`}
                          className="font-bold text-blue-650 hover:text-blue-550 dark:text-blue-450"
                        >
                          Ver curso
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actividades Pendientes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Actividades pendientes
              </h2>
              <Link href="/student/calendar" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Ver todas
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900 animate-pulse">
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className="h-7.5 w-7.5 rounded-lg bg-slate-100 dark:bg-slate-800" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-1/4 rounded bg-slate-100 dark:bg-slate-800" />
                      </div>
                    </div>
                    <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center dark:border-slate-800/60 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No hay actividades pendientes en este momento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task, idx) => {
                  const badgeColor =
                    task.urgency === 'Urgente'
                      ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
                      : task.urgency === 'Próximo'
                        ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                        : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800/60'

                  const getTypeBadge = (type?: string) => {
                    switch (type) {
                      case 'quiz':
                      case 'exam':
                        return { label: 'Evaluación', color: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30' }
                      case 'forum':
                        return { label: 'Foro', color: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/30' }
                      case 'event':
                        return { label: 'Evento', color: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' }
                      case 'homework':
                      default:
                        return { label: 'Tarea', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' }
                    }
                  }

                  const typeBadge = getTypeBadge(task.type)

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200/80 transition-all dark:border-slate-800/60 dark:bg-slate-900"
                    >
                      <div className="flex items-start gap-3.5 text-left">
                        <div className="mt-1 flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-blue-500/5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          <BookOpen className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                              {task.title}
                            </h4>
                            <span className={`rounded-lg border px-1.5 py-0.2 text-[9px] font-bold ${typeBadge.color}`}>
                              {typeBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{task.course}</p>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-4 pl-11 sm:pl-0">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {task.dueDate}
                        </span>
                        <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${badgeColor}`}>
                          {task.urgency}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Calendario y Logros (1/3 ancho) */}
        <div className="space-y-8">

          {/* Calendario Widget — Dinámico */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-800/40">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Calendario</h3>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-400 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 min-w-[80px] text-center">
                  {MONTH_NAMES[calMonth]} {calYear}
                </span>
                <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-400 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Days header */}
            <div className="grid grid-cols-7 gap-y-2 mt-4 text-center text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 gap-y-1 mt-2 text-center text-xs font-semibold">
              {calendarGrid.map((cell, index) => {
                const dayEvents = eventsByDate[cell.dateStr] || []
                const hasQuiz = dayEvents.some(e => e.type === 'quiz')
                const hasTask = dayEvents.some(e => e.type === 'task' || e.type === 'event')
                const hasForum = dayEvents.some(e => e.type === 'forum')
                const hasAny = dayEvents.length > 0

                return (
                  <div key={index} className="flex flex-col items-center justify-center py-0.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors
                        ${cell.isToday
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 font-bold'
                          : cell.currentMonth
                            ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-default'
                            : 'text-slate-300 dark:text-slate-600'
                        }
                      `}
                    >
                      {cell.day}
                    </span>
                    {/* Event dots */}
                    {hasAny && cell.currentMonth && (
                      <div className="flex items-center justify-center gap-0.5 mt-0.5 h-1.5">
                        {hasQuiz && <span className="h-1 w-1 rounded-full bg-purple-500" />}
                        {hasTask && <span className="h-1 w-1 rounded-full bg-amber-500" />}
                        {hasForum && <span className="h-1 w-1 rounded-full bg-emerald-500" />}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-purple-500" />Quiz</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Tarea</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Foro</span>
            </div>

            {/* Upcoming events list */}
            {upcomingEvents.length > 0 && (
              <div className="mt-4 border-t border-slate-50 dark:border-slate-800/40 pt-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Próximos eventos</p>
                {upcomingEvents.map((ev, i) => {
                  const evDate = new Date(ev.date + 'T00:00:00')
                  const label = evDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  const dotColor = ev.type === 'quiz' ? 'bg-purple-500' : ev.type === 'forum' ? 'bg-emerald-500' : 'bg-amber-500'
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{ev.title}</p>
                        <p className="text-[10px] text-slate-400">{label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
