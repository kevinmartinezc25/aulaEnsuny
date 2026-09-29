'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { BookOpen, Users, BrainCircuit, FileText, Upload, Save, X, Edit, Eye, Play, Loader2, Calendar, Clock, CheckCircle2, Search, Filter } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { getTeacherDashboardOverview, TeacherDashboardCourse } from '@/modules/courses/application/teacherActions'

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

export interface TeacherDashboardProps {
  initialTeacherName?: string;
  initialCourses?: TeacherDashboardCourse[];
  initialStats?: any;
  initialTodaySchedule?: any[];
  initialNextClass?: any | null;
  initialIsWeekend?: boolean;
}

export function TeacherDashboardScreen(props: TeacherDashboardProps) {
  const [courses, setCourses] = useState<TeacherDashboardCourse[]>(props.initialCourses || [])
  const [teacherName, setTeacherName] = useState(props.initialTeacherName || 'Prof. Docente')
  const [loading, setLoading] = useState(!props.initialCourses)
  const [stats, setStats] = useState(props.initialStats || {
    coursesCount: 0,
    studentsCount: 0,
    quizzesCount: 0,
    avgGrade: '—'
  })
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [todaySchedule, setTodaySchedule] = useState<any[]>([])
  const [isWeekend, setIsWeekend] = useState(false)
  const [nextClass, setNextClass] = useState<any | null>(null)
  const [completedClasses, setCompletedClasses] = useState(0)
  const [totalClasses, setTotalClasses] = useState(0)

  // Filtros de Cursos
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('ALL')

  // Grados disponibles extraídos de los cursos
  const availableGrades = React.useMemo(() => {
    const grades = new Set<string>()
    courses.forEach((c) => {
      if (c.gradeLevel && c.gradeLevel.trim()) {
        grades.add(c.gradeLevel.trim())
      }
    })
    return Array.from(grades).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [courses])

  // Cursos filtrados
  const filteredCourses = React.useMemo(() => {
    return courses.filter((course) => {
      if (selectedGrade !== 'ALL') {
        const cGrade = (course.gradeLevel || '').trim().toLowerCase()
        if (cGrade !== selectedGrade.toLowerCase()) {
          return false
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchTitle = course.title?.toLowerCase().includes(query)
        const matchSubject = course.subject?.toLowerCase().includes(query)
        const matchGrade = course.gradeLevel?.toLowerCase().includes(query)
        const matchDescription = course.description?.toLowerCase().includes(query)
        const matchJoinCode = course.joinCode?.toLowerCase().includes(query)

        if (!matchTitle && !matchSubject && !matchGrade && !matchDescription && !matchJoinCode) {
          return false
        }
      }

      return true
    })
  }, [courses, selectedGrade, searchQuery])

  // Modales y Editores State
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // Editor de Lecciones State
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonContent, setLessonContent] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeEmbedId, setYoutubeEmbedId] = useState<string | null>(null)
  const [selectedPdfName, setSelectedPdfName] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Tabs
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'general' | 'virtual'>('general')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'virtual') {
      setActiveTab('virtual')
    } else if (tab === 'general') {
      setActiveTab('general')
    }
  }, [searchParams])

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
          if (!props.initialTeacherName) {
            // 1. Cargar perfil del docente
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()

            if (profile) {
              setTeacherName(`${profile.first_name || 'Prof.'} ${profile.last_name || 'Docente'}`)
            } else if (user.user_metadata) {
              setTeacherName(`${user.user_metadata.first_name || 'Prof.'} ${user.user_metadata.last_name || 'Docente'}`)
            }
          }

          if (!props.initialCourses) {
            // 2. Cargar asignaturas y métricas reales del Aula Virtual
            const overview = await getTeacherDashboardOverview()
            setCourses(overview.courses)
            setStats(overview.stats)
          }

          // 5. Cargar Horario de Hoy (usando datos iniciales del servidor)
          try {
            if (props.initialIsWeekend !== undefined) {
              setIsWeekend(props.initialIsWeekend)
            }
            if (props.initialTodaySchedule && props.initialTodaySchedule.length > 0) {
              const fullDaySlots = [...props.initialTodaySchedule]
              const now = new Date()
              const currentMinutes = now.getHours() * 60 + now.getMinutes()
              let next = null
              let completed = 0

              for (const cls of fullDaySlots) {
                if (cls.startTime && cls.startTime.includes(':')) {
                   const [sh, sm] = cls.startTime.split(':')
                   const startMins = parseInt(sh, 10) * 60 + parseInt(sm, 10)
                   
                   let endMins = startMins + 55
                   if (cls.endTime && cls.endTime.includes(':')) {
                     const [eh, em] = cls.endTime.split(':')
                     endMins = parseInt(eh, 10) * 60 + parseInt(em, 10)
                   }
                   
                   const isOngoing = currentMinutes >= startMins && currentMinutes <= endMins
                   cls.isCurrent = isOngoing

                   if (currentMinutes >= endMins) {
                     if (!cls.isFree) completed++
                   }
                   
                   if (currentMinutes < endMins && !next && !cls.isFree) {
                     next = { ...cls, isOngoing }
                   }
                }
              }
              
              setTodaySchedule(fullDaySlots)
              setNextClass(next || props.initialNextClass)
              setCompletedClasses(completed)
              setTotalClasses(fullDaySlots.filter(s => !s.isFree).length)
            }
          } catch(e) {
            console.error('Error procesando horario de hoy:', e)
          }

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
            Aquí tienes el resumen y las herramientas de tus clases activas.
          </p>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex space-x-6 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          Resumen General
        </button>
        <button
          onClick={() => setActiveTab('virtual')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'virtual' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          Aula Virtual
        </button>
      </div>

      {/* Pestaña: Resumen General */}
      {activeTab === 'general' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Próxima clase / Clase en Curso */}
            <div className={`col-span-1 sm:col-span-2 rounded-2xl border p-6 text-white transition-all duration-300 ${
              nextClass?.isOngoing
                ? 'border-emerald-500 bg-gradient-to-r from-emerald-600 to-teal-700 shadow-[0_8px_30px_rgba(16,185,129,0.3)]'
                : 'border-blue-500 bg-gradient-to-r from-blue-600 to-indigo-700 shadow-[0_8px_30px_rgba(59,130,246,0.3)]'
            }`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${
                nextClass?.isOngoing ? 'text-emerald-200' : 'text-blue-200'
              }`}>
                {nextClass?.isOngoing ? (
                  'Clase en Curso'
                ) : nextClass ? (
                  'Siguiente Clase'
                ) : (
                  'Sin Asignación de Clases'
                )}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/20">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">
                    {nextClass ? nextClass.subject : 'Sin clases pendientes'}
                  </h3>
                  <p className={`text-sm font-medium ${
                    nextClass?.isOngoing ? 'text-emerald-100' : 'text-blue-100'
                  }`}>
                    {nextClass 
                      ? `${nextClass.startTime}${nextClass.endTime ? ` - ${nextClass.endTime}` : ''} • Grupo ${nextClass.group}` 
                      : (isWeekend ? 'Día libre por fin de semana' : 'Jornada completada o sin asignaciones hoy')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Progreso de Jornada */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                <Clock className="h-28 w-28 text-slate-900 dark:text-white" />
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Progreso de Hoy</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {completedClasses} <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">/ {totalClasses}</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5 dark:bg-slate-800 relative z-10">
                <div 
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" 
                  style={{ width: `${totalClasses > 0 ? (completedClasses / totalClasses) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Horario de Hoy */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 text-left">
              <div className="pb-4 border-b border-slate-50 dark:border-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Horario de Hoy</h3>
                    <span className="text-xs font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-3 py-1 rounded-full capitalize">
                      {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    {todaySchedule.length > 0 && todaySchedule[0].isNovedad && (
                      <span className="text-xs font-bold uppercase tracking-wide text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-3 py-1 rounded-full">
                        Novedad
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Clases presenciales del día</p>
                </div>
                <Calendar className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="mt-4 space-y-2.5">
                {isWeekend ? (
                  <div className="text-center py-6">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Hoy es fin de semana, no tienes clases programadas.</p>
                  </div>
                ) : todaySchedule.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No tienes clases asignadas para el día de hoy.</p>
                  </div>
                ) : (
                  todaySchedule.map((cls, idx) => {
                    const isLast = idx === todaySchedule.length - 1
                    return (
                      <div key={cls.id}>
                        {cls.isFree ? (
                          <div className="rounded-xl bg-transparent border border-dashed border-slate-200 dark:border-slate-800 p-2.5 px-4 flex items-center justify-between">
                            <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500 italic">Sin Clase Asignada</p>
                            <div className="text-right">
                              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{cls.period}ª Hora</p>
                              <p className="text-[10px] font-medium text-slate-400 mt-0.5">{cls.startTime}{cls.endTime ? ` - ${cls.endTime}` : ''}</p>
                            </div>
                          </div>
                        ) : (
                          <div className={`rounded-xl p-2.5 px-4 border-l-4 transition-colors flex items-center justify-between ${
                            cls.isCurrent
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{cls.subject}</h4>
                                {cls.isCurrent && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                    En curso
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <Users className="h-3 w-3 text-slate-400" /> Grupo {cls.group}
                              </p>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">{cls.period}ª Hora</p>
                              <p className="text-[10px] font-medium text-slate-500 mt-0.5">{cls.startTime}{cls.endTime ? ` - ${cls.endTime}` : ''}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Próximas Actividades */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 text-left">
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
      )}

      {/* Pestaña: Aula Virtual */}
      {activeTab === 'virtual' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Grid de Estadísticas (Pequeño Dashboard con Datos Reales) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-5">
            {[
              { title: 'Cursos virtuales', value: stats.coursesCount, icon: BookOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
              { title: 'Alumnos virtuales', value: stats.studentsCount, icon: Users, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
              { title: 'Quizzes evaluados', value: stats.quizzesCount, icon: BrainCircuit, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
            ].map((stat, idx) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.title}
                  className={`rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 ${
                    idx === 2 ? 'col-span-2 sm:col-span-1' : ''
                  }`}
                >
                  <div className="flex flex-row items-center gap-2.5 sm:gap-4">
                    <div className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl ${stat.color} shrink-0`}>
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                        {stat.title}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Listado de Cursos */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Mis Cursos
                </h2>
                {courses.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {filteredCourses.length}{filteredCourses.length !== courses.length ? ` de ${courses.length}` : ''} {courses.length === 1 ? 'curso' : 'cursos'}
                  </span>
                )}
              </div>

              {/* Filtros: Búsqueda y Grado */}
              {courses.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  {/* Buscador */}
                  <div className="relative flex-1 min-w-[170px] sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar curso o materia..."
                      className="w-full pl-8.5 pr-8 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-all shadow-xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Selector de Grado */}
                  {availableGrades.length > 0 && (
                    <div className="relative min-w-[130px] sm:w-44">
                      <select
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-all shadow-xs cursor-pointer"
                      >
                        <option value="ALL">Todos los grados</option>
                        {availableGrades.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade.toLowerCase().includes('grado') ? grade : `${grade} Grado`}
                          </option>
                        ))}
                      </select>
                      <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  )}

                  {/* Botón de limpiar filtros cuando hay filtros activos */}
                  {(searchQuery || selectedGrade !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedGrade('ALL')
                      }}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              )}
            </div>

            {courses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
                <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No tienes cursos virtuales asignados</p>
                <p className="text-xs text-slate-400 mt-1">Los cursos asignados o creados para tus materias aparecerán aquí.</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
                <Search className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No se encontraron cursos</p>
                <p className="text-xs text-slate-400 mt-1">No hay cursos que coincidan con la búsqueda o el grado seleccionado.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedGrade('ALL')
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-6">
                {filteredCourses.map((course) => {
                  const gradeText = course.gradeLevel
                    ? course.gradeLevel.toLowerCase().includes('grado')
                      ? course.gradeLevel
                      : `${course.gradeLevel} Grado`
                    : null

                  return (
                    <div
                      key={course.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900 text-left"
                    >
                      <div className="space-y-2 sm:space-y-2.5">
                        {/* Badges superiores: Grado (destacado) y Materia */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {gradeText && (
                            <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                              {gradeText}
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                            {course.subject}
                          </span>
                        </div>

                        {/* Nombre del curso con gran énfasis */}
                        <h3
                          className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                          title={course.title}
                        >
                          {course.title}
                        </h3>

                        {/* Descripción del curso */}
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                          {course.description || 'Sin descripción disponible para este curso.'}
                        </p>

                        {/* Código de acceso */}
                        {course.joinCode ? (
                          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[9px] sm:text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 w-fit">
                            <span className="hidden sm:inline uppercase tracking-wider text-slate-400 font-bold">Código</span>
                            <span className="font-mono tracking-wider font-bold">{course.joinCode}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Metadatos y Botón inferior */}
                      <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 sm:space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-xs text-slate-500 font-medium dark:text-slate-400 gap-1 sm:gap-0">
                          <span className="flex items-center gap-1 truncate">
                            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-slate-400" />
                            <span>{course.studentsCount} <span className="hidden sm:inline">Alumnos</span><span className="sm:hidden">alum.</span></span>
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-slate-400" />
                            <span>{course.modulesCount} <span className="hidden sm:inline">Módulos</span><span className="sm:hidden">mód.</span></span>
                          </span>
                        </div>

                        <Link
                          href={`/teacher/courses/${course.slug || course.id}`}
                          className="w-full flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-slate-900 px-2.5 py-2 sm:px-3 sm:py-2.5 text-[11px] sm:text-xs font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs"
                        >
                          <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                          <span className="sm:hidden">Gestionar</span>
                          <span className="hidden sm:inline">Gestionar Curso</span>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
