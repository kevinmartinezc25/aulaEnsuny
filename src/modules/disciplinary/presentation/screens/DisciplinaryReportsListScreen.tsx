'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Search, Plus, Calendar, Filter, FileText, ChevronRight, 
  Clock, ShieldAlert, ArrowUpRight, AlertCircle 
} from 'lucide-react'
import { DisciplinaryReport, ReportStatus, getTeacherReports } from '@/modules/disciplinary/application/actions'
import { DisciplinaryStatusBadge } from '@/components/disciplinary/DisciplinaryStatusBadge'

export function DisciplinaryReportsListScreen() {
  const router = useRouter()
  
  const [reports, setReports] = useState<DisciplinaryReport[]>([])
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('')
  const [groupFilter, setGroupFilter] = useState<string>('')

  useEffect(() => {
    async function loadReports() {
      setLoading(true)
      try {
        const data = await getTeacherReports()
        setReports(data)
      } catch (error) {
        console.error('Error cargando reportes:', error)
      } finally {
        setLoading(false)
      }
    }
    loadReports()
  }, [])

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      const matchSearch = 
        r.studentFullName.toLowerCase().includes(search.toLowerCase()) ||
        (r.studentDocument || '').includes(search) ||
        r.situationSnapshot.code.toLowerCase().includes(search.toLowerCase())
      
      const matchGrade = !gradeFilter || 
        r.studentGrade === gradeFilter || 
        r.studentGrade === gradeFilter.replace('°', '') || 
        r.studentGrade === `${gradeFilter.replace('°', '')}°`

      const matchGroup = !groupFilter || r.studentGroup === groupFilter
      
      return matchStatus && matchSearch && matchGrade && matchGroup
    })
  }, [reports, search, statusFilter, gradeFilter, groupFilter])

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = reports.length
    const thisMonth = reports.filter(r => {
      const reportDate = new Date(r.reportDate)
      const now = new Date()
      return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear()
    }).length
    const active = reports.filter(r => ['registered', 'reviewing', 'following'].includes(r.status)).length

    return { total, thisMonth, active }
  }, [reports])

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left pb-12">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-blue-600 dark:text-blue-500" />
            Convivencia Escolar
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestiona los reportes de novedad disciplinaria de tus estudiantes.
          </p>
        </div>
        
        <Link
          href="/teacher/disciplinary/new"
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold active:scale-[0.98] transition-all"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Nuevo Reporte</span>
        </Link>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total reportes enviados</p>
          </div>
        </div>
        
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Casos activos o en proceso</p>
          </div>
        </div>
        
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.thisMonth}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Reportes este mes</p>
          </div>
        </div>
      </div>

      {/* ── FILTROS ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por estudiante, documento o código de falta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 transition-all text-sm"
          />
        </div>
        
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-sm cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="registered">Registrado</option>
            <option value="reviewing">En revisión</option>
            <option value="following">En seguimiento</option>
            <option value="closed">Cerrado</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
            </svg>
          </div>
        </div>

        <div className="relative min-w-[130px]">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-sm cursor-pointer"
          >
            <option value="">Grados</option>
            {['1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°', '11°'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
            </svg>
          </div>
        </div>

        <div className="relative min-w-[130px]">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-sm cursor-pointer"
          >
            <option value="">Grupos</option>
            {['1', '2', '3', '4'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* ── LISTADO ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-5 flex items-center gap-4 animate-pulse">
                <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              No se encontraron reportes
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
              {search || statusFilter !== 'all' || gradeFilter || groupFilter
                ? 'No hay resultados que coincidan con tus filtros actuales.'
                : 'Aún no has registrado ninguna novedad disciplinaria.'}
            </p>
            {(search || statusFilter !== 'all' || gradeFilter || groupFilter) && (
              <button 
                onClick={() => { setSearch(''); setStatusFilter('all'); setGradeFilter(''); setGroupFilter(''); }}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredReports.map(report => (
              <Link 
                key={report.id}
                href={`/teacher/disciplinary/${report.id}`}
                className="group p-5 flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {report.studentFullName}
                    </h4>
                    <span className="shrink-0 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                      {report.studentGrade} - {report.studentGroup}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(report.reportDate).toLocaleDateString('es-CO')}
                    </span>
                    <span className="flex items-center gap-1.5 truncate max-w-[300px]">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{report.situationSnapshot.code} - {report.situationSnapshot.title}</span>
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 mt-2 sm:mt-0">
                  <DisciplinaryStatusBadge status={report.status} />
                  
                  <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-slate-400 transition-colors">
                    <ChevronRight className="h-4 w-4" />
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
