'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, ShieldAlert, Calendar, ClipboardList, Search, Filter, RefreshCw, BarChart2, Check, Download, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getAcademicPeriods, AcademicPeriod } from '../../application/achievementsActions'
import { getAcademicLevels } from '@/modules/admin/application/actions'
import { AcademicLevel } from '@/modules/admin/application/types'
import { getConsolidatedGroupGrades, getGradeAudits, ConsolidatedGradeRow, GradeAuditRow } from '../../application/gradesActions'

export function AdminAcademicRegistryScreen() {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([])
  
  // Filtros
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [selectedGroup, setSelectedGroup] = useState<string>('1') // default group '1'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'consolidated' | 'audit'>('consolidated')
  
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedGradeRow[]>([])
  const [auditLogs, setAuditLogs] = useState<GradeAuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [coursesColumns, setCoursesColumns] = useState<string[]>([])

  // Cargar períodos y grados al montar
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [periodsData, levelsData] = await Promise.all([
          getAcademicPeriods(),
          getAcademicLevels()
        ])
        setPeriods(periodsData)
        setAcademicLevels(levelsData)

        const activePer = periodsData.find(p => p.status === 'active') || periodsData[0]
        if (activePer) {
          setSelectedPeriodId(activePer.id)
        }
        if (levelsData.length > 0) {
          setSelectedGrade(levelsData[0].name)
        }
      } catch (err) {
        console.error(err)
        toast.error('Error al cargar datos académicos de inicialización')
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [])

  // Cargar datos del consolidado o auditoría
  const fetchRegistryData = async () => {
    if (!selectedPeriodId) return
    setLoading(true)
    try {
      if (activeTab === 'consolidated') {
        if (!selectedGrade) {
          setLoading(false)
          return
        }
        const data = await getConsolidatedGroupGrades(selectedGrade, selectedGroup, selectedPeriodId)
        setConsolidatedData(data)
        
        // Extraer columnas dinámicas de materias del resultado
        const columns = new Set<string>()
        data.forEach(row => {
          Object.keys(row.courseGrades).forEach(key => columns.add(key))
        })
        setCoursesColumns(Array.from(columns))
      } else {
        const data = await getGradeAudits({ periodId: selectedPeriodId })
        setAuditLogs(data)
      }
    } catch (err) {
      toast.error('Error al recuperar registros académicos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegistryData()
  }, [selectedPeriodId, selectedGrade, selectedGroup, activeTab])

  // Filtrado de estudiantes en la cuadrícula consolidada
  const filteredConsolidated = useMemo(() => {
    return consolidatedData.filter(row => 
      row.studentName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [consolidatedData, searchQuery])

  // Filtrado de logs de auditoría
  const filteredAudits = useMemo(() => {
    return auditLogs.filter(log => 
      log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.changeReason || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [auditLogs, searchQuery])

  // Exportar consolidado actual a CSV
  const handleExportCSV = () => {
    if (consolidatedData.length === 0) {
      toast.error('No hay datos para exportar')
      return
    }

    const headers = ['Estudiante', ...coursesColumns, 'Promedio General', 'Desempeño']
    const rows = filteredConsolidated.map(row => {
      const courseGrades = coursesColumns.map(col => {
        const cg = row.courseGrades[col]
        return cg && cg.finalGrade > 0 ? `${cg.finalGrade} (${cg.performanceLevel})` : '-'
      })
      return [row.studentName, ...courseGrades, row.average, row.performanceLevel]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `consolidado_${selectedGrade}_grupo_${selectedGroup}_periodo_${selectedPeriodId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Consolidado exportado correctamente en CSV')
  }

  const getLevelColor = (level: string) => {
    if (level === 'Superior') return 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 font-bold'
    if (level === 'Alto') return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 font-bold'
    if (level === 'Básico') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-bold'
    if (level === 'Bajo' || level === 'Insuficiente') return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 font-bold'
    return 'bg-slate-100 text-slate-500'
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Registro Académico y Auditoría
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Control de calificaciones del centro escolar, consolidados de rendimiento e historial de modificaciones.
          </p>
        </div>

        {activeTab === 'consolidated' && consolidatedData.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-4">
        <button
          onClick={() => { setActiveTab('consolidated'); setSearchQuery('') }}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'consolidated'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Consolidado por Grado y Grupo
        </button>
        <button
          onClick={() => { setActiveTab('audit'); setSearchQuery('') }}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Bitácora de Auditoría
        </button>
      </div>

      {/* Filtros */}
      <div className="p-5 sm:p-6 rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] dark:border-slate-800/60 dark:bg-slate-900 flex flex-col md:flex-row gap-5 items-stretch md:items-center">
        {/* Selector Período */}
        <div className="w-full md:w-60">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Período Académico</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:bg-slate-900 transition-all cursor-pointer"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Solo mostrar filtros de grado/grupo en la pestaña de consolidado */}
        {activeTab === 'consolidated' && (
          <>
            {/* Selector Grado */}
            <div className="w-full md:w-44">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Grado</label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:bg-slate-900 transition-all cursor-pointer"
                >
                  {academicLevels.map(lvl => (
                    <option key={lvl.id} value={lvl.name}>
                      {lvl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selector Grupo */}
            <div className="w-full md:w-36">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Grupo</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:bg-slate-900 transition-all cursor-pointer"
              >
                <option value="1">Grupo 1</option>
                <option value="2">Grupo 2</option>
                <option value="3">Grupo 3</option>
              </select>
            </div>
          </>
        )}

        {/* Buscador */}
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {activeTab === 'consolidated' ? 'Buscar estudiante' : 'Buscar en auditoría'}
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'consolidated' ? "Filtrar estudiante por nombre..." : "Filtrar por estudiante, docente, materia o motivo..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:bg-slate-900 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : activeTab === 'consolidated' ? (
        /* VISTA: CONSOLIDADO GRUPAL */
        filteredConsolidated.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-8">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sin registros académicos</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              No hay calificaciones definitivas asentadas para el grado {selectedGrade} en este período.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden dark:border-slate-800/60 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 dark:bg-slate-950/30 dark:border-slate-800/60">
                    <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[220px] sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-50 dark:border-slate-800/60">
                      Estudiante
                    </th>
                    {coursesColumns.map(col => (
                      <th key={col} className="px-4 py-5 text-center min-w-[150px] border-r border-slate-100 dark:border-slate-800/40 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {col}
                      </th>
                    ))}
                    <th className="px-6 py-5 text-center min-w-[130px] bg-slate-50/30 dark:bg-slate-950/20 font-black">
                      Promedio
                    </th>
                    <th className="px-6 py-5 text-center min-w-[140px] bg-slate-50/30 dark:bg-slate-950/20 border-l border-slate-100 dark:border-slate-800/40">
                      Desempeño
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                  {filteredConsolidated.map(row => (
                    <tr key={row.studentId} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/10 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-50 dark:border-slate-800/60">
                        {row.studentName}
                      </td>
                      {coursesColumns.map(col => {
                        const gradeVal = row.courseGrades[col]
                        return (
                          <td key={col} className="px-4 py-3 text-center border-r border-slate-100 dark:border-slate-800/40">
                            {gradeVal && gradeVal.finalGrade > 0 ? (
                              <div className="space-y-0.5">
                                <span className="font-black text-slate-850 dark:text-white text-sm">{gradeVal.finalGrade.toFixed(2)}</span>
                                <span className={`block text-[9px] font-bold py-0.5 rounded-full max-w-[80px] mx-auto ${getLevelColor(gradeVal.performanceLevel)}`}>
                                  {gradeVal.performanceLevel}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-6 py-4 text-center font-black text-slate-850 dark:text-white bg-slate-50/20 dark:bg-slate-950/10 text-sm">
                        {row.average.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/10">
                        {row.average > 0 ? (
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getLevelColor(row.performanceLevel)}`}>
                            {row.performanceLevel}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* VISTA: BITÁCORA DE AUDITORÍA */
        filteredAudits.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8">
            <ShieldAlert className="mx-auto h-12 w-12 text-slate-350 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sin cambios de notas</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              No se han auditado modificaciones de calificaciones en este período académico.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden dark:border-slate-800/60 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800/60">
                  <tr>
                    <th className="px-6 py-4">Fecha & Hora</th>
                    <th className="px-6 py-4">Docente</th>
                    <th className="px-6 py-4">Estudiante</th>
                    <th className="px-6 py-4">Materia</th>
                    <th className="px-4 py-4 text-center">Antes</th>
                    <th className="px-4 py-4 text-center">Nuevo</th>
                    <th className="px-6 py-4">Motivo / Justificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                  {filteredAudits.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-850/10 transition-colors">
                      <td className="px-6 py-4 text-slate-500 text-xs font-semibold whitespace-nowrap">
                        {log.createdAt}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                        {log.teacherName}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                        {log.studentName}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">
                        {log.courseTitle}
                      </td>
                      <td className="px-4 py-4 text-center text-slate-400 font-bold">
                        {log.oldGrade !== null ? log.oldGrade.toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-4 text-center text-blue-600 dark:text-blue-400 font-black">
                        {log.newGrade.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs italic">
                        "{log.changeReason || 'No especificado'}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  )
}
