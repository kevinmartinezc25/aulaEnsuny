'use client'

import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  GraduationCap,
  HelpCircle,
  Award,
  Layers,
  Sparkles
} from 'lucide-react'
import { usePlanillaStats, StudentRecordByAchievements } from '../../application/usePlanillaStats'

// Dynamic import para Recharts evitando problemas con SSR / HMR cache
const TeacherCourseGradeDistributionChart = dynamic(
  () => import('@/modules/courses/presentation/components/TeacherCourseGradeDistributionChart'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[220px] w-full flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }
)

interface Props {
  subjectName?: string
}

export function PlanillaGeneralAverageDashboard({ subjectName }: Props) {
  const stats = usePlanillaStats()
  const { achievementsList, achievementStats, globalStats, studentRecords } = stats

  // Logro activo seleccionado para el panel de métricas superiores ('all' o ID del logro)
  const [selectedAchievementId, setSelectedAchievementId] = useState<string>('all')

  // Filtros de la tabla de estudiantes
  const [filterTab, setFilterTab] = useState<'all' | 'riesgo' | 'aprobados' | 'sin_calificar'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Obtener estadísticas activas según el logro seleccionado
  const currentViewStats = useMemo(() => {
    if (selectedAchievementId === 'all' || !achievementStats[selectedAchievementId]) {
      return {
        title: 'Consolidado de Todos los Logros',
        isIndividual: false,
        totalStudents: globalStats.totalStudents,
        evaluatedStudents: globalStats.evaluatedStudents,
        unassessedStudents: globalStats.unassessedStudents,
        activeStudents: globalStats.activeStudents,
        atRiskStudents: globalStats.atRiskStudents,
        approvedPct: globalStats.approvedPct,
        atRiskPct: globalStats.atRiskPct,
        unassessedPct: globalStats.unassessedPct,
        average: null,
        chartData: globalStats.chartData
      }
    }

    const achStats = achievementStats[selectedAchievementId]
    return {
      title: achStats.achievementName,
      isIndividual: true,
      totalStudents: achStats.totalStudents,
      evaluatedStudents: achStats.evaluatedStudents,
      unassessedStudents: achStats.unassessedStudents,
      activeStudents: achStats.activeStudents,
      atRiskStudents: achStats.atRiskStudents,
      approvedPct: achStats.approvedPct,
      atRiskPct: achStats.atRiskPct,
      unassessedPct: achStats.unassessedPct,
      average: achStats.achievementAverage,
      chartData: achStats.chartData
    }
  }, [selectedAchievementId, achievementStats, globalStats])

  // Filtrado de estudiantes
  const filteredStudents = useMemo(() => {
    return studentRecords.filter((student: StudentRecordByAchievements) => {
      // Filtro de pestaña
      if (filterTab === 'riesgo' && student.failingCount === 0) return false
      if (filterTab === 'aprobados' && (student.failingCount > 0 || student.passedCount === 0)) return false
      if (filterTab === 'sin_calificar' && student.status !== 'sin_calificar') return false

      // Búsqueda por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesName = student.fullName.toLowerCase().includes(query)
        const matchesNum = String(student.number).includes(query)
        return matchesName || matchesNum
      }

      return true
    })
  }, [studentRecords, filterTab, searchQuery])

  // Desempeño cualitativo del promedio cuando se visualiza un logro individual
  const getAverageDesempeno = (avg: number | null) => {
    if (avg === null) return { text: 'Sin Evaluaciones', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' }
    if (avg < 3.0) return { text: 'Bajo', color: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400' }
    if (avg <= 3.9) return { text: 'Básico', color: 'text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' }
    if (avg <= 4.5) return { text: 'Alto', color: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400' }
    return { text: 'Superior', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' }
  }

  const avgDesempeno = getAverageDesempeno(currentViewStats.average)

  return (
    <div className="w-full flex-1 overflow-y-auto px-4 py-5 sm:p-6">
      {/* Contenedor Centrado al ~70% de ancho en pantalla */}
      <div className="max-w-4xl mx-auto w-full space-y-5">

        {/* Selector de Logro en la Cabecera */}
        {achievementsList.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Analítica por Logro:
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedAchievementId('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedAchievementId === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Todos los Logros
              </button>

              {achievementsList.map((ach, idx) => (
                <button
                  key={ach.id}
                  onClick={() => setSelectedAchievementId(ach.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedAchievementId === ach.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                  title={ach.name}
                >
                  Logro {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* 1. Tarjeta Ejecutiva: Estado del Grupo para el Logro Seleccionado */}
        <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {currentViewStats.isIndividual ? currentViewStats.title : 'Estado General de Logros'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {subjectName ? `${subjectName} · ` : ''}
                {currentViewStats.isIndividual 
                  ? 'Evaluación independiente de competencias y desempeños de este logro' 
                  : 'Consolidado global de aprobación y valoración de logros'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                {currentViewStats.totalStudents} Matriculados
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                {currentViewStats.evaluatedStudents} Evaluados ({currentViewStats.totalStudents > 0 ? Math.round((currentViewStats.evaluatedStudents / currentViewStats.totalStudents) * 100) : 0}%)
              </span>
            </div>
          </div>

          {/* Barra de progreso segmentada continua estilo Apple */}
          <div className="space-y-1">
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex p-0.5 gap-0.5 shadow-inner">
              {currentViewStats.activeStudents > 0 && (
                <div 
                  className="h-full rounded-l-full bg-emerald-500 transition-all duration-500" 
                  style={{ 
                    width: `${(currentViewStats.activeStudents / (currentViewStats.totalStudents || 1)) * 100}%`,
                    borderTopRightRadius: currentViewStats.atRiskStudents === 0 && currentViewStats.unassessedStudents === 0 ? '9999px' : '2px',
                    borderBottomRightRadius: currentViewStats.atRiskStudents === 0 && currentViewStats.unassessedStudents === 0 ? '9999px' : '2px'
                  }}
                  title={`Aprobados: ${currentViewStats.activeStudents} (${currentViewStats.approvedPct}%)`}
                />
              )}
              {currentViewStats.atRiskStudents > 0 && (
                <div 
                  className="h-full bg-red-500 transition-all duration-500" 
                  style={{ 
                    width: `${(currentViewStats.atRiskStudents / (currentViewStats.totalStudents || 1)) * 100}%`,
                    borderTopLeftRadius: currentViewStats.activeStudents === 0 ? '9999px' : '2px',
                    borderBottomLeftRadius: currentViewStats.activeStudents === 0 ? '9999px' : '2px',
                    borderTopRightRadius: currentViewStats.unassessedStudents === 0 ? '9999px' : '2px',
                    borderBottomRightRadius: currentViewStats.unassessedStudents === 0 ? '9999px' : '2px'
                  }}
                  title={`En Riesgo (Desempeño Bajo): ${currentViewStats.atRiskStudents} (${currentViewStats.atRiskPct}%)`}
                />
              )}
              {currentViewStats.unassessedStudents > 0 && (
                <div 
                  className="h-full rounded-r-full bg-slate-300 dark:bg-slate-700 transition-all duration-500" 
                  style={{ 
                    width: `${(currentViewStats.unassessedStudents / (currentViewStats.totalStudents || 1)) * 100}%`,
                    borderTopLeftRadius: currentViewStats.activeStudents === 0 && currentViewStats.atRiskStudents === 0 ? '9999px' : '2px',
                    borderBottomLeftRadius: currentViewStats.activeStudents === 0 && currentViewStats.atRiskStudents === 0 ? '9999px' : '2px'
                  }}
                  title={`Sin Calificaciones: ${currentViewStats.unassessedStudents} (${currentViewStats.unassessedPct}%)`}
                />
              )}
            </div>
          </div>

          {/* 4 Indicadores KPI Horizontales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-0.5">
            {/* Promedio del Logro o Tasa de Logro */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  {currentViewStats.isIndividual ? 'Promedio del Logro' : 'Total Evaluaciones'}
                </span>
                {currentViewStats.isIndividual && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${avgDesempeno.color}`}>
                    {avgDesempeno.text}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-emerald-950 dark:text-emerald-200 mt-1">
                {currentViewStats.isIndividual 
                  ? (currentViewStats.average !== null ? currentViewStats.average.toFixed(2) : '-.-')
                  : `${currentViewStats.evaluatedStudents}`}
              </p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 font-medium">
                {currentViewStats.isIndividual ? 'Escala institucional 1.0 a 5.0' : `${achievementsList.length} Logros activos`}
              </p>
            </div>

            {/* Aprobados */}
            <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Aprobados (≥ 3.0)</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-950 dark:text-emerald-200 mt-1">
                {currentViewStats.activeStudents}
              </p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 font-medium">
                {currentViewStats.approvedPct}% de alumnos
              </p>
            </div>

            {/* En Riesgo (Bajo) */}
            <div className="p-3 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-100/70 dark:border-red-900/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-red-900 dark:text-red-300">Desempeño Bajo (&lt; 3.0)</span>
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              </div>
              <p className="text-2xl font-black text-red-950 dark:text-red-200 mt-1">
                {currentViewStats.atRiskStudents}
              </p>
              <p className="text-[11px] text-red-700/80 dark:text-red-400/80 mt-0.5 font-medium">
                {currentViewStats.atRiskPct}% requiere refuerzo
              </p>
            </div>

            {/* Sin Calificaciones */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Pendientes</span>
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {currentViewStats.unassessedStudents}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {currentViewStats.unassessedStudents === 0 ? '100% evaluado' : `${currentViewStats.unassessedPct}% sin notas`}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Gráfica Principal: Barras por Escala de Desempeño */}
        <div className="w-full rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800/50 space-y-2.5">
              <div className="text-left">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Distribución por Escalas de Desempeño
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentViewStats.isIndividual 
                    ? `Frecuencia de estudiantes por escala en "${currentViewStats.title}"` 
                    : 'Frecuencia consolidada de evaluaciones por escala de desempeño'}
                </p>
              </div>

              {/* Leyenda Visual de Rangos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1 rounded-xl bg-red-50/80 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200/50 dark:border-red-900/40 text-[11px] font-semibold">
                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0"></span>
                  <span className="truncate">&lt; 3.0 Bajo</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50/80 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40 text-[11px] font-semibold">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="truncate">3.0 - 3.9 Básico</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50/80 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/40 text-[11px] font-semibold">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="truncate">4.0 - 4.5 Alto</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40 text-[11px] font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="truncate">4.6 - 5.0 Superior</span>
                </div>
              </div>
            </div>

            <div className="mt-4 w-full">
              <TeacherCourseGradeDistributionChart data={currentViewStats.chartData} />
            </div>
          </div>

          {/* Mini Resumen Inferior */}
          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {currentViewStats.chartData.map((item) => (
              <div key={item.range} className="p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">
                  {item.label} ({item.desempeno})
                </p>
                <p className="text-sm font-bold mt-0.5" style={{ color: item.color }}>
                  {item.count} <span className="text-[11px] font-medium opacity-80">({item.percentage}%)</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Panel de Detalle: Matriz de Logros Independiente por Estudiante */}
        <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Listado Detallado de Estudiantes por Logro
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Definitiva y nivel de desempeño cualitativo (Bajo, Básico, Alto, Superior) calculado independientemente para cada logro
              </p>
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o #..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Filtros por Estado */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              Todos ({stats.totalStudents})
            </button>
            <button
              onClick={() => setFilterTab('riesgo')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filterTab === 'riesgo'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              Con Logros en Riesgo ({stats.globalStats.atRiskStudents})
            </button>
            <button
              onClick={() => setFilterTab('aprobados')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filterTab === 'aprobados'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              Todos Aprobados ({stats.globalStats.activeStudents})
            </button>
            <button
              onClick={() => setFilterTab('sin_calificar')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filterTab === 'sin_calificar'
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              Sin Calificar ({stats.globalStats.unassessedStudents})
            </button>
          </div>

          {/* Tabla de Estudiantes con Columnas Dinámicas por Logro */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                  <th className="py-2.5 px-3 font-bold min-w-[180px]">Estudiante</th>
                  
                  {/* Columnas Dinámicas por Logro */}
                  {achievementsList.map((ach, idx) => (
                    <th key={ach.id} className="py-2.5 px-3 font-bold text-center min-w-[140px]" title={ach.name}>
                      <div className="flex flex-col items-center">
                        <span className="text-slate-900 dark:text-white font-extrabold">Logro {idx + 1}</span>
                        <span className="text-[10px] font-normal text-slate-400 truncate max-w-[130px]">{ach.name}</span>
                      </div>
                    </th>
                  ))}

                  {/* Estado Diagnóstico */}
                  <th className="py-2.5 px-3 font-bold text-center min-w-[150px]">
                    Diagnóstico Institucional
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={achievementsList.length + 3} className="py-10 text-center">
                      <Award className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {filterTab === 'riesgo' 
                          ? '¡Excelente! Ningún estudiante tiene logros en desempeño bajo (< 3.0).' 
                          : 'No se encontraron estudiantes para este criterio de búsqueda.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const formattedName = student.fullName
                      .toLowerCase()
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')

                    return (
                      <tr 
                        key={student.id} 
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* # */}
                        <td className="py-3 px-3 text-center font-bold text-slate-500">
                          {student.number}
                        </td>

                        {/* Nombre */}
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {formattedName}
                          </p>
                        </td>

                        {/* Columnas por cada Logro con Nota y Desempeño */}
                        {achievementsList.map((ach) => {
                          const record = student.achievementsData[ach.id]

                          if (!record || record.grade === null) {
                            return (
                              <td key={ach.id} className="py-3 px-3 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                                  -.- · Pendiente
                                </span>
                              </td>
                            )
                          }

                          return (
                            <td key={ach.id} className="py-3 px-3 text-center">
                              <span 
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs ${record.badgeColor}`}
                                title={`${ach.name}: Definitiva ${record.grade.toFixed(1)} (Desempeño ${record.desempeno})`}
                              >
                                <span>{record.grade.toFixed(1)}</span>
                                <span className="text-[10px] font-semibold opacity-90">· {record.desempeno}</span>
                              </span>
                            </td>
                          )
                        })}

                        {/* Diagnóstico Institucional */}
                        <td className="py-3 px-3 text-center">
                          {student.failingCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              {student.failingCount} {student.failingCount === 1 ? 'Logro en Riesgo' : 'Logros en Riesgo'}
                            </span>
                          ) : student.passedCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50">
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                              {student.passedCount === achievementsList.length ? 'Aprobó todos los logros' : `${student.passedCount} aprobados`}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400 italic">
                              Sin notas
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
