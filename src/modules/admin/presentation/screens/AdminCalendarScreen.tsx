'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, BookOpen,
  CheckCircle, Plus, Trash2, Edit, X, Save, AlertCircle, Loader2
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'

interface Course {
  id: string
  title: string
  subject: string
}

interface CalendarEvent {
  id: string
  title: string
  description: string
  dueDate: Date
  courseId: string | null
  courseName: string
  eventType: 'homework' | 'exam' | 'event'
}

export function AdminCalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 30)) // Default to May 2026 matching mocks
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 4, 30))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '2026-05-30',
    time: '12:00',
    courseId: '',
    eventType: 'event' as 'homework' | 'exam' | 'event'
  })
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const mockCourses: Course[] = [
    { id: 'c-1', title: 'Física I - A', subject: 'Física' },
    { id: 'c-2', title: 'Matemáticas I - A', subject: 'Matemáticas' },
    { id: 'c-3', title: 'Programación - A', subject: 'Programación' },
    { id: 'c-4', title: 'Inglés I - B', subject: 'Inglés' }
  ]

  const mockEvents: CalendarEvent[] = [
    { id: 'evt-1', title: 'Taller: Leyes de Newton', description: 'Resolver ejercicios de la página 45 a la 50.', dueDate: new Date(2026, 4, 30, 18, 0), courseId: 'c-1', courseName: 'Física I - A', eventType: 'homework' },
    { id: 'evt-2', title: 'Quiz 2: Funciones cuadráticas', description: 'Evaluación de parábolas y vértices.', dueDate: new Date(2026, 4, 31, 23, 59), courseId: 'c-2', courseName: 'Matemáticas I - A', eventType: 'exam' },
    { id: 'evt-3', title: 'Feria de Ciencias Institucional', description: 'Exposición anual de proyectos en el patio.', dueDate: new Date(2026, 4, 25, 9, 0), courseId: null, courseName: 'Evento General', eventType: 'event' },
    { id: 'evt-4', title: 'Reunión de Padres y Profesores', description: 'Entrega de informes parciales de mitad de período.', dueDate: new Date(2026, 4, 15, 16, 0), courseId: null, courseName: 'Evento General', eventType: 'event' }
  ]

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setTimeout(() => {
          setEvents(mockEvents)
          setCourses(mockCourses)
          setLoading(false)
        }, 500)
        return
      }

      try {
        const supabase = createClient()
        // Cursos
        const { data: dbCourses } = await supabase.from('courses').select('id, title, subject')
        setCourses(dbCourses || [])

        // Eventos
        const { data: dbEvents, error } = await supabase
          .from('calendars')
          .select('*, courses(title, subject)')

        if (error) throw error

        const mapped: CalendarEvent[] = (dbEvents || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description || '',
          dueDate: new Date(e.due_date),
          courseId: e.course_id,
          courseName: e.courses?.title || 'Evento General',
          eventType: e.event_type || 'event'
        }))

        setEvents(mapped)
      } catch (err) {
        console.error('Error loading calendar data:', err)
        setEvents(mockEvents)
        setCourses(mockCourses)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Calendario Helpers
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = useMemo(() => {
    const date = new Date(year, month + 1, 0)
    return date.getDate()
  }, [year, month])

  const firstDayIndex = useMemo(() => {
    const date = new Date(year, month, 1)
    // getDay() retorna 0 para Domingo, convertimos para que Lunes sea 0
    const day = date.getDay()
    return day === 0 ? 6 : day - 1
  }, [year, month])

  const prevMonthDays = useMemo(() => {
    const date = new Date(year, month, 0)
    return date.getDate()
  }, [year, month])

  const calendarCells = useMemo(() => {
    const cells: { date: Date; isCurrentMonth: boolean }[] = []

    // Días del mes anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      })
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }

    // Días del mes siguiente para completar la grilla (múltiplo de 7)
    const remaining = 42 - cells.length
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }

    return cells;
  }, [year, month, daysInMonth, firstDayIndex, prevMonthDays])

  // Filtrado de eventos para la fecha seleccionada
  const selectedDateEvents = useMemo(() => {
    return events.filter(evt => {
      const d = evt.dueDate
      return d.getDate() === selectedDate.getDate() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getFullYear() === selectedDate.getFullYear()
    })
  }, [events, selectedDate])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const openCreate = () => {
    setEditingEvent(null)
    const dateStr = selectedDate.toISOString().split('T')[0]
    setForm({
      title: '',
      description: '',
      date: dateStr,
      time: '12:00',
      courseId: '',
      eventType: 'event'
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const openEdit = (e: CalendarEvent) => {
    setEditingEvent(e)
    const dateStr = e.dueDate.toISOString().split('T')[0]
    const hrs = String(e.dueDate.getHours()).padStart(2, '0')
    const mins = String(e.dueDate.getMinutes()).padStart(2, '0')
    setForm({
      title: e.title,
      description: e.description,
      date: dateStr,
      time: `${hrs}:${mins}`,
      courseId: e.courseId || '',
      eventType: e.eventType
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      setErrorMsg('El título del evento es requerido.')
      return
    }

    setIsSaving(true)
    setErrorMsg('')

    const combinedDateTime = new Date(`${form.date}T${form.time}`)
    const selectedCourse = courses.find(c => c.id === form.courseId)
    const courseName = selectedCourse ? selectedCourse.title : 'Evento General'

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode) {
      setTimeout(() => {
        if (editingEvent) {
          setEvents(events.map(evt => evt.id === editingEvent.id ? {
            ...evt,
            title: form.title,
            description: form.description,
            dueDate: combinedDateTime,
            courseId: form.courseId || null,
            courseName,
            eventType: form.eventType
          } : evt))
          setSuccessMsg('Evento actualizado con éxito.')
        } else {
          const newEvt: CalendarEvent = {
            id: `evt-${Date.now()}`,
            title: form.title,
            description: form.description,
            dueDate: combinedDateTime,
            courseId: form.courseId || null,
            courseName,
            eventType: form.eventType
          }
          setEvents([...events, newEvt])
          setSuccessMsg('Evento agendado con éxito.')
        }
        setIsSaving(false)
        setIsModalOpen(false)
        setTimeout(() => setSuccessMsg(''), 3000)
      }, 500)
      return
    }

    try {
      const supabase = createClient()
      const payload = {
        title: form.title,
        description: form.description,
        due_date: combinedDateTime.toISOString(),
        course_id: form.courseId || null,
        event_type: form.eventType
      }

      if (editingEvent) {
        const { error } = await supabase
          .from('calendars')
          .update(payload)
          .eq('id', editingEvent.id)

        if (error) throw error

        setEvents(events.map(evt => evt.id === editingEvent.id ? {
          ...evt,
          title: form.title,
          description: form.description,
          dueDate: combinedDateTime,
          courseId: form.courseId || null,
          courseName,
          eventType: form.eventType
        } : evt))
        setSuccessMsg('Evento actualizado en base de datos.')
      } else {
        const { data, error } = await supabase
          .from('calendars')
          .insert([payload])
          .select('id')
          .single()

        if (error) throw error

        const newEvt: CalendarEvent = {
          id: data.id,
          title: form.title,
          description: form.description,
          dueDate: combinedDateTime,
          courseId: form.courseId || null,
          courseName,
          eventType: form.eventType
        }
        setEvents([...events, newEvt])
        setSuccessMsg('Evento agendado en la base de datos.')
      }
      setIsModalOpen(false)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el evento.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este evento institucional?')) return

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode) {
      setEvents(events.filter(evt => evt.id !== id))
      setSuccessMsg('Evento eliminado.')
      setTimeout(() => setSuccessMsg(''), 3000)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from('calendars').delete().eq('id', id)
      if (error) throw error
      setEvents(events.filter(evt => evt.id !== id))
      setSuccessMsg('Evento eliminado de base de datos.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      alert('Error al eliminar evento: ' + err.message)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Calendario Escolar
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestiona eventos globales, fechas límite de tareas y evaluaciones de la institución.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-sm font-semibold active:scale-[0.98] transition-all self-start sm:self-center cursor-pointer shadow-sm"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Crear Evento</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-55 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Agenda Lateral */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm space-y-5">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Agenda del Día</h3>
              <p className="text-xs text-slate-450 mt-0.5">
                {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <CalendarIcon className="h-8 w-8 text-slate-350 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-450">No hay eventos agendados.</p>
                </div>
              ) : (
                selectedDateEvents.map(evt => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 space-y-3 relative group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                          evt.eventType === 'homework' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400' :
                          evt.eventType === 'exam' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-400' :
                          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                        }`}>
                          {evt.eventType === 'homework' ? 'Tarea' : evt.eventType === 'exam' ? 'Examen' : 'Evento'}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1.5">{evt.title}</h4>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => openEdit(evt)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-500"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(evt.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{evt.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100/50 dark:border-slate-800/50">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {evt.dueDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {evt.courseName}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Grilla del Calendario */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col">
            {/* Controles de Navegación del Mes */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
                <span>{monthNames[month]} {year}</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 cursor-pointer"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 cursor-pointer"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-450 uppercase mb-2">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>

            {/* Grilla de Celdas */}
            <div className="grid grid-cols-7 gap-1 border-t border-slate-100 dark:border-slate-800 pt-2 flex-1">
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.date.getDate() === selectedDate.getDate() &&
                  cell.date.getMonth() === selectedDate.getMonth() &&
                  cell.date.getFullYear() === selectedDate.getFullYear()

                const dayEvents = events.filter(evt => {
                  const d = evt.dueDate
                  return d.getDate() === cell.date.getDate() &&
                    d.getMonth() === cell.date.getMonth() &&
                    d.getFullYear() === cell.date.getFullYear()
                })

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`min-h-[72px] p-2 text-left rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                      cell.isCurrentMonth
                        ? 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border-slate-100 dark:border-slate-800/60'
                        : 'bg-slate-50/40 text-slate-350 dark:bg-slate-950/20 border-transparent dark:text-slate-700'
                    } ${
                      isSelected
                        ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/10 dark:bg-blue-950/10'
                        : ''
                    }`}
                  >
                    <span className={`text-xs font-bold ${cell.isCurrentMonth ? 'text-slate-800 dark:text-slate-200' : 'text-slate-350 dark:text-slate-650'}`}>{cell.date.getDate()}</span>

                    {/* Indicadores de Eventos */}
                    <div className="space-y-0.5 mt-1 w-full overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt, eIdx) => (
                        <div
                          key={eIdx}
                          className={`text-[8px] font-bold px-1 py-0.5 rounded truncate ${
                            evt.eventType === 'homework' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                            evt.eventType === 'exam' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {evt.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[7px] text-slate-400 font-bold text-center">
                          +{dayEvents.length - 2} más
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  {editingEvent ? 'Editar Evento Institucional' : 'Agendar Nuevo Evento'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Título del Evento</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Ej: Quiz de Física o Reunión General"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Detalles del evento escolar..."
                    rows={3}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Fecha</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Hora</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={e => setForm({ ...form, time: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Tipo de Evento</label>
                    <select
                      value={form.eventType}
                      onChange={e => setForm({ ...form, eventType: e.target.value as any })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                    >
                      <option value="event">Evento General</option>
                      <option value="homework">Tarea Escolar</option>
                      <option value="exam">Examen / Quiz</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Curso Vinculado</label>
                    <select
                      value={form.courseId}
                      onChange={e => setForm({ ...form, courseId: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                    >
                      <option value="">Ninguno (Evento General)</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-850 font-semibold text-xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Save className="h-4.5 w-4.5" />}
                  <span>{editingEvent ? 'Actualizar Evento' : 'Agendar Evento'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
