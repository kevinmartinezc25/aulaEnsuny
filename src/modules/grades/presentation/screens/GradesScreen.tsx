'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  TrendingUp, 
  Star, 
  ClipboardCheck, 
  Wrench, 
  ArrowLeft, 
  Target, 
  Award, 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  User, 
  FileText,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { getStudentAssistedReport, PlanillaSubjectReport, PlanillaAchievement } from '@/modules/planilla-asistida/application/studentGradesActions'

const COMPONENT_CONFIG: Record<'hacer' | 'saber' | 'ser', { label: string; icon: React.ReactNode; color: string }> = {
  hacer: { label: 'Hacer', icon: <Wrench className="h-3 w-3" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  saber: { label: 'Saber', icon: <BookOpen className="h-3 w-3" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  ser: { label: 'Ser', icon: <Star className="h-3 w-3" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
}

function getLevelBadge(level: string | null) {
  if (!level || level === '-') return 'bg-slate-100 text-slate-500 dark:bg-slate-800'
  if (level === 'Superior') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-bold'
  if (level === 'Alto') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold'
  if (level === 'Básico') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold'
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold'
}

export function GradesScreen() {
  const [report, setReport] = useState<{
    subjects: PlanillaSubjectReport[]
    generalAverage: number
    generalPerformanceLevel: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedAchievementIndex, setSelectedAchievementIndex] = useState<number>(0)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getStudentAssistedReport()
        setReport(data)
      } catch (err: any) {
        console.error('Error cargando boletín asistido:', err)
        setError('No se pudo cargar el boletín. Intenta de nuevo más tarde.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const availablePeriods = useMemo(() => {
    if (!report?.subjects) return []
    const set = new Set<string>()
    report.subjects.forEach(s => {
      if (s.period) set.add(s.period.trim())
    })
    return Array.from(set).sort()
  }, [report?.subjects])

  const filteredSubjects = useMemo(() => {
    if (!report?.subjects) return []
    return report.subjects.filter(sub => {
      const matchesSearch = sub.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.teacherName && sub.teacherName.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesPeriod = selectedPeriod === 'all' || sub.period === selectedPeriod
      return matchesSearch && matchesPeriod
    })
  }, [report?.subjects, searchTerm, selectedPeriod])

  const summaryStats = useMemo(() => {
    if (!report?.subjects) return { total: 0, approved: 0, failed: 0 }
    const total = report.subjects.length
    const approved = report.subjects.filter(s => (s.finalAverage || 0) >= 3.0).length
    const failed = report.subjects.filter(s => s.finalAverage !== null && s.finalAverage < 3.0).length
    return { total, approved, failed }
  }, [report?.subjects])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-[90%] sm:w-full max-w-4xl mx-auto py-5 sm:py-6 space-y-5 sm:space-y-6 px-0 sm:px-4 text-left">
        <div>
          <Link 
            href="/student/dashboard" 
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Portal</span>
          </Link>
        </div>
        <div className="text-center py-16 rounded-3xl border border-dashed border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/10 p-8">
          <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
        </div>
      </div>
    )
  }

  if (!report || report.subjects.length === 0) {
    return (
      <div className="w-[90%] sm:w-full max-w-4xl mx-auto py-5 sm:py-6 space-y-5 sm:space-y-6 px-0 sm:px-4 text-left">
        <div>
          <Link 
            href="/student/dashboard" 
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Portal</span>
          </Link>
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Reporte de Calificaciones
          </h1>
        </div>
        <div className="text-center py-16 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-8">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hay materias disponibles</h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            Aún no has sido agregado a ninguna planilla asistida o tus docentes no han publicado las planillas para este período.
          </p>
        </div>
      </div>
    )
  }

  const selectedSubject = report.subjects.find(s => s.subjectId === selectedSubjectId)

  // Vista de Detalle de Materia
  if (selectedSubject) {
    const achievements = selectedSubject.achievements || []
    const activeAchievement = achievements[selectedAchievementIndex] || achievements[0]

    // Componentes estándar: HACER (35%), SABER (35%), SER (30%)
    const COMPONENTS_ORDER = [
      { key: 'hacer' as const, label: 'HACER', percentage: 35 },
      { key: 'saber' as const, label: 'SABER', percentage: 35 },
      { key: 'ser' as const, label: 'SER', percentage: 30 },
    ]

    const compStats = COMPONENTS_ORDER.map(comp => {
      const compActivities = activeAchievement?.activities.filter(a => a.componentType === comp.key) || []
      const gradedActivities = compActivities.filter(a => a.grade !== null)
      const average = gradedActivities.length > 0 
        ? gradedActivities.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedActivities.length 
        : null
      return {
        ...comp,
        activities: compActivities,
        average
      }
    })

    // Calcular promedio ponderado del logro
    const activeComps = compStats.filter(c => c.average !== null)
    let achievementAvg: number | null = null

    if (activeComps.length > 0) {
      const totalWeight = activeComps.reduce((acc, curr) => acc + curr.percentage, 0)
      const weightedSum = activeComps.reduce((acc, curr) => acc + (curr.average! * curr.percentage), 0)
      achievementAvg = totalWeight > 0 ? (weightedSum / totalWeight) : null
    } else if (activeAchievement?.achievementAverage !== null && activeAchievement?.achievementAverage !== undefined) {
      achievementAvg = activeAchievement.achievementAverage
    }

    function getPerformanceInfo(avg: number | null) {
      if (avg === null) {
        return {
          level: 'Pendiente',
          badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          textClass: 'text-slate-600 dark:text-slate-400',
          cardBorder: 'border-slate-200 dark:border-slate-800',
          cardBg: 'from-slate-50/40 via-white to-slate-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900'
        }
      }
      if (avg >= 4.6) {
        return {
          level: 'Superior',
          badgeClass: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
          textClass: 'text-purple-600 dark:text-purple-400',
          cardBorder: 'border-purple-200/80 dark:border-purple-800/40',
          cardBg: 'from-purple-50/20 via-white to-purple-50/10 dark:from-purple-950/10 dark:via-slate-900 dark:to-purple-950/5'
        }
      }
      if (avg >= 4.0) {
        return {
          level: 'Alto',
          badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          textClass: 'text-blue-600 dark:text-blue-400',
          cardBorder: 'border-blue-200/80 dark:border-blue-800/40',
          cardBg: 'from-blue-50/20 via-white to-blue-50/10 dark:from-blue-950/10 dark:via-slate-900 dark:to-blue-950/5'
        }
      }
      if (avg >= 3.0) {
        return {
          level: 'Básico',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700',
          textClass: 'text-amber-600 dark:text-amber-500',
          cardBorder: 'border-amber-200 dark:border-amber-800/50',
          cardBg: 'from-amber-50/30 via-white to-amber-50/10 dark:from-amber-950/15 dark:via-slate-900 dark:to-amber-950/5'
        }
      }
      return {
        level: 'Bajo',
        badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
        textClass: 'text-red-600 dark:text-red-400',
        cardBorder: 'border-red-200/80 dark:border-red-800/40',
        cardBg: 'from-red-50/20 via-white to-red-50/10 dark:from-red-950/10 dark:via-slate-900 dark:to-red-950/5'
      }
    }

    const perf = getPerformanceInfo(achievementAvg)

    return (
      <div className="w-[90%] sm:w-full max-w-4xl mx-auto py-5 sm:py-6 space-y-4 sm:space-y-5 px-0 sm:px-4 overflow-hidden">
        {/* Barra superior de navegación */}
        <div className="flex items-center justify-between pb-1">
          <button 
            onClick={() => setSelectedSubjectId(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Materias
          </button>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
            {selectedSubject.subjectName}
          </span>
        </div>

        {achievements.length === 0 ? (
          <div className="text-center py-12 sm:py-16 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 sm:p-8">
            <Target className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-300 dark:text-slate-700 mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Sin logros registrados</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              El docente aún no ha publicado logros ni actividades evaluativas para esta materia.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. Selector Dropdown de Logro (idéntico a la imagen) */}
            <div className="relative w-full">
              <select
                value={selectedAchievementIndex}
                onChange={(e) => setSelectedAchievementIndex(Number(e.target.value))}
                className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl text-sm font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-xs cursor-pointer"
              >
                {achievements.map((ach, idx) => (
                  <option key={ach.achievementId} value={idx}>
                    Logro {idx + 1}: {ach.name || `Logro ${idx + 1}`}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* 2. Título del Logro */}
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeAchievement?.name || `Logro ${selectedAchievementIndex + 1}`}
              </h2>
              {activeAchievement?.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {activeAchievement.description}
                </p>
              )}
            </div>

            {/* 3. Cards individuales por componente: HACER, SABER, SER (siempre se muestran) */}
            <div className="space-y-3.5">
              {compStats.map((comp) => (
                <div
                  key={comp.key}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
                >
                  {/* Encabezado del componente */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-[13px] font-black text-slate-800 dark:text-slate-200 tracking-wider">
                      {comp.label} <span className="font-normal text-slate-400">- {comp.percentage}%</span>
                    </span>
                    <span className="text-xs sm:text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                      Promedio: <strong className={`font-bold ${
                        comp.average !== null && comp.average < 3.0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-teal-600 dark:text-teal-400'
                      }`}>
                        {comp.average !== null ? comp.average.toFixed(1) : '—'}
                      </strong>
                    </span>
                  </div>

                  {/* Lista de Actividades y Notas */}
                  <div className="space-y-2 pt-0.5">
                    {comp.activities.length === 0 ? (
                      <div className="py-2 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                        Sin actividades registradas
                      </div>
                    ) : (
                      comp.activities.map((act) => {
                        const isFailing = act.grade !== null && act.grade < 3.0
                        return (
                          <div
                            key={act.activityId}
                            className="flex items-center justify-between py-1 gap-3"
                          >
                            <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 flex-1 min-w-0 break-words">
                              {act.name}
                            </span>
                            <div className={`border rounded-xl px-4 py-1.5 min-w-[58px] text-center shrink-0 ${
                              isFailing
                                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700/60'
                            }`}>
                              <span className={`text-xs sm:text-sm font-black ${
                                isFailing
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}>
                                {act.grade !== null ? act.grade.toFixed(1) : '—'}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 4. Card Promedio del Logro (idéntica a la imagen adjunta) */}
            <div className={`relative overflow-hidden rounded-3xl border ${perf.cardBorder} bg-gradient-to-b ${perf.cardBg} p-6 text-center shadow-xs space-y-2`}>
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Promedio del Logro
                </h3>
                {achievementAvg !== null && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${perf.badgeClass}`}>
                    {perf.level}
                  </span>
                )}
              </div>

              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto">
                Calculado según los porcentajes (Hacer 35%, Saber 35%, Ser 30%)
              </p>

              <div className={`my-2.5 mx-auto w-fit px-8 py-2 rounded-2xl border shadow-xs ${
                achievementAvg !== null && achievementAvg < 3.0
                  ? 'bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50'
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60'
              }`}>
                <span className={`text-3xl sm:text-4xl font-black ${perf.textClass}`}>
                  {achievementAvg !== null ? achievementAvg.toFixed(1) : '—'}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Desempeño: <span className={`font-black ${perf.textClass}`}>{perf.level}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Vista Principal (Grid de Materias)
  return (
    <div className="w-[90%] sm:w-full max-w-4xl mx-auto py-5 sm:py-6 space-y-5 sm:space-y-6 px-0 sm:px-4 animate-in fade-in duration-200">
      <div>
        <Link 
          href="/student/dashboard" 
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Portal</span>
        </Link>
      </div>

      {/* Título */}
      <div>
        <h1 className="text-[28px] sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-1">
          Reporte de Calificaciones
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Registro de notas y desempeño académico por asignaturas
        </p>
      </div>

      {/* ── Métricas de resumen rápido (idéntico a /student/attendance) ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="col-span-2 md:col-span-1 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 p-3.5 sm:p-5 border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">General</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300">
            {report.generalAverage > 0 ? report.generalAverage.toFixed(1) : 'N/A'}
          </span>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Materias</span>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{summaryStats.total}</span>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Desempeño</span>
          <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
            {report.generalPerformanceLevel || '-'}
          </span>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Aprobadas</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-500">{summaryStats.approved}</span>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Por Mejorar</span>
          <span className="text-2xl sm:text-3xl font-black text-rose-500">{summaryStats.failed}</span>
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
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm"
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

      {/* Grid de Materias */}
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
              : 'Actualmente no se registran asignaturas con notas en tu planilla asistida.'}
          </p>
          {(searchTerm || selectedPeriod !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedPeriod('all') }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5">
          {filteredSubjects.map((sub, index) => {
            const hasGrade = sub.finalAverage !== null && sub.finalAverage !== undefined
            const avg = sub.finalAverage || 0
            const progressPct = hasGrade ? Math.min(100, Math.max(0, (avg / 5) * 100)) : 0

            const totalActivities = sub.achievements?.reduce((acc, ach) => acc + (ach.activities?.length || 0), 0) || 0
            const gradedActivities = sub.achievements?.reduce((acc, ach) => acc + (ach.activities?.filter(a => a.grade !== null).length || 0), 0) || 0

            return (
              <motion.div
                key={sub.subjectId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => {
                  setSelectedSubjectId(sub.subjectId)
                  setSelectedAchievementIndex(0)
                }}
                className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 p-3 sm:p-5 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-900/5 dark:hover:shadow-black/40 transition-all duration-300 flex flex-col justify-between relative overflow-hidden active:scale-[0.98]"
              >
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                        {sub.period && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0">
                            P.{sub.period}
                          </span>
                        )}
                        {sub.grade && (
                          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium shrink-0">
                            G{sub.grade}-{sub.groupNumber || 1}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-xs sm:text-base md:text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight break-words">
                        {sub.subjectName}
                      </h3>
                    </div>

                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
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
                  {/* Promedio general */}
                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                      {hasGrade ? 'Promedio' : 'Sin calificar'}
                    </span>
                    <span className={`font-black ml-1 shrink-0 ${
                      hasGrade
                        ? avg >= 4.0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : avg >= 3.0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400'
                    }`}>
                      {hasGrade ? avg.toFixed(1) : 'N/A'}
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        hasGrade
                          ? avg >= 4.0
                            ? 'bg-emerald-500'
                            : avg >= 3.0
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Badges de conteo */}
                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5">
                    {hasGrade && sub.performanceLevel && sub.performanceLevel !== '-' && (
                      <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold ${
                        avg >= 4.0
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : avg >= 3.0
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      }`}>
                        <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                        {sub.performanceLevel}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                      {sub.achievements?.length || 0} <span className="hidden sm:inline">{(sub.achievements?.length || 0) === 1 ? 'logro' : 'logros'}</span>
                    </span>
                    {totalActivities > 0 && (
                      <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                        <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                        {gradedActivities}/{totalActivities} <span className="hidden sm:inline">act.</span>
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
  )
}
