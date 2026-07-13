'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Send, Trash2, ShieldAlert, CheckCircle, AlertTriangle, Info, Search, Filter, Loader2, RefreshCw
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'

interface SystemNotification {
  id: string
  title: string
  message: string
  targetRole: 'all' | 'student' | 'teacher' | 'admin'
  priority: 'low' | 'medium' | 'high'
  sentDate: string
  readsCount: number
}

export function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')

  // Form State
  const [form, setForm] = useState({
    title: '',
    message: '',
    targetRole: 'all' as 'all' | 'student' | 'teacher' | 'admin',
    priority: 'low' as 'low' | 'medium' | 'high'
  })
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const mockNotifications: SystemNotification[] = [
    { id: 'not-1', title: 'Feria de Ciencias 2026', message: 'Se convoca a todos los estudiantes y docentes a participar del evento científico anual en el patio principal.', targetRole: 'all', priority: 'medium', sentDate: '2026-05-29 10:15', readsCount: 112 },
    { id: 'not-2', title: 'Mantenimiento del Servidor', message: 'La plataforma aulaEnsuny estará fuera de línea por mantenimiento técnico el domingo 31 de mayo de 02:00 a 04:00 AM.', targetRole: 'all', priority: 'high', sentDate: '2026-05-28 16:40', readsCount: 145 },
    { id: 'not-3', title: 'Capacitación Pedagógica Híbrida', message: 'Reunión de docentes el viernes a las 3:00 PM para revisar las nuevas metodologías interactivas y rúbricas.', targetRole: 'teacher', priority: 'high', sentDate: '2026-05-27 09:00', readsCount: 22 },
    { id: 'not-4', title: 'Cierre del Primer Trimestre Escolar', message: 'Recordatorio a los alumnos de grado 11° de cargar sus trabajos de grado antes del lunes.', targetRole: 'student', priority: 'medium', sentDate: '2026-05-25 14:00', readsCount: 88 }
  ]

  useEffect(() => {
    async function loadNotifications() {
      setLoading(true)
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setTimeout(() => {
          setNotifications(mockNotifications)
          setLoading(false)
        }, 500)
        return
      }

      try {
        const supabase = createClient()
        const { data: dbNotifications, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('La tabla notifications no está configurada.')
          setNotifications([])
        } else {
          const mapped: SystemNotification[] = (dbNotifications || []).map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            targetRole: n.target_role || 'all',
            priority: n.priority || 'low',
            sentDate: new Date(n.created_at).toISOString().replace('T', ' ').slice(0, 16),
            readsCount: n.reads_count || 0
          }))
          setNotifications(mapped)
        }
      } catch (err) {
        console.error('Error al cargar notificaciones:', err)
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }
    loadNotifications()
  }, [])

  const filteredNotifications = useMemo(() => {
    return notifications.filter(not => {
      const matchSearch = not.title.toLowerCase().includes(search.toLowerCase()) ||
        not.message.toLowerCase().includes(search.toLowerCase())
      const matchRole = filterRole === 'all' || not.targetRole === filterRole
      return matchSearch && matchRole
    })
  }, [notifications, search, filterRole])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) {
      setErrorMsg('El título y mensaje del comunicado son requeridos.')
      return
    }

    setIsSending(true)
    setErrorMsg('')

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode) {
      setTimeout(() => {
        const newNot: SystemNotification = {
          id: `not-${Date.now()}`,
          title: form.title,
          message: form.message,
          targetRole: form.targetRole,
          priority: form.priority,
          sentDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
          readsCount: 0
        }
        setNotifications([newNot, ...notifications])
        setForm({ title: '', message: '', targetRole: 'all', priority: 'low' })
        setSuccessMsg('Comunicado enviado y registrado con éxito (Modo Demo).')
        setIsSending(false)
        setTimeout(() => setSuccessMsg(''), 3000)
      }, 600)
      return
    }

    try {
      const supabase = createClient()
      const payload = {
        title: form.title,
        message: form.message,
        target_role: form.targetRole,
        priority: form.priority
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert([payload])
        .select('id, created_at')
        .single()

      if (error) throw error

      const newNot: SystemNotification = {
        id: data.id,
        title: form.title,
        message: form.message,
        targetRole: form.targetRole,
        priority: form.priority,
        sentDate: new Date(data.created_at).toISOString().replace('T', ' ').slice(0, 16),
        readsCount: 0
      }

      setNotifications([newNot, ...notifications])
      setForm({ title: '', message: '', targetRole: 'all', priority: 'low' })
      setSuccessMsg('Comunicado masivo enviado con éxito.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el comunicado.')
    } finally {
      setIsSending(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este comunicado del historial?')) return

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode) {
      setNotifications(notifications.filter(n => n.id !== id))
      setSuccessMsg('Comunicado eliminado.')
      setTimeout(() => setSuccessMsg(''), 3000)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
      setNotifications(notifications.filter(n => n.id !== id))
      setSuccessMsg('Comunicado eliminado de la base de datos.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      alert('Error al eliminar comunicado: ' + err.message)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Notificaciones y Comunicados
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Difunde anuncios globales o mensajes directos para roles específicos dentro de la plataforma.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-55 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-medium">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulario de Envío */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm self-start">
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            <span>Redactar Comunicado</span>
          </h3>
          <p className="text-xs text-slate-450 mb-5">Llena el formulario para realizar una transmisión masiva.</p>

          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Título del Anuncio</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Suspensión de actividades por lluvia"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Mensaje o Comunicado</label>
              <textarea
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Redacte las instrucciones o información detallada..."
                rows={5}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Destinatarios</label>
                <select
                  value={form.targetRole}
                  onChange={e => setForm({ ...form, targetRole: e.target.value as any })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-xs"
                >
                  <option value="all">Todos los Usuarios</option>
                  <option value="student">Estudiantes</option>
                  <option value="teacher">Docentes</option>
                  <option value="admin">Administradores</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Prioridad</label>
                <select
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value as any })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-xs"
                >
                  <option value="low">Baja (Informativo)</option>
                  <option value="medium">Media (Importante)</option>
                  <option value="high">Alta (Urgencia)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 text-xs font-bold active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-4 shadow-sm"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Transmitiendo...</span>
                </>
              ) : (
                <>
                  <Send className="h-4.5 w-4.5" />
                  <span>Enviar Comunicado</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Historial de Envíos */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Historial de Transmisiones</h3>
              <p className="text-xs text-slate-455">Registro de todos los comunicados enviados.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-950 text-[11px] focus:outline-none dark:text-white"
              >
                <option value="all">Filtro Destinatarios</option>
                <option value="student">Estudiantes</option>
                <option value="teacher">Docentes</option>
                <option value="admin">Administradores</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título o contenido..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
            />
          </div>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <ShieldAlert className="h-10 w-10 text-slate-350 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-450">No hay comunicados registrados.</p>
              </div>
            ) : (
              filteredNotifications.map(not => (
                <div
                  key={not.id}
                  className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/30 hover:bg-slate-55/40 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 transition-colors flex gap-3.5 relative group text-left"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    not.priority === 'high' ? 'bg-red-50 text-red-500 dark:bg-red-950/30' :
                    not.priority === 'medium' ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/30' :
                    'bg-blue-50 text-blue-500 dark:bg-blue-950/30'
                  }`}>
                    {not.priority === 'high' ? <ShieldAlert className="h-5 w-5" /> :
                     not.priority === 'medium' ? <AlertTriangle className="h-5 w-5" /> :
                     <Info className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 space-y-1 pr-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{not.title}</h4>
                      <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                        {not.targetRole === 'all' ? 'Todos' :
                         not.targetRole === 'student' ? 'Estudiantes' :
                         not.targetRole === 'teacher' ? 'Docentes' : 'Admin'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed">{not.message}</p>

                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold pt-1">
                      <span>{not.sentDate}</span>
                      <span>•</span>
                      <span>Leído por: {not.readsCount} usuarios</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(not.id)}
                    className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
