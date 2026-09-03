'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Paperclip,
  GraduationCap,
  BookOpen,
  Building,
  ShieldAlert,
  Printer,
  Send,
  Trash2,
  UploadCloud,
  ExternalLink
} from 'lucide-react'
import { PermissionRequest } from '../../domain/entities'
import { PermissionStatusBadge } from '../components/PermissionStatusBadge'
import { PermissionTimeline } from '../components/PermissionTimeline'
import { PermissionDocumentPreviewModal } from '../components/PermissionDocumentPreviewModal'
import {
  getPermissionById,
  cancelPermissionRequest,
  submitDraftPermission,
  deleteDraftPermission
} from '../../application/actions'
import { generatePermissionPDF } from '../../infrastructure/PermissionPDFGenerator'
import { formatPermissionDateRange } from '../utils/dateUtils'
import { PermissionPostSupportModal } from '../components/PermissionPostSupportModal'

interface Props {
  permissionId: string
}

export function TeacherPermissionDetailScreen({ permissionId }: Props) {
  const router = useRouter()
  const [request, setRequest] = useState<PermissionRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getPermissionById(permissionId)
      setRequest(data)
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar el expediente')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [permissionId])

  const handleDownloadPDF = async () => {
    if (!request) return
    try {
      toast.info('Generando constancia oficial de permiso...')
      await generatePermissionPDF(request)
      toast.success('Constancia PDF descargada con éxito')
    } catch (err) {
      toast.error('No se pudo generar el documento PDF')
    }
  }

  const handleCancel = async () => {
    if (!confirm('¿Está seguro de que desea cancelar esta solicitud? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const res = await cancelPermissionRequest(permissionId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Solicitud cancelada')
        loadData()
      }
    } catch {
      toast.error('Error al cancelar solicitud')
    }
  }

  const handleDraftSubmit = async () => {
    if (!confirm('¿Desea radicar oficialmente este borrador para revisión directiva de Rectoría?')) return
    try {
      const res = await submitDraftPermission(permissionId)
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

  const handleDraftDelete = async () => {
    if (!confirm('¿Está seguro de eliminar este borrador permanentemente? Esta acción no se puede deshacer.')) return
    try {
      const res = await deleteDraftPermission(permissionId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Borrador eliminado correctamente')
        router.push('/teacher/permissions')
      }
    } catch {
      toast.error('Error al eliminar el borrador')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs">Cargando expediente digital...</p>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-16">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No se encontró la solicitud de permiso solicitada.
        </p>
        <Link
          href="/teacher/permissions"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-3"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Mis Solicitudes
        </Link>
      </div>
    )
  }

  const isApproved = request.status === 'approved'
  const isDraft = request.status === 'draft'
  const canCancel = ['draft', 'submitted', 'returned_correction'].includes(request.status)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isFulfilled = today >= new Date(request.endDate)

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/teacher/permissions"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al listado
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Expediente {request.requestNumber}
            </h1>
            <PermissionStatusBadge status={request.status} size="md" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Radicada el {new Date(request.createdAt).toLocaleDateString('es-CO')} | Tipo: <strong>{request.typeSnapshot?.name}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Botones de Borrador (Req 5) */}
          {isDraft && (
            <>
              <button
                onClick={handleDraftSubmit}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>Radicar para Revisión</span>
              </button>
              <button
                onClick={handleDraftDelete}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Eliminar Borrador</span>
              </button>
            </>
          )}

          {/* Botón de Adjuntar Soporte Post-Permiso (Req 1 y 2) */}
          {isApproved && isFulfilled && (!request.postSupportStatus || request.postSupportStatus === 'pending_upload' || request.postSupportStatus === 'rejected') && (
            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Adjuntar Soporte de Cumplimiento</span>
            </button>
          )}

          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Ver / Imprimir Expediente</span>
          </button>

          {isApproved && (
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Descargar Constancia Oficial</span>
            </button>
          )}

          {canCancel && !isDraft && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <XCircle className="h-4 w-4" />
              <span>Cancelar Solicitud</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Devolución para Corrección si aplica */}
      {request.status === 'returned_correction' && request.correctionNotes && (
        <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/80 text-orange-900 dark:text-orange-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-orange-700 dark:text-orange-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Solicitud Devuelta por Rectoría para Ajustes</span>
          </div>
          <p className="text-xs text-orange-800 dark:text-orange-300 pl-6 leading-relaxed">
            {request.correctionNotes}
          </p>
        </div>
      )}

      {/* Alerta de Rechazo si aplica */}
      {request.status === 'rejected' && request.rejectionReason && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-rose-700 dark:text-rose-400">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>Solicitud No Aprobada</span>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-300 pl-6 leading-relaxed">
            {request.rejectionReason}
          </p>
        </div>
      )}

      {/* Grid de contenido del expediente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Datos del Expediente */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tarjeta de Información General */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>Detalles del Permiso</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Vigencia:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {formatPermissionDateRange(request.startDate, request.endDate)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block">Jornada:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {request.isFullDay ? 'Jornada Completa' : `${request.startTime} a ${request.endTime}`}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 font-semibold block mb-1">Motivo / Justificación:</span>
                <p className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 leading-relaxed text-xs">
                  {request.reason}
                </p>
              </div>

              {request.attachmentName && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 font-semibold block mb-1">Soporte Documental:</span>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-xs">
                      <Paperclip className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{request.attachmentName}</span>
                    </div>
                    {request.attachmentUrl && (
                      <a
                        href={request.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Ver adjunto
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta de Soporte Post-Permiso y Revisión de Rectoría (Req 1, 2, 3) */}
          {isApproved && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-amber-600" />
                  <span>Soporte de Cumplimiento Post-Permiso</span>
                </h3>
                {request.postSupportStatus === 'approved' && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprobado por Rectoría
                  </span>
                )}
                {request.postSupportStatus === 'submitted' && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> En Revisión de Rectoría
                  </span>
                )}
              </div>

              {!isFulfilled ? (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Una vez finalizada la vigencia de su permiso ({formatPermissionDateRange(request.startDate, request.endDate)}), deberá adjuntar el soporte documental correspondiente para que entre a revisión y cierre por parte del Rector.
                </p>
              ) : !request.postSupportStatus || request.postSupportStatus === 'pending_upload' || request.postSupportStatus === 'rejected' ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Obligación de adjuntar soporte cumplido el permiso:</strong>
                      Debe radicar la constancia o certificación para revisión del SuperAdmin (Rector). Si no se entrega a los 5 días de finalizado el permiso, se genera una alerta obligatoria de entrega en máximo 2 días hábiles.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSupportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Adjuntar Soporte de Cumplimiento Ahora</span>
                  </button>
                </div>
              ) : request.postSupportStatus === 'submitted' ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>{request.postSupportName || 'Soporte_Cumplimiento.pdf'}</span>
                      </span>
                      {request.postSupportUrl && (
                        <a
                          href={request.postSupportUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>Ver soporte</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {request.postSupportSubmittedAt && (
                      <p className="text-[11px] text-slate-500">
                        Entregado el: {new Date(request.postSupportSubmittedAt).toLocaleString('es-CO')}
                      </p>
                    )}
                    {request.postSupportReviewNotes && (
                      <p className="text-slate-600 dark:text-slate-400 italic text-[11px] pt-1">
                        "{request.postSupportReviewNotes}"
                      </p>
                    )}
                  </div>

                  {/* Alerta de resolución en máx 3 días (Req 2) */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                    <Clock className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block text-slate-800 dark:text-slate-200">
                        Plazo de aprobación del soporte (Máximo 3 días):
                      </strong>
                      El soporte se encuentra en estudio directivo por Rectoría. Recibirá notificación y confirmación en un plazo máximo de tres (3) días hábiles.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Soporte Validado y Aprobado por Rectoría (Cierre Oficial)</span>
                    </span>
                    {request.postSupportUrl && (
                      <a
                        href={request.postSupportUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] underline flex items-center gap-1"
                      >
                        Ver archivo
                      </a>
                    )}
                  </div>
                  {request.postSupportReviewedAt && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Fecha de validación: {new Date(request.postSupportReviewedAt).toLocaleString('es-CO')}
                    </p>
                  )}
                  {request.postSupportReviewNotes && (
                    <p className="text-slate-700 dark:text-slate-300 italic text-[11px]">
                      "{request.postSupportReviewNotes}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tarjeta de Impacto Académico y Cobertura */}
          {request.affectsAcademicDuty && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-purple-600" />
                <span>Impacto Académico y Cobertura Docente</span>
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                {request.academicImpact.map((item, idx) => {
                  const cov = request.coveragePlan?.find(c => c.academicItemIndex === idx)
                  return (
                    <div key={idx} className="p-3.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.courseName} ({item.gradeGroup})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-[11px]">
                          {item.hoursCount}h | Asignatura: {item.subject}
                        </span>
                      </div>
                      {cov?.substituteTeacherName && (
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg text-[11px]">
                          <UserCheck className="h-3.5 w-3.5 shrink-0" />
                          <span>Docente cobertura asignado: <strong>{cov.substituteTeacherName}</strong></span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tarjeta de Actividades Dejadas */}
          {request.leavesStudentActivities && request.studentActivities.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-600" />
                <span>Plan de Continuidad (Actividades Estudiantiles)</span>
              </h3>

              <div className="space-y-3">
                {request.studentActivities.map((act, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {act.title} <span className="text-slate-400 font-normal">({act.groupName})</span>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {act.instructions}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Trazabilidad y Aprobaciones */}
        <div className="space-y-6">
          {/* Cuadro de Aprobación Institucional */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <span>Resolución Institucional</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rectoría</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {request.rectorName || 'Pendiente de revisión'}
                </p>
                {request.rectorApprovalDate && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    ✓ Aprobado el {new Date(request.rectorApprovalDate).toLocaleString('es-CO')}
                  </p>
                )}
                {request.rectorNotes && (
                  <p className="text-[11px] text-slate-500 mt-1 italic">"{request.rectorNotes}"</p>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Coordinación Académica</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {request.coordinatorName || (request.rectorApprovalDate ? 'En revisión académica' : 'En espera de Rectoría')}
                </p>
                {request.coordinatorApprovalDate && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    ✓ Aprobado el {new Date(request.coordinatorApprovalDate).toLocaleString('es-CO')}
                  </p>
                )}
                {request.coordinatorNotes && (
                  <p className="text-[11px] text-slate-500 mt-1 italic">"{request.coordinatorNotes}"</p>
                )}
              </div>
            </div>
          </div>

          {/* Línea de Tiempo del Expediente */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Historial y Trazabilidad</span>
            </h3>

            <PermissionTimeline history={request.history || []} />
          </div>
        </div>
      </div>

      {/* Modal de Vista Previa Oficial Imprimible con Membrete */}
      <PermissionDocumentPreviewModal
        request={request}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Modal para adjuntar soporte post-permiso */}
      <PermissionPostSupportModal
        requestId={request.id}
        requestNumber={request.requestNumber}
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  )
}
