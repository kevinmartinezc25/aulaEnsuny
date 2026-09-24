'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FileSpreadsheet, ArrowLeft, Users, Save, Download, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from 'next/link'
import { toast } from 'sonner'
import { 
  createAssistedStudents, 
  getAssistedAchievementsAndActivities, 
  getAssistedStudents, 
  getAssistedGrades, 
  getAssistedSubjectById, 
  getPlanillaDirectoryCandidates,
  PlanillaCandidateStudent,
  AssistedAchievement, 
  AssistedActivity, 
  AssistedSubject 
} from '../../application/actions'
import { 
  Loader2, Plus, GripVertical, Edit2, Trash2,
  Search, CheckSquare, Square, CheckCircle2, UserPlus,
  Sparkles, AlertCircle, RefreshCw, Clock, Filter
} from 'lucide-react'
import { CreateAchievementModal } from '../components/CreateAchievementModal'
import { CreateActivityModal } from '../components/CreateActivityModal'
import { usePlanillaStore } from '@/store/usePlanillaStore'
import { SpreadsheetTable } from '@/components/planilla-asistida/SpreadsheetTable'
import { AttendanceTable } from '@/components/planilla-asistida/AttendanceTable'
import { AttendanceDashboard } from '@/components/planilla-asistida/AttendanceDashboard'
import { getAssistedSessions, getAssistedAttendance } from '../../application/attendanceActions'
import { exportPlanillaToExcel } from '../../application/exportUtils'

interface PlanillaAsistidaDetailScreenProps {
  subjectId: string
}

