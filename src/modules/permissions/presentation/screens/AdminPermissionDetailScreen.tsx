'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Clock,
  Download,
  FileText,
  UserCheck,
  Loader2,
  Paperclip,
  GraduationCap,
  BookOpen,
  Building,
  User,
  Printer,
  ShieldCheck
} from 'lucide-react'
import { PermissionRequest, CoverageAssignment } from '../../domain/entities'
import { PermissionStatusBadge } from '../components/PermissionStatusBadge'
import { PermissionTimeline } from '../components/PermissionTimeline'
import { ApprovalDecisionModal, DecisionType } from '../components/ApprovalDecisionModal'
import { CoverageAssignmentModal } from '../components/CoverageAssignmentModal'
import { PermissionDocumentPreviewModal } from '../components/PermissionDocumentPreviewModal'
import { RectorSupportReviewModal } from '../components/RectorSupportReviewModal'
import { getPermissionById } from '../../application/actions'
import {
  rectorProcessPermission,
  coordinatorProcessPermission,
  getAvailableSubstituteTeachers,
  getCurrentAdminRoleInfo
} from '../../application/adminActions'
import { generatePermissionPDF } from '../../infrastructure/PermissionPDFGenerator'
import { formatPermissionDateRange } from '../utils/dateUtils'

interface Props {
  permissionId: string
}

