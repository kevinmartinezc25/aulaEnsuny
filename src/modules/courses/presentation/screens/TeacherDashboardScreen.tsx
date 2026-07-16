'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { BookOpen, Users, BrainCircuit, TrendingUp, FileText, Upload, Save, X, Edit, Eye, Play, Loader2, Calendar } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@/core/config/supabase/client'

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

interface Course {
  id: string
  title: string
  subject: string
  studentsCount: number
  modulesCount: number
  bannerUrl: string
  joinCode?: string
}

const analyticsData = [
  { name: 'Sem 1', promedio: 3.6 },
  { name: 'Sem 2', promedio: 3.8 },
  { name: 'Sem 3', promedio: 4.0 },
  { name: 'Sem 4', promedio: 3.9 },
  { name: 'Sem 5', promedio: 4.2 },
  { name: 'Sem 6', promedio: 4.1 },
]

export function TeacherDashboardScreen() {
  const [courses, setCourses] = useState<Course[]>([
    { id: 'fisica-1', title: 'Física I', subject: 'Física', studentsCount: 42, modulesCount: 2, bannerUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=300', joinCode: 'FIS-101' },
    { id: 'mate-1', title: 'Matemáticas I', subject: 'Matemáticas', studentsCount: 38, modulesCount: 2, bannerUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=300', joinCode: 'MAT-202' },
    { id: 'prog-1', title: 'Programación', subject: 'Tecnología', studentsCount: 45, modulesCount: 1, bannerUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=300', joinCode: 'PRO-303' },
  ])

  const [teacherName, setTeacherName] = useState('Prof. Alejandro')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    coursesCount: 3,
    studentsCount: 125,
    quizzesCount: 42,
    avgGrade: '4.1 / 5.0'
  })
  const [chartData, setChartData] = useState<any[]>(analyticsData)
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])

  // Modales y Editores State
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // Editor de Lecciones State
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonContent, setLessonContent] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeEmbedId, setYoutubeEmbedId] = useState<string | null>(null)
  const [selectedPdfName, setSelectedPdfName] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Carga de datos dinámicos desde Supabase o fallback a Mock en Modo Demo
  useEffect(() => {
    async function loadTeacherData() {
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
            setTeacherName(`${session.first_name || 'Prof.'} ${session.last_name || 'Alejandro'}`)
          } catch (e) {
            console.error(e)
          }
        }
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // 1. Cargar perfil del docente
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profile) {
            setTeacherName(`${profile.first_name || 'Prof.'} ${profile.last_name || 'Docente'}`)
          }

          // 2. Cargar asignaturas creadas
          const { data: dbCourses } = await supabase
            .from('courses')
            .select('*')
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false })

          // (Se ha eliminado la lógica de fallback por gradeCounts)

          // 3b. Obtener el conteo de estudiantes inscritos por curso (student_courses)
          const enrollmentCounts: Record<string, number> = {}
          if (dbCourses && dbCourses.length > 0) {
            const { data: enrollData } = await supabase
              .from('student_courses')
              .select('course_id')
              .in('course_id', dbCourses.map(c => c.id))

            enrollData?.forEach((e: any) => {
              enrollmentCounts[e.course_id] = (enrollmentCounts[e.course_id] || 0) + 1
            })
          }

          // 3c. Obtener el conteo de módulos por curso
          const modulesCountMap: Record<string, number> = {}
          if (dbCourses && dbCourses.length > 0) {
            const { data: dbModules } = await supabase
              .from('course_modules')
              .select('course_id')
              .in('course_id', dbCourses.map(c => c.id))
            
            dbModules?.forEach((m: any) => {
              modulesCountMap[m.course_id] = (modulesCountMap[m.course_id] || 0) + 1
            })
          }

          const mappedCourses: Course[] = (dbCourses || []).map((c: any) => {
            let banner = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=300'
            const sub = (c.subject || 'Física').toLowerCase()
            if (sub.includes('matem')) banner = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=300'
            else if (sub.includes('fís')) banner = 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=300'
            else if (sub.includes('tec') || sub.includes('prog')) banner = 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=300'

            const studentsCount = enrollmentCounts[c.id] || 0

            return {
              id: c.id,
              title: c.title,
              subject: c.subject || 'General',
              studentsCount,
              modulesCount: modulesCountMap[c.id] || 0,
              bannerUrl: banner,
              joinCode: c.join_code || ''
            }
          })

          setCourses(mappedCourses)

          // 4. Intentos calificados y promedios históricos
          const courseIds = (dbCourses || []).map(c => c.id)
          let quizzesCount = 0
          let avgGrade = '0.0 / 5.0'
          const studentsCount = mappedCourses.reduce((acc, c) => acc + c.studentsCount, 0)

          if (courseIds.length > 0) {
            const { data: dbGrades } = await supabase
              .from('grades')
              .select('score, created_at, category_id, course_grade_categories(name)')
              .in('course_id', courseIds)

            if (dbGrades && dbGrades.length > 0) {
              // Contar solo las calificaciones que pertenecen a categorías de tipo Quiz
              quizzesCount = dbGrades.filter((g: any) => 
                g.course_grade_categories?.name?.toLowerCase().includes('quiz')
              ).length

              const sum = dbGrades.reduce((acc, g) => acc + Number(g.score), 0)
              avgGrade = `${(sum / dbGrades.length).toFixed(1)} / 5.0`

              // Formatear y agrupar datos del gráfico de evolución de notas real
              const sortedGrades = [...dbGrades].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              
              const dates = sortedGrades.map(g => new Date(g.created_at).getTime())
              const minDate = Math.min(...dates)
              const maxDate = Math.max(...dates)
              const diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24)

              const grouped: Record<string, { sum: number; count: number }> = {}

              sortedGrades.forEach(g => {
                const date = new Date(g.created_at)
                // Si la diferencia de días es mayor a 60 días, agrupamos por mes, si no, por día
                const key = diffDays > 60
                  ? date.toLocaleDateString('es-ES', { month: 'short' })
                  : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

                if (!grouped[key]) {
                  grouped[key] = { sum: 0, count: 0 }
                }
                grouped[key].sum += Number(g.score)
                grouped[key].count++
              })

              const realChartData = Object.entries(grouped).map(([name, val]) => ({
                name,
                promedio: parseFloat((val.sum / val.count).toFixed(2))
              }))

              setChartData(realChartData)
            } else {
              setChartData([])
            }
          } else {
            setChartData([])
          }

          setStats({
            coursesCount: dbCourses?.length || 0,
            studentsCount,
            quizzesCount,
            avgGrade
          })

          // Cargar próximos eventos institucionales
          try {
            const { getEvents } = await import('@/modules/institutional-agenda/application/actions')
            const allEvents = await getEvents()
            setUpcomingEvents(allEvents.slice(0, 5) || [])
          } catch (e) {
            console.error('Error cargando eventos de agenda en dashboard docente:', e)
          }
        }
      } catch (err) {
        console.error('Error cargando datos del docente en el dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTeacherData()
  }, [])

  // Validar y parsear URL de Youtube
  useEffect(() => {
    if (!youtubeUrl) {
      setYoutubeEmbedId(null)
      return
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = youtubeUrl.match(regExp)
    if (match && match[2].length === 11) {
      setYoutubeEmbedId(match[2])
    } else {
      setYoutubeEmbedId(null)
    }
  }, [youtubeUrl])



  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Solo se admiten documentos PDF.')
        return
      }
      setSelectedPdfName(file.name)
    }
  }

  const handleSaveLesson = () => {
    if (!lessonTitle.trim()) {
      toast.warning('La lección requiere un título.')
      return
    }
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success('¡Lección guardada exitosamente en el servidor (Modo Demo)!')
      // Limpiar formulario
      setLessonTitle('')
      setLessonContent('')
      setYoutubeUrl('')
      setSelectedPdfName(null)
      setSelectedCourseId(null)
    }, 1200)
  }

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-left">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-row items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              ¡Hola, {teacherName}!
            </h1>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/30 w-fit">
              Docente
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Aquí tienes el resumen y las herramientas de tus cursos activos.
          </p>
        </div>
      </div>

      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Cursos asignados', value: stats.coursesCount, icon: BookOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
          { title: 'Estudiantes activos', value: stats.studentsCount, icon: Users, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
          { title: 'Quizzes evaluados', value: stats.quizzesCount, icon: BrainCircuit, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
          { title: 'Rendimiento promedio', value: stats.avgGrade, icon: TrendingUp, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Secciones del Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Columna Izquierda: Cursos creados */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Mis materias
            </h2>
            {courses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900 shadow-sm">
                <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No tienes materias asignadas</h3>
                <p className="text-xs text-slate-550 dark:text-slate-400 max-w-sm mx-auto">
                  Crea tu primera asignatura con el botón de la esquina superior o solicita a un administrador que te asigne tus cursos correspondientes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 dark:border-slate-800/60 dark:bg-slate-900"
                  >
                    <div className="h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                      <img
                        src={course.bannerUrl}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                      <span className="absolute top-4 left-4 rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white">
                        {course.subject}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5 text-left">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {course.title}
                      </h3>
                      {course.joinCode ? (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                          <span>Código</span>
                          <span className="font-mono tracking-[0.18em]">{course.joinCode}</span>
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                        <span>👤 {course.studentsCount} Alumnos</span>
                        <span>📚 {course.modulesCount} Módulos</span>
                      </div>

                      <div className="mt-6 flex gap-2">
                        <Link
                          href={`/teacher/courses/${course.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Gestionar Curso</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Gráfico de Rendimiento & Próximas Actividades */}
        <div className="space-y-6 self-start">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900">
            <div className="pb-4 border-b border-slate-50 dark:border-slate-800/40 text-left">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Rendimiento Histórico Promedio
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Evolución de notas de estudiantes</p>
            </div>
            <div className="h-64 mt-4 w-full flex items-center justify-center">
              {chartData.length === 0 ? (
                <div className="text-center p-4">
                  <p className="text-xs font-semibold text-slate-400">Sin datos de calificaciones suficientes.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} domain={[1.0, 5.0]} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="promedio" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPromedio)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tarjeta Próximas Actividades */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 text-left">
            <div className="pb-4 border-b border-slate-50 dark:border-slate-800/40 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Próximas Actividades
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Agenda Institucional</p>
              </div>
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>

            <div className="mt-4 space-y-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No hay actividades próximas programadas.</p>
              ) : (
                upcomingEvents.map((event) => {
                  const dateStr = new Date(event.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  const timeStr = new Date(event.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
                  
                  return (
                    <div key={event.id} className="flex items-start justify-between border-b border-slate-50 dark:border-slate-850 pb-3 last:border-0 last:pb-0 font-medium">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{event.title}</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{dateStr} • {timeStr}</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
                        {event.event_categories?.name || 'General'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/40">
              <Link 
                href="/teacher/institutional-agenda"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <span>Ver Agenda Completa</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* Editor/Creador de Lecciones Estilo Notion */}
      <AnimatePresence>
        {selectedCourseId && selectedCourse && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:border-slate-800/60 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-800/40">
              <div className="text-left">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Editor Académico
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Diseñar Lección en: {selectedCourse.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCourseId(null)}
                className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Formulario Izquierda */}
              <div className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase dark:text-slate-500">
                    Título de la lección
                  </label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="Ej. Introducción a la Dinámica Estructural"
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase dark:text-slate-500">
                    Resumen de clase (Estilo Notion)
                  </label>
                  <textarea
                    rows={6}
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                    placeholder="Escribe el resumen conceptual de la lección. Soporta texto explicativo y fórmulas..."
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950/50"
                  />
                </div>

                {/* Subir PDF (Supabase Storage Mockup) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase dark:text-slate-500">
                    Material complementario (PDF)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/30 cursor-pointer transition-all">
                      <Upload className="h-4.5 w-4.5" />
                      <span>{selectedPdfName ? 'Cambiar PDF' : 'Seleccionar PDF'}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                      />
                    </label>
                    {selectedPdfName && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {selectedPdfName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Integración y Validación de YouTube Derecha */}
              <div className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase dark:text-slate-500 flex items-center gap-1.5">
                    <YoutubeIcon className="h-4 w-4 text-red-500 shrink-0" />
                    <span>Enlace de Video Instructivo (YouTube)</span>
                  </label>
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950/50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    El video no se almacena en el servidor, solo se extrae el ID para reproducción en el reproductor embebido.
                  </p>
                </div>

                {/* Previsualización del video en tiempo real */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase dark:text-slate-500">
                    Previsualización del reproductor
                  </label>
                  <div className="aspect-video w-full rounded-2xl border border-slate-200/60 bg-slate-950 overflow-hidden flex items-center justify-center relative dark:border-slate-800">
                    {youtubeEmbedId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeEmbedId}`}
                        title="Youtube Preview"
                        className="h-full w-full border-0"
                      />
                    ) : (
                      <div className="text-center p-6 text-slate-500">
                        <Play className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-55" />
                        <p className="text-xs font-medium">Ingresa un enlace válido de YouTube para previsualizar el reproductor.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveLesson}
                    disabled={isSaving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all px-6 py-3 text-sm font-semibold text-white"
                  >
                    {isSaving ? 'Guardando...' : 'Publicar Lección'}
                    <Save className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  )
}
