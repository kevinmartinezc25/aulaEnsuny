'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileSpreadsheet, ArrowLeft, Users, Save, Download, Settings,
  Menu, X, ChevronRight, CalendarDays, TrendingUp, Layers
} from 'lucide-react'
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
import { PlanillaGeneralAverageDashboard } from '../components/PlanillaGeneralAverageDashboard'

interface PlanillaAsistidaDetailScreenProps {
  subjectId: string
}

export const NAV_SECTIONS: {
  id: 'planilla' | 'asistencia' | 'estudiantes' | 'actividades' | 'promedio'
  label: string
  shortLabel: string
  description: string
  icon: React.ElementType
}[] = [
  {
    id: 'planilla',
    label: 'Planilla de Calificaciones',
    shortLabel: 'Planilla',
    description: 'Registro de calificaciones, logros y ponderaciones',
    icon: FileSpreadsheet,
  },
  {
    id: 'asistencia',
    label: 'Registro de Asistencia',
    shortLabel: 'Asistencia',
    description: 'Control de sesiones diarias, faltas y justificaciones',
    icon: CalendarDays,
  },
  {
    id: 'estudiantes',
    label: 'Gestión de Estudiantes',
    shortLabel: 'Estudiantes',
    description: 'Directorio institucional y nómina del grupo',
    icon: Users,
  },
  {
    id: 'actividades',
    label: 'Estructura Curricular',
    shortLabel: 'Estructura',
    description: 'Configuración de logros, actividades y periodos',
    icon: Layers,
  },
  {
    id: 'promedio',
    label: 'Promedio General',
    shortLabel: 'Promedio General',
    description: 'Dashboard analítico y desempeño acumulado',
    icon: TrendingUp,
  },
]

