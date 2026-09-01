'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ShieldAlert, Settings, FileText, Activity, AlertCircle, 
  Search, Filter, Calendar, Users, Eye, Archive, CheckCircle2,
  ChevronLeft, ChevronRight, BarChart3, Clock, Loader2, Link as LinkIcon, Trash2
} from 'lucide-react'
import { 
  DisciplinaryReport, ReportStatus, 
  getAdminReports, getDisciplinaryStats, updateReportStatus, softDeleteReport 
} from '@/modules/disciplinary/application/actions'
import { DisciplinaryStatusBadge } from '@/components/disciplinary/DisciplinaryStatusBadge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export function AdminDisciplinaryDashboard() {
  const router = useRouter()
  
  // ── ESTADO ─────────────────────────────────────────────────────────────
  const [reports, setReports] = useState<DisciplinaryReport[]>([])
  const [totalReports, setTotalReports] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Filtros y Paginación
  const [page, setPage] = useState(0)
  const pageSize = 15
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<'Tipo I' | 'Tipo II' | 'Tipo III' | 'all'>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('')
  const [groupFilter, setGroupFilter] = useState<string>('')
  
  // Modal de estado
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<DisciplinaryReport | null>(null)
  const [newStatus, setNewStatus] = useState<ReportStatus>('reviewing')
  const [statusNotes, setStatusNotes] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Modal de eliminar
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<DisciplinaryReport | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── EFECTOS ────────────────────────────────────────────────────────────
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  // Cargar estadísticas globales
  useEffect(() => {
    async function loadStats() {
      const data = await getDisciplinaryStats()
      setStats(data)
    }
    loadStats()
  }, [])

  // Cargar tabla de reportes
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const { reports, total } = await getAdminReports({
          page,
          pageSize,
          status: statusFilter,
          situationType: typeFilter,
          studentSearch: debouncedSearch,
          grade: gradeFilter || undefined,
          group: groupFilter || undefined,
        })
        setReports(reports)
        setTotalReports(total)
      } catch (error) {
        console.error('Error cargando reportes:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [page, statusFilter, typeFilter, debouncedSearch, gradeFilter, groupFilter])

  // Reiniciar página al cambiar filtros
  useEffect(() => {
    setPage(0)
  }, [statusFilter, typeFilter, debouncedSearch, gradeFilter, groupFilter])

  // ── HANDLERS ───────────────────────────────────────────────────────────
  const handleOpenStatusModal = (report: DisciplinaryReport) => {
    setSelectedReport(report)
    setNewStatus(report.status)
    setStatusNotes('')
    setStatusModalOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedReport) return
    
    setIsUpdatingStatus(true)
    const toastId = toast.loading('Actualizando estado...')
    
    try {
      const res = await updateReportStatus(selectedReport.id, newStatus, statusNotes)
      if (res.success) {
        toast.success('Estado actualizado correctamente', { id: toastId })
        // Actualizar estado localmente
        setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: newStatus } : r))
        setStatusModalOpen(false)
        // Refrescar stats
        const newStats = await getDisciplinaryStats()
        setStats(newStats)
      } else {
        toast.error(res.error || 'Error al actualizar', { id: toastId })
      }
    } catch (error) {
      toast.error('Error inesperado', { id: toastId })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDeleteClick = (report: DisciplinaryReport) => {
    setReportToDelete(report)
    setDeleteModalOpen(true)
  }

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return
    
    setIsDeleting(true)
    const toastId = toast.loading('Eliminando reporte...')
    try {
      const res = await softDeleteReport(reportToDelete.id)
      if (res.success) {
        toast.success('Reporte eliminado correctamente', { id: toastId })
        setReports(reports.filter(r => r.id !== reportToDelete.id))
        setTotalReports(prev => prev - 1)
        setDeleteModalOpen(false)
        const newStats = await getDisciplinaryStats()
        setStats(newStats)
      } else {
        toast.error(res.error || 'Error al eliminar el reporte', { id: toastId })
      }
    } catch (error) {
      toast.error('Error inesperado', { id: toastId })
    } finally {
      setIsDeleting(false)
    }
  }

  // ── RENDER COMPONENTES ─────────────────────────────────────────────────
  const StatusOption = ({ value, label, icon: Icon, colorClass, desc }: any) => {
    const isSelected = newStatus === value
    return (
      <button
        onClick={() => setNewStatus(value)}
        className={`flex items-start gap-3 w-full p-4 rounded-xl border text-left transition-all ${
          isSelected 
            ? `${colorClass} ring-2 ring-blue-500/50 shadow-sm` 
            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        <div className={`mt-0.5 ${isSelected ? '' : 'text-slate-400'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className={`font-semibold ${isSelected ? '' : 'text-slate-700 dark:text-slate-300'}`}>{label}</h4>
          <p className={`text-xs mt-1 ${isSelected ? 'opacity-90' : 'text-slate-500'}`}>{desc}</p>
        </div>
      </button>
    )
  }

  const totalPages = Math.ceil(totalReports / pageSize)

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-blue-600 dark:text-blue-500" />
            Coordinación Disciplinaria
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestión y trazabilidad de los casos de convivencia reportados.
          </p>
        </div>
        
        <Link
          href="/admin/disciplinary/situations"
          className="flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-3 text-sm font-semibold active:scale-[0.98] transition-all"
        >
          <Settings className="h-4.5 w-4.5 text-slate-500" />
          <span>Catálogo Institucional</span>
        </Link>
      </div>

      {/* ── STATS (KPIs) ───────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide font-semibold">Total Año</p>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 h-16 w-16 bg-red-500/5 rounded-bl-full pointer-events-none" />
            <div className="h-10 w-10 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-3 relative z-10">
              <Activity className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white relative z-10">{stats.openCases}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide font-semibold relative z-10">Casos Abiertos</p>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.tipoI + stats.tipoII}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide font-semibold">Tipo I y II</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col items-center text-center border-b-4 border-b-red-500">
            <div className="h-10 w-10 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mb-3">
              <ShieldAlert className="h-5 w-5 text-red-700 dark:text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.tipoIII}</p>
            <p className="text-xs text-red-500 dark:text-red-400/70 mt-1 uppercase tracking-wide font-bold">Graves (Tipo III)</p>
          </div>
        </div>
      )}

      {/* ── TABLA DE REPORTES ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col overflow-hidden">
        
        {/* Filtros */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <div className="flex gap-2 min-w-[300px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">Todos los estados</option>
              <option value="registered">Registrados</option>
              <option value="reviewing">En revisión</option>
              <option value="following">En seguimiento</option>
              <option value="closed">Cerrados</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">Tipos</option>
              <option value="Tipo I">Tipo I</option>
              <option value="Tipo II">Tipo II</option>
              <option value="Tipo III">Tipo III</option>
            </select>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Grado</option>
              {Array.from({ length: 11 }, (_, i) => i + 1).map(g => (
                <option key={g} value={`${g}°`}>{g}°</option>
              ))}
            </select>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Grupo</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Grado</th>
                <th className="px-6 py-4">Situación</th>
                <th className="px-6 py-4">Docente</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-6 w-24 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                    <td className="px-6 py-5"><div className="h-8 w-8 ml-auto bg-slate-200 dark:bg-slate-700 rounded" /></td>
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron reportes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {new Date(report.reportDate).toLocaleDateString('es-CO')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {report.reportTime.substring(0,5)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {report.studentFullName}
                        </div>
                        {report.hasAlert && (
                          <div title="Alerta: Este estudiante tiene 3 o más reportes en total" className="flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                            <AlertCircle className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {report.studentDocument ? `Doc: ${report.studentDocument}` : 'Sin documento'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                      {report.studentGrade}-{report.studentGroup}
                    </td>
                    <td className="px-6 py-4 max-w-[250px]">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`shrink-0 h-2 w-2 rounded-full ${
                          report.situationSnapshot.type === 'Tipo I' ? 'bg-blue-500' :
                          report.situationSnapshot.type === 'Tipo II' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {report.situationSnapshot.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5" title={report.situationSnapshot.title}>
                        {report.situationSnapshot.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {report.teacherName}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleOpenStatusModal(report)}
                        className="inline-block transition-transform hover:scale-105 active:scale-95"
                        title="Cambiar estado"
                      >
                        <DisciplinaryStatusBadge status={report.status} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/admin/disciplinary/${report.id}`}
                          className="inline-flex items-center justify-center h-8 w-8 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-blue-500/20 dark:hover:text-blue-400 transition-colors"
                          title="Ver detalle completo"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(report)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded bg-red-50 hover:bg-red-100 hover:text-red-600 text-red-400 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-300 transition-colors"
                          title="Mover a papelera"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalReports)} de {totalReports}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL CAMBIO DE ESTADO ─────────────────────────────────────── */}
      <AnimatePresence>
        {statusModalOpen && selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setStatusModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cambiar Estado del Reporte</h3>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <p className="text-sm text-slate-500 mb-4">
                  Actualizando el reporte de <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReport.studentFullName}</span>
                </p>

                <div className="space-y-3 mb-6">
                  <StatusOption 
                    value="registered" label="Registrado" icon={FileText} desc="Reporte inicial ingresado por el docente."
                    colorClass="bg-slate-50 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                  />
                  <StatusOption 
                    value="reviewing" label="En Revisión" icon={Eye} desc="Coordinación está analizando el caso y citando acudientes."
                    colorClass="bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                  />
                  <StatusOption 
                    value="following" label="En Seguimiento" icon={Activity} desc="Se establecieron compromisos, en periodo de observación."
                    colorClass="bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                  />
                  <StatusOption 
                    value="closed" label="Cerrado" icon={CheckCircle2} desc="El caso ha sido resuelto favorablemente."
                    colorClass="bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
                  />
                  <StatusOption 
                    value="archived" label="Archivado" icon={Archive} desc="Retirado, desestimado o trasladado."
                    colorClass="bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Nota para el historial (opcional)
                  </label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 resize-none h-24"
                    placeholder="Ej. Se citó a los padres de familia para el martes..."
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus || newStatus === selectedReport.status}
                  className="px-6 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL ELIMINAR REPORTE ───────────────────────────────────── */}
      <AnimatePresence>
        {deleteModalOpen && reportToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isDeleting && setDeleteModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-500 flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Eliminar Reporte
                </h3>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                  ¿Estás seguro de que deseas eliminar este reporte de <span className="font-bold">{reportToDelete.studentFullName}</span>?
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta acción moverá el reporte a la papelera y ya no aparecerá en las búsquedas ni en los registros del estudiante.
                </p>
              </div>

              <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteReport}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
