'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, UserPlus, X, Save, Trash2, Edit, ChevronDown,
  Shield, GraduationCap, BookOpen, Filter, CheckCircle, Loader2, AlertCircle
} from 'lucide-react'
import {
  getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
  getAcademicLevels
} from '../../application/actions'
import { AdminUser, AcademicLevel } from '../../application/types'

type Role = 'student' | 'teacher' | 'admin' | 'superadmin'
type Status = 'active' | 'inactive'

const ROLE_CONFIG: Record<Role, { label: string; icon: React.ElementType; classes: string }> = {
  student: { label: 'Estudiante', icon: GraduationCap, classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  teacher: { label: 'Docente', icon: BookOpen, classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  admin: { label: 'Admin', icon: Shield, classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  superadmin: { label: 'SuperAdmin', icon: Shield, classes: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
}

export function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [showSuccess, setShowSuccess] = useState('')

  const [form, setForm] = useState({ name: '', email: '', role: 'student' as Role, status: 'active' as Status, grade: '', password: '' })

  // Cargar usuarios al montar
  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true)
      try {
        const [usersData, levelsData] = await Promise.all([
          getAdminUsers(),
          getAcademicLevels()
        ])
        setUsers(usersData)
        setAcademicLevels(levelsData)
      } catch (error) {
        console.error('Error al cargar datos en AdminUsersScreen:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadUsers()
  }, [])

  const filtered = useMemo(() =>
    users.filter(u => {
      const matchSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(search.toLowerCase())
      const matchRole = filterRole === 'all' || u.role === filterRole
      const matchStatus = filterStatus === 'all' || u.status === filterStatus
      return matchSearch && matchRole && matchStatus
    }), [users, search, filterRole, filterStatus])

  const openCreate = () => {
    setEditingUser(null)
    setErrorMsg('')
    setForm({ name: '', email: '', role: 'student', status: 'active', grade: '', password: '' })
    setIsModalOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditingUser(user)
    setErrorMsg('')
    setForm({ name: user.name, email: user.email, role: user.role, status: user.status, grade: user.grade || '', password: '' })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setErrorMsg('El nombre completo es requerido.')
      return
    }
    if (!form.email.trim()) {
      setErrorMsg('El correo electrónico es requerido.')
      return
    }

    setIsSaving(true)
    setErrorMsg('')

    if (editingUser) {
      const res = await updateAdminUser(editingUser.id, form)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...form } : u))
        setShowSuccess('Usuario actualizado correctamente.')
        setIsModalOpen(false)
      }
    } else {
      const res = await createAdminUser(form)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        const data = await getAdminUsers()
        setUsers(data)
        setShowSuccess('Usuario creado correctamente.')
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
    const res = await deleteAdminUser(deleteTarget.id)
    if (res?.error) {
      alert(`Error al eliminar usuario: ${res.error}`)
    } else {
      setUsers(users.filter(u => u.id !== deleteTarget.id))
      setShowSuccess('Usuario eliminado.')
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20">
              <Users className="h-5 w-5" />
            </div>
            Gestión de Usuarios
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crea, edita y administra todos los usuarios del sistema.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm">
          <UserPlus className="h-4 w-4" /> Nuevo Usuario
        </button>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o correo..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value as any)}
            className="w-full sm:w-40 rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 appearance-none cursor-pointer">
            <option value="all">Todos los roles</option>
            <option value="student">Estudiante</option>
            <option value="teacher">Docente</option>
            <option value="admin">Admin</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="w-full sm:w-40 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 appearance-none cursor-pointer">
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table / Loader */}
      <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Cargando usuarios desde Supabase...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20">
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Usuario</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Rol</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:table-cell">Grado/Área</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Estado</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {filtered.length > 0 ? filtered.map((user, idx) => {
                    const roleConf = ROLE_CONFIG[user.role]
                    const RoleIcon = roleConf.icon
                    return (
                      <motion.tr key={user.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.01 }}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">
                              {(user.name || '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                              <p className="text-xs text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${roleConf.classes}`}>
                            <RoleIcon className="h-3 w-3" /> {roleConf.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">
                          {user.grade || (user.role === 'teacher' ? 'Docente' : user.role === 'admin' ? 'Administrador' : '—')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {user.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(user)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteTarget(user)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400">
                        <Users className="mx-auto h-10 w-10 mb-3 opacity-30" />
                        <p className="font-medium">No se encontraron usuarios</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800/60 px-6 py-3 text-xs text-slate-400">
              {filtered.length} de {users.length} usuarios
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-slate-900 overflow-hidden z-10">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
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
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre Completo</label>
                  <input disabled={isSaving} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej. Ana Gómez"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Correo Institucional</label>
                  <input disabled={isSaving} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="correo@ensuny.edu" type="email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Contraseña {editingUser && <span className="text-xs font-normal text-slate-500">(Opcional. Llenar solo para cambiarla)</span>}
                  </label>
                  <input disabled={isSaving} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editingUser ? 'Nueva contraseña...' : 'Contraseña por defecto...'} type="password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Rol</label>
                    <select disabled={isSaving} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60">
                      <option value="student">Estudiante</option>
                      <option value="teacher">Docente</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estado</label>
                    <select disabled={isSaving} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60">
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                </div>
                {form.role === 'student' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Grado</label>
                    <select
                      disabled={isSaving}
                      value={form.grade}
                      onChange={e => setForm({ ...form, grade: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white disabled:opacity-60"
                    >
                      <option value="">Seleccione un grado...</option>
                      {academicLevels.map(lvl => (
                        <option key={lvl.id} value={lvl.name}>{lvl.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {!editingUser && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    * Los nuevos usuarios serán creados con la contraseña por defecto: <strong className="text-slate-600 dark:text-slate-300">Ensuny2026!</strong>
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 px-6 py-4">
                <button disabled={isSaving} onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button disabled={isSaving} onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-75">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> {editingUser ? 'Guardar cambios' : 'Crear Usuario'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
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
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">¿Eliminar Usuario?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Esta acción eliminará a <strong className="text-slate-700 dark:text-slate-300">{deleteTarget.name}</strong> del sistema. No se puede deshacer.</p>
              </div>
              <div className="flex gap-3">
                <button disabled={isSaving} onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
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
