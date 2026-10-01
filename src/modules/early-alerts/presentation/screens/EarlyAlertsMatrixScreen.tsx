'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAvailablePeriods, getStudentsAtRisk, getGroupDirectorName } from '../../application/actions'
import type { AtRiskStudent } from '../../domain/types'
import { InstitutionalReportHeader } from '@/components/reports/InstitutionalReportHeader'
import { Loader2, Search, XCircle, ArrowLeft, Sun, Moon, Printer, LogOut, BarChart3, Table2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUserSessionStore } from '@/store/useUserSessionStore'
import { logout } from '@/modules/auth/application/actions'

export function EarlyAlertsMatrixScreen() {
  const [periods, setPeriods] = useState<string[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [students, setStudents] = useState<AtRiskStudent[]>([])
  const [loading, setLoading] = useState(false)
  
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [directorName, setDirectorName] = useState<string>('Cargando...')

  const router = useRouter()
  const [isDark, setIsDark] = useState(false)
  const [viewMode, setViewMode] = useState<'matrix' | 'charts'>('matrix')

  // Inicializar estado del tema
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const isDarkNow = document.documentElement.classList.toggle('dark')
    setIsDark(isDarkNow)
    localStorage.setItem('theme', isDarkNow ? 'dark' : 'light')
  }

  const handleLogout = async () => {
    useUserSessionStore.getState().clearSession()
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pending_permissions_popup_dismissed')
    }
    try {
      await logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // 1. Carga de períodos
  useEffect(() => {
    getAvailablePeriods().then(p => {
      setPeriods(p)
      if (p.length > 0) setSelectedPeriod(p[p.length - 1])
    })
  }, [])

  // 2. Cargar estudiantes al cambiar el período
  useEffect(() => {
    if (!selectedPeriod) return
    setLoading(true)
    getStudentsAtRisk(selectedPeriod)
      .then(res => setStudents(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedPeriod])

  // 3. Procesar Grupos Únicos
  const groups = useMemo(() => {
    const uniqueGroups = new Set<string>()
    students.forEach(s => uniqueGroups.add(s.group_label))
    return Array.from(uniqueGroups).sort((a, b) => {
      const gA = Number(a.match(/Grado (\d+)/)?.[1] || 0)
      const gB = Number(b.match(/Grado (\d+)/)?.[1] || 0)
      if (gA !== gB) return gA - gB
      const numA = Number(a.match(/Grupo (\d+)/)?.[1] || 0)
      const numB = Number(b.match(/Grupo (\d+)/)?.[1] || 0)
      return numA - numB
    })
  }, [students])

  // Seleccionar primer grupo por defecto si cambia la data y no hay uno válido
  useEffect(() => {
    if (groups.length > 0 && (!selectedGroup || !groups.includes(selectedGroup))) {
      setSelectedGroup(groups[0])
    } else if (groups.length === 0) {
      setSelectedGroup('')
    }
  }, [groups, selectedGroup])

  // Cargar Director de Grupo cuando cambia el grupo seleccionado
  useEffect(() => {
    if (!selectedGroup) {
      setDirectorName('No Asignado')
      return
    }
    setDirectorName('Cargando...')
    getGroupDirectorName(selectedGroup)
      .then(name => setDirectorName(name))
      .catch(() => setDirectorName('No Asignado'))
  }, [selectedGroup])

  // 4. Filtrar estudiantes del grupo seleccionado y armar matriz
  const currentMatrix = useMemo(() => {
    if (!selectedGroup) return { students: [], subjects: [] }
    
    let filtered = students.filter(s => s.group_label === selectedGroup)
    if (search) {
      const lowerSearch = search.toLowerCase()
      filtered = filtered.filter(s => s.student_name.toLowerCase().includes(lowerSearch))
    }

    // Extraer el prefijo del grado actual (ej. "6°-1" -> "6°")
    const currentGrade = selectedGroup.split('-')[0]

    // Extraer materias únicas a nivel de GRADO para mantener columnas idénticas
    // entre grupos del mismo nivel (ej. 6-1 y 6-2), pero excluyendo materias de otros grados (ej. Física en 10)
    const subjectsSet = new Set<string>()
    students.forEach(s => {
      const studentGrade = s.group_label.split('-')[0]
      if (studentGrade === currentGrade) {
        s.low_subjects.forEach((sub: string) => subjectsSet.add(sub))
      }
    })

    // Ordenar estudiantes alfabéticamente
    filtered.sort((a, b) => a.student_name.localeCompare(b.student_name))

    return {
      students: filtered,
      subjects: Array.from(subjectsSet).sort()
    }
  }, [students, selectedGroup, search])

  // ── Helper format group label for tabs (e.g. "Grado 6° · Grupo 1" -> "6-1")
  const formatTabLabel = (label: string) => {
    const gradeMatch = label.match(/Grado (\d+)/)
    const groupMatch = label.match(/Grupo (\d+)/)
    if (gradeMatch && groupMatch) return `${gradeMatch[1]}-${groupMatch[1]}`
    return label
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B1120] print:block print:h-auto print:bg-white">
      {/* ── HEADER CON CONTROLES ── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 print:hidden">
        {/* Izquierda: Título y Controles */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3 min-w-max">
            <Link 
              href="/admin/dashboard" 
              className="p-1.5 -ml-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight hidden sm:block">
                Matriz de Alertas Tempranas
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {periods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {loading && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar estudiante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-48 md:w-64 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Selector de Vista */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                  viewMode === 'matrix' 
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Table2 className="h-4 w-4" />
                Matriz
              </button>
              <button
                onClick={() => setViewMode('charts')}
                className={`flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                  viewMode === 'charts' 
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Gráficos
              </button>
            </div>
          </div>
        </div>

        {/* Derecha: Botones de Acción */}
        <div className="flex items-center justify-end gap-1.5">
          <button 
            onClick={handlePrint}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors" 
            title="Imprimir reporte"
          >
            <Printer className="h-5 w-5" />
          </button>
          
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors" 
            title="Cambiar tema"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" 
            title="Cerrar sesión"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span className="text-sm font-semibold hidden md:block">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {viewMode === 'matrix' ? (
        <>
          {/* ── TABS DE GRUPOS ── */}
          {groups.length > 0 && (
            <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 scrollbar-hide print:hidden">
          <div className="flex px-4 pt-2">
            {groups.map(group => {
              const isSelected = selectedGroup === group
              return (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`
                    relative px-5 py-2.5 text-sm font-bold transition-colors whitespace-nowrap
                    ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
                  `}
                >
                  {formatTabLabel(group)}
                  {isSelected && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CONTENEDOR DE LA MATRIZ (SCROLLABLE) ── */}
      <div className="flex-1 overflow-auto relative p-4 bg-slate-50 dark:bg-[#0B1120] print:block print:p-0 print:bg-white print:overflow-visible">
        
        {/* ── MEMBRETE INSTITUCIONAL EN MODO IMPRESIÓN ── */}
        {selectedGroup && (
          <div className="hidden print:block mb-1">
            <InstitutionalReportHeader
              documentTitle={`REPORTE DE ALERTAS TEMPRANAS - PERÍODO ${selectedPeriod}`}
              date={new Date().toISOString().split('T')[0]}
              time={new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              variant="compact"
              showMeta={false}
              className="[&_img]:!max-h-16 [&_img]:!max-w-[500px] [&_div.pt-4]:!pt-2 [&_div.pt-4]:!pb-0 [&_h2]:!text-base [&_h2]:!mb-1"
            />
            <div className="mt-2 border-l-4 border-slate-800 pl-3 py-1">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 leading-none print:text-[14pt]">
                {selectedGroup}
              </h2>
              <p className="text-[10px] text-slate-600 font-medium leading-none mt-2 print:text-[12pt]">
                Director de Grupo: <span className="text-slate-900 font-bold">{directorName}</span>
              </p>
              <p className="text-[9px] text-slate-500 mt-2 text-justify max-w-4xl leading-snug print:text-[12pt] print:font-sans">
                Estudiantes con desempeño bajo (menor a 3.0) en asignaturas reportadas. Soporte para comités y acudientes.
              </p>
            </div>
          </div>
        )}

        {!loading && currentMatrix.students.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 print:hidden">
            <XCircle className="h-10 w-10 mb-3 opacity-20" />
            <p>No hay estudiantes con bajo rendimiento en este grupo.</p>
          </div>
        ) : (
          <div className="inline-block min-w-max bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:block print:min-w-0 print:w-auto print:border-none print:shadow-none">
            <table className="w-full text-left border-collapse print:text-[10px] print:w-auto print:mx-0">
              <thead>
                <tr>
                  {/* Cabecera Estudiantes (Fija a la izquierda) */}
                  <th className="sticky left-0 top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 p-2 font-bold text-slate-700 dark:text-slate-300 min-w-[200px] shadow-[1px_0_0_0_rgba(0,0,0,0.05)] print:static print:bg-slate-100 print:text-slate-900 print:border-slate-300 print:min-w-0 print:w-auto print:whitespace-nowrap print:px-2 print:py-1 print:text-[11px]">
                    Estudiante
                  </th>
                  {/* Cabeceras de Materias */}
                  {currentMatrix.subjects.map(subject => (
                    <th 
                      key={subject}
                      className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-800 p-1 h-32 w-8 align-bottom print:static print:bg-white print:border-slate-300 print:h-20 print:w-5 print:p-0"
                    >
                      <div className="flex items-end justify-center h-full pb-1">
                        <span 
                          className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-400 transform -rotate-180 print:text-slate-900 print:text-[9px] print:font-normal leading-none"
                          style={{ writingMode: 'vertical-rl' }}
                        >
                          {subject}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentMatrix.students.map((student, idx) => (
                  <tr 
                    key={student.assisted_student_id}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group transition-colors print:break-inside-avoid print:bg-white"
                  >
                    {/* Celda Nombre Estudiante (Fija a la izquierda) */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-blue-50/80 dark:group-hover:bg-slate-800/80 border-b border-r border-slate-200 dark:border-slate-800 px-2 py-1 md:px-4 md:py-1.5 font-medium text-xs md:text-sm text-slate-800 dark:text-slate-200 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] transition-colors print:static print:bg-white print:border-slate-300 print:text-slate-900 print:whitespace-nowrap print:px-2 print:py-0.5 print:text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 dark:text-slate-600 text-[10px] w-3 font-mono print:text-slate-500">{idx + 1}</span>
                        <span className="truncate print:overflow-visible print:whitespace-nowrap leading-none">{student.student_name}</span>
                      </div>
                    </td>
                    
                    {/* Celdas de Rendimiento */}
                    {currentMatrix.subjects.map(subject => {
                      const isLow = student.low_subjects.includes(subject)
                      return (
                        <td 
                          key={subject}
                          className="border-b border-r border-slate-200 dark:border-slate-800 text-center print:border-slate-300 print:p-0"
                        >
                          <div className="flex items-center justify-center h-full w-full py-0.5 print:py-0">
                            {isLow && (
                              <div className="flex items-center justify-center font-bold text-[10px] md:text-xs text-red-600 dark:text-red-400 print:text-slate-900 print:text-[11px]">
                                X
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : (
        <EarlyAlertsChartsView 
          students={students} 
          onBarClick={(group) => {
            setSelectedGroup(group)
            setViewMode('matrix')
          }}
        />
      )}
    </div>
  )
}

// ── COMPONENTE DE GRÁFICOS (VISTA ANALÍTICA) ──

function EarlyAlertsChartsView({ 
  students, 
  onBarClick 
}: { 
  students: AtRiskStudent[], 
  onBarClick: (group: string) => void 
}) {
  // 1. Agrupar por Grupo/Grado
  const dataGroups = useMemo(() => {
    const map = new Map<string, number>()
    students.forEach(s => map.set(s.group_label, (map.get(s.group_label) || 0) + 1))
    // Ordenar de mayor a menor cantidad de reportes
    return Array.from(map.entries())
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count)
  }, [students])

  // 2. Agrupar por Materias (Top 10)
  const dataSubjects = useMemo(() => {
    const map = new Map<string, number>()
    students.forEach(s => {
      s.low_subjects.forEach(sub => map.set(sub, (map.get(sub) || 0) + 1))
    })
    return Array.from(map.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [students])

  const maxGroupCount = dataGroups.length > 0 ? dataGroups[0].count : 1
  const maxSubjectCount = dataSubjects.length > 0 ? dataSubjects[0].count : 1

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 print:p-0 print:overflow-visible print:bg-white bg-slate-50 dark:bg-[#0B1120]">
      
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold uppercase text-slate-900 border-b-2 border-slate-900 pb-2">
          CONSOLIDADO ESTADÍSTICO DE ALERTAS TEMPRANAS
        </h1>
        <p className="text-sm text-slate-600 mt-1">Reporte de frecuencia por grados e índices de criticidad por materias.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:flex print:flex-col print:max-w-3xl print:mx-auto print:gap-8">
        
        {/* Gráfico 1: Reportados por Grupo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Estudiantes Reportados por Grupo
          </h2>
          {dataGroups.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No hay datos para mostrar en este período.</p>
          ) : (
            <div className="space-y-3">
              {dataGroups.map((item, idx) => {
                const widthPercent = Math.max((item.count / maxGroupCount) * 100, 2) // Mínimo 2% para que se vea
                // Color dinámico según severidad
                const colorClass = idx < 3 ? 'bg-red-500 dark:bg-red-600' : idx < 7 ? 'bg-orange-500 dark:bg-orange-600' : 'bg-blue-500 dark:bg-blue-600'
                
                return (
                  <div key={item.group} className="relative group/bar cursor-pointer" onClick={() => onBarClick(item.group)}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover/bar:text-blue-600 transition-colors">
                        {item.group}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.count} <span className="text-xs text-slate-500 font-normal">est.</span>
                      </span>
                    </div>
                    <div className="h-4 md:h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
                        style={{ width: `${widthPercent}%`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Gráfico 2: Top Materias en Riesgo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm print:break-before-page">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Top 10 Materias con Mayor Riesgo Académico
          </h2>
          {dataSubjects.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No hay datos para mostrar.</p>
          ) : (
            <div className="space-y-3">
              {dataSubjects.map((item, idx) => {
                const widthPercent = Math.max((item.count / maxSubjectCount) * 100, 2)
                return (
                  <div key={item.subject} className="relative">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate pr-4">
                        {item.subject}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white shrink-0">
                        {item.count} <span className="text-xs text-slate-500 font-normal">reportes</span>
                      </span>
                    </div>
                    <div className="h-4 md:h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <div 
                        className="h-full bg-slate-700 dark:bg-slate-600 rounded-full transition-all duration-1000 ease-out print:bg-slate-600"
                        style={{ width: `${widthPercent}%`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
