'use client'

import React, { useRef } from 'react'
import {
  Printer,
  Download,
  X,
  FileText,
  User,
  Calendar,
  Clock,
  Building,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { PermissionRequest, PERMISSION_STATUS_LABELS } from '../../domain/entities'
import { InstitutionalReportHeader } from '@/components/reports/InstitutionalReportHeader'
import { formatPermissionDateRange } from '../utils/dateUtils'
import { generatePermissionPDF } from '../../infrastructure/PermissionPDFGenerator'
import { toast } from 'sonner'

interface Props {
  request: PermissionRequest
  isOpen: boolean
  onClose: () => void
}

export function PermissionDocumentPreviewModal({ request, isOpen, onClose }: Props) {
  const printAreaRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    const toastId = toast.loading('Generando documento PDF oficial...')
    try {
      await generatePermissionPDF(request)
      toast.success('Documento PDF generado exitosamente', { id: toastId })
    } catch (err) {
      console.error('Error al generar PDF:', err)
      toast.error('Error al generar el documento PDF', { id: toastId })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static"
      data-testid="permission-document-preview-modal"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* ── Barra Superior de Acciones (Oculta en Impresión) ── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Expediente Oficial &bull; Radicado {request.requestNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Imprimir documento oficial"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Descargar en PDF"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1 cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Hoja Oficial del Documento (Área de Impresión) ── */}
        <div
          ref={printAreaRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white text-slate-900 font-serif leading-relaxed print:p-0 print:overflow-visible print:bg-white print:text-black"
        >
          {/* Membrete Reutilizable con Logos */}
          <InstitutionalReportHeader
            documentTitle="CONSTANCIA OFICIAL DE PERMISO DOCENTE"
            documentSubtitle="Escuela Normal Superior del Nordeste — Sistema Integrado aulaEnsuny"
            radicadoNumber={request.requestNumber}
            date={request.createdAt}
            variant="formal"
          />

          <div className="mt-6 space-y-6 text-xs sm:text-sm font-sans">
            
            {/* ── 1. Información del Docente ── */}
            <div className="border border-slate-300 rounded-lg p-4 bg-slate-50/70 print:bg-transparent">
              <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-600" />
                1. Información del Docente Solicitante
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                <div>
                  <span className="text-slate-500 font-semibold block text-xs">Docente:</span>
                  <span className="font-bold text-slate-900">{request.teacherSnapshot.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-xs">Correo Electrónico:</span>
                  <span className="text-slate-800">{request.teacherSnapshot.email}</span>
                </div>
                {request.teacherSnapshot.campus && (
                  <div>
                    <span className="text-slate-500 font-semibold block text-xs">Sede Educativa:</span>
                    <span className="text-slate-800">{request.teacherSnapshot.campus}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 font-semibold block text-xs">Estado de la Solicitud:</span>
                  <span className="font-bold uppercase text-blue-700">
                    {PERMISSION_STATUS_LABELS[request.status]}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 2. Detalles del Permiso ── */}
            <div className="border border-slate-300 rounded-lg p-4">
              <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                2. Detalles de la Solicitud y Vigencia
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                <div>
                  <span className="text-slate-500 font-semibold block text-xs">Tipo de Permiso:</span>
                  <span className="font-bold text-slate-900 text-sm">{request.typeSnapshot?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-xs">Vigencia (Día / Rango):</span>
                  <span className="font-bold text-slate-900">
                    {formatPermissionDateRange(request.startDate, request.endDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-xs">Horario Solicitado:</span>
                  <span className="font-semibold text-slate-800">
                    {request.isFullDay ? 'Jornada Completa' : `${request.startTime} a ${request.endTime}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-xs">Afectación de Carga Académica:</span>
                  <span className="font-medium text-slate-800">
                    {request.affectsAcademicDuty ? 'Sí afecta labores de clase' : 'No afecta labores directas de clase'}
                  </span>
                </div>
                <div className="sm:col-span-2 mt-1">
                  <span className="text-slate-500 font-semibold block text-xs mb-1">Motivo / Justificación Expuesta:</span>
                  <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed font-serif">
                    {request.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* ── 3. Afectación Académica y Plan de Cobertura ── */}
            {request.affectsAcademicDuty && (
              <div className="border border-slate-300 rounded-lg p-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                  3. Plan de Contingencia y Cobertura Académica
                </h3>

                {request.academicImpact && request.academicImpact.length > 0 ? (
                  <div className="mb-4">
                    <span className="text-slate-600 font-semibold block text-xs mb-1.5">Grupos y Clases Afectadas:</span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="p-2 border-b">Grupo / Grado</th>
                            <th className="p-2 border-b">Asignatura</th>
                            <th className="p-2 border-b">Horario</th>
                            <th className="p-2 border-b">Estrategia Pedagógica</th>
                          </tr>
                        </thead>
                        <tbody>
                          {request.academicImpact.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="p-2 font-semibold">{item.gradeGroup || item.courseName}</td>
                              <td className="p-2">{item.subject}</td>
                              <td className="p-2">{item.startTime ? `${item.startTime} - ${item.endTime}` : `${item.hoursCount} hora(s)`}</td>
                              <td className="p-2 text-slate-600">{item.courseName || 'Actividad institucional asignada'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic mb-3">
                    El docente no especificó asignaturas individuales en el formulario.
                  </p>
                )}

                {request.coveragePlan && request.coveragePlan.length > 0 && (
                  <div>
                    <span className="text-slate-600 font-semibold block text-xs mb-1.5">Docentes Asignados para Acompañamiento / Cobertura:</span>
                    <ul className="space-y-1.5 text-xs">
                      {request.coveragePlan.map((cov, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-slate-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                          <span className="font-semibold">{cov.substituteTeacherName || 'Docente de apoyo'}:</span>
                          <span>{cov.groupName} - {cov.subject} ({cov.periodOrTime})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── 4. Firmas y Validaciones Institucionales ── */}
            <div className="mt-8 pt-4 border-t-2 border-slate-900 print:border-black">
              <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs mb-8 text-center">
                Constancia y Firmas de Aprobación Institucional
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs">
                
                {/* Firma Docente */}
                <div className="flex flex-col items-center">
                  <div className="w-48 border-b border-slate-400 pb-1 mb-2">
                    <span className="font-serif italic text-sm text-slate-800">
                      {request.teacherSnapshot.fullName}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs">Docente Solicitante</span>
                  <span className="text-slate-500 text-[11px]">Firma y Radicación Digital</span>
                </div>

                {/* Firma Rectoría */}
                <div className="flex flex-col items-center">
                  <div className="w-48 border-b border-slate-400 pb-1 mb-2">
                    <span className="font-serif italic text-sm text-slate-800">
                      {request.rectorApprovalDate ? 'Aprobado por Rectoría' : 'Pendiente de Rectoría'}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs">Rectoría Institucional</span>
                  <span className="text-slate-500 text-[11px]">
                    {request.rectorApprovalDate
                      ? new Date(request.rectorApprovalDate).toLocaleDateString('es-CO')
                      : 'En trámite'}
                  </span>
                </div>

                {/* Firma Coordinación */}
                <div className="flex flex-col items-center">
                  <div className="w-48 border-b border-slate-400 pb-1 mb-2">
                    <span className="font-serif italic text-sm text-slate-800">
                      {request.coordinatorApprovalDate ? 'Aprobado por Coordinación' : 'Pendiente de Coordinación'}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs">Coordinación Académica</span>
                  <span className="text-slate-500 text-[11px]">
                    {request.coordinatorApprovalDate
                      ? new Date(request.coordinatorApprovalDate).toLocaleDateString('es-CO')
                      : 'En trámite'}
                  </span>
                </div>

              </div>

              {/* Pie de autenticidad */}
              <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 font-sans">
                <p>
                  Documento emitido y validado digitalmente por la plataforma <strong>aulaEnsuny</strong> para la <strong>Institución Educativa Escuela Normal Superior del Nordeste</strong> (Yolombó, Antioquia).
                </p>
                <p className="mt-0.5">
                  Código de Verificación: <strong className="font-mono">{request.verificationCode || 'VER-' + request.id.substring(0, 8)}</strong> &bull; Consecutivo: <strong>{request.requestNumber}</strong>
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
