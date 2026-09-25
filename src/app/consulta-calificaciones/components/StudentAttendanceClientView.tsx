'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CalendarCheck2, 
  ArrowLeft, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  BookOpen, 
  User, 
  ChevronRight, 
  Filter,
  Sparkles,
  Percent,
  Check,
  FileQuestion
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  StudentAttendanceOverview, 
  StudentAttendanceSubjectSummary, 
  StudentSessionAttendanceTrace,
  getStudentSubjectAttendanceTraceability 
} from '@/modules/planilla-asistida/application/studentAttendanceQueries'

interface StudentAttendanceClientViewProps {
  attendanceData: StudentAttendanceOverview
  studentName: string
  groupName?: string
  resolvedGrade?: string
}

export function StudentAttendanceClientView({
  attendanceData,
  studentName,
  groupName,
  resolvedGrade
}: StudentAttendanceClientViewProps) {
  const { summary, subjects } = attendanceData

  // Estado de navegación entre Nivel 1 (Lista de Materias) y Nivel 2 (Trazabilidad)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [traceabilityData, setTraceabilityData] = useState<{
    subject: {
      id: string
      name: string
      grade: number
      group_number: number
      period: string
      teacherName?: string
    }
    summary: {
      totalSessions: number
      attendedCount: number
      tardyCount?: number
      unjustifiedAbsences: number
      excusedAbsences: number
      attendancePercentage: number
    }
    sessions: StudentSessionAttendanceTrace[]
  } | null>(null)

  const [isLoadingTrace, startTransition] = useTransition()
  
  // Filtros de Nivel 1 (Lista de materias)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')

  // Filtros de Nivel 2 (Trazabilidad)
  const [traceFilter, setTraceFilter] = useState<'all' | 'A' | 'T' | 'I' | 'E'>('all')

  // Períodos disponibles
  const availablePeriods = useMemo(() => {
    const set = new Set<string>()
    subjects.forEach(s => {
      if (s.period) set.add(s.period.trim())
    })
    return Array.from(set).sort()
  }, [subjects])

  // Filtrado de materias de Planilla Asistida
  const filteredSubjects = useMemo(() => {
    return subjects.filter(sub => {
      const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.teacherName && sub.teacherName.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesPeriod = selectedPeriod === 'all' || sub.period === selectedPeriod
      return matchesSearch && matchesPeriod
    })
  }, [subjects, searchTerm, selectedPeriod])

  // Al hacer clic en una materia para ver su trazabilidad
  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
    startTransition(async () => {
      try {
        const data = await getStudentSubjectAttendanceTraceability(subjectId)
        setTraceabilityData(data)
      } catch (err) {
        console.error('Error al cargar trazabilidad de asistencia:', err)
      }
    })
  }

  const handleBackToList = () => {
    setSelectedSubjectId(null)
    setTraceabilityData(null)
    setTraceFilter('all')
  }

  // Formateador de fecha amigable en español
  const formatSessionDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-')
      const date = new Date(Number(year), Number(month) - 1, Number(day))
      return date.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  // Filtrar sesiones en Nivel 2
  const filteredSessions = useMemo(() => {
    if (!traceabilityData?.sessions) return []
    if (traceFilter === 'all') return traceabilityData.sessions
    return traceabilityData.sessions.filter(s => s.status === traceFilter)
  }, [traceabilityData, traceFilter])

  const selectedSubjectSummary = useMemo(() => {
    return subjects.find(s => s.id === selectedSubjectId)
  }, [subjects, selectedSubjectId])

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* ────────────────────────────────────────────────────────────── */}
      {/* NIVEL 2: TRAZABILIDAD POR FECHAS                              */}
      {/* ────────────────────────────────────────────────────────────── */}
      {selectedSubjectId ? (
        <div className="space-y-6">
          {/* Barra de Retorno y Título de la Asignatura */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-3.5">
              <Button
                variant="outline"
                size="icon"
                onClick={handleBackToList}
                className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 shadow-sm transition-transform active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                    <CalendarCheck2 className="h-3 w-3" />
                    Trazabilidad por Fechas
                  </span>
                  {selectedSubjectSummary?.period && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      · Período {selectedSubjectSummary.period}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {selectedSubjectSummary?.name || 'Materia de Planilla Asistida'}
                </h2>
                {selectedSubjectSummary?.teacherName && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <User className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Docente: <strong>{selectedSubjectSummary.teacherName}</strong></span>
                  </p>
                )}
              </div>
            </div>

            {/* Porcentaje de asistencia en la materia */}
            {selectedSubjectSummary && (
              <div className="flex items-center gap-3 sm:self-center bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Asistencia</div>
                  <div className={`text-lg font-black ${
                    selectedSubjectSummary.attendancePercentage >= 80 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : selectedSubjectSummary.attendancePercentage >= 60 
                      ? 'text-amber-600 dark:text-amber-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {selectedSubjectSummary.attendancePercentage}%
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  selectedSubjectSummary.attendancePercentage >= 80 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                    : selectedSubjectSummary.attendancePercentage >= 60 
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' 
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}>
                  <Percent className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>

          {/* Tarjetas de Resumen de la Asignatura */}
          {selectedSubjectSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Clases</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedSubjectSummary.totalSessions}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Asistió</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {selectedSubjectSummary.attendedCount}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Llegó Tarde</div>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {selectedSubjectSummary.tardyCount || 0}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Inasistencias</div>
                  <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                    {selectedSubjectSummary.unjustifiedAbsences}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Excusas</div>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {selectedSubjectSummary.excusedAbsences}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtros de sesiones */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filtrar por:</span>
            <button
              onClick={() => setTraceFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                traceFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              Todas ({traceabilityData?.sessions.length || 0})
            </button>
            <button
              onClick={() => setTraceFilter('A')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                traceFilter === 'A'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/50'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Asistió ({selectedSubjectSummary?.attendedCount || 0})
            </button>
            <button
              onClick={() => setTraceFilter('T')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                traceFilter === 'T'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50/50'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Llegó Tarde ({selectedSubjectSummary?.tardyCount || 0})
            </button>
            <button
              onClick={() => setTraceFilter('I')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                traceFilter === 'I'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50/50'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              Inasistencias ({selectedSubjectSummary?.unjustifiedAbsences || 0})
            </button>
            <button
              onClick={() => setTraceFilter('E')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                traceFilter === 'E'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50/50'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Excusas ({selectedSubjectSummary?.excusedAbsences || 0})
            </button>
          </div>

          {/* Listado de Sesiones / Fechas */}
          {isLoadingTrace ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-white/10">
              <div className="animate-spin w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Consultando trazabilidad de clases en Planilla Asistida...
              </p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                <Calendar className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {traceFilter === 'all'
                  ? 'No hay clases registradas aún'
                  : 'No hay registros para este filtro'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {traceFilter === 'all'
                  ? 'El docente titular de esta materia aún no ha habilitado sesiones de asistencia en Planilla Asistida.'
                  : 'No se encontraron sesiones que coincidan con el estado seleccionado.'}
              </p>
              {traceFilter !== 'all' && (
                <button
                  onClick={() => setTraceFilter('all')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline pt-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Ver todas las fechas
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session, index) => {
                const isPresent = session.status === 'A'
                const isTardy = session.status === 'T'
                const isAbsent = session.status === 'I'
                const isExcused = session.status === 'E'
                const isPending = session.status === 'NONE'

                return (
                  <motion.div
                    key={session.sessionId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isPresent
                        ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40'
                        : isTardy
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50 hover:border-amber-500/40'
                        : isAbsent
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40 hover:border-rose-400/60'
                        : isExcused
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40 hover:border-amber-400/60'
                        : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Icono de estado */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isPresent
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : isTardy
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : isAbsent
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : isExcused
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {isPresent && <CheckCircle2 className="h-5 w-5" />}
                        {isTardy && <Clock className="h-5 w-5" />}
                        {isAbsent && <XCircle className="h-5 w-5" />}
                        {isExcused && <AlertCircle className="h-5 w-5" />}
                        {isPending && <Clock className="h-5 w-5 opacity-40" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white capitalize">
                            {formatSessionDate(session.date)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {session.date}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                          {session.topic && session.topic.trim() ? (
                            <span>Tema: <strong className="text-slate-800 dark:text-slate-200">{session.topic}</strong></span>
                          ) : (
                            <span className="italic text-slate-400">Sin tema específico registrado para esta sesión</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Badge de estado lateral */}
                    <div className="self-end sm:self-center shrink-0">
                      {isPresent && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Asistió
                        </span>
                      )}
                      {isTardy && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <Clock className="h-3.5 w-3.5" />
                          Llegó Tarde
                        </span>
                      )}
                      {isAbsent && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                          <XCircle className="h-3.5 w-3.5" />
                          Inasistencia
                        </span>
                      )}
                      {isExcused && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Excusa / Justificada
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                          <Clock className="h-3.5 w-3.5" />
                          Sin registrar
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────────── */
        /* NIVEL 1: LISTADO DE MATERIAS DE PLANILLA ASISTIDA             */
        /* ────────────────────────────────────────────────────────────── */
        <div className="space-y-6 sm:space-y-8">
          {/* Título Simple */}
          <div className="px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-[28px] sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-1">
                Asistencia Escolar
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Registro general de asistencia para <strong className="text-slate-700 dark:text-slate-300">{studentName}</strong>
              </p>
            </div>
            <span className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
              Módulo Planilla
            </span>
          </div>

          {/* ── Métricas de resumen rápido ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-4 px-2 sm:px-0">
            <div className="col-span-2 md:col-span-1 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 p-3.5 sm:p-5 border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">General</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300">{summary.overallPercentage}%</span>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Materias</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{summary.totalSubjects}</span>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Asistencias</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-500">{summary.totalAttended}</span>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Faltas</span>
              <span className="text-2xl sm:text-3xl font-black text-rose-500">{summary.totalUnjustified}</span>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Exc / Ret</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-500">{summary.totalExcused + (summary.totalTardy || 0)}</span>
            </div>
          </div>

          {/* Filtros y Buscador */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar materia o docente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 shadow-sm"
              />
            </div>

            {availablePeriods.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Período:</span>
                <select
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">Todos los períodos</option>
                  {availablePeriods.map(p => (
                    <option key={p} value={p}>Período {p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Listado de Materias Grid */}
          {filteredSubjects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {searchTerm || selectedPeriod !== 'all'
                  ? 'No se encontraron materias con los filtros aplicados'
                  : 'No hay materias registradas en Planilla Asistida'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchTerm || selectedPeriod !== 'all'
                  ? 'Intenta restablecer los filtros para ver todas las asignaturas disponibles.'
                  : `Actualmente los docentes de ${resolvedGrade || 'tu grado'} grupo ${groupName || ''} no han creado planillas asistidas de asistencia.`}
              </p>
              {(searchTerm || selectedPeriod !== 'all') && (
                <button
                  onClick={() => { setSearchTerm(''); setSelectedPeriod('all') }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline pt-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restablecer búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5">
              {filteredSubjects.map((sub, index) => {
                const hasSessions = sub.totalSessions > 0
                const hasAbsences = sub.unjustifiedAbsences > 0

                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => handleSelectSubject(sub.id)}
                    className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 p-3 sm:p-5 hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-900/5 dark:hover:shadow-black/40 transition-all duration-300 flex flex-col justify-between relative overflow-hidden active:scale-[0.98]"
                  >
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                            <span className="px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0">
                              P.{sub.period}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium shrink-0">
                              G{sub.grade}-{sub.group_number}
                            </span>
                          </div>
                          <h3 className="font-bold text-xs sm:text-base md:text-lg text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 leading-tight">
                            {sub.name}
                          </h3>
                        </div>

                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                      </div>

                      {sub.teacherName && (
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{sub.teacherName}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-3 sm:mt-5 pt-2.5 sm:pt-3.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2 sm:space-y-2.5">
                      {/* Porcentaje de asistencia */}
                      <div className="flex items-center justify-between text-[10px] sm:text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                          {hasSessions ? `${sub.totalSessions} clases` : 'Sin clases'}
                        </span>
                        <span className={`font-black ml-1 shrink-0 ${
                          sub.attendancePercentage >= 80
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : sub.attendancePercentage >= 60
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {hasSessions ? `${sub.attendancePercentage}%` : 'N/A'}
                        </span>
                      </div>

                      {/* Barra de progreso */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            sub.attendancePercentage >= 80
                              ? 'bg-emerald-500'
                              : sub.attendancePercentage >= 60
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${hasSessions ? sub.attendancePercentage : 0}%` }}
                        />
                      </div>

                      {/* Badges de conteo */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5">
                        <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                          {sub.attendedCount} <span className="hidden sm:inline">Asist.</span>
                        </span>
                        {sub.tardyCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                            {sub.tardyCount} <span className="hidden sm:inline">Tardes</span>
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold ${
                          hasAbsences
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                          {sub.unjustifiedAbsences} <span className="hidden sm:inline">Faltas</span>
                        </span>
                        {sub.excusedAbsences > 0 && (
                          <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                            {sub.excusedAbsences} <span className="hidden sm:inline">Exc.</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
