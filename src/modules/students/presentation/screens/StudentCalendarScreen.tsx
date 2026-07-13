'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  ListTodo,
  CalendarCheck,
  CheckSquare,
  X
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'

interface CalendarEvent {
  id: string
  title: string
  description: string
  dueDate: Date
  courseName: string
  eventType: 'homework' | 'exam' | 'event'
  courseColor: string
}

interface Task {
  id: string
  title: string
  course: string
  dueDate: string
  urgency: 'Urgente' | 'Próximo' | 'Pendiente'
  description?: string
  completed: boolean
}

export function StudentCalendarScreen() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks'>('calendar')
  const [currentDate, setCurrentDate] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'homework' | 'exam' | 'event'>('all')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(true)

  // Mocks fallback for Demo Mode — always relative to TODAY
  const _today = new Date()
  const addDays = (base: Date, days: number, h = 18, m = 0) => {
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    d.setHours(h, m, 0, 0)
    return d
  }
  const mockEvents: CalendarEvent[] = [
    {
      id: 'evt-1',
      title: 'Taller: Leyes de Newton',
      description: 'Resolver ejercicios de la página 45 a la 50. Enviar en formato PDF con portada y procedimiento completo.',
      dueDate: addDays(_today, 0, 18, 0),
      courseName: 'Física I',
      eventType: 'homework',
      courseColor: 'bg-blue-500 text-blue-600 dark:text-blue-400'
    },
    {
      id: 'evt-2',
      title: 'Quiz 2: Funciones cuadráticas',
      description: 'Evaluación en línea de 5 preguntas sobre parábolas, raíces y vértice.',
      dueDate: addDays(_today, 1, 23, 59),
      courseName: 'Matemáticas I',
      eventType: 'exam',
      courseColor: 'bg-purple-500 text-purple-600 dark:text-purple-400'
    },
    {
      id: 'evt-3',
      title: 'Feria de Ciencias Institucional',
      description: 'Exposición anual de proyectos científicos del colegio en el patio principal.',
      dueDate: addDays(_today, 4, 9, 0),
      courseName: 'Evento General',
      eventType: 'event',
      courseColor: 'bg-emerald-500 text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'evt-4',
      title: 'Proyecto: Calculadora en Python',
      description: 'Crear un script de calculadora funcional con opciones de operaciones básicas y potencias en Python.',
      dueDate: addDays(_today, 7, 23, 59),
      courseName: 'Programación',
      eventType: 'homework',
      courseColor: 'bg-indigo-500 text-indigo-600 dark:text-indigo-400'
    },
    {
      id: 'evt-5',
      title: 'Examen Trimestral Inglés',
      description: 'Examen escrito y oral correspondiente al primer trimestre sobre gramática y comprensión lectora.',
      dueDate: addDays(_today, 10, 10, 30),
      courseName: 'Inglés I',
      eventType: 'exam',
      courseColor: 'bg-amber-500 text-amber-600 dark:text-amber-400'
    },
    {
      id: 'evt-6',
      title: 'Reunión de Padres y Profesores',
      description: 'Entrega de informes parciales de mitad de período académico.',
      dueDate: addDays(_today, 14, 16, 0),
      courseName: 'Evento General',
      eventType: 'event',
      courseColor: 'bg-emerald-500 text-emerald-600 dark:text-emerald-400'
    }
  ]

  const mockTasks: Task[] = [
    {
      id: 'tsk-1',
      title: 'Taller: Leyes de Newton',
      course: 'Física I',
      dueDate: 'Hoy, 6:00 PM',
      urgency: 'Urgente',
      description: 'Resolver ejercicios de la página 45 a la 50. Enviar en formato PDF con portada y procedimiento completo.',
      completed: false
    },
    {
      id: 'tsk-2',
      title: 'Quiz 2: Funciones cuadráticas',
      course: 'Matemáticas I',
      dueDate: 'Mañana, 11:59 PM',
      urgency: 'Próximo',
      description: 'Evaluación en línea de 5 preguntas sobre parábolas, raíces y vértice.',
      completed: false
    },
    {
      id: 'tsk-3',
      title: 'Proyecto: Calculadora en Python',
      course: 'Programación',
      dueDate: 'En 3 días, 11:59 PM',
      urgency: 'Próximo',
      description: 'Crear un script de calculadora funcional con opciones de operaciones básicas y potencias en Python.',
      completed: false
    },
    {
      id: 'tsk-4',
      title: 'Reading Comprehension Lesson',
      course: 'Inglés I',
      dueDate: 'En 6 días, 11:59 PM',
      urgency: 'Pendiente',
      description: 'Responder las preguntas asociadas al texto "The History of Language" provisto en el módulo 2.',
      completed: false
    },
    {
      id: 'tsk-5',
      title: 'Ensayo sobre Energía Cinética',
      course: 'Física I',
      dueDate: 'Entregado (En Calificación)',
      urgency: 'Pendiente',
      description: 'Redactar un ensayo crítico de 2 páginas sobre las aplicaciones industriales de la energía cinética.',
      completed: true
    }
  ]

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setTimeout(() => {
          setEvents(mockEvents)
          setTasks(mockTasks)
          setLoading(false)
        }, 600)
        return
      }

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // 1. Obtener perfil
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          // 2. Obtener cursos del grado del estudiante
          let dbCourses: any[] = []
          if (profile?.grade_level) {
            const { data } = await supabase
              .from('courses')
              .select('*')
              .eq('grade_level', profile.grade_level)
              .eq('status', 'active')
            dbCourses = data || []
          }

          const courseIds = dbCourses.map(c => c.id)

          // 3. Obtener eventos de calendario
          let query = supabase
            .from('calendars')
            .select('*, courses(title, subject)')

          if (courseIds.length > 0) {
            query = query.or(`course_id.in.(${courseIds.join(',')}),course_id.is.null`)
          } else {
            query = query.is('course_id', null)
          }

          const { data: dbEvents } = await query

          const mapDbEvent = (e: any): CalendarEvent => {
            const subject = (e.courses?.subject || 'general').toLowerCase()
            let color = 'bg-blue-500 text-blue-600 dark:text-blue-400'
            if (subject.includes('matem')) color = 'bg-purple-500 text-purple-600 dark:text-purple-400'
            else if (subject.includes('tec') || subject.includes('prog')) color = 'bg-emerald-500 text-emerald-600 dark:text-emerald-400'
            else if (subject.includes('ingl')) color = 'bg-amber-500 text-amber-600 dark:text-amber-400'

            return {
              id: e.id,
              title: e.title,
              description: e.description || 'Sin descripción adicional.',
              dueDate: new Date(e.due_date),
              courseName: e.courses?.title || 'Evento General',
              eventType: e.event_type || 'homework',
              courseColor: color
            }
          }

          const mappedEvents = (dbEvents || []).map(mapDbEvent)
          setEvents(mappedEvents)

          // 4. Mapear tareas a partir de los eventos
          const mappedTasks: Task[] = mappedEvents
            .filter(e => e.eventType === 'homework' || e.eventType === 'exam')
            .map(e => {
              const due = e.dueDate
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
                course: e.courseName,
                dueDate: formattedDate,
                urgency,
                description: e.description,
                completed: false
              }
            })
          setTasks(mappedTasks)
        }
      } catch (error) {
        console.error('Error al cargar datos de calendario:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Calendario Helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const year = prev.getMonth() === 0 ? prev.getFullYear() - 1 : prev.getFullYear()
      const month = prev.getMonth() === 0 ? 11 : prev.getMonth() - 1
      return new Date(year, month, 1)
    })
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const year = prev.getMonth() === 11 ? prev.getFullYear() + 1 : prev.getFullYear()
      const month = prev.getMonth() === 11 ? 0 : prev.getMonth() + 1
      return new Date(year, month, 1)
    })
  }

  const monthYearString = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
  const firstDayIndex = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth())

  const calendarCells: { date: Date | null; isCurrentMonth: boolean; hasEvent: boolean }[] = []

  // Rellenar días del mes anterior
  const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
  const daysInPrevMonth = getDaysInMonth(prevMonthDate.getFullYear(), prevMonthDate.getMonth())
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
      hasEvent: false
    })
  }

  // Rellenar días del mes actual
  for (let i = 1; i <= daysInMonth; i++) {
    const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
    const hasEvent = events.some(e => e.dueDate.toDateString() === cellDate.toDateString())
    calendarCells.push({
      date: cellDate,
      isCurrentMonth: true,
      hasEvent
    })
  }

  // Rellenar días del mes siguiente hasta completar múltiplos de 7 (42 celdas)
  const remainingCells = 42 - calendarCells.length
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i),
      isCurrentMonth: false,
      hasEvent: false
    })
  }

  const selectedDayEvents = events.filter(e => {
    const sameDate = e.dueDate.toDateString() === selectedDate.toDateString()
    const matchFilter = eventTypeFilter === 'all' || e.eventType === eventTypeFilter
    return sameDate && matchFilter
  })

  const currentMonthEvents = events.filter(e => {
    const isSameMonth = e.dueDate.getMonth() === currentDate.getMonth() && e.dueDate.getFullYear() === currentDate.getFullYear()
    const matchFilter = eventTypeFilter === 'all' || e.eventType === eventTypeFilter
    return isSameMonth && matchFilter
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mi Agenda
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestiona tus entregas, actividades y exámenes programados en un solo lugar.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        {[
          { id: 'calendar', name: 'Calendario Mensual', icon: CalendarIcon },
          { id: 'tasks', name: 'Ver Actividades', icon: ListTodo }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              {tab.name}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <CalendarIcon className="h-10 w-10 text-slate-300 animate-bounce" />
            <p className="text-sm font-medium text-slate-400">Cargando agenda escolar...</p>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'calendar' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Calendario Grid (2/3 de ancho) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                  {/* Navegación de Mes */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/40">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                      {monthYearString}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevMonth}
                        className="p-2 rounded-xl hover:bg-slate-55 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleNextMonth}
                        className="p-2 rounded-xl hover:bg-slate-55 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Días Cabecera */}
                  <div className="grid grid-cols-7 gap-y-2 mt-6 text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
                    <span>Lunes</span>
                    <span>Martes</span>
                    <span>Miércoles</span>
                    <span>Jueves</span>
                    <span>Viernes</span>
                    <span>Sábado</span>
                    <span>Domingo</span>
                  </div>

                  {/* Días Celdas */}
                  <div className="grid grid-cols-7 gap-1 mt-3">
                    {calendarCells.map((cell, index) => {
                      if (!cell.date) return <div key={index} className="aspect-square" />
                      const isSelected = cell.date.toDateString() === selectedDate.toDateString()
                      const isToday = cell.date.toDateString() === new Date().toDateString()

                      let cellClass = 'relative aspect-square flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-850 '
                      if (cell.isCurrentMonth) {
                        cellClass += 'text-slate-800 dark:text-slate-200 font-semibold '
                      } else {
                        cellClass += 'text-slate-350 dark:text-slate-700 font-medium '
                      }

                      if (isSelected) {
                        cellClass += 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md shadow-slate-950/10 hover:bg-slate-900 dark:hover:bg-white '
                      } else if (isToday) {
                        cellClass += 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 '
                      }

                      return (
                        <div
                          key={index}
                          onClick={() => cell.date && setSelectedDate(cell.date)}
                          className={cellClass}
                        >
                          <span className="text-sm">{cell.date.getDate()}</span>
                          
                          {cell.hasEvent && !isSelected && (
                            <span className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Filtros rápidos */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', name: 'Todos los eventos', count: currentMonthEvents.length, color: 'border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300 bg-white dark:bg-slate-900' },
                    { id: 'homework', name: 'Tareas', count: currentMonthEvents.filter(e => e.eventType === 'homework').length, color: 'border-blue-200 text-blue-700 dark:border-blue-900/30 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/10' },
                    { id: 'exam', name: 'Evaluaciones', count: currentMonthEvents.filter(e => e.eventType === 'exam').length, color: 'border-red-200 text-red-700 dark:border-red-900/30 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10' },
                    { id: 'event', name: 'Colegio', count: currentMonthEvents.filter(e => e.eventType === 'event').length, color: 'border-emerald-200 text-emerald-700 dark:border-emerald-900/30 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setEventTypeFilter(f.id as any)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer ${f.color} ${
                        eventTypeFilter === f.id ? 'ring-2 ring-blue-500/50' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span>{f.name}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-black/30 font-bold">
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Eventos del Día Seleccionado (1/3 de ancho) */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 h-full flex flex-col">
                  <div className="pb-4 border-b border-slate-100 dark:border-slate-800/40 mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Agenda del día
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">
                      {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 max-h-[360px] pr-1">
                    {selectedDayEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CalendarCheck className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Día libre de entregas</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                          No hay tareas, exámenes ni eventos programados para esta fecha.
                        </p>
                      </div>
                    ) : (
                      selectedDayEvents.map(evt => {
                        const isHomework = evt.eventType === 'homework'
                        const isExam = evt.eventType === 'exam'
                        const badgeColor = isHomework
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                          : isExam
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'

                        const isPast = evt.dueDate.getTime() < Date.now()

                        return (
                          <div
                            key={evt.id}
                            onClick={() => setSelectedEvent(evt)}
                            className="group p-4 rounded-2xl border border-slate-50 hover:border-slate-200/80 bg-slate-50/20 dark:border-slate-850 dark:bg-slate-850/20 cursor-pointer transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.01)] text-left"
                          >
                            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                              <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                {evt.eventType === 'homework' ? 'Tarea' : evt.eventType === 'exam' ? 'Examen' : 'Evento'}
                              </span>
                              {isPast && (
                                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  Finalizado
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                              {evt.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                              <BookOpen className="h-3 w-3" /> {evt.courseName}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {evt.dueDate.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Todas mis Actividades Pendientes
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tareas Pendientes */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="h-3.5 w-3.5 text-blue-500" /> Pendientes por entregar ({tasks.filter(t => !t.completed).length})
                  </h4>

                  {tasks.filter(t => !t.completed).length === 0 ? (
                    <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
                      <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white">¡Al día!</h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No tienes actividades pendientes por el momento.</p>
                    </div>
                  ) : (
                    tasks.filter(t => !t.completed).map((task, idx) => {
                      const urgencyColor =
                        task.urgency === 'Urgente'
                          ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400'
                          : task.urgency === 'Próximo'
                            ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400'
                            : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/40 dark:text-slate-400'

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                          className="flex flex-col p-5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200/80 transition-all dark:border-slate-800/60 dark:bg-slate-900 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-3">
                              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
                                <BookOpen className="h-4.5 w-4.5" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                                  {task.title}
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">{task.course}</p>
                              </div>
                            </div>
                            <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${urgencyColor}`}>
                              {task.urgency}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-350" /> Vence: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{task.dueDate}</strong>
                            </span>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </div>

                {/* Tareas Completadas */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> Entregadas / Completadas ({tasks.filter(t => t.completed).length})
                  </h4>

                  {tasks.filter(t => t.completed).length === 0 ? (
                    <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
                      <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-xs text-slate-550 dark:text-slate-455 mt-1">Aún no has completado actividades en este período.</p>
                    </div>
                  ) : (
                    tasks.filter(t => t.completed).map((task, idx) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className="flex flex-col p-5 rounded-2xl border border-slate-100 bg-white opacity-85 hover:opacity-100 transition-all dark:border-slate-800/60 dark:bg-slate-900 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
                              <CheckCircle className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-white text-base line-through">
                                {task.title}
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">{task.course}</p>
                            </div>
                          </div>
                          <span className="rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            Entregado
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-450 dark:text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">
                            Estado: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{task.dueDate}</strong>
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Modal / Drawer de Detalle de Evento */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="fixed inset-0 bg-black z-50 print:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 overflow-hidden text-left"
            >
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalle de actividad</span>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight mt-0.5">
                      {selectedEvent.title}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-slate-650 dark:text-slate-350">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/40">
                    <span className="text-[10px] text-slate-450 uppercase font-semibold">Curso / Materia</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${selectedEvent.courseColor.split(' ')[0]}`}></span>
                      {selectedEvent.courseName}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/40">
                    <span className="text-[10px] text-slate-450 uppercase font-semibold">Tipo Evento</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 capitalize flex items-center gap-2">
                      <span>{selectedEvent.eventType === 'homework' ? 'Tarea' : selectedEvent.eventType === 'exam' ? 'Evaluación' : 'Evento Colegio'}</span>
                      {selectedEvent.dueDate.getTime() < Date.now() && (
                        <span className="inline-flex items-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-450 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Finalizado
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/40">
                  <span className="text-[10px] text-slate-450 uppercase font-semibold">Fecha de entrega / Programación</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                    <Clock className="h-4.5 w-4.5 text-slate-400" />
                    {selectedEvent.dueDate.toLocaleString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-450 uppercase font-semibold">Instrucciones / Descripción</span>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-h-[120px] overflow-y-auto pr-1">
                    {selectedEvent.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-100 hover:bg-slate-55 dark:border-slate-800 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 text-sm font-semibold active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
