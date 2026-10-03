'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, FileSpreadsheet, MoreVertical, Edit2, Trash2, Loader2, Users, ArrowRight } from 'lucide-react'
import { getAssistedSubjects, deleteAssistedSubject, AssistedSubject } from '../../application/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { toast } from 'sonner'
import { CreateSubjectModal } from '../components/CreateSubjectModal'

export interface PlanillaAsistidaListProps {
  initialSubjects?: AssistedSubject[]
}

export function PlanillaAsistidaListScreen({ initialSubjects }: PlanillaAsistidaListProps = {}) {
  const [subjects, setSubjects] = useState<AssistedSubject[]>(initialSubjects || [])
  const [isLoading, setIsLoading] = useState(!initialSubjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<AssistedSubject | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadSubjects = async () => {
    try {
      setIsLoading(true)
      const data = await getAssistedSubjects()
      setSubjects(data)
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar las materias')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!initialSubjects) {
      loadSubjects()
    }
    
    // Cerrar dropdown globalmente
    const handleGlobalClick = () => setOpenDropdownId(null)
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [initialSubjects])

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenDropdownId(prev => prev === id ? null : id)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenDropdownId(null)
    
    toast.error('¿Estás seguro de eliminar esta planilla?', {
      description: 'Todos los estudiantes y notas asociadas se perderán permanentemente.',
      duration: 10000,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            setDeletingId(id)
            await deleteAssistedSubject(id)
            toast.success('Planilla eliminada exitosamente')
            loadSubjects()
          } catch (error) {
            toast.error('Error al eliminar la planilla')
          } finally {
            setDeletingId(null)
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const uniqueGrades = React.useMemo(() => Array.from(new Set(subjects.map(s => s.grade?.toString()).filter(Boolean))).sort((a, b) => Number(a) - Number(b)), [subjects])
  const uniqueGroups = React.useMemo(() => Array.from(new Set(subjects.map(s => s.group_number?.toString() || (s.grade === 12 || s.grade === 13 ? '1' : '')).filter(Boolean))).sort((a, b) => Number(a) - Number(b)), [subjects])
  const uniqueSubjects = React.useMemo(() => Array.from(new Set(subjects.map(s => s.name).filter(Boolean))).sort(), [subjects])
  const uniquePeriods = React.useMemo(() => Array.from(new Set(subjects.map(s => s.period?.toString()).filter(Boolean))).sort(), [subjects])

  const filteredSubjects = React.useMemo(() => subjects.filter(subject => {
    const isPfc12 = subject.grade === 12
    const isPfc13 = subject.grade === 13
    const isNivelatorio = subject.grade === 0 || subject.name.toLowerCase().includes('nivelat')
    const matchesSearch = subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subject.grade !== undefined && subject.grade !== null && subject.grade.toString().includes(searchQuery)) ||
      (isPfc12 && 'pfc-12'.includes(searchQuery.toLowerCase())) ||
      (isPfc13 && 'pfc-13'.includes(searchQuery.toLowerCase())) ||
      (isNivelatorio && 'nivelatorio'.includes(searchQuery.toLowerCase())) ||
      subject.period?.toLowerCase().includes(searchQuery.toLowerCase())
      
    const matchesGrade = selectedGrade === 'all' || subject.grade?.toString() === selectedGrade
    const matchesGroup = selectedGroup === 'all' || 
      subject.group_number?.toString() === selectedGroup || 
      (!subject.group_number && selectedGroup === '1' && (isPfc12 || isPfc13 || isNivelatorio))
    const matchesSubject = selectedSubject === 'all' || subject.name === selectedSubject
    const matchesPeriod = selectedPeriod === 'all' || subject.period?.toString() === selectedPeriod

    return matchesSearch && matchesGrade && matchesGroup && matchesSubject && matchesPeriod
  }), [subjects, searchQuery, selectedGrade, selectedGroup, selectedSubject, selectedPeriod])

  return (
    <div className="flex-1 space-y-2 p-2 lg:px-4 lg:py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            Planilla Asistida
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registra y calcula las calificaciones de tus estudiantes de forma rápida y sencilla, independiente de los cursos oficiales.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Crear materia
        </Button>
      </div>

      {uniquePeriods.length > 0 && (
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
          <button
            onClick={() => setSelectedPeriod('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${selectedPeriod === 'all' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}
          >
            Todos los periodos
          </button>
          {uniquePeriods.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p as string)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${selectedPeriod === p ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              Periodo {p}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-5 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, grado o periodo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11 rounded-xl w-full"
            />
          </div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 shrink-0 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
            {filteredSubjects.length} {filteredSubjects.length === 1 ? 'materia' : 'materias'}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-0.5">Materia</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-9 sm:h-10 rounded-xl px-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 dark:text-slate-300 w-full truncate"
            >
              <option value="all">Todas las materias</option>
              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-0.5">Grado</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-9 sm:h-10 rounded-xl px-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 dark:text-slate-300 w-full truncate"
            >
              <option value="all">Todos los grados</option>
              {uniqueGrades.map(g => (
                <option key={g} value={g}>
                  {g === '12' ? 'PFC-12 (12°)' : g === '13' ? 'PFC-13 (13°)' : g === '0' ? 'Nivelatorio' : `Grado ${g}°`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-0.5">Grupo</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-9 sm:h-10 rounded-xl px-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 dark:text-slate-300 w-full truncate"
            >
              <option value="all">Todos los grupos</option>
              {uniqueGroups.map(g => <option key={g} value={g}>Grupo {g}</option>)}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-100 dark:border-slate-800"></div>
          ))}
        </div>
      ) : filteredSubjects.length > 0 ? (
        <div className="grid gap-4 sm:gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject, index) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all duration-200 relative"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0 border border-emerald-100 dark:border-emerald-900/50">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2 leading-snug" title={subject.name}>
                      {subject.name}
                    </h3>
                  </div>
                  
                  <div className="relative shrink-0">
                    <button 
                      onClick={(e) => toggleDropdown(subject.id, e)}
                      disabled={deletingId === subject.id}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 -mr-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Opciones"
                    >
                      {deletingId === subject.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                    </button>
                    {openDropdownId === subject.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => { 
                            e.preventDefault()
                            setOpenDropdownId(null)
                            setEditingSubject(subject)
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-2"
                        >
                          <Edit2 className="h-3 w-3" /> Editar
                        </button>
                        <button 
                          onClick={(e) => handleDelete(subject.id, e)}
                          className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <Trash2 className="h-3 w-3" /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bloque Grado y Grupo */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 sm:p-3 border border-slate-100 dark:border-slate-800 grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 text-center">
                  <div className="px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800/70 dark:text-teal-400/70 block">
                      Grado
                    </span>
                    <span className="text-2xl sm:text-[28px] font-black text-teal-700 dark:text-teal-400 tracking-tight leading-none mt-0.5 block truncate">
                      {subject.grade === 12 ? 'PFC-12' : subject.grade === 13 ? 'PFC-13' : subject.grade === 0 ? 'Nivelatorio' : (subject.grade || '-')}
                    </span>
                  </div>
                  <div className="px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800/70 dark:text-teal-400/70 block">
                      Grupo
                    </span>
                    <span className="text-2xl sm:text-[28px] font-black text-teal-700 dark:text-teal-400 tracking-tight leading-none mt-0.5 block truncate">
                      {subject.group_number !== undefined && subject.group_number !== null ? subject.group_number : '1'}
                    </span>
                  </div>
                </div>

                {/* Fila de Badges: Periodo y Estudiantes */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {subject.period && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                      Periodo {subject.period}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                    <Users className="h-3 w-3 shrink-0" />
                    <span>{subject.students_count || 0} {subject.students_count === 1 ? 'estudiante' : 'estudiantes'}</span>
                  </span>
                </div>
                
                {subject.description && (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed px-0.5 mt-2" title={subject.description}>
                    {subject.description}
                  </p>
                )}
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={`/teacher/planilla-asistida/${subject.id}`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-xs hover:shadow-sm"
                >
                  <span>Abrir Planilla</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-16 px-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
            <FileSpreadsheet className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
            No tienes materias creadas
          </h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Comienza creando tu primera materia en Planilla Asistida. Recuerda que estos datos son independientes de los cursos virtuales.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Crear materia
          </Button>
        </div>
      )}

      <CreateSubjectModal 
        isOpen={isCreateModalOpen || editingSubject !== null}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingSubject(null)
        }}
        initialData={editingSubject}
        existingSubjects={subjects}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          setEditingSubject(null)
          loadSubjects()
        }}
      />
    </div>
  )
}
