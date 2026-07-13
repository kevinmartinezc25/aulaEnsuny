'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar as CalendarIcon, Clock, BookOpen, ChevronRight } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  type: string
  color: string
  courseTitle?: string
  courseId?: string
  due_date?: string
}

const DEMO_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Quiz Leyes de Newton', date: 'Hoy', time: '23:59', type: 'evaluation', color: 'bg-purple-500', courseTitle: 'Física I', courseId: 'fisica-1', due_date: new Date(new Date().setHours(23, 59, 0, 0)).toISOString() },
  { id: '2', title: 'Clase en Vivo: Cinemática', date: 'Mañana', time: '10:00 AM', type: 'class', color: 'bg-blue-500', courseTitle: 'Física I', courseId: 'fisica-1', due_date: new Date(Date.now() + 86400000).toISOString() },
  { id: '3', title: 'Entrega de Laboratorio', date: '15 Sep', time: '23:59', type: 'assignment', color: 'bg-emerald-500', courseTitle: 'Matemáticas I', courseId: 'mate-1', due_date: new Date('2026-09-15T23:59:00Z').toISOString() },
]

const TYPE_LABELS: Record<string, string> = {
  class: 'Clase',
  evaluation: 'Evaluación',
  exam: 'Examen',
  homework: 'Tarea',
  assignment: 'Entrega',
  quiz: 'Quiz',
}

export function TeacherCalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const isDemoMode =
          !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

        if (isDemoMode) {
          setEvents(DEMO_EVENTS)
          setLoading(false)
          return
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        // Fetch teacher's courses first
        const { data: courses } = await supabase
          .from('courses')
          .select('id, title')
          .eq('teacher_id', user.id)

        const courseIds = (courses || []).map((c: any) => c.id)
        const courseMap: Record<string, string> = {}
        ;(courses || []).forEach((c: any) => { courseMap[c.id] = c.title })

        if (courseIds.length === 0) {
          setEvents([])
          setLoading(false)
          return
        }

        const { data: dbEvents } = await supabase
          .from('calendars')
          .select('*')
          .in('course_id', courseIds)
          .order('due_date', { ascending: true })

        if (dbEvents) {
          const mapped: CalendarEvent[] = dbEvents.map((e: any) => {
            let color = 'bg-blue-500'
            if (e.event_type === 'exam' || e.event_type === 'evaluation' || e.event_type === 'quiz') color = 'bg-purple-500'
            else if (e.event_type === 'homework' || e.event_type === 'assignment') color = 'bg-emerald-500'

            const d = new Date(e.due_date)
            const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
            const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

            return {
              id: e.id,
              title: e.title,
              date: dateStr,
              time: timeStr,
              type: e.event_type,
              color,
              courseTitle: courseMap[e.course_id] || 'Curso',
              courseId: e.course_id,
              due_date: e.due_date,
            }
          })
          setEvents(mapped)
        }
      } catch (err) {
        console.error('Error cargando eventos del docente:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <CalendarIcon className="h-5 w-5" />
          </div>
          Calendario
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Todos los eventos y fechas importantes de tus cursos.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Próximos Eventos</h3>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
              <CalendarIcon className="h-7 w-7 text-slate-400 dark:text-slate-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No hay eventos programados</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Crea eventos desde la sección <strong>Calendario</strong> dentro de cada curso.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-8 pb-4">
            {events.map((event) => (
              <div key={event.id} className="relative pl-8">
                {/* Timeline dot */}
                <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-4 border-white dark:border-slate-900 ${event.color}`} />

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{event.title}</h4>
                      {event.due_date && new Date(event.due_date).getTime() < Date.now() && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Finalizado
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{event.date}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {event.time}
                      </div>
                      {event.type && (
                        <>
                          <span>•</span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {TYPE_LABELS[event.type] ?? event.type}
                          </span>
                        </>
                      )}
                    </div>
                    {event.courseTitle && event.courseId && (
                      <Link
                        href={`/teacher/courses/${event.courseId}/calendar`}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        <BookOpen className="h-3 w-3" />
                        {event.courseTitle}
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
