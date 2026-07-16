'use client'

import React, { useEffect, useState } from 'react'
import { UserPlus, CheckCircle2, XCircle, Clock3, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { listCourseJoinRequests, reviewJoinRequest, CourseJoinRequest } from '../../application/joinRequestsActions'

interface Props {
  courseId: string
}

export function TeacherCourseJoinRequestsScreen({ courseId }: Props) {
  const [requests, setRequests] = useState<CourseJoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [commentMap, setCommentMap] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await listCourseJoinRequests(courseId)
      setRequests(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [courseId])

  const handleReview = async (requestId: string, action: 'approved' | 'rejected') => {
    setProcessingId(requestId)
    try {
      await reviewJoinRequest({
        requestId,
        action,
        comments: commentMap[requestId]?.trim() || undefined
      })
      toast.success(action === 'approved' ? 'Solicitud aprobada. El estudiante fue matriculado al curso.' : 'Solicitud rechazada.')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo procesar la solicitud.')
    } finally {
      setProcessingId(null)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const resolvedRequests = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Solicitudes de ingreso</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Aprueba o rechaza las peticiones de los estudiantes.</p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
          {pendingRequests.length} pendiente{pendingRequests.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <UserPlus className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300">No hay solicitudes pendientes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {request.student_name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'ES'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{request.student_name || 'Estudiante'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{request.student_email || 'Sin correo'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Documento: {request.student_document || 'No registrado'}</p>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Clock3 className="h-3.5 w-3.5" />
                      {new Date(request.requested_at).toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:min-w-[280px]">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Observación</label>
                  <textarea
                    rows={3}
                    value={commentMap[request.id] || ''}
                    onChange={(e) => setCommentMap((prev) => ({ ...prev, [request.id]: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(request.id, 'approved')}
                      disabled={processingId === request.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleReview(request.id, 'rejected')}
                      disabled={processingId === request.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historial de solicitudes resueltas */}
      {resolvedRequests.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 select-none">
            {resolvedRequests.length} solicitud{resolvedRequests.length !== 1 ? 'es' : ''} resuelta{resolvedRequests.length !== 1 ? 's' : ''} ▸
          </summary>
          <div className="mt-3 space-y-3">
            {resolvedRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 opacity-70 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {request.student_name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'ES'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{request.student_name}</p>
                    <p className="text-xs text-slate-400">{request.student_email}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    request.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                  }`}>
                    {request.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
