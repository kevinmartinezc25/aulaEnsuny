'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FileSpreadsheet, ArrowLeft, Users, Save, Download, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { createAssistedStudents, getAssistedAchievementsAndActivities, getAssistedStudents, getAssistedGrades, getAssistedSubjectById, AssistedAchievement, AssistedActivity, AssistedSubject } from '../../application/actions'
import { Loader2, Plus, GripVertical, Edit2, Trash2 } from 'lucide-react'
import { CreateAchievementModal } from '../components/CreateAchievementModal'
import { CreateActivityModal } from '../components/CreateActivityModal'
import { usePlanillaStore } from '@/store/usePlanillaStore'
import { SpreadsheetTable } from '@/components/planilla-asistida/SpreadsheetTable'
import { exportPlanillaToExcel } from '../../application/exportUtils'

interface PlanillaAsistidaDetailScreenProps {
  subjectId: string
}

export function PlanillaAsistidaDetailScreen({ subjectId }: PlanillaAsistidaDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<'planilla' | 'actividades' | 'estudiantes' | 'configuracion'>('planilla')
  const [pastedData, setPastedData] = useState<string>('')
  const [students, setStudents] = useState<{ id: string, number: number, fullName: string }[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingPlanilla, setIsLoadingPlanilla] = useState(true)
  const [subjectData, setSubjectData] = useState<AssistedSubject | null>(null)

  // Zustand Store
  const initializeStore = usePlanillaStore(state => state.initialize)
  const storeState = usePlanillaStore()
  
  // Fase 2: Evaluación
  const [achievements, setAchievements] = useState<AssistedAchievement[]>([])
  const [activities, setActivities] = useState<AssistedActivity[]>([])
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<{ id: string, name: string, description: string, code_config?: any } | null>(null)
  
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<'hacer' | 'saber' | 'ser' | null>(null)
  const [editingActivity, setEditingActivity] = useState<{ id: string, name: string } | null>(null)

  const loadEvaluationStructure = useCallback(async () => {
    try {
      setIsLoadingPlanilla(true)
      const [subject, data, studs, grad] = await Promise.all([
        getAssistedSubjectById(subjectId),
        getAssistedAchievementsAndActivities(subjectId),
        getAssistedStudents(subjectId),
        getAssistedGrades(subjectId)
      ])

      setSubjectData(subject)
      setAchievements(data.achievements)
      setActivities(data.activities)

      initializeStore(subjectId, {
        students: studs,
        achievements: data.achievements,
        activities: data.activities,
        grades: grad
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

  // Lógica para procesar pegado desde Excel
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    setPastedData(text)
    
    // Procesar filas
    const rows = text.split('\n').filter(row => row.trim() !== '')
    const newStudents: { id: string, number: number, fullName: string }[] = []
    
    let autoNum = 1
    rows.forEach((row, idx) => {
      // Excel separa las columnas por tabulación
      const cols = row.split('\t')
      
      let num = autoNum
      let name = ''

      if (cols.length >= 2) {
        // Tiene número y nombre (ej: "1 \t ALVAREZ...")
        const parsedNum = parseInt(cols[0], 10)
        if (!isNaN(parsedNum)) {
          num = parsedNum
        }
        name = cols[1].trim()
      } else {
        // Solo pegaron los nombres
        name = cols[0].trim()
      }

      // Si el nombre no está vacío y no parece ser un encabezado
      if (name && !name.toLowerCase().includes('nombres') && !name.toLowerCase().includes('apellidos')) {
        newStudents.push({
          id: `temp-${idx}`,
          number: num,
          fullName: name
        })
        autoNum = num + 1
      }
    })

    if (newStudents.length > 0) {
      setStudents(newStudents)
      toast.success(`${newStudents.length} estudiantes detectados`)
    }
  }, [])

  const handleSaveStudents = async () => {
    if (students.length === 0) return
    
    try {
      setIsSaving(true)
      await createAssistedStudents(subjectId, students)
      toast.success(`${students.length} estudiantes guardados exitosamente.`)
      // Limpiar y pasar a la pestaña de Planilla
      setPastedData('')
      setStudents([])
      setActiveTab('planilla')
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar los estudiantes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportExcel = () => {
    if (!subjectData) return
    exportPlanillaToExcel(
      subjectData.name,
      storeState.students,
      storeState.achievements,
      storeState.activities,
      storeState.grades
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
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header Fijo */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/teacher/planilla-asistida" className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                {subjectData?.name || 'Cargando...'}
              </h1>
              <p className="text-xs font-medium text-slate-500">
                {subjectData?.grade ? `Grado ${subjectData.grade}${subjectData.group_number ? ` - Grupo ${subjectData.group_number}` : ''}` : 'Planilla Asistida'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={handleExportExcel} variant="outline" className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200">
              <Download className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-100 dark:border-slate-800 overflow-x-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('planilla')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'planilla' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Planilla
          </button>
          <button 
            onClick={() => setActiveTab('estudiantes')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'estudiantes' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Estudiantes
          </button>
          <button 
            onClick={() => setActiveTab('actividades')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'actividades' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Estructura de Evaluación
          </button>
        </div>
      </div>

      {/* Contenido Principal Scrollable */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'estudiantes' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                Cargar Estudiantes
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Copia la lista de estudiantes desde Excel y pégala en el recuadro de abajo. Puedes pegar dos columnas (N° y Nombre) o solo una columna con los nombres.
              </p>

              <div className="space-y-4">
                <textarea
                  className="w-full h-32 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none font-mono text-sm placeholder:text-slate-400"
                  placeholder="Ejemplo:&#10;1&#9;ALVAREZ MARIN JUAN DIEGO&#10;2&#9;BARRETO DURANGO FEDERICO..."
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  onPaste={handlePaste}
                />
              </div>
            </div>

            {students.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Vista previa de estudiantes ({students.length})
                  </h3>
                  <Button 
                    onClick={handleSaveStudents}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Confirmar estudiantes
                  </Button>
                </div>
                <div className="max-h-[400px] overflow-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 sticky top-0 uppercase">
                      <tr>
                        <th className="px-6 py-3 font-semibold w-24">N°</th>
                        <th className="px-6 py-3 font-semibold">Apellidos y Nombres</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{student.number}</td>
                          <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{student.fullName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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

            {achievements.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 px-4 text-center">
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Sin logros</h3>
                <p className="mb-6 max-w-sm text-sm text-slate-500">Crea tu primer logro (desempeño) para comenzar a organizar tus actividades.</p>
                <Button onClick={() => setIsAchievementModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="h-4 w-4 mr-2" /> Crear Logro
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {achievements.map((ach) => (
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
                        const compActivities = activities.filter(a => a.achievement_id === ach.id && a.component_type === comp)
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
          <div className="h-full relative min-h-[500px]">
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
          loadEvaluationStructure()
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
            loadEvaluationStructure()
          }}
        />
      )}
    </div>
  )
}
