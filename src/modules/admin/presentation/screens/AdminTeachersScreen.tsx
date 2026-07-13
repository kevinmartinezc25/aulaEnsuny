'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, UserPlus, X, Save, Trash2, Edit, ChevronDown,
  BookOpen, Filter, CheckCircle, Loader2, AlertCircle, Phone, Mail, Award
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { getAdminTeachers, getAdminCourses } from '../../application/actions'

interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  subjects: string[]
  status: 'active' | 'inactive'
  joinedDate: string
}

export function AdminTeachersScreen() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', subjects: '', status: 'active' as 'active' | 'inactive' })
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const mockTeachers: Teacher[] = [
    { id: 't-1', name: 'Alejandro Giraldo', email: 'a.giraldo@ensuny.edu.co', phone: '312 456 7890', subjects: ['Física I', 'Física II'], status: 'active', joinedDate: '2024-01-15' },
    { id: 't-2', name: 'Beatriz Nuñez', email: 'b.nunez@ensuny.edu.co', phone: '315 987 6543', subjects: ['Matemáticas I', 'Álgebra'], status: 'active', joinedDate: '2024-02-10' },
    { id: 'd3aa9e2f-bd89-4b90-b47a-f8d6273347e3', name: 'Carlos Pérez', email: 'docente@ensuny.edu.co', phone: '300 111 2222', subjects: ['Programación', 'Robótica'], status: 'active', joinedDate: '2026-05-28' },
    { id: 't-4', name: 'Diana Rivas', email: 'd.rivas@ensuny.edu.co', phone: '318 444 5555', subjects: ['Inglés I', 'Inglés II'], status: 'inactive', joinedDate: '2023-08-20' }
  ]

  const mockCourses = [
    { id: 'c-1', title: 'Física I', grade: '8°' },
    { id: 'c-2', title: 'Física II', grade: '9°' },
    { id: 'c-3', title: 'Matemáticas I', grade: '8°' },
    { id: 'c-4', title: 'Álgebra', grade: '9°' },
    { id: 'c-5', title: 'Programación', grade: '10°' },
    { id: 'c-6', title: 'Robótica', grade: '11°' },
    { id: 'c-7', title: 'Inglés I', grade: '10°' },
    { id: 'c-8', title: 'Inglés II', grade: '11°' }
  ]

  useEffect(() => {
    async function loadTeachers() {
      setLoading(true)
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setTimeout(() => {
          setTeachers(mockTeachers)
          setAvailableCourses(mockCourses)
          setLoading(false)
        }, 500)
        return
      }

      try {
        const [mapped, coursesData] = await Promise.all([
          getAdminTeachers(),
          getAdminCourses()
        ])
        setTeachers(mapped)
        setAvailableCourses(coursesData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadTeachers()
  }, [])

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || t.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [teachers, search, filterStatus])

  const openCreate = () => {
    setEditingTeacher(null)
    setForm({ name: '', email: '', phone: '', subjects: '', status: 'active' })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const openEdit = (t: Teacher) => {
    setEditingTeacher(t)
    setForm({ name: t.name, email: t.email, phone: t.phone, subjects: t.subjects.join(', '), status: t.status })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg('Nombre y Correo electrónico son requeridos.')
      return
    }

    setIsSaving(true)
    setErrorMsg('')

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode) {
      setTimeout(() => {
        if (editingTeacher) {
          setTeachers(teachers.map(t => t.id === editingTeacher.id ? {
            ...t,
            name: form.name,
            email: form.email,
            phone: form.phone,
            subjects: form.subjects.split(',').map(s => s.trim()).filter(Boolean),
            status: form.status
          } : t))
          setSuccessMsg('Docente actualizado con éxito.')
        } else {
          const newT: Teacher = {
            id: `t-${Date.now()}`,
            name: form.name,
            email: form.email,
            phone: form.phone,
            subjects: form.subjects.split(',').map(s => s.trim()).filter(Boolean),
            status: form.status,
            joinedDate: new Date().toISOString().split('T')[0]
          }
          setTeachers([newT, ...teachers])
          setSuccessMsg('Docente creado con éxito (Modo Demo).')
        }
        setIsSaving(false)
        setIsModalOpen(false)
        setTimeout(() => setSuccessMsg(''), 3000)
      }, 500)
      return
    }

    try {
      const supabase = createClient()
      const nameParts = form.name.trim().split(' ')
      const firstName = nameParts[0] || 'Docente'
      const lastName = nameParts.slice(1).join(' ') || 'Nuevo'

      if (editingTeacher) {
        // En modo real, actualizamos perfil
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: form.phone,
            bio: form.subjects, // Usamos campo bio para materias en esta maqueta
            status: form.status
          })
          .eq('id', editingTeacher.id)

        if (error) throw error

        // 1. Desasignar todos los cursos previamente asignados a este profesor en la tabla courses
        const { error: unassignError } = await supabase
          .from('courses')
          .update({ teacher_id: null })
          .eq('teacher_id', editingTeacher.id)

        if (unassignError) throw unassignError

        // 2. Asignar los nuevos cursos seleccionados
        const selectedTitles = form.subjects.split(',').map(s => s.trim()).filter(Boolean)
        const selectedCourseIds = availableCourses
          .filter(c => selectedTitles.includes(c.title))
          .map(c => c.id)

        if (selectedCourseIds.length > 0) {
          const { error: assignError } = await supabase
            .from('courses')
            .update({ teacher_id: editingTeacher.id })
            .in('id', selectedCourseIds)

          if (assignError) throw assignError
        }

        setTeachers(teachers.map(t => t.id === editingTeacher.id ? {
          ...t,
          name: form.name,
          phone: form.phone,
          subjects: selectedTitles,
          status: form.status
        } : t))
        setSuccessMsg('Docente actualizado con éxito.')
      } else {
        // Para crear un docente real se necesita Supabase Auth Admin.
        // Simulamos la inserción en la interfaz o damos advertencia
        setErrorMsg('La creación de cuentas de Auth requiere permisos de administrador del sistema. Use la API de Usuarios.')
        setIsSaving(false)
        return
      }
      setIsModalOpen(false)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar docente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este docente del sistema?')) {
      setTeachers(teachers.filter(t => t.id !== id))
      setSuccessMsg('Docente eliminado con éxito.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gestión de Docentes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Administra el cuerpo docente institucional, asignaturas y estados de contratación.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-sm font-semibold active:scale-[0.98] transition-all self-start sm:self-center cursor-pointer"
        >
          <UserPlus className="h-4.5 w-4.5" />
          <span>Registrar Docente</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-55 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { title: 'Total Docentes', value: teachers.length, icon: Users, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
          { title: 'Activos', value: teachers.filter(t => t.status === 'active').length, icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
          { title: 'Materias Dictadas', value: Array.from(new Set(teachers.flatMap(t => t.subjects))).length, icon: BookOpen, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' }
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Controles de filtro */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar docente por nombre o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center dark:border-slate-800/60 dark:bg-slate-900">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-550 dark:text-slate-455">No se encontraron docentes con los criterios seleccionados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
          <table className="w-full text-sm text-left text-slate-550 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-450 uppercase font-bold border-b border-slate-100 dark:border-slate-800/60">
              <tr>
                <th className="px-6 py-4">Docente</th>
                <th className="px-6 py-4">Materias</th>
                <th className="px-6 py-4">Información de Contacto</th>
                <th className="px-6 py-4">Fecha de Ingreso</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {filteredTeachers.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                    {t.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {t.subjects.length > 0 ? (
                        t.subjects.map(sub => (
                          <span key={sub} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100/30">
                            {sub}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-550 dark:bg-slate-800/60 dark:text-slate-400 border border-slate-200/30">
                          Sin cursos
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 space-y-1 text-xs">
                    <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> {t.email}</p>
                    <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {t.phone}</p>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {t.joinedDate}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      t.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {t.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openEdit(t)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 transition-colors"
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
      )}

      {/* Modal Crear/Editar */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  {editingTeacher ? 'Editar Ficha de Docente' : 'Registrar Nuevo Docente'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Alejandro Giraldo"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Correo Institucional</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="docente@ensuny.edu.co"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="Ej: 312 456 7890"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-2">Asignaturas / Cursos</label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950 space-y-1.5">
                    {availableCourses.map(course => {
                      const courseTitle = course.title
                      const currentList = form.subjects.split(',').map(s => s.trim()).filter(Boolean)
                      const isChecked = currentList.includes(courseTitle)

                      return (
                        <label key={course.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              let updated = [...currentList]
                              if (e.target.checked) {
                                if (!updated.includes(courseTitle)) {
                                  updated.push(courseTitle)
                                }
                              } else {
                                updated = updated.filter(s => s !== courseTitle)
                              }
                              setForm({ ...form, subjects: updated.join(', ') })
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{courseTitle} {course.grade ? `(${course.grade})` : ''}</span>
                        </label>
                      )
                    })}
                    {availableCourses.length === 0 && (
                      <p className="text-[11px] text-slate-400 p-1">No hay asignaturas creadas en el sistema.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-850 font-semibold text-xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Save className="h-4.5 w-4.5" />}
                  <span>{editingTeacher ? 'Actualizar Ficha' : 'Guardar Ficha'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
