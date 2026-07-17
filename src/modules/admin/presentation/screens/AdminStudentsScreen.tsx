'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Search, UserPlus, Trash2, Edit,
  Filter, CheckCircle, Loader2, AlertCircle, BookOpen, Link as LinkIcon
} from 'lucide-react'
import { getAcademicLevels, AcademicLevel, getAdminStudents } from '../../application/actions'

interface Student {
  id: string
  name: string
  email: string
  gradeLevel: string
  groupName?: string
  status: 'active' | 'inactive'
  joinedDate: string
}

export function AdminStudentsScreen() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([])
  const [successMsg, setSuccessMsg] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const mockStudents: Student[] = [
    { id: 's-1', name: 'Ana María Torres', email: 'a.torres@estudiante.ensuny.edu.co', gradeLevel: '8°', groupName: '1', status: 'active', joinedDate: '2025-01-20' },
    { id: 's-2', name: 'José Daniel Ramírez', email: 'j.ramirez@estudiante.ensuny.edu.co', gradeLevel: '8°', groupName: '1', status: 'active', joinedDate: '2025-01-22' },
    { id: 's-3', name: 'Luis Alfredo Sandoval', email: 'l.sandoval@estudiante.ensuny.edu.co', gradeLevel: '9°', groupName: '2', status: 'active', joinedDate: '2024-01-15' },
    { id: 's-4', name: 'María Camila Herrera', email: 'm.herrera@estudiante.ensuny.edu.co', gradeLevel: '10°', groupName: '2', status: 'inactive', joinedDate: '2024-02-05' },
    { id: 's-5', name: 'Kevin Martinez', email: 'kevin@estudiante.ensuny.edu.co', gradeLevel: '11°', groupName: '1', status: 'active', joinedDate: '2023-01-10' }
  ]

  useEffect(() => {
    async function loadStudents() {
      setLoading(true)
      try {
        const levelsData = await getAcademicLevels()
        setAcademicLevels(levelsData)
      } catch (err) {
        console.error('Error loading academic levels:', err)
      }

      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setTimeout(() => {
          setStudents(mockStudents)
          setLoading(false)
        }, 500)
        return
      }

      try {
        const mapped = await getAdminStudents()
        setStudents(mapped as Student[])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadStudents()
  }, [])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
      const matchGrade = filterGrade === 'all' || s.gradeLevel === filterGrade
      const matchStatus = filterStatus === 'all' || s.status === filterStatus
      return matchSearch && matchGrade && matchStatus
    })
  }, [students, search, filterGrade, filterStatus])

  const openCreate = () => {
    router.push('/admin/students/new')
  }

  const openEdit = (s: Student) => {
    router.push(`/admin/students/${s.id}/edit`)
  }

  const confirmDelete = (id: string) => {
    setDeleteTargetId(id)
    setIsDeleteModalOpen(true)
  }

  const performDelete = () => {
    if (deleteTargetId) {
      setStudents(students.filter(s => s.id !== deleteTargetId))
      setSuccessMsg('Estudiante retirado con éxito.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
    setIsDeleteModalOpen(false)
    setDeleteTargetId(null)
  }

  const copyRegistrationLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aula.ensuny.edu.co'
    const link = `${baseUrl}/register/student`
    navigator.clipboard.writeText(link)
    setSuccessMsg('¡Enlace de registro copiado al portapapeles!')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gestión de Estudiantes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Matricula alumnos, asigna grados escolares y controla sus estados académicos.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={copyRegistrationLink}
            className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 px-4 py-3 text-sm font-semibold active:scale-[0.98] transition-all cursor-pointer"
            title="Copiar enlace público de registro"
          >
            <LinkIcon className="h-4.5 w-4.5" />
            <span className="hidden sm:inline">Copiar Enlace</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-sm font-semibold active:scale-[0.98] transition-all cursor-pointer"
          >
            <UserPlus className="h-4.5 w-4.5" />
            <span>Matricular Alumno</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { title: 'Total Matriculados', value: students.length, icon: GraduationCap, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
          { title: 'Estudiantes Activos', value: students.filter(s => s.status === 'active').length, icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
          { title: 'Distribución por Grados', value: `${new Set(students.map(s => s.gradeLevel)).size} Niveles`, icon: BookOpen, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' }
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
        <div className="relative w-full sm:w-85">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar estudiante por nombre o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
          />
        </div>

        <div className="flex items-center gap-4 self-stretch sm:self-auto justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value)}
              className="border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
            >
              <option value="all">Todos los Grados</option>
              {academicLevels.map(lvl => (
                <option key={lvl.id} value={lvl.name}>Grado {lvl.name}</option>
              ))}
            </select>
          </div>

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
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center dark:border-slate-800/60 dark:bg-slate-900">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-550 dark:text-slate-455">No se encontraron estudiantes matriculados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
          <table className="w-full text-sm text-left text-slate-550 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-450 uppercase font-bold border-b border-slate-100 dark:border-slate-800/60">
              <tr>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Grado / Nivel</th>
                <th className="px-6 py-4">Correo Institucional</th>
                <th className="px-6 py-4">Fecha de Registro</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {filteredStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-55/50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                    {s.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-100/30">
                      Grado {s.gradeLevel} - {s.groupName || '1'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono">
                    {s.email}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {s.joinedDate}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      s.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {s.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(s.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
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

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                <Trash2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">¿Retirar estudiante?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ¿Está seguro de que desea retirar este estudiante del sistema? Esta acción desvinculará sus registros académicos.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteTargetId(null)
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={performDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition active:scale-[0.98] cursor-pointer shadow-sm shadow-rose-200 dark:shadow-none"
                >
                  Retirar Estudiante
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