export function AdminPermissionDetailScreen({ permissionId }: Props) {
  const [request, setRequest] = useState<PermissionRequest | null>(null)
  const [availableTeachers, setAvailableTeachers] = useState<Array<{ id: string; name: string; email: string; subject: string }>>([])
  const [adminRole, setAdminRole] = useState<{
    role: 'superadmin' | 'admin'
    name: string
    isRector: boolean
    isCoordinator: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Modals state
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean
    decisionType: DecisionType
    roleContext: 'rector' | 'coordinator'
  }>({
    isOpen: false,
    decisionType: 'approve',
    roleContext: 'rector'
  })

  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false)
  const [isRectorReviewModalOpen, setIsRectorReviewModalOpen] = useState(false)

  const loadData = async () => {
    try {
      const [reqData, teachersData, roleData] = await Promise.all([
        getPermissionById(permissionId),
        getAvailableSubstituteTeachers(),
        getCurrentAdminRoleInfo()
      ])
      setRequest(reqData)
      setAvailableTeachers(teachersData)
      setAdminRole(roleData)
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar expediente institucional')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function initialize() {
      try {
        const [reqData, teachersData, roleData] = await Promise.all([
          getPermissionById(permissionId),
          getAvailableSubstituteTeachers(),
          getCurrentAdminRoleInfo()
        ])
        if (!active) return
        setRequest(reqData)
        setAvailableTeachers(teachersData)
        setAdminRole(roleData)
      } catch (e) {
        console.error(e)
        if (active) toast.error('Error al cargar expediente institucional')
      } finally {
        if (active) setLoading(false)
      }
    }

    initialize()

    return () => {
      active = false
    }
  }, [permissionId])

  const handleDownloadPDF = async () => {
    if (!request) return
    try {
      toast.info('Generando constancia oficial de permiso...')
      await generatePermissionPDF(request)
      toast.success('Constancia PDF descargada con éxito')
    } catch {
      toast.error('No se pudo generar el documento PDF')
    }
  }

  const handleConfirmDecision = async (payload: { decision: DecisionType; notes: string; reason: string }) => {
    if (!request) return

    if (decisionModal.roleContext === 'rector') {
      const res = await rectorProcessPermission({
        requestId: request.id,
        decision: payload.decision,
        notes: payload.notes,
        rejectionReason: payload.decision === 'reject' ? payload.reason : undefined,
        correctionNotes: payload.decision === 'return' ? payload.reason : undefined
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          payload.decision === 'approve'
            ? 'Solicitud aprobada por Rectoría y remitida a Coordinación Académica'
            : payload.decision === 'return'
            ? 'Solicitud devuelta al docente para corrección'
            : 'Solicitud rechazada institucionalmente'
        )
        loadData()
      }
    } else {
      // Coordinación rechazo
      const res = await coordinatorProcessPermission({
        requestId: request.id,
        decision: 'reject',
        rejectionReason: payload.reason,
        coveragePlan: request.coveragePlan || []
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Solicitud rechazada por Coordinación Académica')
        loadData()
      }
    }
  }

  const handleConfirmCoverage = async (coverage: CoverageAssignment[], notes: string) => {
    if (!request) return
    const res = await coordinatorProcessPermission({
      requestId: request.id,
      decision: 'approve',
      coveragePlan: coverage,
      notes
    })

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Cobertura guardada y permiso aprobado definitivamente')
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs">Cargando expediente institucional...</p>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-16">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No se encontró el expediente solicitado.
        </p>
        <Link
          href="/admin/permissions"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-3"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Bandeja Institucional
        </Link>
      </div>
    )
  }

  const isRectorStage = ['submitted', 'reviewing_rector'].includes(request.status)
  const isCoordStage = ['approved_rector', 'reviewing_coordinator'].includes(request.status)
  const isApproved = request.status === 'approved'

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Encabezado y Navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/permissions"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a la Bandeja de Permisos</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Expediente {request.requestNumber}
            </h1>
            <PermissionStatusBadge status={request.status} size="md" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Docente: <strong>{request.teacherSnapshot.fullName}</strong> | Radicado: {request.createdAt.split('T')[0]}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
              <span>Descargar Constancia Oficial (PDF)</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Acciones de Rectoría */}
      {isRectorStage && (
        <div className="p-5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 block">
                Acciones de Rectoría
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                Rol: SuperAdmin
              </span>
            </div>
            <p className="text-xs text-blue-900/80 dark:text-blue-300/80 mt-1">
              Esta solicitud está en espera de la revisión directiva por parte del Rector.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() =>
                setDecisionModal({ isOpen: true, decisionType: 'return', roleContext: 'rector' })
              }
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
            >
              Devolver para corrección
            </button>
            <button
              onClick={() =>
                setDecisionModal({ isOpen: true, decisionType: 'reject', roleContext: 'rector' })
              }
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer"
            >
              Rechazar
            </button>
            <button
              onClick={() =>
                setDecisionModal({ isOpen: true, decisionType: 'approve', roleContext: 'rector' })
              }
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
            >
              Aprobar (Pasa a Coordinación)
            </button>
          </div>
        </div>
      )}

      {/* Barra de Acciones de Coordinación Académica */}
      {isCoordStage && (
        <div className="p-5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 block">
                Acciones de Coordinación Académica
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                Rol: Admin / SuperAdmin
              </span>
            </div>
            <p className="text-xs text-purple-900/80 dark:text-purple-300/80 mt-1">
              Aprobada previamente por Rectoría. Asigne la cobertura de clases y emita la resolución final.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() =>
                setDecisionModal({ isOpen: true, decisionType: 'reject', roleContext: 'coordinator' })
              }
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer"
            >
              Rechazar
            </button>
            <button
              onClick={() => setIsCoverageModalOpen(true)}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-colors cursor-pointer flex items-center gap-2"
            >
              <UserCheck className="h-4 w-4" />
              <span>Gestionar Cobertura y Aprobar Permiso</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Revisión de Soporte Post-Permiso por el Rector (Req 1) */}
      {request.status === 'approved' && adminRole?.isRector && (
        <div className="p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 block">
                Soporte de Cumplimiento Post-Permiso (Rectoría)
              </span>
              {request.postSupportStatus === 'submitted' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300">
                  Pendiente de Revisión
                </span>
              )}
              {request.postSupportStatus === 'approved' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300">
                  Aprobado ✓
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 mt-1">
              {request.postSupportStatus === 'submitted'
                ? `El docente ${request.teacherSnapshot.fullName} radicó el soporte de cumplimiento ("${request.postSupportName}"). Revise y valide el documento para el cierre formal del expediente.`
                : request.postSupportStatus === 'approved'
                ? `El soporte fue validado y aprobado el ${new Date(request.postSupportReviewedAt || '').toLocaleDateString('es-CO')}. Expediente cerrado a conformidad.`
                : `El docente aún no ha radicado el soporte posterior al cumplimiento de su permiso.`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {request.postSupportStatus === 'submitted' && (
              <button
                onClick={() => setIsRectorReviewModalOpen(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-colors cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Revisar y Validar Soporte</span>
              </button>
            )}
            {request.postSupportUrl && (
              <a
                href={request.postSupportUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4" />
                <span>Ver Archivo</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Grid del expediente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Ficha del Docente */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span>Información del Docente Solicitante</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 font-medium block">Nombre:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{request.teacherSnapshot.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Correo:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 break-words block">{request.teacherSnapshot.email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Documento:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">{request.teacherSnapshot.document || 'No registrado'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Cargo:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{request.teacherSnapshot.role}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Área / Asignatura:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{request.teacherSnapshot.mainSubject || 'General'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Sede:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{request.teacherSnapshot.campus || 'Sede Principal'}</span>
              </div>
            </div>
          </div>

          {/* Ficha del Permiso */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>Detalles de la Solicitud</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Tipo de Permiso:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {request.typeSnapshot?.name}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Vigencia y Horario:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatPermissionDateRange(request.startDate, request.endDate)}
                  {' — '}
                  <span className="text-blue-600 dark:text-blue-400">
                    {request.isFullDay ? 'Jornada Completa' : `${request.startTime} a ${request.endTime}`}
                  </span>
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 font-medium block mb-1">Motivo / Justificación:</span>
                <p className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 leading-relaxed text-xs">
                  {request.reason}
                </p>
              </div>

              {request.attachmentName && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 font-medium block mb-1">Soporte Adjunto:</span>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-xs">
                      <Paperclip className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold">{request.attachmentName}</span>
                    </div>
                    {request.attachmentUrl && (
                      <a
                        href={request.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Ver / Descargar archivo
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Impacto Académico y Cobertura */}
          {request.affectsAcademicDuty && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                  <span>Impacto Académico y Cobertura</span>
                </h3>
                {isCoordStage && (
                  <button
                    onClick={() => setIsCoverageModalOpen(true)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
                  >
                    Editar asignación de cobertura
                  </button>
                )}
              </div>

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
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Docente encargado:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {cov?.substituteTeacherName || 'Sin asignar aún'}
                        </strong>
                        {cov?.observations && <span className="italic">({cov.observations})</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actividades para Estudiantes */}
          {request.leavesStudentActivities && request.studentActivities.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-600" />
                <span>Actividades Asignadas a Estudiantes</span>
              </h3>

              <div className="space-y-3 text-xs">
                {request.studentActivities.map((act, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {act.title} ({act.groupName})
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
          {/* Cuadro de Aprobaciones */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <span>Resolución Institucional</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rectoría</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {request.rectorName || (request.status === 'submitted' ? 'Pendiente de revisión' : 'Registrado')}
                </p>
                {request.rectorApprovalDate && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    ✓ Aprobado el {new Date(request.rectorApprovalDate).toLocaleString('es-CO')}
                  </p>
                )}
                {request.rectorNotes && (
                  <p className="text-[11px] text-slate-500 mt-1 italic">&ldquo;{request.rectorNotes}&rdquo;</p>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Coordinación Académica</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {request.coordinatorName || (request.rectorApprovalDate ? 'En revisión de cobertura' : 'En espera de Rectoría')}
                </p>
                {request.coordinatorApprovalDate && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    ✓ Aprobado el {new Date(request.coordinatorApprovalDate).toLocaleString('es-CO')}
                  </p>
                )}
                {request.coordinatorNotes && (
                  <p className="text-[11px] text-slate-500 mt-1 italic">&ldquo;{request.coordinatorNotes}&rdquo;</p>
                )}
              </div>
            </div>
          </div>

          {/* Línea de Tiempo */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Historial y Trazabilidad</span>
            </h3>

            <PermissionTimeline history={request.history || []} />
          </div>
        </div>
      </div>

      {/* Modales */}
      <ApprovalDecisionModal
        isOpen={decisionModal.isOpen}
        onClose={() => setDecisionModal(prev => ({ ...prev, isOpen: false }))}
        decisionType={decisionModal.decisionType}
        roleContext={decisionModal.roleContext}
        requestNumber={request.requestNumber}
        teacherName={request.teacherSnapshot.fullName}
        onConfirm={handleConfirmDecision}
      />

      <CoverageAssignmentModal
        isOpen={isCoverageModalOpen}
        onClose={() => setIsCoverageModalOpen(false)}
        impactItems={request.academicImpact || []}
        currentCoverage={request.coveragePlan || []}
        availableTeachers={availableTeachers}
        onConfirm={handleConfirmCoverage}
      />

      {/* Modal de Vista Previa Oficial Imprimible con Membrete */}
      <PermissionDocumentPreviewModal
        request={request}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Modal de Revisión y Validación de Soporte Post-Permiso por Rectoría (Req 1) */}
      <RectorSupportReviewModal
        isOpen={isRectorReviewModalOpen}
        requestId={request.id}
        requestNumber={request.requestNumber}
        teacherName={request.teacherSnapshot.fullName}
        postSupportName={request.postSupportName}
        postSupportUrl={request.postSupportUrl}
        postSupportSubmittedAt={request.postSupportSubmittedAt}
        teacherNotes={request.postSupportReviewNotes}
        onClose={() => setIsRectorReviewModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  )
}