export function PlanillaAsistidaDetailScreen({ subjectId }: PlanillaAsistidaDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<'planilla' | 'promedio' | 'actividades' | 'estudiantes' | 'asistencia' | 'configuracion'>('planilla')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
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

  const handleTabChange = async (newTab: 'planilla' | 'promedio' | 'actividades' | 'estudiantes' | 'asistencia' | 'configuracion') => {
    if (activeTab === newTab) return
    if (storeState.hasUnsavedChanges || storeState.dirtyGrades.length > 0 || storeState.dirtyAttendance.length > 0) {
      await storeState.saveChanges()
    }
    setActiveTab(newTab)
  }
  
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

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false)
    }
    if (isMenuOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])



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
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-6 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Lado Izquierdo: Regreso + Asignatura + Grado + Indicador móvil */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link 
              href="/teacher/planilla-asistida" 
              className="p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors shrink-0"
              title="Volver a mis planillas"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
                <span className="truncate">{subjectData?.name || 'Cargando...'}</span>
              </h1>
              <span className="text-[11px] font-semibold text-slate-500 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md shrink-0">
                {subjectData?.grade ? `G${subjectData.grade}${subjectData.group_number ? ` - ${subjectData.group_number}` : ''}` : 'Planilla'}
              </span>
            </div>

            {/* Píldora de sección activa visible solo en móvil (< md) para contexto rápido */}
            <div className="md:hidden">
              {(() => {
                const currentSection = NAV_SECTIONS.find(s => s.id === activeTab) || NAV_SECTIONS[0]
                return (
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 truncate">
                    {currentSection.shortLabel}
                  </span>
                )
              })()}
            </div>
          </div>

          {/* Pestañas para Escritorio (Desktop): visibles en pantallas md o mayores */}
          <div className="hidden md:flex items-center gap-1 lg:gap-1.5 mx-2 flex-1 justify-center overflow-x-auto custom-scrollbar">
            {NAV_SECTIONS.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{tab.shortLabel}</span>
                </button>
              )
            })}
          </div>

          {/* Lado Derecho: Exportar en escritorio, Hamburguesa en móvil */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Exportar para Escritorio */}
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="hidden md:inline-flex text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800 h-8 text-xs px-3 font-semibold gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar</span>
            </Button>

            {/* Botón Hamburguesa solo para Móviles (< md) */}
            <Button
              onClick={() => setIsMenuOpen(true)}
              variant="outline"
              size="sm"
              className="md:hidden h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs cursor-pointer"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Menú</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Drawer Hamburguesa con Pestañas y Botón Exportar */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop con desenfoque suave */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs cursor-pointer"
              aria-hidden="true"
            />

            {/* Panel Lateral Drawer */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
              role="dialog"
              aria-label="Menú de navegación de planilla"
            >
              {/* Encabezado del Menú */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Planilla Asistida</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    {subjectData?.name || 'Asignatura'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {subjectData?.grade ? `Grado ${subjectData.grade}${subjectData.group_number ? ` - Grupo ${subjectData.group_number}` : ''}` : 'Sin grado'}
                    {storeState.students.length > 0 && ` • ${storeState.students.length} estudiantes`}
                  </p>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contenido Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Sección de Vistas */}
                <div>
                  <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Secciones del Cuaderno
                  </div>
                  <div className="space-y-1.5">
                    {NAV_SECTIONS.map((section) => {
                      const isActive = activeTab === section.id
                      const Icon = section.icon
                      return (
                        <button
                          key={section.id}
                          onClick={() => {
                            handleTabChange(section.id)
                            setIsMenuOpen(false)
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                              : 'bg-white dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                              isActive 
                                ? 'bg-emerald-600 text-white shadow-2xs' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs sm:text-sm font-semibold truncate ${
                                isActive ? 'text-emerald-900 dark:text-emerald-200 font-bold' : 'text-slate-800 dark:text-slate-200'
                              }`}>
                                {section.label}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {section.description}
                              </div>
                            </div>
                          </div>
                          {isActive ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                              Activo
                            </span>
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Separador */}
                <div className="border-t border-slate-200/80 dark:border-slate-800" />

                {/* Sección de Exportación */}
                <div>
                  <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Acciones & Descargas
                  </div>
                  <button
                    onClick={() => {
                      handleExportExcel()
                      setIsMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-linear-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-emerald-950/40 text-emerald-900 dark:text-emerald-200 hover:shadow-sm hover:border-emerald-400 dark:hover:border-emerald-700 transition-all group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                        <Download className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Exportar a Excel</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded">
                            .XLSX
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400 truncate">
                          Planilla de notas y registro de asistencia
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                </div>
              </div>

              {/* Pie del Drawer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Aula Ensuny • Planilla Asistida</span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sincronizado
                </span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Contenido Principal Scrollable */}
      <div className={`flex-1 ${['planilla', 'asistencia'].includes(activeTab) ? 'overflow-hidden flex flex-col p-2 sm:p-4' : activeTab === 'promedio' ? 'overflow-hidden flex flex-col p-0' : 'overflow-auto p-3.5 sm:p-6'}`}>
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
          <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Logros y Actividades
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Configura los logros de tu materia. Cada logro tiene un Hacer (35%), Saber (35%) y Ser (30%).
                </p>
              </div>
              <Button 
                onClick={() => setIsAchievementModalOpen(true)} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm w-full sm:w-auto justify-center"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Nuevo Logro
              </Button>
            </div>

            {storeState.achievements.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 sm:py-16 px-4 text-center">
                <h3 className="mb-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white">Sin logros</h3>
                <p className="mb-6 max-w-sm text-xs sm:text-sm text-slate-500">Crea tu primer logro (desempeño) para comenzar a organizar tus actividades.</p>
                <Button onClick={() => setIsAchievementModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" /> Crear Logro
                </Button>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {storeState.achievements.map((ach) => (
                  <div key={ach.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs sm:shadow-sm overflow-hidden">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3.5 sm:px-6 sm:py-4 border-b border-emerald-100 dark:border-emerald-900/50 flex items-start sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="font-bold text-emerald-950 dark:text-emerald-300 text-sm sm:text-base leading-snug break-words">
                            {ach.name}
                          </h3>
                          {ach.code_config && ach.code_config.type !== 'none' && (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-800/60 dark:text-emerald-200 text-[10px] sm:text-xs px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold border border-emerald-200 dark:border-emerald-700 shrink-0">
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
                        {ach.description && <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed break-words">{ach.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-white/70 dark:bg-slate-900/60 p-0.5 sm:p-1 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                        <button 
                          onClick={() => {
                            setEditingAchievement({ id: ach.id, name: ach.name, description: ach.description || '', code_config: ach.code_config })
                            setIsAchievementModalOpen(true)
                          }}
                          className="p-1.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                          title="Editar logro"
                          aria-label="Editar logro"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAchievement(ach.id, ach.name)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Eliminar logro"
                          aria-label="Eliminar logro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                      {(['hacer', 'saber', 'ser'] as const).map((comp) => {
                        const compActivities = storeState.activities.filter(a => a.achievement_id === ach.id && a.component_type === comp)
                        const percentage = comp === 'ser' ? '30%' : '35%'
                        const badgeColors = {
                          hacer: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
                          saber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
                          ser: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                        }
                        const dotColors = {
                          hacer: 'bg-blue-500',
                          saber: 'bg-amber-500',
                          ser: 'bg-emerald-500'
                        }
                        return (
                          <div key={comp} className="p-3.5 sm:p-4 bg-white dark:bg-slate-900">
                            <div className="flex justify-between items-center mb-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${dotColors[comp]}`} />
                                <h4 className="font-bold text-xs sm:text-sm uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                                  {comp}
                                </h4>
                                <span className={`text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded border ${badgeColors[comp]}`}>
                                  {percentage}
                                </span>
                              </div>
                              <button 
                                onClick={() => {
                                  setSelectedAchievementId(ach.id)
                                  setSelectedComponent(comp)
                                  setIsActivityModalOpen(true)
                                }}
                                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 rounded-lg px-2 py-1 text-xs font-medium transition-colors border border-emerald-200/60 dark:border-emerald-800/40"
                                title={`Agregar actividad a ${comp}`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-semibold">Actividad</span>
                              </button>
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                              {compActivities.length === 0 ? (
                                <div className="py-3 px-2 text-center rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-dashed border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 italic">
                                  Sin actividades registradas
                                </div>
                              ) : (
                                compActivities.map(act => (
                                  <div key={act.id} className="text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-2.5 sm:px-3 py-2 flex items-center justify-between gap-2 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <GripVertical className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                                      <span className="truncate font-medium text-slate-700 dark:text-slate-200">{act.name}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                                      <button 
                                        onClick={() => {
                                          setEditingActivity({ id: act.id, name: act.name })
                                          setSelectedAchievementId(ach.id)
                                          setSelectedComponent(comp)
                                          setIsActivityModalOpen(true)
                                        }}
                                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        title="Editar actividad"
                                        aria-label="Editar actividad"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteActivity(act.id, act.name)}
                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title="Eliminar actividad"
                                        aria-label="Eliminar actividad"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
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

        {activeTab === 'promedio' && (
          <PlanillaGeneralAverageDashboard subjectName={subjectData?.name} />
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
