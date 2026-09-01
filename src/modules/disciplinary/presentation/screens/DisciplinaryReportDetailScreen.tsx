'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Printer, FileDown, Calendar, User, 
  ShieldAlert, AlignLeft, Info, Download, Loader2, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { getReportDetail, DisciplinaryReport, ReportHistoryEntry } from '@/modules/disciplinary/application/actions'
import { DisciplinaryStatusBadge } from '@/components/disciplinary/DisciplinaryStatusBadge'
import { generateDisciplinaryPDF } from '@/components/disciplinary/DisciplinaryPDFGenerator'

interface Props {
  reportId: string
  basePath?: string
}

export function DisciplinaryReportDetailScreen({ reportId, basePath = '/teacher/disciplinary' }: Props) {
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
  }, [reportId, router])

  const handleDownloadPDF = async () => {
    if (!report) return
    setIsGeneratingPdf(true)
    const toastId = toast.loading('Generando documento PDF...')
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
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium">Cargando reporte...</p>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* ── HEADER & BREADCRUMBS ────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => router.push(basePath)}
          className="flex items-center text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver
        </button>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              Detalle del Reporte
              <DisciplinaryStatusBadge status={report.status} />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(report.reportDate).toLocaleDateString('es-CO')} {report.reportTime.substring(0, 5)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors tooltip"
            title="Imprimir"
          >
            <Printer className="h-5 w-5" />
          </button>
          
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Descargar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ── COLUMNA PRINCIPAL (Datos) ─────────────────────────────────── */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Estudiante */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" /> Datos del Estudiante
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div className="col-span-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">Nombre Completo</p>
                <p className="font-semibold text-slate-900 dark:text-white">{report.studentFullName}</p>
              </div>
              {report.studentDocument && (
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Documento</p>
                  <p className="font-medium text-slate-900 dark:text-white">{report.studentDocument}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Grado</p>
                <p className="font-medium text-slate-900 dark:text-white">{report.studentGrade}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Grupo</p>
                <p className="font-medium text-slate-900 dark:text-white">{report.studentGroup}</p>
              </div>
            </div>
          </div>

          {/* Situación */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" /> Clasificación
            </h3>
            
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                {report.situationSnapshot.code}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10 px-2 py-1 rounded border border-amber-200 dark:border-amber-500/20">
                {report.situationSnapshot.type}
              </span>
            </div>
            
            <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-2">
              {report.situationSnapshot.title}
            </h4>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
              {report.situationSnapshot.description}
            </p>
            
            {report.situationSnapshot.manualReference && (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-500 flex items-center gap-1.5">
                <Info className="h-4 w-4" /> Ref. Manual: {report.situationSnapshot.manualReference}
              </p>
            )}
          </div>

          {/* Relación de hechos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <AlignLeft className="h-5 w-5 text-emerald-500" /> Relación de los Hechos
            </h3>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50 mb-6">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                Texto del documento:
              </p>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed text-justify">
                {report.generatedReport}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                Tus observaciones:
              </p>
              <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-1">
                {report.teacherDescription}
              </p>
            </div>
          </div>

        </div>

        {/* ── COLUMNA LATERAL (Firmas e Historial) ──────────────────────── */}
        <div className="space-y-6">
          
          {/* Constancia de Firma */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Constancia de Firma</h3>
            
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium leading-tight">
                El estudiante firmó el reporte presencialmente.
              </p>
            </div>

            {report.studentSignatureUrl && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={report.studentSignatureUrl} 
                  alt="Firma del estudiante" 
                  className="max-h-24 object-contain dark:invert mix-blend-multiply dark:mix-blend-normal opacity-80"
                />
                <div className="w-full border-t border-slate-300 dark:border-slate-600 mt-2 mb-1" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-center">
                  Firma: {report.studentFullName}
                </p>
              </div>
            )}
          </div>

          {/* Historial de estados */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Trazabilidad</h3>
            
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={entry.id} className="relative pl-6">
                  {/* Línea conectora */}
                  {index < history.length - 1 && (
                    <div className="absolute left-[9px] top-6 bottom-[-16px] w-0.5 bg-slate-200 dark:bg-slate-700" />
                  )}
                  {/* Punto */}
                  <div className="absolute left-0 top-1.5 h-5 w-5 rounded-full border-4 border-white dark:border-slate-900 bg-blue-500" />
                  
                  <div className="mb-1">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">
                      Estado cambiado a: 
                    </span>
                    <span className="ml-2">
                      <DisciplinaryStatusBadge status={entry.newStatus} showIcon={false} />
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Por {entry.changedByName} • {new Date(entry.createdAt).toLocaleDateString('es-CO')} {new Date(entry.createdAt).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  {entry.notes && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                      {entry.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
