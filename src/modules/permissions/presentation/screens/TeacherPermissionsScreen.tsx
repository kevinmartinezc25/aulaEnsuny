'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Plus,
  Search,
  FileText,
  Calendar,
  Clock,
  Download,
  Eye,
  XCircle,
  Loader2,
  RefreshCw,
  GraduationCap,
  Send,
  Trash2,
  UploadCloud,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { PermissionRequest, PermissionStatsSummary } from '../../domain/entities'
import { PermissionStatusBadge } from '../components/PermissionStatusBadge'
import { PermissionStatsCards } from '../components/PermissionStatsCards'
import {
  getTeacherPermissions,
  cancelPermissionRequest,
  submitDraftPermission,
  deleteDraftPermission
} from '../../application/actions'
import { generatePermissionPDF } from '../../infrastructure/PermissionPDFGenerator'
import { PermissionAdvanceNoticeModal } from '../components/PermissionAdvanceNoticeModal'
import { PermissionSupportOverdueModal } from '../components/PermissionSupportOverdueModal'
import { PermissionPostSupportModal } from '../components/PermissionPostSupportModal'

export function TeacherPermissionsScreen() {
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()
  const [requests, setRequests] = useState<PermissionRequest[]>([])
  const [stats, setStats] = useState<PermissionStatsSummary>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    returned: 0,
    totalHoursAffected: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modales
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [showOverdueModal, setShowOverdueModal] = useState(false)
  const [overdueRequest, setOverdueRequest] = useState<PermissionRequest | null>(null)
  const [selectedPostSupportReq, setSelectedPostSupportReq] = useState<PermissionRequest | null>(null)

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const data = await getTeacherPermissions(statusFilter)
      setRequests(data.requests)
      setStats(data.stats)

      // Verificar si hay solicitudes aprobadas cuyo permiso haya finalizado hace más de 5 días sin soporte
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const foundOverdue = data.requests.find(r => {
        if (r.status !== 'approved') return false
        if (r.postSupportStatus === 'submitted' || r.postSupportStatus === 'approved') return false
        const end = new Date(r.endDate)
        end.setHours(0, 0, 0, 0)
        const diffDays = Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 5
      })

      if (foundOverdue) {
        setOverdueRequest(foundOverdue)
        setShowOverdueModal(true)
      }
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar solicitudes de permisos')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    let active = true
    getTeacherPermissions(statusFilter)
      .then(data => {
        if (!active) return
        setRequests(data.requests)
        setStats(data.stats)

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const foundOverdue = data.requests.find(r => {
          if (r.status !== 'approved') return false
          if (r.postSupportStatus === 'submitted' || r.postSupportStatus === 'approved') return false
          const end = new Date(r.endDate)
          end.setHours(0, 0, 0, 0)
          const diffDays = Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays >= 5
        })

        if (foundOverdue) {
          setOverdueRequest(foundOverdue)
          setShowOverdueModal(true)
        }
      })
      .catch(e => {
        console.error(e)
        if (active) toast.error('Error al cargar solicitudes de permisos')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [statusFilter])

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        r.requestNumber.toLowerCase().includes(q) ||
        r.typeSnapshot?.name.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      )
    })
  }, [requests, search])

  const handleDownloadPDF = async (e: React.MouseEvent, req: PermissionRequest) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      toast.info('Generando constancia oficial de permiso...')
      await generatePermissionPDF(req)
      toast.success('Constancia PDF descargada con éxito')
    } catch {
      toast.error('No se pudo generar el documento PDF')
    }
  }

  const handleCancel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm('¿Está seguro de que desea cancelar esta solicitud? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const res = await cancelPermissionRequest(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Solicitud cancelada correctamente')
        loadData(true)
      }
    } catch {
      toast.error('Error al cancelar solicitud')
    }
  }

  const handleDraftSubmit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm('¿Desea radicar oficialmente este borrador para revisión de Rectoría?')) return
    try {
      const res = await submitDraftPermission(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Borrador radicado exitosamente ante Rectoría')
        loadData(true)
      }
    } catch {
      toast.error('Error al radicar el borrador')
    }
  }

  const handleDraftDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm('¿Está seguro de eliminar este borrador permanentemente? Esta acción no se puede deshacer.')) return
    try {
      const res = await deleteDraftPermission(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Borrador eliminado correctamente')
        loadData(true)
      }
    } catch {
      toast.error('Error al eliminar el borrador')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado Estilo Apple */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs shrink-0">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Permisos Docentes
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Gestione y consulte el historial institucional de sus solicitudes de permisos y licencias.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            title="Recargar listado"
            className="p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all duration-100 active:scale-95 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAdvanceModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-semibold shadow-[0_4px_16px_rgba(37,99,235,0.25)] transition-all duration-100 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva solicitud</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <PermissionStatsCards
        stats={stats}
        activeFilter={statusFilter}
        onFilterClick={setStatusFilter}
      />

      {/* Barra de Filtros y Búsqueda Apple Toolbar */}
      <div className="relative rounded-[22px] bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-3 sm:p-3.5 border border-white/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Línea de luz especular superior */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por radicado o motivo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-100/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">Estado:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-100/70 dark:bg-slate-800/60 px-3.5 py-2 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">En trámite</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
              <option value="returned_correction">Devueltas</option>
              <option value="draft">Borradores</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Solicitudes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
          <p className="text-xs font-medium text-slate-500">Cargando solicitudes...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="relative overflow-hidden flex flex-col items-center justify-center py-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[28px] border border-white/80 dark:border-white/10 p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />
          <div className="p-4 rounded-3xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-3.5">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No se encontraron solicitudes de permisos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
            {search || statusFilter !== 'all'
              ? 'No hay registros que coincidan con los filtros seleccionados.'
              : 'Aún no ha radicado solicitudes. Inicie un nuevo trámite digital de manera ágil.'}
          </p>
          <Link
            href="/teacher/permissions/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-semibold transition-all duration-100 active:scale-[0.98] shadow-[0_4px_16px_rgba(37,99,235,0.25)]"
          >
            <Plus className="h-4 w-4" />
            <span>Crear primera solicitud</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredRequests.map((req, idx) => {
            const isApproved = req.status === 'approved'
            const canCancel = ['draft', 'submitted', 'returned_correction'].includes(req.status)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  damping: 24,
                  stiffness: 260,
                  delay: shouldReduceMotion ? 0 : Math.min(idx * 0.04, 0.25)
                }}
                className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] border border-white/80 dark:border-white/10 p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-slate-300/80 dark:hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden"
              >
                {/* Línea de luz especular superior */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

                {/* Info Principal */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/15 px-2.5 py-0.5 rounded-xl border border-blue-500/20">
                      {req.requestNumber}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {req.typeSnapshot?.name || 'Permiso'}
                    </h3>
                    <PermissionStatusBadge status={req.status} size="sm" />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {req.reason}
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {req.startDate === req.endDate ? req.startDate : `${req.startDate} al ${req.endDate}`}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {req.isFullDay ? 'Jornada Completa' : `${req.startTime} - ${req.endTime}`}
                    </span>
                    {req.affectsAcademicDuty && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {req.academicImpact?.length || 1} clase(s) afectada(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                  {/* Botones para solicitudes en borrador (Req 5) */}
                  {req.status === 'draft' && (
                    <>
                      <button
                        onClick={(e) => handleDraftSubmit(e, req.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all duration-100 active:scale-[0.98] cursor-pointer shadow-xs"
                        title="Radicar borrador oficialmente ante Rectoría"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Enviar</span>
                      </button>
                      <button
                        onClick={(e) => handleDraftDelete(e, req.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all duration-100 active:scale-95 cursor-pointer"
                        title="Eliminar borrador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* Botones y badges de soporte post-permiso (Req 1 y 2) */}
                  {isApproved && (
                    <>
                      {today >= new Date(req.endDate) && (
                        <>
                          {(!req.postSupportStatus || req.postSupportStatus === 'pending_upload' || req.postSupportStatus === 'rejected') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                setSelectedPostSupportReq(req)
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-all duration-100 active:scale-[0.98] cursor-pointer shadow-xs"
                              title="Adjuntar soporte de cumplimiento para revisión de Rectoría"
                            >
                              <UploadCloud className="h-3.5 w-3.5" />
                              <span>Adjuntar Soporte</span>
                            </button>
                          )}

                          {req.postSupportStatus === 'submitted' && (
                            <span
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 rounded-xl text-[11px] font-semibold border border-blue-500/20"
                              title="Soporte en revisión por Rectoría (Aprobación máx: 3 días)"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>Soporte en revisión</span>
                            </span>
                          )}

                          {req.postSupportStatus === 'approved' && (
                            <span
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-semibold border border-emerald-500/20"
                              title="Soporte validado y aprobado por Rectoría"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Soporte aprobado</span>
                            </span>
                          )}
                        </>
                      )}

                      <button
                        onClick={(e) => handleDownloadPDF(e, req)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold transition-all duration-100 active:scale-[0.98] cursor-pointer border border-emerald-500/20"
                        title="Descargar Constancia Oficial PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Constancia</span> PDF
                      </button>
                    </>
                  )}

                  <Link
                    href={`/teacher/permissions/${req.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all duration-100 active:scale-[0.98] cursor-pointer border border-slate-200/60 dark:border-white/5"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Expediente</span>
                  </Link>

                  {canCancel && (
                    <button
                      onClick={(e) => handleCancel(e, req.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all duration-100 active:scale-95 cursor-pointer"
                      title="Cancelar solicitud"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal Req 6: Aviso preventivo de 8 días de anticipación */}
      <PermissionAdvanceNoticeModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        onConfirm={() => {
          setShowAdvanceModal(false)
          router.push('/teacher/permissions/new')
        }}
      />

      {/* Modal Req 3: Alerta pop-up de soporte vencido tras 5 días */}
      <PermissionSupportOverdueModal
        isOpen={showOverdueModal}
        overdueRequest={overdueRequest}
        onClose={() => setShowOverdueModal(false)}
        onOpenUpload={(req) => {
          setShowOverdueModal(false)
          setSelectedPostSupportReq(req)
        }}
      />

      {/* Modal Req 1 & 2: Adjuntar soporte post-permiso */}
      {selectedPostSupportReq && (
        <PermissionPostSupportModal
          requestId={selectedPostSupportReq.id}
          requestNumber={selectedPostSupportReq.requestNumber}
          isOpen={!!selectedPostSupportReq}
          onClose={() => setSelectedPostSupportReq(null)}
          onSuccess={() => loadData(true)}
        />
      )}
    </div>
  )
}

