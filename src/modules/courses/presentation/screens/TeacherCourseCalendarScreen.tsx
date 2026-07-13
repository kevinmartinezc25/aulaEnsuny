'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar as CalendarIcon, Clock, MoreVertical, Plus, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/core/config/supabase/client'

const TYPE_LABELS: Record<string, string> = {
  class: 'Clase',
  evaluation: 'Evaluación',
  exam: 'Examen',
  homework: 'Tarea',
  assignment: 'Entrega',
  quiz: 'Quiz',
}

const DEMO_EVENTS = [
  { id: '1', title: 'Clase en Vivo: Cinemática', date: '30 May', time: '10:00', type: 'class', color: 'bg-blue-500', due_date: '2026-05-30T10:00:00Z' },
  { id: '2', title: 'Quiz Leyes de Newton', date: '15 Jun', time: '23:59', type: 'quiz', color: 'bg-purple-500', due_date: '2026-06-15T23:59:00Z' },
  { id: '3', title: 'Entrega de Laboratorio', date: '20 Jun', time: '23:59', type: 'assignment', color: 'bg-emerald-500', due_date: '2026-06-20T23:59:00Z' },
]

export function TeacherCourseCalendarScreen({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    if (openDropdownId) {
      window.addEventListener('click', handleClickOutside)
    }
    return () => window.removeEventListener('click', handleClickOutside)
  }, [openDropdownId])

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

        if (isDemoMode) {
          setEvents(DEMO_EVENTS)
          setLoading(false)
          return
        }

        const supabase = createClient()
        const { data: dbEvents, error } = await supabase
          .from('calendars')
          .select('*')
          .eq('course_id', courseId)
          .order('due_date', { ascending: true })

        if (error) throw error

        if (dbEvents) {
          const mapped = dbEvents.map((e: any) => {
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
              due_date: e.due_date,
            }
          })
          setEvents(mapped)
        }
      } catch (err) {
        console.error('Error cargando eventos del calendario:', err)
        toast.error('No se pudieron cargar los eventos del curso.')
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [courseId])

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este evento?')) return
    try {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (!isDemoMode) {
        const supabase = createClient()
        const { error } = await supabase.from('calendars').delete().eq('id', id)
        if (error) throw error
      }
      toast.success('Evento eliminado correctamente.')
      setEvents(prev => prev.filter(e => e.id !== id))
    } catch (err: any) {
      console.error('Error al eliminar evento:', err)
      toast.error('No se pudo eliminar el evento.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-6 dark:border-slate-800/60">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <CalendarIcon className="h-5 w-5" />
            </div>
            Calendario del Curso
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Cronograma de clases, entregas y evaluaciones para este curso.
          </p>
        </div>
        <Link 
          href={`/teacher/courses/${courseId}/calendar/new`}
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 active:scale-[0.98] transition-all shadow-sm self-start sm:self-center decoration-none"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Nuevo Evento</span>
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Eventos del Curso</h3>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
              <CalendarIcon className="h-7 w-7 text-slate-400 dark:text-slate-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No hay eventos programados</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Comienza programando un evento utilizando el botón "Nuevo Evento".
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-8 pb-4">
            {events.map((event) => {
              const isPast = event.due_date ? new Date(event.due_date).getTime() < Date.now() : false
              return (
                <div key={event.id} className="relative pl-8">
                  <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-4 border-white dark:border-slate-900 ${event.color}`} />

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{event.title}</h4>
                        {isPast && (
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
                    </div>
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenDropdownId(openDropdownId === event.id ? null : event.id)
                        }}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors self-start dark:hover:bg-slate-800 dark:hover:text-slate-300 border-none bg-transparent cursor-pointer"
                      >
                        <MoreVertical className="h-5 w-5 pointer-events-none" />
                      </button>

                      {openDropdownId === event.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-white shadow-lg border border-slate-100 dark:border-slate-800 dark:bg-slate-900 z-10 py-1" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => { router.push(`/teacher/courses/${courseId}/calendar/${event.id}/edit`); setOpenDropdownId(null); }}
                            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 border-none bg-transparent cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                            Editar
                          </button>
                          <button 
                            onClick={() => { handleDeleteEvent(event.id); setOpenDropdownId(null); }}
                            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800 border-none bg-transparent cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
