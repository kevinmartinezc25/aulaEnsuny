'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Search, Plus, X, Save, Trash2, Edit, Users,
  CheckCircle, Filter, ChevronDown, Calendar, Loader2, AlertCircle
} from 'lucide-react'
import {
  getAdminCourses, getTeachersList, createAdminCourse, updateAdminCourse, deleteAdminCourse,
  getAcademicLevels
} from '../../application/actions'
import { AdminCourse, AcademicLevel } from '../../application/types'

type CourseStatus = 'active' | 'draft' | 'archived'

const STATUS_CONFIG: Record<CourseStatus, { label: string; classes: string }> = {
  active: { label: 'Activo', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  draft: { label: 'Borrador', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  archived: { label: 'Archivado', classes: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
}

const SUBJECT_COLORS: Record<string, string> = {
  'Ciencias': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Matemáticas': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Español': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'Sociales': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Idiomas': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

export function AdminCoursesScreen() {
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<CourseStatus | 'all'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminCourse | null>(null)
  const [showSuccess, setShowSuccess] = useState('')

  const [form, setForm] = useState({ title: '', subject: '', grade: '', teacherId: '', status: 'active' as CourseStatus })

  // Cargar cursos y profesores al montar
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [coursesData, teachersData, levelsData] = await Promise.all([
          getAdminCourses(),
          getTeachersList(),
          getAcademicLevels()
        ])
        setCourses(coursesData)
        setTeachers(teachersData)
        setAcademicLevels(levelsData)
      } catch (error) {
        console.error('Error al cargar datos de administración de cursos:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const filtered = useMemo(() =>
    courses.filter(c => {
      const matchSearch = (c.title || '').toLowerCase().includes(search.toLowerCase()) || 
                          (c.teacher || '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || c.status === filterStatus
      return matchSearch && matchStatus
    }), [courses, search, filterStatus])

  const stats = useMemo(() => [
    { label: 'Cursos Activos', value: courses.filter(c => c.status === 'active').length, color: 'text-emerald-600' },
    { label: 'Borradores', value: courses.filter(c => c.status === 'draft').length, color: 'text-amber-600' },
    { label: 'Archivados', value: courses.filter(c => c.status === 'archived').length, color: 'text-slate-500' },
    { label: 'Total Estudiantes', value: courses.reduce((sum, c) => sum + (c.students || 0), 0), color: 'text-blue-600' },
  ], [courses])

  const openCreate = () => {
    setEditingCourse(null)
    setErrorMsg('')
    setForm({ title: '', subject: '', grade: '', teacherId: '', status: 'active' })
    setIsModalOpen(true)
  }

  const openEdit = (course: AdminCourse) => {
    setEditingCourse(course)
    setErrorMsg('')
    setForm({
      title: course.title,
      subject: course.subject,
      grade: course.grade,
      teacherId: course.teacherId || '',
      status: course.status
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      setErrorMsg('El título del curso es requerido.')
      return
    }
    if (!form.subject.trim()) {
      setErrorMsg('El área/materia es requerida.')
      return
    }
    if (!form.grade.trim()) {
      setErrorMsg('El grado es requerido.')
      return
    }
    if (!form.teacherId) {
      setErrorMsg('El docente responsable es requerido.')
      return
    }

    setIsSaving(true)
    setErrorMsg('')

    if (editingCourse) {
      const res = await updateAdminCourse(editingCourse.id, form)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        const data = await getAdminCourses()
        setCourses(data)
        setShowSuccess('Curso actualizado correctamente.')
        setIsModalOpen(false)
      }
    } else {
      const res = await createAdminCourse(form)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        const data = await getAdminCourses()
        setCourses(data)
        setShowSuccess('Curso creado correctamente.')
        setIsModalOpen(false)
      }
    }
    setIsSaving(false)
    setTimeout(() => setShowSuccess(''), 3000)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsSaving(true)
    setErrorMsg('')
    const res = await deleteAdminCourse(deleteTarget.id)
    if (res?.error) {
      alert(`Error al eliminar curso: ${res.error}`)
    } else {
      setCourses(courses.filter(c => c.id !== deleteTarget.id))
      setShowSuccess('Curso eliminado.')
    }
    setDeleteTarget(null)
    setIsSaving(false)
    setTimeout(() => setShowSuccess(''), 3000)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            Gestión de Cursos
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crea, edita y administra todos los cursos de la institución.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 active:scale-[0.98] transition-all shadow-sm">
          <Plus className="h-4 w-4" /> Nuevo Curso
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
            <p className="text-xs font-semibold text-slate-400">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{isLoading ? '...' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" /> {showSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título o docente..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="w-full sm:w-44 rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2.5 text-sm text-slate-700 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 appearance-none cursor-pointer">
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="draft">Borradores</option>
            <option value="archived">Archivados</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Course Cards Grid / Loader */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
          <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Cargando cursos desde Supabase...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length > 0 ? filtered.map((course, idx) => (
            <motion.div key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
              className="group relative rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:border-slate-800/60 dark:bg-slate-900">
              <div className="flex items-start justify-between mb-4">
                <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${SUBJECT_COLORS[course.subject] || 'bg-slate-100 text-slate-600'}`}>
                  {course.subject}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold flex items-center gap-1 ${STATUS_CONFIG[course.status].classes}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${course.status === 'active' ? 'bg-emerald-500' : course.status === 'draft' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                  {STATUS_CONFIG[course.status].label}
                </span>
              </div>
              
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{course.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{course.teacher}</p>
              
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {course.students} estudiantes</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {course.grade}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Creado: {course.createdAt}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(course)} className="rounded-lg p-1.5 text-slate-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-slate-800 transition-colors">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(course)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-3 py-20 text-center text-slate-400">
              <BookOpen className="mx-auto h-10 w-10 mb-3 opacity-30" />
              <p className="font-medium">No se encontraron cursos</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-slate-900 overflow-hidden z-10">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingCourse ? 'Editar Curso' : 'Nuevo Curso'}</h2>
                <button disabled={isSaving} onClick={() => setIsModalOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors disabled:opacity-50">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Título del Curso</label>
                  <input disabled={isSaving} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej. Física General"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Área/Materia</label>
                    <input disabled={isSaving} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Ej. Ciencias"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Grado</label>
                    <select
                      disabled={isSaving}
                      value={form.grade}
                      onChange={e => setForm({ ...form, grade: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60"
                    >
                      <option value="">Seleccione un grado...</option>
                      {academicLevels.map(lvl => (
                        <option key={lvl.id} value={lvl.name}>{lvl.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Docente Responsable</label>
                  <select disabled={isSaving} value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60">
                    <option value="">Seleccione un docente...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estado</label>
                  <select disabled={isSaving} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CourseStatus })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60">
                    <option value="active">Activo</option>
                    <option value="draft">Borrador</option>
                    <option value="archived">Archivado</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 px-6 py-4">
                <button disabled={isSaving} onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">Cancelar</button>
                <button disabled={isSaving} onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-75">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> {editingCourse ? 'Guardar cambios' : 'Crear Curso'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSaving && setDeleteTarget(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 text-center space-y-4 z-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
                <Trash2 className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">¿Eliminar Curso?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Se eliminará <strong className="text-slate-700 dark:text-slate-300">{deleteTarget.title}</strong> del sistema.</p>
              </div>
              <div className="flex gap-3">
                <button disabled={isSaving} onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">Cancelar</button>
                <button disabled={isSaving} onClick={handleDelete} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-75 flex justify-center items-center gap-2">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    'Sí, eliminar'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
