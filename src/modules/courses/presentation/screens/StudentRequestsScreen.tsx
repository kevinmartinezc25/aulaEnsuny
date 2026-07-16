'use client'

import React, { useState, useEffect } from 'react'
import { BookOpen, Loader2, ClipboardList, Trash2, ArrowRight, ShieldCheck, XCircle, Clock } from 'lucide-react'
import { getStudentJoinRequests, cancelJoinRequest, CourseJoinRequest } from '../../application/joinRequestsActions'
import Link from 'next/link'
import { toast } from 'sonner'

export function StudentRequestsScreen() {
  const [requests, setRequests] = useState<CourseJoinRequest[]>([])
  const [loading, setLoading] = useState(true)

  const loadRequests = async () => {
    try {
      setLoading(true)
      const data = await getStudentJoinRequests()
      setRequests(data)
    } catch (e: any) {
      toast.error(e?.message || 'Error al cargar las solicitudes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleCancel = async (id: string) => {
    const confirmCancel = window.confirm('¿Estás seguro de que deseas cancelar esta solicitud?')
    if (!confirmCancel) return

    const promise = cancelJoinRequest(id)

    toast.promise(promise, {
      loading: 'Cancelando solicitud...',
      success: () => {
        loadRequests()
        return 'Solicitud cancelada correctamente'
      },
      error: (err) => err?.message || 'No se pudo cancelar la solicitud'
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Mis Solicitudes de Cursos</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Consulta el estado de tus solicitudes de ingreso o solicita unirte a uno nuevo.</p>
          </div>
        </div>
        <Link
          href="/student/join-course"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm"
        >
          <BookOpen className="h-4 w-4" />
          Unirse a un curso
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Cargando solicitudes...</span>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 border-dashed py-16 text-center dark:border-slate-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
            <ClipboardList className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No tienes solicitudes</h3>
            <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">No has enviado ninguna solicitud para unirte a asignaturas todavía.</p>
          </div>
          <Link
            href="/student/join-course"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 transition"
          >
            Solicitar código de ingreso
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800/60 dark:bg-slate-800/20 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Curso / Asignatura</th>
                  <th className="px-6 py-4">Fecha Solicitada</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4">Comentarios</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {requests.map((req) => {
                  const requestedDate = new Date(req.requested_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        <div>
                          <p>{req.course_title}</p>
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{req.subject}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{requestedDate}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {req.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100/30 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Aprobado
                          </span>
                        ) : req.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100/30 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                            <XCircle className="h-3.5 w-3.5" />
                            Rechazado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100/30 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 animate-pulse">
                            <Clock className="h-3.5 w-3.5" />
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                        {req.comments || <span className="italic text-slate-400 dark:text-slate-600">Sin comentarios</span>}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {req.status === 'pending' ? (
                          <button
                            onClick={() => handleCancel(req.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-800/40 dark:text-rose-400 dark:hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Cancelar
                          </button>
                        ) : req.status === 'approved' ? (
                          <Link
                            href={`/student/courses/${req.course_id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 transition"
                          >
                            Ir al curso
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">Finalizada</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            {requests.map((req) => {
              const requestedDate = new Date(req.requested_at).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })

              return (
                <div key={req.id} className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-base">{req.course_title}</p>
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{req.subject}</span>
                    </div>
                    {req.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100/30 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Aprobado
                      </span>
                    ) : req.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100/30 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                        <XCircle className="h-3.5 w-3.5" />
                        Rechazado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100/30 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5" />
                        Pendiente
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400 uppercase font-semibold tracking-wider text-[10px]">Fecha Solicitada</p>
                      <p className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">{requestedDate}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase font-semibold tracking-wider text-[10px]">Comentarios</p>
                      <p className="text-slate-700 dark:text-slate-300 font-medium mt-0.5 truncate max-w-[150px]">
                        {req.comments || <span className="italic text-slate-400 dark:text-slate-600">Sin comentarios</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    {req.status === 'pending' ? (
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-800/40 dark:text-rose-400 dark:hover:bg-rose-500/10 transition w-full"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Cancelar Solicitud
                      </button>
                    ) : req.status === 'approved' ? (
                      <Link
                        href={`/student/courses/${req.course_id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 transition w-full text-center"
                      >
                        Ir al curso
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 w-full text-right">Finalizada</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
