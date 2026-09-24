'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Calendar, 
  Clock, 
  User, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ChevronDown, 
  Info,
  BookOpen,
  Award
} from 'lucide-react'
import { DisciplinaryReport, StudentDisciplinaryHistory } from '@/modules/disciplinary/application/actions'
import { DisciplinaryStatusBadge } from '@/components/disciplinary/DisciplinaryStatusBadge'
import { generateDisciplinaryPDF } from '@/components/disciplinary/DisciplinaryPDFGenerator'

interface StudentDisciplinaryClientViewProps {
  summary: StudentDisciplinaryHistory
  reports: DisciplinaryReport[]
  studentName: string
  groupName?: string
}

export function StudentDisciplinaryClientView({
  summary,
  reports,
  studentName,
  groupName
}: StudentDisciplinaryClientViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'Tipo I' | 'Tipo II' | 'Tipo III'>('all')
  const [expandedReportId, setExpandedReportId] = useState<string | null>(
    reports.length > 0 ? reports[0].id : null
  )
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const filteredReports = reports.filter(r => {
    if (selectedFilter === 'all') return true
    return r.situationSnapshot?.type === selectedFilter
  })

  const handleDownloadPDF = async (report: DisciplinaryReport) => {
    try {
      setDownloadingId(report.id)
      await generateDisciplinaryPDF(report)
    } catch (err) {
      console.error('Error al generar PDF del reporte:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedReportId(prev => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* ── Encabezado informativo ── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white via-slate-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/20 p-5 sm:p-7 border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Convivencia Escolar Institucional</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Seguimiento Convivencial y Pedagógico
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Estudiante: <strong className="text-slate-800 dark:text-slate-200">{studentName}</strong>
              {groupName && (
                <span> · Grupo: <strong className="text-slate-800 dark:text-slate-200">{groupName}</strong></span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <span className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
              Modo Solo Lectura
            </span>
          </div>
        </div>

        {/* ── Métricas de resumen rápido ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mt-5 pt-5 border-t border-slate-200/70 dark:border-slate-800">
          <div className="rounded-xl sm:rounded-2xl bg-white/70 dark:bg-slate-800/60 p-3 border border-slate-200/60 dark:border-white/5">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Novedades
            </p>
            <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {summary.totalReports}
            </p>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 p-3 border border-sky-500/20">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              Tipo I (Leves)
            </p>
            <p className="text-lg sm:text-2xl font-black text-sky-700 dark:text-sky-300 mt-0.5">
              {summary.tipoI}
            </p>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 p-3 border border-amber-500/20">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Tipo II (Graves)
            </p>
            <p className="text-lg sm:text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
              {summary.tipoII}
            </p>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 p-3 border border-rose-500/20">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Tipo III (Gravísimas)
            </p>
            <p className="text-lg sm:text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5">
              {summary.tipoIII}
            </p>
          </div>
        </div>
      </div>

      {/* ── Si no tiene reportes: Reconocimiento de Buen Comportamiento ── */}
      {reports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-500/25 p-8 sm:p-12 text-center space-y-4"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm">
            <Award className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-[#1F4E31] dark:text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>¡Comportamiento Ejemplar!</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              No tienes reportes de convivencia registrados
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              No registras sanciones, faltas ni llamados de atención tipificados en el Manual de Convivencia Institucional durante el año lectivo. ¡Sigue así, aportando a un ambiente armónico y respetuoso!
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* ── Filtros por Tipo de Situación ── */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({reports.length})
              </button>
              {summary.tipoI > 0 && (
                <button
                  onClick={() => setSelectedFilter('Tipo I')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFilter === 'Tipo I'
                      ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300'
                  }`}
                >
                  Tipo I ({summary.tipoI})
                </button>
              )}
              {summary.tipoII > 0 && (
                <button
                  onClick={() => setSelectedFilter('Tipo II')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFilter === 'Tipo II'
                      ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300'
                  }`}
                >
                  Tipo II ({summary.tipoII})
                </button>
              )}
              {summary.tipoIII > 0 && (
                <button
                  onClick={() => setSelectedFilter('Tipo III')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFilter === 'Tipo III'
                      ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300'
                  }`}
                >
                  Tipo III ({summary.tipoIII})
                </button>
              )}
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando {filteredReports.length} {filteredReports.length === 1 ? 'reporte' : 'reportes'}
            </span>
          </div>

          {/* ── Listado de Reportes Convivenciales ── */}
          <div className="space-y-3 sm:space-y-4">
            {filteredReports.map((report) => {
              const isExpanded = expandedReportId === report.id
              const isTipoI = report.situationSnapshot?.type === 'Tipo I'
              const isTipoII = report.situationSnapshot?.type === 'Tipo II'
              const isTipoIII = report.situationSnapshot?.type === 'Tipo III'

              const badgeTypeClass = isTipoI
                ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                : isTipoII
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'

              return (
                <div
                  key={report.id}
                  className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden transition-all duration-200"
                >
                  {/* Encabezado del acordeón */}
                  <div
                    onClick={() => toggleExpand(report.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`mt-0.5 sm:mt-0 w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl border flex items-center justify-center shrink-0 ${badgeTypeClass}`}>
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border ${badgeTypeClass}`}>
                            {report.situationSnapshot?.type || 'Tipo I'}
                          </span>
                          <DisciplinaryStatusBadge status={report.status} />
                          {report.signatureConfirmed && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Firmado
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {report.situationSnapshot?.title || 'Novedad de Convivencia'}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {report.reportDate}
                          </span>
                          {report.reportTime && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {report.reportTime.slice(0, 5)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            Docente: {report.teacherName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadPDF(report)
                        }}
                        disabled={downloadingId === report.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                        title="Descargar constancia en PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {downloadingId === report.id ? 'Generando...' : 'Descargar PDF'}
                        </span>
                      </button>

                      <div className="text-slate-400 dark:text-slate-500">
                        <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo expandible con los detalles completos del reporte */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-6 space-y-4"
                      >
                        {/* Referencia al manual */}
                        {report.situationSnapshot?.manualReference && (
                          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300">
                            <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                            <div>
                              <strong className="font-semibold">Referencia Manual de Convivencia:</strong>{' '}
                              <span>{report.situationSnapshot.manualReference}</span>
                              {report.situationSnapshot.description && (
                                <p className="mt-1 text-[11px] text-blue-800/80 dark:text-blue-400">
                                  {report.situationSnapshot.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Descripción de los hechos por el docente */}
                        <div className="space-y-1.5">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Descripción de los hechos y observaciones pedagógicas
                          </h5>
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                            {report.teacherDescription || report.generatedReport || 'Sin descripción detallada.'}
                          </div>
                        </div>

                        {/* Versión libre del estudiante (si existe) */}
                        {report.studentDefense && (
                          <div className="space-y-1.5">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Versión libre y aclaraciones del estudiante
                            </h5>
                            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                              {report.studentDefense}
                            </div>
                          </div>
                        )}

                        {/* Compromisos y acuerdos pedagógicos */}
                        {report.studentCommitment && (
                          <div className="space-y-1.5">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              Compromisos y acuerdos pedagógicos asumidos
                            </h5>
                            <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 leading-relaxed whitespace-pre-line">
                              {report.studentCommitment}
                            </div>
                          </div>
                        )}

                        {/* Pie de firma y constancia */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            {report.signatureConfirmed ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                Reporte notificado y firmado por el estudiante
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                                <AlertTriangle className="w-4 h-4" />
                                Notificación formal registrada en sistema
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleDownloadPDF(report)}
                            disabled={downloadingId === report.id}
                            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar copia del acta (.pdf)</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Nota institucional de debido proceso y Ley 1620 ── */}
      <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong>Marco Institucional de Convivencia:</strong> Los registros convivenciales forman parte del seguimiento formativo integral orientado por la Ley 1620 de 2013 y el Manual de Convivencia Escolar. Tienen como propósito el fortalecimiento de los valores pedagógicos, el diálogo constructivo y el debido proceso. Para cualquier inquietud o seguimiento adicional, comunícate con la Coordinación de Convivencia de la institución.
        </p>
      </div>
    </div>
  )
}
