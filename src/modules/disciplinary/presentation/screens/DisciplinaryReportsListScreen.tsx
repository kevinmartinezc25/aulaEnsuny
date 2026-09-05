'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion, Variants } from 'framer-motion'
import {
  Search,
  Plus,
  Calendar,
  Filter,
  FileText,
  ChevronRight,
  Clock,
  ShieldAlert,
  AlertCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react'
import {
  DisciplinaryReport,
  ReportStatus,
  getTeacherReports,
  getTeacherAssignedGroups
} from '@/modules/disciplinary/application/actions'
import { DisciplinaryStatusBadge } from '@/components/disciplinary/DisciplinaryStatusBadge'

export function DisciplinaryReportsListScreen() {
  const shouldReduceMotion = useReducedMotion()

  const [reports, setReports] = useState<DisciplinaryReport[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('')
  const [groupFilter, setGroupFilter] = useState<string>('')

  const [teacherGroups, setTeacherGroups] = useState<{ id: string; name: string; level: string }[]>([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [data, groups] = await Promise.all([
          getTeacherReports(),
          getTeacherAssignedGroups()
        ])
        setReports(data)
        setTeacherGroups(groups)
      } catch (error) {
        console.error('Error cargando datos:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>()
    teacherGroups.forEach((g) => {
      const match = g.name.match(/\d+/)
      if (match) grades.add(match[0] + '°')
    })
    return Array.from(grades).sort((a, b) => parseInt(a) - parseInt(b))
  }, [teacherGroups])

  const uniqueGroups = useMemo(() => {
    return Array.from(new Set(teacherGroups.map((g) => g.name))).filter(Boolean).sort()
  }, [teacherGroups])

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      const matchSearch =
        r.studentFullName.toLowerCase().includes(search.toLowerCase()) ||
        (r.studentDocument || '').includes(search) ||
        r.situationSnapshot.code.toLowerCase().includes(search.toLowerCase())

      const matchGrade =
        !gradeFilter ||
        r.studentGrade === gradeFilter ||
        r.studentGrade === gradeFilter.replace('°', '') ||
        r.studentGrade === `${gradeFilter.replace('°', '')}°`

      const cleanStr = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      const matchGroup =
        !groupFilter ||
        cleanStr(r.studentGroup) === cleanStr(groupFilter) ||
        cleanStr(`${r.studentGrade}${r.studentGroup}`) === cleanStr(groupFilter) ||
        r.studentGroup === groupFilter

      return matchStatus && matchSearch && matchGrade && matchGroup
    })
  }, [reports, search, statusFilter, gradeFilter, groupFilter])

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = filteredReports.length
    const thisMonth = filteredReports.filter((r) => {
      const [year, month] = r.reportDate.split('-').map(Number)
      const now = new Date()
      return month - 1 === now.getMonth() && year === now.getFullYear()
    }).length
    const active = filteredReports.filter((r) =>
      ['registered', 'reviewing', 'following'].includes(r.status)
    ).length

    return { total, thisMonth, active }
  }, [filteredReports])

  const isFiltered = Boolean(search || statusFilter !== 'all' || gradeFilter || groupFilter)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setGradeFilter('')
    setGroupFilter('')
  }

  // Animaciones Apple Design con resortes de amortiguación crítica
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.02,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 24,
        stiffness: 260,
        mass: 0.8,
      },
    },
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 text-left pb-12">
      {/* ── HEADER CON TIPOGRAFÍA DISPLAY Y ACCIÓN RÁPIDA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <span>Convivencia Escolar</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Gestiona los reportes de novedad disciplinaria de tus estudiantes con rigor y debido proceso.
          </p>
        </div>

        <Link
          href="/teacher/disciplinary/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold shadow-sm shadow-blue-900/15 active:scale-[0.98] duration-100 ease-out transition-all shrink-0 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Nuevo Reporte</span>
        </Link>
      </div>

      {/* ── TARJETAS MÉTRICAS KPI DE CRISTAL ESMERILADO ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5"
      >
        {/* Total Reportes */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-2xl sm:rounded-[24px] border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4 overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-blue-600 bg-blue-500/10 border border-blue-500/20 dark:text-blue-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {stats.total}
            </p>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Total reportes enviados
            </p>
          </div>
        </motion.div>

        {/* Casos Activos */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-2xl sm:rounded-[24px] border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4 overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-amber-600 bg-amber-500/10 border border-amber-500/20 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {stats.active}
            </p>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Casos activos o en proceso
            </p>
          </div>
        </motion.div>

        {/* Reportes este mes */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-2xl sm:rounded-[24px] border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4 overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 dark:text-emerald-400">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {stats.thisMonth}
            </p>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Reportes este mes
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* ── BARRA DE FILTROS ESTILO APPLE TOOLBAR ── */}
      <div className="relative rounded-2xl sm:rounded-[24px] border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Campo de Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por estudiante, documento o falta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-100/60 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm transition-all focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filtro de Estado */}
        <div className="relative min-w-[170px]">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-100/60 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-xs sm:text-sm appearance-none cursor-pointer focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="all">Todos los estados</option>
            <option value="registered">Registrado</option>
            <option value="reviewing">En revisión</option>
            <option value="following">En seguimiento</option>
            <option value="closed">Cerrado</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
              <path
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
                fillRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Filtro de Grado */}
        <div className="relative min-w-[120px]">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-100/60 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-xs sm:text-sm appearance-none cursor-pointer focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">Todos los Grados</option>
            {uniqueGrades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
              <path
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
                fillRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Filtro de Grupo */}
        <div className="relative min-w-[120px]">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-100/60 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-xs sm:text-sm appearance-none cursor-pointer focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">Todos los Grupos</option>
            {uniqueGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
              <path
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
                fillRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Botón para limpiar filtros */}
        {isFiltered && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 active:scale-95 duration-100 transition-all cursor-pointer"
            title="Restablecer filtros"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* ── LISTADO PRINCIPAL DE REPORTES ── */}
      <div className="relative rounded-2xl sm:rounded-[26px] border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 sm:p-6 flex items-center gap-4 animate-pulse">
                <div className="h-11 w-11 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800/60 rounded-3xl flex items-center justify-center mb-4 border border-slate-200/60 dark:border-white/10">
              <Search className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
              No se encontraron reportes
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              {isFiltered
                ? 'Ninguna novedad coincide con los criterios de búsqueda o filtros seleccionados.'
                : 'Aún no has registrado ninguna novedad disciplinaria en el sistema.'}
            </p>
            {isFiltered && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 dark:text-blue-300 font-semibold text-xs transition-all active:scale-95 duration-100 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restablecer todos los filtros</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredReports.map((report) => (
              <Link
                key={report.id}
                href={`/teacher/disciplinary/${report.id}`}
                className="group p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/40 active:scale-[0.995] duration-100 ease-out transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {report.studentFullName}
                    </h4>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                      {report.studentGrade} - {report.studentGroup}
                    </span>
                  </div>

                  <div className="flex items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(`${report.reportDate}T${report.reportTime || '00:00:00'}`).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {new Date(`${report.reportDate}T${report.reportTime || '00:00:00'}`).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                    <span className="flex items-center gap-1 truncate max-w-[320px] text-slate-700 dark:text-slate-300 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">
                        {report.situationSnapshot.code} - {report.situationSnapshot.title}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 mt-1 sm:mt-0">
                  <DisciplinaryStatusBadge status={report.status} />

                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500 text-slate-400 transition-all duration-150">
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
