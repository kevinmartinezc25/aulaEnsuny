'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, Plus, Trash2, X, Save, AlertCircle, Loader2, CheckCircle,
  Users, BookOpen, Sparkles, MapPin, School, Search, ArrowRight, ExternalLink,
  Layers, Filter, RefreshCw, Building2, Edit2, Phone, Navigation, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  getAdminGradeLevelsOverview,
  createAcademicLevel,
  deleteAcademicLevel,
  createAcademicGroup,
  deleteAcademicGroup,
  syncMissingGroupsFromStudents,
  getStudentsByGradeLevel,
  createMissingOfficialGradeLevels,
  getInstitutionalSedes,
  createInstitutionalSede,
  updateInstitutionalSede,
  deleteInstitutionalSede
} from '../../application/actions'
import {
  GradeLevelOverviewItem,
  AcademicGradeLevelsOverview,
  AdminStudent,
  InstitutionalSede
} from '../../application/types'
import {
  DEFAULT_INSTITUTIONAL_SEDES,
  OFFICIAL_GRADE_LEVELS
} from '@/lib/gradeUtils'

export function AdminGradeLevelsScreen() {
  // Pestaña principal: 'grades' (Grados y Grupos) o 'sedes' (Sedes Institucionales)
  const [activeMainTab, setActiveMainTab] = useState<'grades' | 'sedes'>('grades')

  const [overview, setOverview] = useState<AcademicGradeLevelsOverview>({
    levels: [],
    totalStudents: 0,
    totalCourses: 0,
    totalGroups: 0,
    sedes: Array.from(DEFAULT_INSTITUTIONAL_SEDES),
    missingGroups: []
  })

  // Lista de Sedes Institucionales
  const [sedesList, setSedesList] = useState<InstitutionalSede[]>([])

  const [selectedSede, setSelectedSede] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isProvisioning, setIsProvisioning] = useState(false)

  // Grados
  const [newLevelName, setNewLevelName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modal para inspeccionar estudiantes del grado
  const [inspectGrade, setInspectGrade] = useState<GradeLevelOverviewItem | null>(null)
  const [inspectStudents, setInspectStudents] = useState<AdminStudent[]>([])
  const [loadingInspect, setLoadingInspect] = useState(false)
  const [inspectGroupFilter, setInspectGroupFilter] = useState<string>('all')
  const [inspectSedeFilter, setInspectSedeFilter] = useState<string>('all')
  const [inspectSearchQuery, setInspectSearchQuery] = useState('')

  // Modal de Crear / Editar Sede
  const [isSedeModalOpen, setIsSedeModalOpen] = useState(false)
  const [editingSede, setEditingSede] = useState<InstitutionalSede | null>(null)
  const [sedeSaving, setSedeSaving] = useState(false)
  const [sedeForm, setSedeForm] = useState<{
    name: string
    daneCode: string
    zone: 'Urbana' | 'Rural'
    hasMultigrade: boolean
    address: string
    contactPhone: string
  }>({
    name: '',
    daneCode: '',
    zone: 'Urbana',
    hasMultigrade: false,
    address: '',
    contactPhone: ''
  })

  // Modal personalizado de Confirmación (Reemplaza los confirm() del navegador)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
    onConfirm: () => Promise<void> | void
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'danger',
    onConfirm: () => {}
  })
  const [isConfirmingAction, setIsConfirmingAction] = useState(false)

  // Carga unificada de datos alimentada desde Gestión de Estudiantes y BD de Sedes
  const loadData = async (sedeFilter = selectedSede) => {
    setIsLoading(true)
    try {
      const [data, sedesData] = await Promise.all([
        getAdminGradeLevelsOverview(sedeFilter),
        getInstitutionalSedes()
      ])
      setOverview(data)
      setSedesList(sedesData)
    } catch (error) {
      console.error('Error al cargar vista de grados y sedes:', error)
      toast.error('Error al sincronizar datos institucionales.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedSede)
  }, [selectedSede])

  // Abrir modal de inspección de estudiantes
  const handleOpenInspect = async (lvl: GradeLevelOverviewItem) => {
    setInspectGrade(lvl)
    setInspectGroupFilter('all')
    setInspectSedeFilter('all')
    setInspectSearchQuery('')
    setLoadingInspect(true)
    try {
      const stList = await getStudentsByGradeLevel(lvl.name, 'all', selectedSede)
      setInspectStudents(stList)
    } catch (err) {
      console.error('Error al cargar estudiantes del grado:', err)
      toast.error('No se pudieron cargar los estudiantes del grado.')
    } finally {
      setLoadingInspect(false)
    }
  }

  // Filtrar estudiantes dentro del modal
  const filteredInspectStudents = useMemo(() => {
    return inspectStudents.filter(s => {
      if (inspectGroupFilter !== 'all' && (s.groupName || '1').trim() !== inspectGroupFilter.trim()) {
        return false
      }
      if (inspectSedeFilter !== 'all' && (s.sede || 'Sede Principal').trim().toLowerCase() !== inspectSedeFilter.trim().toLowerCase()) {
        return false
      }
      if (inspectSearchQuery.trim()) {
        const q = inspectSearchQuery.toLowerCase()
        const matchName = s.name.toLowerCase().includes(q)
        const matchDoc = (s as any).documentId?.toLowerCase?.().includes(q)
        const matchEmail = s.email?.toLowerCase?.().includes(q)
        if (!matchName && !matchDoc && !matchEmail) return false
      }
      return true
    })
  }, [inspectStudents, inspectGroupFilter, inspectSedeFilter, inspectSearchQuery])

  // Grados oficiales que aún no han sido registrados
  const availableOfficialLevels = useMemo(() => {
    const registeredNames = new Set(overview.levels.map(l => l.name.toLowerCase()))
    return OFFICIAL_GRADE_LEVELS.filter(o => !registeredNames.has(o.toLowerCase()))
  }, [overview.levels])

  // Sincronización automática de grupos faltantes desde estudiantes
  const handleSyncMissingGroups = async () => {
    setIsSyncing(true)
    try {
      const res = await syncMissingGroupsFromStudents()
      if (res.success) {
        toast.success(`Se sincronizaron y crearon ${res.createdCount} grupos detectados en estudiantes.`)
        await loadData(selectedSede)
      } else {
        toast.error(res.error || 'Error al sincronizar grupos.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error en la sincronización.')
    } finally {
      setIsSyncing(false)
    }
  }

  // Aprovisionamiento masivo de grados oficiales faltantes con Modal Elegante
  const handleProvisionOfficialLevels = () => {
    setConfirmModal({
      isOpen: true,
      title: '¿Aprovisionar Grados Oficiales?',
      description: `Se registrarán automáticamente los grados oficiales institucionales faltantes (${availableOfficialLevels.slice(0, 5).join(', ')}${availableOfficialLevels.length > 5 ? '...' : ''}). Estarán disponibles de inmediato en la matrícula y diseño de cursos.`,
      confirmText: 'Sí, Aprovisionar Grados',
      cancelText: 'Cancelar',
      variant: 'info',
      onConfirm: async () => {
        setIsConfirmingAction(true)
        try {
          const res = await createMissingOfficialGradeLevels()
          if (res.success) {
            toast.success(`Se agregaron ${res.createdCount} grados oficiales al catálogo.`)
            await loadData(selectedSede)
          } else {
            toast.error(res.error || 'Error al aprovisionar grados.')
          }
        } catch (err: any) {
          toast.error(err.message || 'Error al aprovisionar.')
        } finally {
          setIsConfirmingAction(false)
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  // Crear grado académico
  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLevelName.trim()) {
      setErrorMsg('El nombre del grado es requerido.')
      return
    }

    const normalizedName = newLevelName.trim()
    if (overview.levels.some(l => l.name.toLowerCase() === normalizedName.toLowerCase())) {
      setErrorMsg('Este grado ya se encuentra registrado.')
      return
    }

    setIsSaving(true)
    setErrorMsg('')

    try {
      const res = await createAcademicLevel(normalizedName)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        setNewLevelName('')
        setSuccessMsg('Grado académico registrado con éxito.')
        await loadData(selectedSede)
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el grado.')
    } finally {
      setIsSaving(false)
    }
  }

  // Eliminar grado con Modal Elegante
  const handleDeleteGrade = (lvl: GradeLevelOverviewItem) => {
    const hasDependencies = lvl.studentsCount > 0 || lvl.coursesCount > 0

    setConfirmModal({
      isOpen: true,
      title: hasDependencies ? 'Advertencia: Grado con Registros' : '¿Eliminar Grado Académico?',
      description: hasDependencies
        ? `El grado "${lvl.name}" tiene ${lvl.studentsCount} alumnos matriculados y ${lvl.coursesCount} materias vinculadas en Gestión de Estudiantes. Si lo eliminas, los estudiantes perderán su vinculación de grado oficial. ¿Deseas proceder?`
        : `¿Estás seguro de que deseas eliminar permanentemente el grado "${lvl.name}" del catálogo institucional?`,
      confirmText: hasDependencies ? 'Proceder y Eliminar' : 'Eliminar Grado',
      cancelText: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        setIsConfirmingAction(true)
        try {
          const res = await deleteAcademicLevel(lvl.id)
          if (res?.error) {
            toast.error(`Error al eliminar grado: ${res.error}`)
          } else {
            toast.success(`Grado "${lvl.name}" eliminado con éxito.`)
            await loadData(selectedSede)
          }
        } catch (err: any) {
          toast.error('Error: ' + err.message)
        } finally {
          setIsConfirmingAction(false)
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  // Eliminar grupo con Modal Elegante
  const handleDeleteGroup = (groupId: string, levelName: string, groupName: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Grupo Escolar?',
      description: `¿Estás seguro de que deseas eliminar el grupo "${levelName}-${groupName}"? Se actualizará la estructura escolar y dejará de estar disponible para horarios y asistencias.`,
      confirmText: 'Sí, Eliminar Grupo',
      cancelText: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        setIsConfirmingAction(true)
        try {
          const res = await deleteAcademicGroup(groupId)
          if (res?.error) {
            toast.error(res.error)
          } else {
            toast.success(`Grupo "${levelName}-${groupName}" eliminado con éxito.`)
            await loadData(selectedSede)
          }
        } catch (err: any) {
          toast.error(err.message || 'Error al eliminar el grupo.')
        } finally {
          setIsConfirmingAction(false)
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  // Abrir modal para crear sede
  const handleOpenCreateSede = () => {
    setEditingSede(null)
    setSedeForm({
      name: '',
      daneCode: '',
      zone: 'Rural',
      hasMultigrade: true,
      address: '',
      contactPhone: ''
    })
    setIsSedeModalOpen(true)
  }

  // Abrir modal para editar sede
  const handleOpenEditSede = (sede: InstitutionalSede) => {
    setEditingSede(sede)
    setSedeForm({
      name: sede.name,
      daneCode: sede.daneCode || '',
      zone: sede.zone || 'Urbana',
      hasMultigrade: !!sede.hasMultigrade,
      address: sede.address || '',
      contactPhone: sede.contactPhone || ''
    })
    setIsSedeModalOpen(true)
  }

  // Guardar sede (crear o editar)
  const handleSaveSedeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sedeForm.name.trim()) {
      toast.error('El nombre de la sede es obligatorio.')
      return
    }

    setSedeSaving(true)
    try {
      if (editingSede) {
        const res = await updateInstitutionalSede(editingSede.id, {
          name: sedeForm.name,
          daneCode: sedeForm.daneCode,
          zone: sedeForm.zone,
          hasMultigrade: sedeForm.hasMultigrade,
          address: sedeForm.address,
          contactPhone: sedeForm.contactPhone
        })
        if (res.success) {
          toast.success('Sede institucional actualizada con éxito.')
          setIsSedeModalOpen(false)
          await loadData(selectedSede)
        } else {
          toast.error(res.error || 'Error al actualizar sede.')
        }
      } else {
        const res = await createInstitutionalSede({
          name: sedeForm.name,
          daneCode: sedeForm.daneCode,
          zone: sedeForm.zone,
          hasMultigrade: sedeForm.hasMultigrade,
          address: sedeForm.address,
          contactPhone: sedeForm.contactPhone
        })
        if (res.success) {
          toast.success('Sede institucional creada con éxito.')
          setIsSedeModalOpen(false)
          await loadData(selectedSede)
        } else {
          toast.error(res.error || 'Error al crear sede.')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la sede.')
    } finally {
      setSedeSaving(false)
    }
  }

  // Eliminar sede con Modal Elegante
  const handleDeleteSedeClick = (sede: InstitutionalSede) => {
    if ((sede.studentsCount || 0) > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Acción Bloqueada',
        description: `No es posible eliminar la sede "${sede.name}" porque tiene ${sede.studentsCount} estudiantes matriculados o en directorio vinculados. Debes reasignar los estudiantes a otra sede antes de proceder con la eliminación.`,
        confirmText: 'Entendido',
        cancelText: 'Cerrar',
        variant: 'warning',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
        }
      })
      return
    }

    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Sede Institucional?',
      description: `¿Estás seguro de que deseas eliminar permanentemente la sede "${sede.name}"? Esta acción borrará el plantel del catálogo oficial y no se podrá deshacer.`,
      confirmText: 'Sí, Eliminar Sede',
      cancelText: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        setIsConfirmingAction(true)
        try {
          const res = await deleteInstitutionalSede(sede.id, sede.name)
          if (res.success) {
            toast.success(`Sede "${sede.name}" eliminada correctamente.`)
            await loadData(selectedSede)
          } else {
            toast.error(res.error || 'Error al eliminar sede.')
          }
        } catch (err: any) {
          toast.error(err.message || 'Error al eliminar la sede.')
        } finally {
          setIsConfirmingAction(false)
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left pb-12">
      {/* Header General */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20">
              <ClipboardList className="h-6 w-6" />
            </div>
            Estructura Académica e Institucional
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Administra los grados escolares, grupos y sedes institucionales vinculadas en tiempo real con la{' '}
            <Link href="/admin/students" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1">
              Gestión de Estudiantes <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </div>

        {/* Selector de Sede para auditoría cuando estamos en Grados */}
        {activeMainTab === 'grades' && (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2 shadow-sm">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Sede:</span>
            <select
              value={selectedSede}
              onChange={e => setSelectedSede(e.target.value)}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Todas las Sedes ({overview.totalStudents} Alumnos)</option>
              {sedesList.map(s => (
                <option key={s.id} value={s.name}>{s.name} ({s.studentsCount || 0} alumnos)</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pestañas de Navegación Principal */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveMainTab('grades')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'grades'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Grados y Grupos</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
            activeMainTab === 'grades'
              ? 'bg-blue-700/60 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {overview.levels.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('sedes')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'sedes'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Sedes Institucionales</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
            activeMainTab === 'sedes'
              ? 'bg-blue-700/60 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {sedesList.length}
          </span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 1: GRADOS Y GRUPOS ESCOLARES                           */}
      {/* ============================================================== */}
      {activeMainTab === 'grades' && (
        <div className="space-y-8">
          {/* Banner de Sincronización de Grupos Detectados en Estudiantes */}
          {overview.missingGroups.length > 0 && (
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/25 dark:bg-amber-950/20 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-white shrink-0 shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Grupos detectados en la Población Estudiantil pendientes por registrar
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                    Se encontraron <strong>{overview.missingGroups.reduce((acc, m) => acc + m.studentsCount, 0)} estudiantes</strong> distribuidos en grupos aún no creados formalmente: {overview.missingGroups.map(m => `${m.gradeLevel}-${m.groupName} (${m.studentsCount})`).join(', ')}.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSyncMissingGroups}
                disabled={isSyncing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Sincronizar Grupos desde Estudiantes</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* KPIs Conectados a la Realidad Institucional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-blue-500 bg-blue-50 dark:bg-blue-950/30">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Grados Oficiales</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{overview.levels.length}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {selectedSede === 'all' ? 'Alumnos Institucionales' : `Alumnos en ${selectedSede}`}
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{overview.totalStudents}</p>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                    Sincronizado
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Grupos Habilitados</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{overview.totalGroups}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-purple-500 bg-purple-50 dark:bg-purple-950/30">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Materias Asignadas</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{overview.totalCourses}</p>
              </div>
            </div>
          </div>

          {/* Subsección 1: Registrar Grado */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-500" />
                <span>Registrar Grado</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Agrega un nuevo nivel académico oficial para matrículas y diseño de cursos.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateGrade} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 text-sm">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">
                  Nombre del Grado
                </label>
                <input
                  type="text"
                  required
                  disabled={isSaving}
                  value={newLevelName}
                  onChange={e => setNewLevelName(e.target.value)}
                  placeholder="Ej: Transición, 1°, Aula Multigrado, PFC-12"
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-xs font-bold active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 shadow-sm shrink-0 h-[42px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Crear Grado</span>
                  </>
                )}
              </button>
            </form>

            {/* Accesos rápidos a grados oficiales del MEN pendientes */}
            {availableOfficialLevels.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Grados Oficiales Sugeridos del MEN
                  </span>
                  <button
                    onClick={handleProvisionOfficialLevels}
                    disabled={isProvisioning}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer self-start sm:self-auto"
                  >
                    + Agregar todos ({availableOfficialLevels.length})
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableOfficialLevels.map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewLevelName(lvl)}
                      className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors cursor-pointer"
                    >
                      + {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subsección 2: Niveles y Grupos Oficiales (A todo el ancho, DEBAJO de Registrar Grado) */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Niveles y Grupos Oficiales
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total de alumnos y materias sincronizados con los registros de estudiantes.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {overview.levels.length} Grados Registrados
              </span>
            </div>

            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            ) : overview.levels.length === 0 ? (
              <div className="text-center py-12 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">No hay grados registrados en el sistema.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400 border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold border-b border-slate-100 dark:border-slate-800/60">
                    <tr>
                      <th className="px-5 py-3.5">Grado / Nivel</th>
                      <th className="px-5 py-3.5">Grupos & Alumnos</th>
                      <th className="px-5 py-3.5">Total Matriculados & Sedes</th>
                      <th className="px-5 py-3.5">Materias</th>
                      <th className="px-5 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {overview.levels.map(lvl => {
                      return (
                        <tr key={lvl.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{lvl.name}</span>
                              {Object.keys(lvl.sedesDistribution).length > 1 && (
                                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full" title="Presente en múltiples sedes">
                                  {Object.keys(lvl.sedesDistribution).length} Sedes
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Grupos con conteo de alumnos individual */}
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {lvl.groups.map(g => (
                                <span
                                  key={g.id}
                                  className="group inline-flex items-center gap-1.5 text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50"
                                >
                                  <span>{lvl.name}-{g.name}</span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                                      g.studentsCount > 0
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                        : 'bg-slate-200/60 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'
                                    }`}
                                    title={`${g.studentsCount} estudiantes en este grupo`}
                                  >
                                    {g.studentsCount} alum{g.studentsCount !== 1 ? 's' : ''}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteGroup(g.id, lvl.name, g.name)}
                                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-0.5"
                                    title="Eliminar grupo"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}

                              {/* Input en línea para agregar nuevo grupo */}
                              <InlineGroupAdd levelId={lvl.id} onAdded={() => loadData(selectedSede)} />
                            </div>
                          </td>

                          {/* Estudiantes Matriculados Interactivos & Desglose por Sede */}
                          <td className="px-5 py-4">
                            {lvl.studentsCount > 0 ? (
                              <div className="space-y-1.5">
                                <button
                                  onClick={() => handleOpenInspect(lvl)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-2.5 py-1 rounded-xl border border-emerald-200/60 dark:border-emerald-900/30 transition-colors cursor-pointer"
                                  title="Ver y auditar lista de alumnos de este grado"
                                >
                                  <Users className="h-3.5 w-3.5" />
                                  <span>{lvl.studentsCount} Alumnos</span>
                                </button>

                                {/* Desglose de cuántos alumnos pertenecen a cada sede */}
                                {Object.entries(lvl.sedesDistribution).length > 0 && (
                                  <div className="flex flex-wrap gap-1 items-center max-w-sm pt-0.5">
                                    {Object.entries(lvl.sedesDistribution).map(([sedeName, count]) => (
                                      <span
                                        key={sedeName}
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60"
                                        title={`${count} estudiante(s) en ${sedeName}`}
                                      >
                                        <Building2 className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                                        <span className="truncate max-w-[120px]">{sedeName}:</span>
                                        <strong className="text-slate-900 dark:text-white font-bold">{count}</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">
                                0 Alumnos
                              </span>
                            )}
                          </td>

                          {/* Materias Asignadas */}
                          <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300 text-xs">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                              <span>{lvl.coursesCount} Cursos</span>
                            </div>
                          </td>

                          {/* Acciones */}
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => handleDeleteGrade(lvl)}
                              className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                              title="Eliminar Grado"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: SEDES INSTITUCIONALES (CRUD COMPLETO)               */}
      {/* ============================================================== */}
      {activeMainTab === 'sedes' && (
        <div className="space-y-6">
          {/* Header y Botón Nueva Sede */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Catálogo de Sedes Institucionales
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Administra los planteles urbanos y rurales del colegio, sus códigos DANE, zonas y metodologías. Cada sede configurada aquí estará disponible de inmediato en la <strong>Ficha de Matrícula SIMAT</strong> y en el <strong>Directorio Estudiantil</strong>.
              </p>
            </div>
            <button
              onClick={handleOpenCreateSede}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm shadow-blue-500/20 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Sede</span>
            </button>
          </div>

          {/* KPIs de Sedes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-blue-500 bg-blue-50 dark:bg-blue-950/30">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Total Sedes</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{sedesList.length}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30">
                <Navigation className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Sedes Urbanas</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {sedesList.filter(s => s.zone === 'Urbana').length}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-purple-500 bg-purple-50 dark:bg-purple-950/30">
                <School className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Rurales / Multigrado</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {sedesList.filter(s => s.hasMultigrade || s.zone === 'Rural').length}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-amber-500 bg-amber-50 dark:bg-amber-950/30">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Alumnos en Sedes</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {sedesList.reduce((acc, s) => acc + (s.studentsCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de Sedes Institucionales */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
              <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400 border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold border-b border-slate-100 dark:border-slate-800/60">
                  <tr>
                    <th className="px-5 py-3.5">Nombre de la Sede</th>
                    <th className="px-5 py-3.5">Código DANE</th>
                    <th className="px-5 py-3.5">Zona & Metodología</th>
                    <th className="px-5 py-3.5">Contacto & Ubicación</th>
                    <th className="px-5 py-3.5">Alumnos Matriculados</th>
                    <th className="px-5 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {sedesList.map(sede => (
                    <tr key={sede.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      {/* Nombre */}
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                            sede.name === 'Sede Principal'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          }`}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{sede.name}</p>
                            {sede.name === 'Sede Principal' && (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                Sede Central / Administrativa
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Código DANE */}
                      <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {sede.daneCode || (
                          <span className="text-slate-400 italic font-sans text-[11px]">Sin registrar</span>
                        )}
                      </td>

                      {/* Zona y Modelo */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            sede.zone === 'Urbana'
                              ? 'bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30'
                          }`}>
                            {sede.zone || 'Urbana'}
                          </span>

                          {sede.hasMultigrade ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/50 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/30">
                              Aula Multigrado / Escuela Nueva
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Tradicional
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="space-y-0.5">
                          {sede.address && (
                            <p className="flex items-center gap-1 truncate max-w-[200px]" title={sede.address}>
                              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                              <span>{sede.address}</span>
                            </p>
                          )}
                          {sede.contactPhone && (
                            <p className="flex items-center gap-1 text-[11px]">
                              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                              <span>{sede.contactPhone}</span>
                            </p>
                          )}
                          {!sede.address && !sede.contactPhone && (
                            <span className="text-slate-400 italic text-[11px]">No especificado</span>
                          )}
                        </div>
                      </td>

                      {/* Alumnos Matriculados */}
                      <td className="px-5 py-4 font-bold text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/30">
                          <Users className="h-3.5 w-3.5" />
                          <span>{sede.studentsCount || 0} Alumnos</span>
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditSede(sede)}
                            className="p-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                            title="Editar Sede"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSedeClick(sede)}
                            className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                            title="Eliminar Sede"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL PERSONALIZADO DE CONFIRMACIÓN (REEMPLAZA CONFIRM)        */}
      {/* ============================================================== */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden p-6 text-center space-y-4"
            >
              {/* Icon Badge */}
              <div className="flex justify-center">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  confirmModal.variant === 'danger'
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 ring-8 ring-rose-50/60 dark:ring-rose-950/20'
                    : confirmModal.variant === 'warning'
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 ring-8 ring-amber-50/60 dark:ring-amber-950/20'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 ring-8 ring-blue-50/60 dark:ring-blue-950/20'
                }`}>
                  {confirmModal.variant === 'danger' && <Trash2 className="h-7 w-7" />}
                  {confirmModal.variant === 'warning' && <AlertTriangle className="h-7 w-7" />}
                  {confirmModal.variant === 'info' && <Sparkles className="h-7 w-7" />}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {confirmModal.description}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isConfirmingAction}
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {confirmModal.cancelText || 'Cancelar'}
                </button>
                <button
                  type="button"
                  disabled={isConfirmingAction}
                  onClick={() => confirmModal.onConfirm()}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                    confirmModal.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 active:scale-[0.98]'
                      : confirmModal.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25 active:scale-[0.98]'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25 active:scale-[0.98]'
                  }`}
                >
                  {isConfirmingAction ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <span>{confirmModal.confirmText || 'Confirmar'}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* MODAL: CREAR / EDITAR SEDE INSTITUCIONAL                       */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isSedeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header Modal */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    <span>{editingSede ? 'Editar Sede Institucional' : 'Nueva Sede Institucional'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {editingSede
                      ? 'Actualiza los datos y modalidades pedagógicas del plantel.'
                      : 'Registra un nuevo plantel para asociar en las matrículas de alumnos.'}
                  </p>
                </div>
                <button
                  onClick={() => setIsSedeModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSaveSedeSubmit} className="p-6 space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    Nombre Oficial de la Sede *
                  </label>
                  <input
                    type="text"
                    required
                    value={sedeForm.name}
                    onChange={e => setSedeForm({ ...sedeForm, name: e.target.value })}
                    placeholder="Ej: Sede San José, Sede La Esperanza"
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Código DANE (Sede)
                    </label>
                    <input
                      type="text"
                      value={sedeForm.daneCode}
                      onChange={e => setSedeForm({ ...sedeForm, daneCode: e.target.value })}
                      placeholder="Ej: 205001000123"
                      className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Zona Geográfica *
                    </label>
                    <select
                      value={sedeForm.zone}
                      onChange={e => setSedeForm({ ...sedeForm, zone: e.target.value as 'Urbana' | 'Rural' })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    >
                      <option value="Urbana">Urbana</option>
                      <option value="Rural">Rural</option>
                    </select>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Maneja Aula Multigrado / Escuela Nueva
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Habilita metodologías flexibles para sedes rurales unitarias con varios grados en un aula.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sedeForm.hasMultigrade}
                    onChange={e => setSedeForm({ ...sedeForm, hasMultigrade: e.target.checked })}
                    className="h-4.5 w-4.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Dirección Física
                    </label>
                    <input
                      type="text"
                      value={sedeForm.address}
                      onChange={e => setSedeForm({ ...sedeForm, address: e.target.value })}
                      placeholder="Ej: Vereda La Ceiba Km 4"
                      className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="text"
                      value={sedeForm.contactPhone}
                      onChange={e => setSedeForm({ ...sedeForm, contactPhone: e.target.value })}
                      placeholder="Ej: 310 123 4567"
                      className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>
                </div>

                {/* Footer Modal */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSedeModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sedeSaving}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {sedeSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>{editingSede ? 'Guardar Cambios' : 'Crear Sede'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* MODAL: INSPECCIÓN DE ESTUDIANTES DEL GRADO                    */}
      {/* ============================================================== */}
      <AnimatePresence>
        {inspectGrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header Modal */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span>Estudiantes de Grado {inspectGrade.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {inspectStudents.length} estudiantes matriculados en Gestión de Estudiantes.
                  </p>
                </div>
                <button
                  onClick={() => setInspectGrade(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Filtros dentro del modal */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={inspectSearchQuery}
                    onChange={e => setInspectSearchQuery(e.target.value)}
                    placeholder="Buscar estudiante por nombre o documento..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Grupo:</span>
                    <select
                      value={inspectGroupFilter}
                      onChange={e => setInspectGroupFilter(e.target.value)}
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 focus:outline-none"
                    >
                      <option value="all">Todos los Grupos</option>
                      {inspectGrade.groups.map(g => (
                        <option key={g.id} value={g.name}>
                          Grupo {g.name} ({g.studentsCount})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Sede:</span>
                    <select
                      value={inspectSedeFilter}
                      onChange={e => setInspectSedeFilter(e.target.value)}
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 focus:outline-none"
                    >
                      <option value="all">Todas las Sedes</option>
                      {Object.entries(inspectGrade.sedesDistribution).map(([sName, cnt]) => (
                        <option key={sName} value={sName}>
                          {sName} ({cnt})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Lista de Estudiantes */}
              <div className="p-6 overflow-y-auto flex-1">
                {loadingInspect ? (
                  <div className="py-12 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  </div>
                ) : filteredInspectStudents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    No se encontraron estudiantes para los filtros seleccionados.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {filteredInspectStudents.map((st, idx) => (
                      <div key={st.id || idx} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {st.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {st.email || 'Sin correo asignado'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                            Grupo {st.groupName || '1'}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                            {st.sede || 'Sede Principal'}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                            {st.modalidad || 'Tradicional'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Modal con enlace a Gestión de Estudiantes */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Mostrando {filteredInspectStudents.length} de {inspectStudents.length} alumnos
                </span>
                <Link
                  href="/admin/students"
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  Abrir Módulo de Estudiantes <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InlineGroupAdd({ levelId, onAdded }: { levelId: string; onAdded: () => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!value.trim()) {
      setIsEditing(false)
      return
    }
    setLoading(true)
    const res = await createAcademicGroup(levelId, value)
    setLoading(false)
    if (res?.error) {
      toast.error(res.error)
    } else {
      setValue('')
      setIsEditing(false)
      onAdded()
    }
  }

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-xl border border-blue-500 shadow-sm">
        <input
          type="text"
          autoFocus
          placeholder="Ej: 1, A"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-12 bg-transparent text-[11px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none placeholder-slate-400"
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          disabled={loading}
        />
        <button onClick={handleSubmit} disabled={loading} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
          <CheckCircle className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setIsEditing(false)} disabled={loading} className="text-slate-400 hover:text-slate-600 cursor-pointer">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 px-2 py-0.5 rounded-xl border border-dashed border-blue-200 dark:border-blue-900/40 cursor-pointer transition-colors"
      title="Agregar un grupo a este grado"
    >
      <Plus className="h-3 w-3" /> Grupo
    </button>
  )
}
