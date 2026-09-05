'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Printer,
  FileDown,
  Calendar,
  User,
  ShieldAlert,
  AlignLeft,
  Info,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getReportDetail,
  DisciplinaryReport,
  ReportHistoryEntry
} from '@/modules/disciplinary/application/actions'
import { DisciplinaryStatusBadge } from '@/components/disciplinary/DisciplinaryStatusBadge'
import { generateDisciplinaryPDF } from '@/components/disciplinary/DisciplinaryPDFGenerator'
import { InstitutionalReportHeader } from '@/components/reports/InstitutionalReportHeader'

interface Props {
  reportId: string
  basePath?: string
}

export function DisciplinaryReportDetailScreen({
  reportId,
  basePath = '/teacher/disciplinary'
}: Props) {
  const router = useRouter()

  const [report, setReport] = useState<DisciplinaryReport | null>(null)
  const [history, setHistory] = useState<ReportHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  useEffect(() => {
    async function loadDetail() {
      setLoading(true)
      try {
        const data = await getReportDetail(reportId)
        if (data) {
          setReport(data.report)
          setHistory(data.history)
        } else {
          toast.error('Reporte no encontrado')
          router.push(basePath)
        }
      } catch (error) {
        console.error('Error cargando detalle:', error)
        toast.error('Error al cargar el reporte')
      } finally {
        setLoading(false)
      }
    }
    loadDetail()
  }, [reportId, router, basePath])

  const handleDownloadPDF = async () => {
    if (!report) return
    setIsGeneratingPdf(true)
    const toastId = toast.loading('Generando documento PDF oficial...')
    try {
      await generateDisciplinaryPDF(report)
      toast.success('PDF generado correctamente', { id: toastId })
    } catch (error) {
      console.error('Error al generar PDF:', error)
      toast.error('Error al generar el documento', { id: toastId })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4 text-center">
        <Loader2 className="h-10 w-10 text-blue-600 dark:text-blue-400 animate-spin" />
        <p className="text-xs sm:text-sm text-slate-500 font-medium">Cargando reporte disciplinario...</p>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12 text-left">
      {/* ── MEMBRETE INSTITUCIONAL EN MODO IMPRESIÓN ── */}
      <div className="hidden print:block">
        <InstitutionalReportHeader
          documentTitle="REPORTE DE NOVEDAD DISCIPLINARIA"
          date={report.reportDate}
          time={report.reportTime.substring(0, 5)}
          variant="formal"
        />
      </div>

      {/* ── HEADER Y ACCIONES SUPERIORES (OCULTO EN IMPRESIÓN) ── */}
      <div className="space-y-4 print:hidden">
        <div>
          <button
            type="button"
            onClick={() => router.push(basePath)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white backdrop-blur-xl shadow-xs active:scale-95 duration-100 transition-all cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Volver a Convivencia</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Detalle del Reporte
              </h1>
              <DisciplinaryStatusBadge status={report.status} />
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {new Date(report.reportDate).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}{' '}
                • {report.reportTime.substring(0, 5)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center justify-center h-10 w-10 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 backdrop-blur-xl shadow-xs active:scale-90 duration-100 transition-all cursor-pointer"
              title="Imprimir acta"
              aria-label="Imprimir acta"
            >
              <Printer className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-900/15 active:scale-[0.98] duration-100 ease-out transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── COLUMNA PRINCIPAL (Datos del Caso) ── */}
        <div className="md:col-span-2 space-y-6">
          {/* Ficha: Datos del Estudiante */}
          <div className="relative rounded-2xl sm:rounded-[26px] border border-white/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-blue-500" />
              <span>Datos del Estudiante</span>
            </h3>

            <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs sm:text-sm">
              <div className="col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nombre Completo</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">
                  {report.studentFullName}
                </p>
              </div>
              {report.studentDocument && (
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Documento de Identidad</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{report.studentDocument}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Grado</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{report.studentGrade}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Grupo</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{report.studentGroup}</p>
              </div>
            </div>
          </div>

          {/* Ficha: Clasificación de la Falta */}
          <div className="relative rounded-2xl sm:rounded-[26px] border border-white/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
              <span>Clasificación Convivencial</span>
            </h3>

            <div className="flex items-center gap-2.5 mb-3">
              <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/5">
                {report.situationSnapshot.code}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-500/10 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {report.situationSnapshot.type}
              </span>
            </div>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-2">
              {report.situationSnapshot.title}
            </h4>

            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mb-3">
              {report.situationSnapshot.description}
            </p>

            {report.situationSnapshot.manualReference && (
              <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span>Referencia en Manual: {report.situationSnapshot.manualReference}</span>
              </p>
            )}
          </div>

          {/* Ficha: Relación de Hechos y Descargos */}
          <div className="relative rounded-2xl sm:rounded-[26px] border border-white/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlignLeft className="h-4.5 w-4.5 text-emerald-500" />
              <span>Relación de los Hechos</span>
            </h3>

            {/* Texto oficial generado */}
            <div className="bg-slate-100/60 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/60 dark:border-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Texto del documento oficial:
              </p>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed text-justify">
                {report.generatedReport}
              </p>
            </div>

            {/* Observaciones del docente */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Observaciones del Docente:
              </p>
              <p className="whitespace-pre-wrap text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-l-2 border-blue-500/60 pl-3.5 py-0.5">
                {report.teacherDescription}
              </p>
            </div>

            {/* Descargos del estudiante */}
            {report.studentDefense && (
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Descargos del Estudiante:
                </p>
                <p className="whitespace-pre-wrap text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-l-2 border-amber-500/60 pl-3.5 py-0.5">
                  {report.studentDefense}
                </p>
              </div>
            )}

            {/* Compromiso pedagógico */}
            {report.studentCommitment && (
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Compromiso Asumido:
                </p>
                <p className="whitespace-pre-wrap text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-l-2 border-emerald-500/60 pl-3.5 py-0.5">
                  {report.studentCommitment}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── COLUMNA LATERAL (Firma y Trazabilidad) ── */}
        <div className="space-y-6">
          {/* Constancia de Firma Digital */}
          <div className="relative rounded-2xl sm:rounded-[26px] border border-white/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-3">Constancia de Firma</h3>

            <div className="flex items-center gap-2 mb-3.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium leading-tight">
                El estudiante estampó su firma digital presencialmente.
              </p>
            </div>

            {report.studentSignatureUrl && (
              <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950 p-4 flex flex-col items-center">
                <img
                  src={report.studentSignatureUrl}
                  alt="Firma del estudiante"
                  className="max-h-20 object-contain dark:invert opacity-90"
                />
                <div className="w-full border-t border-slate-200 dark:border-white/10 mt-2 mb-1" />
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center">
                  {report.studentFullName}
                </p>
              </div>
            )}
          </div>

          {/* Historial / Trazabilidad */}
          <div className="relative rounded-2xl sm:rounded-[26px] border border-white/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-4 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Trazabilidad del Caso</span>
            </h3>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay registros adicionales de cambio de estado.</p>
            ) : (
              <div className="space-y-4">
                {history.map((entry, index) => (
                  <div key={entry.id} className="relative pl-5 text-xs">
                    {/* Línea conectora */}
                    {index < history.length - 1 && (
                      <div className="absolute left-[7px] top-4 bottom-[-16px] w-0.5 bg-slate-200 dark:bg-slate-800" />
                    )}
                    {/* Nodo de estado */}
                    <div className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-blue-600" />

                    <div className="mb-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Estado cambiado a:
                      </span>
                      <DisciplinaryStatusBadge status={entry.newStatus} showIcon={false} />
                    </div>
                    <div className="text-[11px] text-slate-400 mb-1">
                      Por {entry.changedByName} •{' '}
                      {new Date(entry.createdAt).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}{' '}
                      {new Date(entry.createdAt).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {entry.notes && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