export function PlanillaAsistidaDetailScreen({ subjectId }: PlanillaAsistidaDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<'planilla' | 'actividades' | 'estudiantes' | 'asistencia' | 'configuracion'>('planilla')
  const [students, setStudents] = useState<{ id: string, number: number, fullName: string, directoryId?: string }[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingFromDir, setIsLoadingFromDir] = useState(false)
  const [isLoadingPlanilla, setIsLoadingPlanilla] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [subjectData, setSubjectData] = useState<AssistedSubject | null>(null)

  // Estados para validación inteligente contra Gestión de Estudiantes del Superadmin
  const [candidates, setCandidates] = useState<PlanillaCandidateStudent[]>([])
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set())
  const [searchCandidate, setSearchCandidate] = useState('')
  const [filterCandidateTab, setFilterCandidateTab] = useState<'all' | 'missing' | 'already'>('missing')
  const [hasLoadedCandidates, setHasLoadedCandidates] = useState(false)

  // Zustand Store
  const initializeStore = usePlanillaStore(state => state.initialize)
  const storeState = usePlanillaStore()
  
  // Fase 2: Evaluación
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<{ id: string, name: string, description: string, code_config?: any } | null>(null)
  
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<'hacer' | 'saber' | 'ser' | null>(null)
  const [editingActivity, setEditingActivity] = useState<{ id: string, name: string } | null>(null)

  const loadEvaluationStructure = useCallback(async () => {
    try {
      setIsLoadingPlanilla(true)
      const [subject, data, studs, grad, sessionsData, attendanceData] = await Promise.all([
        getAssistedSubjectById(subjectId),
        getAssistedAchievementsAndActivities(subjectId),
        getAssistedStudents(subjectId),
        getAssistedGrades(subjectId),
        getAssistedSessions(subjectId),
        getAssistedAttendance(subjectId)
      ])

      setSubjectData(subject)

      initializeStore(subjectId, {
        students: studs,
        achievements: data.achievements,
        activities: data.activities,
        grades: grad,
        sessions: sessionsData,
        attendance: attendanceData
      })
    } catch (error: any) {
      toast.error('Error al cargar la estructura de evaluación')
    } finally {
      setIsLoadingPlanilla(false)
    }
  }, [subjectId, initializeStore])

  React.useEffect(() => {
    loadEvaluationStructure()
  }, [loadEvaluationStructure])



  const handleSaveStudents = async () => {
    if (students.length === 0) return
    
    try {
      setIsSaving(true)
      const studentsPayload = students.map(s => ({
        number: s.number,
        fullName: s.fullName,
        directoryId: s.directoryId
      }))
      await createAssistedStudents(subjectId, studentsPayload)
      toast.success(`${students.length} estudiantes guardados exitosamente.`)
      // Limpiar datos temporales
      setStudents([])
      // Recargar la estructura para actualizar el estado global (Zustand)
      await loadEvaluationStructure()
      // Pasar a la pestaña de Planilla
      setActiveTab('planilla')
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar los estudiantes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAllStudents = async () => {
    try {
      setIsSaving(true)
      const { deleteAllAssistedStudents } = await import('../../application/actions')
      await deleteAllAssistedStudents(subjectId)
      toast.success('Planilla vaciada exitosamente. Todos los estudiantes y sus datos fueron eliminados.')
      await loadEvaluationStructure()
      setIsDeleteDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al vaciar la planilla')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadFromDirectory = async () => {
    if (!subjectData?.grade) {
      toast.error('La materia no tiene un grado asignado válido.')
      return
    }
    
    try {
      setIsLoadingFromDir(true)
      const result = await getPlanillaDirectoryCandidates(subjectId, subjectData.grade, subjectData.group_number)
      
      setCandidates(result.candidates)
      setHasLoadedCandidates(true)
      
      // Pre-seleccionar por defecto todos los que faltan por agregar
      const missingIds = new Set(
        result.candidates.filter(c => !c.isAlreadyInPlanilla).map(c => c.id)
      )
      setSelectedCandidateIds(missingIds)

      if (result.candidates.length === 0) {
        const gradeLabel = subjectData.grade === 12 ? 'PFC-12' : subjectData.grade === 13 ? 'PFC-13' : subjectData.grade === 0 ? 'Nivelatorio' : `grado ${subjectData.grade}°`
        const groupLabel = subjectData.group_number ? ` grupo ${subjectData.group_number}` : ''
        toast.info(`No se encontraron estudiantes para el ${gradeLabel}${groupLabel} en el sistema.`)
        return
      }

      if (result.missingCount === 0) {
        toast.success(`Todos los estudiantes del grado (${result.totalFound}) ya se encuentran cargados en la planilla.`)
        setFilterCandidateTab('all')
      } else {
        toast.info(`Se encontraron ${result.totalFound} estudiantes: ${result.alreadyInPlanillaCount} ya en planilla y ${result.missingCount} pendientes por agregar.`)
        setFilterCandidateTab('missing')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar estudiantes desde Gestión de Estudiantes')
    } finally {
      setIsLoadingFromDir(false)
    }
  }

  const handleAddSelectedCandidates = async () => {
    const toAdd = candidates.filter(c => selectedCandidateIds.has(c.id) && !c.isAlreadyInPlanilla)
    if (toAdd.length === 0) {
      toast.error('No has seleccionado ningún estudiante nuevo para agregar.')
      return
    }

    try {
      setIsSaving(true)
      const { addDirectoryStudents } = await import('../../application/actions')
      const payload = toAdd.map(c => ({
        full_name: c.fullName,
        directory_id: c.id
      }))

      await addDirectoryStudents(subjectId, payload)
      toast.success(`¡${toAdd.length} estudiante(s) agregados exitosamente a la planilla!`)

      // Recargar evaluación completa para sincronizar store
      await loadEvaluationStructure()

      // Refrescar lista de candidatos
      const refreshed = await getPlanillaDirectoryCandidates(subjectId, subjectData?.grade, subjectData?.group_number)
      setCandidates(refreshed.candidates)
      
      const newMissing = new Set(refreshed.candidates.filter(c => !c.isAlreadyInPlanilla).map(c => c.id))
      setSelectedCandidateIds(newMissing)
      if (refreshed.missingCount === 0) {
        setFilterCandidateTab('all')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar estudiantes a la planilla')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleSelectCandidate = (id: string, isAlready: boolean) => {
    if (isAlready) return
    const next = new Set(selectedCandidateIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedCandidateIds(next)
  }

  const handleSelectAllMissing = () => {
    const missing = candidates.filter(c => !c.isAlreadyInPlanilla)
    setSelectedCandidateIds(new Set(missing.map(c => c.id)))
  }

  const handleDeselectAll = () => {
    setSelectedCandidateIds(new Set())
  }

  const filteredCandidates = React.useMemo(() => {
    return candidates.filter(c => {
      if (filterCandidateTab === 'missing' && c.isAlreadyInPlanilla) return false
      if (filterCandidateTab === 'already' && !c.isAlreadyInPlanilla) return false

      if (searchCandidate.trim()) {
        const query = searchCandidate.toLowerCase().trim()
        const matchName = c.fullName.toLowerCase().includes(query)
        const matchDoc = c.documentNumber ? c.documentNumber.includes(query) : false
        return matchName || matchDoc
      }
      return true
    })
  }, [candidates, filterCandidateTab, searchCandidate])

  const alreadyInPlanillaCount = candidates.filter(c => c.isAlreadyInPlanilla).length
  const missingCandidatesCount = candidates.filter(c => !c.isAlreadyInPlanilla).length
  const selectedToAddCount = candidates.filter(c => selectedCandidateIds.has(c.id) && !c.isAlreadyInPlanilla).length

  const handleExportExcel = () => {
    if (!subjectData) return
    exportPlanillaToExcel(
      subjectData.name,
      storeState.students,
      storeState.achievements,
      storeState.activities,
      storeState.grades,
      storeState.sessions,
      storeState.attendance
    )
    toast.success('Descargando archivo Excel...')
  }

  const handleDeleteAchievement = (id: string, name: string) => {
    toast.error(`¿Estás seguro de eliminar el logro "${name}"?`, {
      description: 'Se perderán todas sus actividades y calificaciones.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            const { deleteAssistedAchievement } = await import('../../application/actions')
            await deleteAssistedAchievement(id)
            storeState.removeAchievement(id)
            toast.success('Logro eliminado exitosamente')
          } catch (error: any) {
            toast.error(error.message || 'Error al eliminar logro')
          }
        }
      },
      cancel: { label: 'Cancelar', onClick: () => {} }
    })
  }

  const handleDeleteActivity = (id: string, name: string) => {
    toast.error(`¿Estás seguro de eliminar la actividad "${name}"?`, {
      description: 'Se perderán todas las calificaciones de esta actividad.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            const { deleteAssistedActivity } = await import('../../application/actions')
            await deleteAssistedActivity(id)
            storeState.removeActivity(id)
            toast.success('Actividad eliminada exitosamente')
          } catch (error: any) {
            toast.error(error.message || 'Error al eliminar actividad')
          }
        }
      },
      cancel: { label: 'Cancelar', onClick: () => {} }
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header Fijo */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 pt-2">
          
          <div className="flex items-center gap-3 mb-1 xl:mb-0">
            <Link href="/teacher/planilla-asistida" className="p-1.5 -ml-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                {subjectData?.name || 'Cargando...'}
              </h1>
              <span className="text-[11px] font-semibold text-slate-500 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                {subjectData?.grade ? `G${subjectData.grade}${subjectData.group_number ? ` - ${subjectData.group_number}` : ''}` : 'Planilla Asistida'}
              </span>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-5 overflow-x-auto custom-scrollbar flex-1 xl:ml-6">
            <button 
              onClick={() => setActiveTab('planilla')}
              className={`pb-2 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'planilla' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Planilla
            </button>
            <button 
              onClick={() => setActiveTab('asistencia')}
              className={`pb-2 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'asistencia' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Asistencia
            </button>
            <button 
              onClick={() => setActiveTab('estudiantes')}
              className={`pb-2 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'estudiantes' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Estudiantes
            </button>
            <button 
              onClick={() => setActiveTab('actividades')}
              className={`pb-2 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'actividades' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Estructura
            </button>
          </div>
          
          <div className="flex items-center pb-2 xl:pb-1 shrink-0">
            <Button onClick={handleExportExcel} variant="outline" className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 h-7 text-xs px-2.5">
              <Download className="h-3 w-3 mr-1.5" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido Principal Scrollable */}
      <div className={`flex-1 ${['planilla', 'asistencia'].includes(activeTab) ? 'overflow-hidden flex flex-col p-2 sm:p-4' : 'overflow-auto p-6'}`}>
        {activeTab === 'estudiantes' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Tarjeta de Control Principal */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600" />
                    Gestión y Carga de Estudiantes
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Sincroniza y valida los estudiantes del grupo contra el sistema institucional (Gestión de Estudiantes del Superadmin), detectando quiénes ya están cargados y permitiéndote agregar solo los que faltan.
                  </p>
                </div>
                
                {/* Badges de Información de la Asignatura */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {subjectData?.grade === 12 ? 'PFC-12 (12°)' : subjectData?.grade === 13 ? 'PFC-13 (13°)' : subjectData?.grade === 0 ? 'Nivelatorio' : `Grado ${subjectData?.grade}°`}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {subjectData?.group_number ? `Grupo ${subjectData.group_number}` : 'Grupo 1 (Único)'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                    {storeState.students.length} en planilla
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  onClick={handleLoadFromDirectory}
                  disabled={isLoadingFromDir}
                  className="w-full sm:w-auto bg-[#1F4E31] hover:bg-[#183e27] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-medium shadow-sm"
                >
                  {isLoadingFromDir ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Consultando Gestión de Estudiantes...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {hasLoadedCandidates ? 'Volver a consultar Directorio' : 'Cargar desde Directorio Estudiantil'}
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isSaving || storeState.students.length === 0}
                  variant="outline"
                  className="w-full sm:w-auto text-red-700 bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Vaciar toda la planilla ({storeState.students.length})
                </Button>
              </div>
            </div>

            {/* Panel de Validación Contra Gestión de Estudiantes */}
            {hasLoadedCandidates && (
              <div className="space-y-4">
                {/* Métricas KPI */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      Total en Gestión
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {candidates.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {subjectData?.grade === 12 ? 'PFC-12' : subjectData?.grade === 13 ? 'PFC-13' : subjectData?.grade === 0 ? 'Nivelatorio' : `Grado ${subjectData?.grade}°`} - {subjectData?.group_number ? `Grupo ${subjectData.group_number}` : 'Grupo 1'}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 p-4">
                    <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ya en Planilla
                    </div>
                    <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                      {alreadyInPlanillaCount}
                    </div>
                    <div className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Estudiantes cargados</div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200/70 dark:border-amber-900/40 p-4">
                    <div className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Pendientes por Agregar
                    </div>
                    <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                      {missingCandidatesCount}
                    </div>
                    <div className="text-[11px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Faltan en esta materia</div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200/70 dark:border-blue-900/40 p-4">
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" />
                      Seleccionados
                    </div>
                    <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                      {selectedToAddCount}
                    </div>
                    <div className="text-[11px] text-blue-600/70 dark:text-blue-400/70 mt-0.5">Listos para agregar</div>
                  </div>
                </div>

                {/* Tabla de Comparación y Selección */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  {/* Encabezado y Barra de Acciones */}
                  <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Listado de Estudiantes del Grupo</span>
                        <span className="text-xs font-normal text-slate-500">
                          (Cuentas de Campus y Directorio Institucional)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Marca los estudiantes que deseas ingresar a la planilla. Los ya cargados se muestran identificados con su número.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={handleSelectAllMissing}
                        disabled={missingCandidatesCount === 0 || isSaving}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 text-slate-700 dark:text-slate-300"
                      >
                        <CheckSquare className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        Marcar solo faltantes ({missingCandidatesCount})
                      </Button>

                      <Button
                        onClick={handleDeselectAll}
                        disabled={selectedCandidateIds.size === 0 || isSaving}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <Square className="h-3.5 w-3.5 mr-1" />
                        Deseleccionar
                      </Button>

                      <Button
                        onClick={handleAddSelectedCandidates}
                        disabled={selectedToAddCount === 0 || isSaving}
                        size="sm"
                        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Agregando...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                            Agregar {selectedToAddCount} faltante(s)
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Filtros y Buscador */}
                  <div className="p-3 sm:px-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium self-start">
                      <button
                        onClick={() => setFilterCandidateTab('missing')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${filterCandidateTab === 'missing' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        Faltantes ({missingCandidatesCount})
                      </button>
                      <button
                        onClick={() => setFilterCandidateTab('all')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${filterCandidateTab === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        Todos ({candidates.length})
                      </button>
                      <button
                        onClick={() => setFilterCandidateTab('already')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${filterCandidateTab === 'already' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        Ya en planilla ({alreadyInPlanillaCount})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchCandidate}
                        onChange={(e) => setSearchCandidate(e.target.value)}
                        placeholder="Buscar por nombre o documento..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                      />
                      {searchCandidate && (
                        <button
                          onClick={() => setSearchCandidate('')}
                          className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabla */}
                  <div className="max-h-[460px] overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 sticky top-0 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 z-10">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">Sel.</th>
                          <th className="py-3 px-3 w-14 text-center">N°</th>
                          <th className="py-3 px-4">Apellidos y Nombres</th>
                          <th className="py-3 px-4">Documento</th>
                          <th className="py-3 px-4">Origen / Cuenta</th>
                          <th className="py-3 px-4 text-center">Estado en Planilla</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {filteredCandidates.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400">
                              No se encontraron estudiantes con los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          filteredCandidates.map((cand) => {
                            const isSelected = selectedCandidateIds.has(cand.id)
                            return (
                              <tr
                                key={cand.id}
                                onClick={() => handleToggleSelectCandidate(cand.id, cand.isAlreadyInPlanilla)}
                                className={`transition-colors cursor-pointer ${
                                  cand.isAlreadyInPlanilla
                                    ? 'bg-slate-50/50 dark:bg-slate-900/30 opacity-80 cursor-default'
                                    : isSelected
                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  {cand.isAlreadyInPlanilla ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleSelectCandidate(cand.id, cand.isAlreadyInPlanilla)}
                                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                    />
                                  )}
                                </td>
                                
                                <td className="py-2.5 px-3 text-center font-bold">
                                  {cand.isAlreadyInPlanilla ? (
                                    <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                                      #{cand.currentPlanillaNumber}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 font-mono">+</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                  {cand.fullName}
                                </td>

                                <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                                  {cand.documentNumber || <span className="text-slate-300 dark:text-slate-600 italic">Sin documento</span>}
                                </td>

                                <td className="py-2.5 px-4">
                                  {cand.source === 'profiles' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                      <Sparkles className="w-3 h-3 text-emerald-600" />
                                      Cuenta Campus
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                      <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                                      Directorio / Sin cuenta
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-4 text-center">
                                  {cand.isAlreadyInPlanilla ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      En planilla (N° {cand.currentPlanillaNumber})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      Pendiente por agregar
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
            )}

            {/* Listado Oficial Actual de Estudiantes en la Planilla */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Estudiantes matriculados actualmente en la planilla</span>
                    <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full font-bold">
                      {storeState.students.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Estudiantes activos que cuentan con registro de calificaciones y asistencias en esta asignatura.
                  </p>
                </div>
              </div>

              {storeState.students.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Aún no hay estudiantes matriculados en esta planilla
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Haz clic en el botón superior &quot;Cargar desde Directorio Estudiantil&quot; para consultar los estudiantes de este grupo y agregarlos en un clic.
                  </p>
                </div>
              ) : (
                <div className="max-h-[380px] overflow-auto custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 sticky top-0 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-3 w-16 text-center">N°</th>
                        <th className="px-6 py-3">Apellidos y Nombres</th>
                        <th className="px-6 py-3 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {storeState.students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-6 py-2.5 font-bold font-mono text-center text-emerald-700 dark:text-emerald-400">
                            #{student.number}
                          </td>
                          <td className="px-6 py-2.5 font-medium text-slate-800 dark:text-slate-200 uppercase">
                            {student.full_name}
                          </td>
                          <td className="px-6 py-2.5 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Activo en planilla
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'actividades' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Logros y Actividades</h2>
                <p className="text-sm text-slate-500">
                  Configura los logros de tu materia. Cada logro tiene un Hacer (35%), Saber (35%) y Ser (30%).
                </p>
              </div>
              <Button onClick={() => setIsAchievementModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Logro
              </Button>
            </div>

            {storeState.achievements.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 px-4 text-center">
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Sin logros</h3>
                <p className="mb-6 max-w-sm text-sm text-slate-500">Crea tu primer logro (desempeño) para comenzar a organizar tus actividades.</p>
                <Button onClick={() => setIsAchievementModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="h-4 w-4 mr-2" /> Crear Logro
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {storeState.achievements.map((ach) => (
                  <div key={ach.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 px-6 py-4 border-b border-emerald-100 dark:border-emerald-900/50 flex justify-between items-center group">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-emerald-900 dark:text-emerald-300">{ach.name}</h3>
                          {ach.code_config && ach.code_config.type !== 'none' && (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-800/60 dark:text-emerald-200 text-[10px] sm:text-xs px-2 py-0.5 rounded flex items-center gap-1 font-semibold border border-emerald-200 dark:border-emerald-700">
                              {ach.code_config.type === 'single' ? (
                                <>Cód: <span className="font-bold">{ach.code_config.singleCode}</span></>
                              ) : (
                                <>
                                  Códs: 
                                  <span title="Superior" className="text-emerald-600 dark:text-emerald-400">S({ach.code_config.rangeCodes?.superior})</span> · 
                                  <span title="Alto" className="text-emerald-600 dark:text-emerald-400">A({ach.code_config.rangeCodes?.alto})</span> · 
                                  <span title="Básico" className="text-emerald-600 dark:text-emerald-400">B({ach.code_config.rangeCodes?.basico})</span> · 
                                  <span title="Bajo" className="text-emerald-600 dark:text-emerald-400">Bj({ach.code_config.rangeCodes?.bajo})</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                        {ach.description && <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">{ach.description}</p>}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingAchievement({ id: ach.id, name: ach.name, description: ach.description || '', code_config: ach.code_config })
                            setIsAchievementModalOpen(true)
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAchievement(ach.id, ach.name)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">
                      {(['hacer', 'saber', 'ser'] as const).map((comp) => {
                        const compActivities = storeState.activities.filter(a => a.achievement_id === ach.id && a.component_type === comp)
                        const percentage = comp === 'ser' ? '30%' : '35%'
                        return (
                          <div key={comp} className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-semibold text-sm uppercase text-slate-700 dark:text-slate-300">
                                {comp} ({percentage})
                              </h4>
                              <button 
                                onClick={() => {
                                  setSelectedAchievementId(ach.id)
                                  setSelectedComponent(comp)
                                  setIsActivityModalOpen(true)
                                }}
                                className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md p-1"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="space-y-2">
                              {compActivities.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Sin actividades</p>
                              ) : (
                                compActivities.map(act => (
                                  <div key={act.id} className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-md px-3 py-2 flex items-center justify-between group/act">
                                    <div className="flex items-center gap-2 truncate">
                                      <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
                                      <span className="truncate">{act.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/act:opacity-100 shrink-0">
                                      <button 
                                        onClick={() => {
                                          setEditingActivity({ id: act.id, name: act.name })
                                          setSelectedAchievementId(ach.id)
                                          setSelectedComponent(comp)
                                          setIsActivityModalOpen(true)
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteActivity(act.id, act.name)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'planilla' && (
          <div className="flex-1 relative flex flex-col min-h-0">
            {isLoadingPlanilla ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                <p>Cargando planilla...</p>
              </div>
            ) : (
              <SpreadsheetTable subjectId={subjectId} />
            )}
          </div>
        )}

        {activeTab === 'asistencia' && (
          <div className="flex-1 relative flex flex-col min-h-0">
            {isLoadingPlanilla ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                <p>Cargando asistencia...</p>
              </div>
            ) : (
              <>
                <AttendanceDashboard />
                <div className="flex-1 min-h-0 flex flex-col mt-2">
                  <AttendanceTable subjectId={subjectId} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <CreateAchievementModal 
        isOpen={isAchievementModalOpen}
        onClose={() => {
          setIsAchievementModalOpen(false)
          setEditingAchievement(null)
        }}
        subjectId={subjectId}
        initialData={editingAchievement || undefined}
        onSuccess={() => {
          setIsAchievementModalOpen(false)
          setEditingAchievement(null)
        }}
      />

      {selectedAchievementId && selectedComponent && (
        <CreateActivityModal 
          isOpen={isActivityModalOpen}
          onClose={() => {
            setIsActivityModalOpen(false)
            setEditingActivity(null)
          }}
          achievementId={selectedAchievementId}
          componentType={selectedComponent}
          initialData={editingActivity || undefined}
          onSuccess={() => {
            setIsActivityModalOpen(false)
            setEditingActivity(null)
          }}
        />
      )}
      {/* Modal de confirmación para vaciar planilla */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Vaciar toda la planilla</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar TODOS los estudiantes de esta planilla? Se borrarán también todas las notas y asistencias asociadas. Esta acción NO se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={handleDeleteAllStudents}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Sí, vaciar planilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
