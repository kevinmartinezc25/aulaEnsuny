'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, FolderOpen, TrendingUp, HelpCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { getTeacherCourseStats, TeacherCourseStats } from '../../application/teacherActions'
import { getCourseJoinCode } from '../../application/joinRequestsActions'

const TeacherCourseGradeDistributionChart = dynamic(
  () => import('../components/TeacherCourseGradeDistributionChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] w-full flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }
)

export function TeacherCourseDashboardScreen({ courseId }: { courseId: string }) {
  const [stats, setStats] = useState<TeacherCourseStats | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [data, code] = await Promise.all([
          getTeacherCourseStats(courseId),
          getCourseJoinCode(courseId)
        ])
        setStats(data)
        setJoinCode(code)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [courseId])

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const statCards = [
    { title: 'Módulos activos', value: stats.modulesCount, icon: FolderOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30', href: `/teacher/courses/${courseId}/modules` },
    { title: 'Quizzes creados', value: stats.quizzesCount, icon: HelpCircle, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30', href: `/teacher/courses/${courseId}/quizzes` },
    { title: 'Estudiantes', value: stats.studentsCount, icon: Users, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', href: `/teacher/courses/${courseId}/students` },
    { title: 'Promedio del curso', value: stats.averageGrade.toFixed(1), icon: TrendingUp, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30', href: `/teacher/courses/${courseId}/grades` },
  ]

  const totalEvaluated = stats.chartData.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <div className="space-y-8">
      {/* Cabecera Interna */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center text-xs font-medium text-slate-400 mb-2 gap-y-1">
          <span className="shrink-0">Mis materias</span>
          <span className="mx-2 shrink-0">/</span>
          <span className="text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-xs" title={stats.title}>{stats.title}</span>
          <span className="mx-2 shrink-0">/</span>
          <span className="shrink-0">Gestión del Curso</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
          Gestión del Curso
        </h1>
        {joinCode ? (
          <div className="mt-3 flex flex-col sm:flex-row w-full sm:w-fit items-start sm:items-center gap-2 sm:gap-3 rounded-2xl sm:rounded-full border border-emerald-100 bg-emerald-50/80 px-5 sm:px-4 py-3.5 sm:py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
            <span className="opacity-80">Código de acceso</span>
            <span className="font-mono tracking-[0.25em] text-lg sm:text-base bg-white/50 dark:bg-black/20 px-3 py-1 rounded-md">{joinCode}</span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Aún no hay un código de acceso configurado para este curso.
          </p>
        )}
        <p className="text-slate-500 dark:text-slate-400">
          Supervisa el rendimiento y contenido de esta materia.
        </p>
      </div>

      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.title}
              href={stat.href}
              className="group block rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-md hover:border-slate-200 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:border-slate-700 transition-all active:scale-[0.98]"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl shrink-0 ${stat.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 truncate sm:whitespace-normal group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {stat.title}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Contenedor Centrado al ~70% de ancho en pantalla (max-w-4xl mx-auto) */}
      <div className="max-w-4xl mx-auto w-full space-y-5">
        {/* 1. Franja Superior: Estado General del Grupo (Compacto) */}
        {(() => {
          const totalStudents = stats.studentsCount > 0 ? stats.studentsCount : 1
          const approvedPct = Math.round((stats.activeStudents / totalStudents) * 100)
          const atRiskPct = Math.round((stats.atRiskStudents / totalStudents) * 100)
          const unassessedCount = stats.unassessedStudents || Math.max(0, stats.studentsCount - (stats.activeStudents + stats.atRiskStudents))
          const unassessedPct = Math.max(0, 100 - approvedPct - atRiskPct)

          return (
            <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/50">
                <div className="text-left">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Estado General del Grupo
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Consolidado de rendimiento académico y aprobación global del curso
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                    {stats.studentsCount} {stats.studentsCount === 1 ? 'Matriculado' : 'Matriculados'}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                    {stats.evaluatedStudents || (stats.activeStudents + stats.atRiskStudents)} Evaluados ({Math.min(100, Math.round(((stats.evaluatedStudents || (stats.activeStudents + stats.atRiskStudents)) / totalStudents) * 100))}%)
                  </span>
                </div>
              </div>

              {/* Barra de progreso segmentada continua estilo Apple */}
              <div className="space-y-1">
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex p-0.5 gap-0.5 shadow-inner">
                  {stats.activeStudents > 0 && (
                    <div 
                      className="h-full rounded-l-full bg-emerald-500 transition-all duration-500" 
                      style={{ 
                        width: `${(stats.activeStudents / totalStudents) * 100}%`,
                        borderTopRightRadius: stats.atRiskStudents === 0 && unassessedCount === 0 ? '9999px' : '2px',
                        borderBottomRightRadius: stats.atRiskStudents === 0 && unassessedCount === 0 ? '9999px' : '2px'
                      }}
                      title={`Aprobados: ${stats.activeStudents} (${approvedPct}%)`}
                    />
                  )}
                  {stats.atRiskStudents > 0 && (
                    <div 
                      className="h-full bg-red-500 transition-all duration-500" 
                      style={{ 
                        width: `${(stats.atRiskStudents / totalStudents) * 100}%`,
                        borderTopLeftRadius: stats.activeStudents === 0 ? '9999px' : '2px',
                        borderBottomLeftRadius: stats.activeStudents === 0 ? '9999px' : '2px',
                        borderTopRightRadius: unassessedCount === 0 ? '9999px' : '2px',
                        borderBottomRightRadius: unassessedCount === 0 ? '9999px' : '2px'
                      }}
                      title={`En Riesgo: ${stats.atRiskStudents} (${atRiskPct}%)`}
                    />
                  )}
                  {unassessedCount > 0 && (
                    <div 
                      className="h-full rounded-r-full bg-slate-300 dark:bg-slate-700 transition-all duration-500" 
                      style={{ 
                        width: `${(unassessedCount / totalStudents) * 100}%`,
                        borderTopLeftRadius: stats.activeStudents === 0 && stats.atRiskStudents === 0 ? '9999px' : '2px',
                        borderBottomLeftRadius: stats.activeStudents === 0 && stats.atRiskStudents === 0 ? '9999px' : '2px'
                      }}
                      title={`Sin Calificaciones: ${unassessedCount} (${unassessedPct}%)`}
                    />
                  )}
                </div>
              </div>

              {/* Indicadores KPI horizontales compactos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
                <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-xs">
                    {stats.activeStudents}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 dark:text-emerald-300 truncate">
                      Aprobados (≥ 3.0)
                    </p>
                    <p className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-400/80">
                      {approvedPct}% del total matriculado
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-100/60 dark:border-red-900/30">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white font-bold text-sm shadow-xs">
                    {stats.atRiskStudents}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-red-950 dark:text-red-300 truncate">
                      En Riesgo (&lt; 3.0)
                    </p>
                    <p className="text-[11px] font-medium text-red-700/80 dark:text-red-400/80">
                      {atRiskPct}% requiere refuerzo
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-400 dark:bg-slate-600 text-white font-bold text-sm shadow-xs">
                    {unassessedCount}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-300 truncate">
                      Sin Calificaciones
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {unassessedCount === 0 ? '100% evaluado' : `${unassessedPct}% pendiente`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* 2. Gráfica Principal: Barras por Rango de Notas (Compacta) */}
        <div className="w-full rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800/50 space-y-2.5">
              <div className="text-left">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Rendimiento Histórico Promedio
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distribución de estudiantes por rango de notas acumulado
                </p>
              </div>

              {/* Leyenda Visual de Rangos (Debajo del título, responsive) */}
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
              <TeacherCourseGradeDistributionChart data={stats.chartData} />
            </div>
          </div>

          {/* Mini Resumen Inferior */}
          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {stats.chartData.map((item) => (
              <div key={item.range} className="p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">{item.label}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: item.color }}>
                  {item.count} <span className="text-[11px] font-medium opacity-80">({item.percentage}%)</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
