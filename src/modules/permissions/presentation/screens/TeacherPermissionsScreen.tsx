'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Filter,
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
  AlertCircle
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

  const loadData = async () => {
    setLoading(true)
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
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const filteredRequests = requests.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.requestNumber.toLowerCase().includes(q) ||
      r.typeSnapshot?.name.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    )
  })

  const handleDownloadPDF = async (e: React.MouseEvent, req: PermissionRequest) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      toast.info('Generando constancia oficial de permiso...')
      await generatePermissionPDF(req)
      toast.success('Constancia PDF descargada con éxito')
    } catch (err) {
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
        loadData()
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
        loadData()
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
        loadData()
      }
    } catch {
      toast.error('Error al eliminar el borrador')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>📋 Permisos Docentes</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestione y consulte el historial institucional de sus solicitudes de permisos y licencias.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            title="Recargar listado"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAdvanceModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Nueva solicitud</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <PermissionStatsCards
        stats={stats}
        activeFilter={statusFilter}
        onFilterClick={setStatusFilter}
      />

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por radicado o motivo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Estado:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none"
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

      {/* Lista de Solicitudes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
          <p className="text-xs">Cargando solicitudes...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No se encontraron solicitudes de permisos
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
            {search || statusFilter !== 'all'
              ? 'No hay registros que coincidan con los filtros seleccionados.'
              : 'Aún no ha radicado solicitudes. Inicie un nuevo trámite digital de manera ágil.'}
          </p>
          <Link
            href="/teacher/permissions/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Crear primera solicitud</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isApproved = req.status === 'approved'
            const canCancel = ['draft', 'submitted', 'returned_correction'].includes(req.status)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Info Principal */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900/60">
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

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {req.startDate === req.endDate ? req.startDate : `${req.startDate} al ${req.endDate}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {req.isFullDay ? 'Jornada Completa' : `${req.startTime} - ${req.endTime}`}
                    </span>
                    {req.affectsAcademicDuty && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
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
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                        title="Radicar borrador oficialmente ante Rectoría"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Enviar</span>
                      </button>
                      <button
                        onClick={(e) => handleDraftDelete(e, req.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
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
                              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                              title="Adjuntar soporte de cumplimiento para revisión de Rectoría"
                            >
                              <UploadCloud className="h-3.5 w-3.5" />
                              <span>Adjuntar Soporte</span>
                            </button>
                          )}

                          {req.postSupportStatus === 'submitted' && (
                            <span
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-[11px] font-semibold border border-blue-200 dark:border-blue-900/60"
                              title="Soporte en revisión por Rectoría (Aprobación máx: 3 días)"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>Soporte en revisión</span>
                            </span>
                          )}

                          {req.postSupportStatus === 'approved' && (
                            <span
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-semibold border border-emerald-200 dark:border-emerald-900/60"
                              title="Soporte validado y aprobado por Rectoría"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Soporte aprobado</span>
                            </span>
                          )}
                        </>
                      )}

                      <button
                        onClick={(e) => handleDownloadPDF(e, req)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                        title="Descargar Constancia Oficial PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Constancia</span> PDF
                      </button>
                    </>
                  )}

                  <Link
                    href={`/teacher/permissions/${req.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Expediente</span>
                  </Link>

                  {canCancel && (
                    <button
                      onClick={(e) => handleCancel(e, req.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
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
          onSuccess={() => loadData()}
        />
      )}
    </div>
  )
}
