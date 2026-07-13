'use client'

import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Save, ChevronLeft, Clock, AlignLeft, Edit2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'

export function TeacherCreateEventScreen({ courseId, eventId }: { courseId: string, eventId?: string }) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    type: 'class',
    date: '',
    time: '',
    description: '',
  })

  useEffect(() => {
    if (eventId) {
      // Mock data for edit mode
      setFormData({
        title: 'Clase en Vivo: Cinemática',
        type: 'class',
        date: '2026-05-30',
        time: '10:00',
        description: '',
      })
    }
  }, [eventId])

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.warning('El título del evento es obligatorio.')
      return
    }
    if (!formData.date) {
      toast.warning('Debes seleccionar una fecha para el evento.')
      return
    }
    if (!formData.time) {
      toast.warning('Debes seleccionar una hora para el evento.')
      return
    }

    setIsSaving(true)
    try {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (!isDemoMode) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Combine date and time into a single ISO timestamp
        const due_date = new Date(`${formData.date}T${formData.time}:00`).toISOString()

        const payload = {
          title: formData.title.trim(),
          event_type: formData.type,
          due_date,
          course_id: courseId,
          description: formData.description.trim() || null,
          created_by: user?.id ?? null,
        }

        if (eventId) {
          const { error } = await supabase
            .from('calendars')
            .update(payload)
            .eq('id', eventId)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('calendars')
            .insert(payload)
          if (error) throw error
        }
      }

      toast.success(eventId ? 'Evento actualizado correctamente.' : 'Evento creado correctamente.')
      router.refresh()
      router.push(`/teacher/courses/${courseId}/calendar`)
    } catch (err: any) {
      console.error('Error guardando evento:', err)
      toast.error(err?.message || 'No se pudo guardar el evento. Intenta de nuevo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      {/* Cabecera */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-6 dark:border-slate-800/60">
        <div className="flex items-center gap-4">
          <Link 
            href={`/teacher/courses/${courseId}/calendar`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              {eventId ? <Edit2 className="h-5 w-5 text-amber-600 dark:text-amber-400" /> : <CalendarIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
              {eventId ? 'Editar Evento' : 'Nuevo Evento'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {eventId ? 'Modifica los detalles del evento existente.' : 'Programa clases, reuniones o fechas importantes.'}
            </p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{isSaving ? 'Guardando...' : 'Guardar Evento'}</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 space-y-8">
        
        <div className="space-y-4">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de Evento</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: 'class', label: 'Clase en Vivo', color: 'blue' },
              { id: 'assignment', label: 'Entrega / Tarea', color: 'emerald' },
              { id: 'quiz', label: 'Evaluación', color: 'purple' },
            ].map(t => (
              <label
                key={t.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                  formData.type === t.id 
                    ? `border-${t.color}-500 bg-${t.color}-50 ring-4 ring-${t.color}-500/10 dark:bg-${t.color}-900/20` 
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full bg-${t.color}-500`}></div>
                  <span className={`text-sm font-semibold ${formData.type === t.id ? `text-${t.color}-700 dark:text-${t.color}-400` : 'text-slate-700 dark:text-slate-300'}`}>
                    {t.label}
                  </span>
                </div>
                <input
                  type="radio"
                  name="eventType"
                  value={t.id}
                  checked={formData.type === t.id}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Título del Evento</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ej. Clase Magistral: Derivadas"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hora</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Descripción o Enlace</label>
          <div className="relative">
            <AlignLeft className="absolute left-3 top-4 h-4 w-4 text-slate-400" />
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Añade detalles, instrucciones o el enlace de Zoom/Meet."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-amber-500"
            />
          </div>
        </div>

      </div>
    </div>
  )
}
