'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, Plus, Trash2, X, Save, AlertCircle, Loader2, CheckCircle, Users, BookOpen
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { toast } from 'sonner'
import {
  getAcademicLevels, createAcademicLevel, deleteAcademicLevel,
  getAcademicGroups, createAcademicGroup, deleteAcademicGroup
} from '../../application/actions'
import { AcademicLevel, AcademicGroup } from '../../application/types'

export function AdminGradeLevelsScreen() {
  const [levels, setLevels] = useState<AcademicLevel[]>([])
  const [groups, setGroups] = useState<AcademicGroup[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [newLevelName, setNewLevelName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Load all required data to display statistics
  const loadData = async () => {
    setIsLoading(true)
    try {
      const levelsData = await getAcademicLevels()
      setLevels(levelsData)

      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (!isDemoMode) {
        const supabase = createClient()
        
        // Load students profiles
        const { data: dbStudents } = await supabase
          .from('profiles')
          .select('grade_level, roles!inner(name)')
          .eq('roles.name', 'student')
        
        // Load courses
        const { data: dbCourses } = await supabase
          .from('courses')
          .select('grade_level')

        // Load academic groups
        const { data: dbGroups } = await supabase
          .from('academic_groups')
          .select('*')

        setStudents(dbStudents || [])
        setCourses(dbCourses || [])
        setGroups((dbGroups || []).map(g => ({
          id: g.id,
          academicLevelId: g.academic_level_id,
          name: g.name,
          createdAt: new Date(g.created_at).toISOString().split('T')[0]
        })))
      } else {
        // Mock data for demo mode statistics
        setStudents([
          { grade_level: '8°' }, { grade_level: '8°' },
          { grade_level: '9°' }, { grade_level: '10°' },
          { grade_level: '11°' }
        ])
        setCourses([
          { grade_level: '8°' }, { grade_level: '9°' }, { grade_level: '11°' }
        ])
        setGroups([
          { id: 'mg-1', academicLevelId: '1', name: '1', createdAt: '2026-01-01' },
          { id: 'mg-2', academicLevelId: '1', name: '2', createdAt: '2026-01-01' },
          { id: 'mg-3', academicLevelId: '2', name: '1', createdAt: '2026-01-01' },
          { id: 'mg-4', academicLevelId: '2', name: '2', createdAt: '2026-01-01' },
          { id: 'mg-5', academicLevelId: '3', name: '1', createdAt: '2026-01-01' }
        ])
      }
    } catch (error) {
      console.error('Error al cargar grados académicos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Calculate statistics per grade level
  const levelStats = useMemo(() => {
    const statsMap: Record<string, { studentsCount: number; coursesCount: number }> = {}
    
    levels.forEach(lvl => {
      statsMap[lvl.name] = { studentsCount: 0, coursesCount: 0 }
    })

    students.forEach(s => {
      if (statsMap[s.grade_level]) {
        statsMap[s.grade_level].studentsCount += 1
      }
    })

    courses.forEach(c => {
      if (statsMap[c.grade_level]) {
        statsMap[c.grade_level].coursesCount += 1
      }
    })

    return statsMap
  }, [levels, students, courses])

  // Ordenar grados de mayor a menor
  const sortedLevels = useMemo(() => {
    return [...levels].sort((a, b) => {
      const getNum = (name: string) => {
        const match = name.match(/^(\d+)/)
        return match ? parseInt(match[1], 10) : -1
      }
      const numA = getNum(a.name)
      const numB = getNum(b.name)
      
      if (numA !== -1 || numB !== -1) {
        if (numA === -1) return 1
        if (numB === -1) return -1
        return numB - numA // Descendente: de mayor a menor
      }
      return b.name.localeCompare(a.name)
    })
  }, [levels])

  // Total KPIs
  const totalStudents = students.length
  const totalCourses = courses.length

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLevelName.trim()) {
      setErrorMsg('El nombre del grado es requerido.')
      return
    }

    const normalizedName = newLevelName.trim()
    if (levels.some(l => l.name.toLowerCase() === normalizedName.toLowerCase())) {
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
        await loadData()
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el grado.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (lvl: AcademicLevel) => {
    const stats = levelStats[lvl.name] || { studentsCount: 0, coursesCount: 0 }
    if (stats.studentsCount > 0 || stats.coursesCount > 0) {
      if (!confirm(`ADVERTENCIA: El grado "${lvl.name}" tiene ${stats.studentsCount} alumnos y ${stats.coursesCount} materias asignadas. Si lo eliminas, estos registros perderán su vinculación de grado. ¿Deseas proceder?`)) {
        return
      }
    } else {
      if (!confirm(`¿Está seguro de que desea eliminar el grado "${lvl.name}" del sistema?`)) {
        return
      }
    }

    setIsLoading(true)
    try {
      const res = await deleteAcademicLevel(lvl.id)
      if (res?.error) {
        alert(`Error al eliminar grado: ${res.error}`)
      } else {
        setSuccessMsg('Grado eliminado con éxito.')
        await loadData()
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId: string, levelName: string, groupName: string) => {
    if (!confirm(`¿Está seguro de eliminar el grupo "${levelName}-${groupName}"? Se perderán las vinculaciones de calificaciones, estudiantes y cursos en este grupo.`)) {
      return
    }

    setIsLoading(true)
    try {
      const res = await deleteAcademicGroup(groupId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Grupo eliminado con éxito.')
        await loadData()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el grupo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20">
            <ClipboardList className="h-5.5 w-5.5" />
          </div>
          Gestión de Grados Escolares
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Administra los niveles, grados escolares oficiales y sus respectivos grupos para la matriculación de alumnos y diseño de cursos.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-55 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-blue-500 bg-blue-50 dark:bg-blue-950/30">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Grados Creados</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{levels.length}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Alumnos Asignados</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{totalStudents}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-purple-500 bg-purple-50 dark:bg-purple-950/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Materias Totales</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{totalCourses}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Formulario de Creación */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-500" />
            <span>Crear Grado</span>
          </h3>
          <p className="text-xs text-slate-455 mb-5">Agrega un nuevo nivel académico oficial.</p>

          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-450 uppercase mb-1.5">Nombre del Grado</label>
              <input
                type="text"
                required
                disabled={isSaving}
                value={newLevelName}
                onChange={e => setNewLevelName(e.target.value)}
                placeholder="Ej: 7°, 10-A, Párvulos"
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-semibold">
                Este nombre aparecerá en los selectores de matrículas de alumnos y diseño de cursos.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 text-xs font-bold active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-4 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4.5 w-4.5" />
                  <span>Crear Grado</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Listado de Grados */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Niveles Registrados</h3>
            <p className="text-xs text-slate-455">Lista de grados y grupos disponibles en la base de datos.</p>
          </div>

          {isLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : levels.length === 0 ? (
            <div className="text-center py-12 border border-slate-100 dark:border-slate-800 rounded-2xl">
              <AlertCircle className="h-10 w-10 text-slate-350 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-450">No hay grados registrados en el sistema.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
              <table className="w-full text-sm text-left text-slate-550 dark:text-slate-400 border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-455 uppercase font-bold border-b border-slate-100 dark:border-slate-800/60">
                  <tr>
                    <th className="px-6 py-4">Grado / Nivel</th>
                    <th className="px-6 py-4">Grupos</th>
                    <th className="px-6 py-4">Estudiantes Matriculados</th>
                    <th className="px-6 py-4">Materias Asignadas</th>
                    <th className="px-6 py-4">Fecha de Creación</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {sortedLevels.map(lvl => {
                    const stats = levelStats[lvl.name] || { studentsCount: 0, coursesCount: 0 }
                    return (
                      <tr key={lvl.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                          {lvl.name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {/* List existing groups for this level */}
                            {groups.filter(g => g.academicLevelId === lvl.id).map(g => (
                              <span key={g.id} className="group inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350 px-2 py-0.5 rounded-lg border border-slate-200/45 dark:border-slate-700/40">
                                {lvl.name}-{g.name}
                                <button
                                  onClick={() => handleDeleteGroup(g.id, lvl.name, g.name)}
                                  className="text-slate-400 hover:text-red-650 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-0.5"
                                  title="Eliminar grupo"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                            {/* Add group inline input/button */}
                            <InlineGroupAdd levelId={lvl.id} onAdded={loadData} />
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          👤 {stats.studentsCount} Alumnos
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          📚 {stats.coursesCount} Cursos
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {lvl.createdAt}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDelete(lvl)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 transition-colors"
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
      <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-blue-500">
        <input
          type="text"
          autoFocus
          placeholder="Ej: 1, A"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-12 bg-transparent text-[10px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none placeholder-slate-400"
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
      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-dashed border-blue-200 dark:border-blue-900/40 cursor-pointer transition-colors"
    >
      <Plus className="h-3 w-3" /> Grupo
    </button>
  )
}
