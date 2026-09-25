'use client'

import React, { useState } from 'react'
import { UserCog, CheckCircle2, XCircle, Info, ArrowUpRight, Search, Link2, Unlink, X, Briefcase, Trash2, AlertTriangle, GitMerge } from 'lucide-react'
import { toast } from 'sonner'
import { linkTeacherProfile, unlinkTeacherProfile, removeObsoleteTeacherAction, mergeTeachersAction } from './actions'

interface Teacher {
  id: string
  full_name: string
  profile_id: string | null
  profiles: { first_name: string; last_name: string; email: string } | null
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string
}

export interface AcademicLoad {
  assignment_id: string
  teacher_id: string
  teacher_name: string
  subject_id: string
  subject_name: string
  group_id: string
  group_name: string
  hours_per_week: number
}

interface Props {
  initialTeachers: Teacher[]
  platformProfiles: Profile[]
  allAssignments: AcademicLoad[]
  totalTeachers: number
  linkedTeachers: number
  pendingTeachers: number
}

export default function TeachersClientView({ 
  initialTeachers,
  platformProfiles,
  allAssignments,
  totalTeachers, 
  linkedTeachers, 
  pendingTeachers 
}: Props) {
  const [teachers, setTeachers] = useState(initialTeachers)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  
  // Estado para el modal de Carga Académica
  const [selectedTeacherModal, setSelectedTeacherModal] = useState<Teacher | null>(null)

  // Estado para el modal de confirmación de eliminación
  const [deleteConfirmTeacher, setDeleteConfirmTeacher] = useState<Teacher | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Estado para el modal de Fusión de Docentes
  const [mergeSourceTeacher, setMergeSourceTeacher] = useState<Teacher | null>(null)
  const [mergeTargetTeacherId, setMergeTargetTeacherId] = useState<string>('')
  const [isMerging, setIsMerging] = useState(false)

  const filteredTeachers = teachers.filter(t => 
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Perfiles que aún no han sido vinculados a ningún docente
  const availableProfiles = platformProfiles.filter(p => 
    !teachers.some(t => t.profile_id === p.id)
  )

  const handleLink = async (academicTeacherId: string, profileId: string) => {
    if (profileId === 'none') return
    
    setLoadingId(academicTeacherId)
    const res = await linkTeacherProfile(academicTeacherId, profileId)
    
    if (res.success) {
      toast.success('Docente vinculado correctamente')
      const profile = platformProfiles.find(p => p.id === profileId)
      setTeachers(prev => prev.map(t => 
        t.id === academicTeacherId ? { ...t, profile_id: profileId, profiles: profile ? { first_name: profile.first_name, last_name: profile.last_name, email: profile.email } : null } : t
      ))
    } else {
      toast.error(res.error || 'Error al vincular')
    }
    setLoadingId(null)
  }

  const handleUnlink = async (academicTeacherId: string) => {
    setLoadingId(academicTeacherId)
    const res = await unlinkTeacherProfile(academicTeacherId)
    
    if (res.success) {
      toast.success('Docente desvinculado')
      setTeachers(prev => prev.map(t => 
        t.id === academicTeacherId ? { ...t, profile_id: null, profiles: null } : t
      ))
    } else {
      toast.error(res.error || 'Error al desvincular')
    }
    setLoadingId(null)
  }

  // Lógica para procesar las materias del modal
  const getTeacherLoadData = (teacherId: string) => {
    const loads = allAssignments.filter(a => a.teacher_id === teacherId)
    const totalHours = loads.reduce((sum, l) => sum + (l.hours_per_week || 0), 0)
    
    const bySubject = loads.reduce((acc: Record<string, { groups: { name: string, hours: number }[], hours: number }>, curr) => {
      if (!acc[curr.subject_name]) {
        acc[curr.subject_name] = { groups: [], hours: 0 }
      }
      acc[curr.subject_name].groups.push({ name: curr.group_name, hours: curr.hours_per_week })
      acc[curr.subject_name].hours += curr.hours_per_week
      return acc
    }, {})

    return { totalHours, bySubject }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTeacher) return
    setIsDeleting(true)
    const res = await removeObsoleteTeacherAction(deleteConfirmTeacher.id)
    setIsDeleting(false)
    if (res.success) {
      toast.success(`Docente "${deleteConfirmTeacher.full_name}" eliminado correctamente.`)
      setTeachers(prev => prev.filter(t => t.id !== deleteConfirmTeacher.id))
      setDeleteConfirmTeacher(null)
    } else {
      toast.error(res.error || 'No se pudo eliminar el docente.')
      setDeleteConfirmTeacher(null)
    }
  }

  const handleConfirmMerge = async () => {
    if (!mergeSourceTeacher || !mergeTargetTeacherId) {
      toast.error('Selecciona el docente de destino para transferir las clases.')
      return
    }

    setIsMerging(true)
    const res = await mergeTeachersAction(mergeSourceTeacher.id, mergeTargetTeacherId)
    setIsMerging(false)

    if (res.success) {
      toast.success(`Docente fusionado correctamente. Se transfirieron ${res.transferredSlots || 0} clase(s).`)
      setTeachers(prev => prev.filter(t => t.id !== mergeSourceTeacher.id))
      setMergeSourceTeacher(null)
      setMergeTargetTeacherId('')
    } else {
      toast.error(res.error || 'Error al fusionar docentes.')
    }
  }

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCog className="h-6 w-6 text-emerald-500" />
              Docentes (Horarios)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Visualización y vinculación sincronizada desde el archivo Maestro XML.
            </p>
          </div>
          
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar docente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Docentes aSc</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{teachers.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Cuentas Vinculadas</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {teachers.filter(t => t.profile_id).length}
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Pendientes por Vincular</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {teachers.length - teachers.filter(t => t.profile_id).length}
              <XCircle className="h-5 w-5 text-amber-500" />
            </p>
          </div>
        </div>
      </div>

      {/* Table (Scroll Nativo) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {/* VISTA DESKTOP */}
          <table className="hidden md:table w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="px-6 py-4">Nombre en aSc TimeTables</th>
                <th className="px-6 py-4">Estado de Cuenta (Plataforma)</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                    {teacher.full_name}
                  </td>
                  <td className="px-6 py-4">
                    {teacher.profile_id ? (
                      <div className="flex items-center justify-between gap-4 max-w-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-slate-700 dark:text-slate-200 font-medium">
                              {teacher.profiles?.first_name} {teacher.profiles?.last_name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {teacher.profiles?.email}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnlink(teacher.id)}
                          disabled={loadingId === teacher.id}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                          title="Desvincular cuenta"
                        >
                          <Unlink className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 relative w-64">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                        <select
                          value="none"
                          onChange={(e) => handleLink(teacher.id, e.target.value)}
                          disabled={loadingId === teacher.id}
                          className="w-full text-sm py-1.5 pl-9 pr-8 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-400 focus:outline-none focus:border-amber-400 transition-colors appearance-none cursor-pointer"
                        >
                          <option value="none">-- Seleccionar Perfil --</option>
                          {availableProfiles.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.first_name} {p.last_name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                           <div className="h-0 w-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-amber-500"></div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Botón Fusionar: transfiere clases al docente principal si este quedó duplicado */}
                      <button
                        onClick={() => {
                          setMergeSourceTeacher(teacher)
                          setMergeTargetTeacherId('')
                        }}
                        disabled={loadingId === teacher.id}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                        title="Fusionar / Transferir clases a otro docente"
                      >
                        <GitMerge className="h-4 w-4" />
                      </button>

                      {/* Botón eliminar: solo disponible para docentes sin cuenta vinculada */}
                      {teacher.profile_id === null && (
                        <button
                          onClick={() => setDeleteConfirmTeacher(teacher)}
                          disabled={loadingId === teacher.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Eliminar docente (solo si no tiene clases activas)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => setSelectedTeacherModal(teacher)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-sm font-semibold text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      >
                        <Briefcase className="h-4 w-4" />
                        Ver Carga
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* VISTA MOBILE */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTeachers.map((teacher) => (
              <div key={teacher.id} className="p-4 flex flex-col gap-4 bg-white dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-900 dark:text-white text-base leading-tight pr-4">{teacher.full_name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setMergeSourceTeacher(teacher)
                        setMergeTargetTeacherId('')
                      }}
                      disabled={loadingId === teacher.id}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                      title="Fusionar / Transferir clases"
                    >
                      <GitMerge className="h-4 w-4" />
                    </button>
                    {teacher.profile_id === null && (
                      <button
                        onClick={() => setDeleteConfirmTeacher(teacher)}
                        disabled={loadingId === teacher.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800/50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Eliminar docente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-full">
                  {teacher.profile_id ? (
                    <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <div className="truncate">
                          <p className="text-slate-700 dark:text-slate-200 font-bold text-sm truncate">
                            {teacher.profiles?.first_name} {teacher.profiles?.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {teacher.profiles?.email}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUnlink(teacher.id)}
                        disabled={loadingId === teacher.id}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors shrink-0"
                      >
                        <Unlink className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 relative w-full">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                      <select
                        value="none"
                        onChange={(e) => handleLink(teacher.id, e.target.value)}
                        disabled={loadingId === teacher.id}
                        className="w-full text-sm py-2 pl-9 pr-8 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-400 focus:outline-none focus:border-amber-400 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="none">Vincular a Perfil Plataforma</option>
                        {availableProfiles.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.first_name} {p.last_name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <div className="h-0 w-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-amber-500"></div>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedTeacherModal(teacher)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-sm font-bold text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  <Briefcase className="h-4 w-4" />
                  Ver Carga Académica
                </button>
              </div>
            ))}
          </div>

          {filteredTeachers.length === 0 && (
            <div className="py-16 text-center">
              <Info className="h-8 w-8 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">No se encontraron docentes</h3>
              <p className="text-sm text-slate-500 mt-1">Intenta con otra búsqueda.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL DE CARGA ACADÉMICA --- */}
      {selectedTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedTeacherModal(null)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <UserCog className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedTeacherModal.full_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Carga Académica (Distribución Oficial)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTeacherModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar">
              {(() => {
                const { totalHours, bySubject } = getTeacherLoadData(selectedTeacherModal.id)
                const subjects = Object.entries(bySubject)

                if (subjects.length === 0) {
                  return (
                    <div className="py-12 text-center">
                      <Briefcase className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">Este docente no tiene materias asignadas.</p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-6">
                    {/* Resumen */}
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        Total Horas Semanales
                      </span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {totalHours} <span className="text-base font-bold text-slate-400">hrs</span>
                      </span>
                    </div>

                    {/* Lista de Materias y Grupos */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Desglose de Materias</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {subjects.map(([subjectName, details]) => (
                          <div key={subjectName} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3 gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                                {subjectName}
                              </span>
                              <span className="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-200/50 dark:border-emerald-800/50">
                                {details.hours} h
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-auto">
                              {details.groups.map((group, idx) => (
                                <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-md uppercase flex items-center gap-1.5">
                                  {group.name}
                                  <span className="text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-sm font-black">
                                    {group.hours}h
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
      {/* --- MODAL DE CONFIRMACIÓN DE ELIMINACIÓN --- */}
      {deleteConfirmTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteConfirmTeacher(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">¿Eliminar Docente?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Se eliminará a <strong className="text-slate-900 dark:text-white">{deleteConfirmTeacher.full_name}</strong> del catálogo de docentes académicos.
              </p>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <span>Los usuarios de la plataforma, calificaciones y registros de asistencia <strong>no se ven afectados</strong>.</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Si el docente tiene clases asignadas en el horario activo, la operación será rechazada de forma automática.
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmTeacher(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE FUSIÓN DE DOCENTES --- */}
      {mergeSourceTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !isMerging && setMergeSourceTeacher(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <GitMerge className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Fusionar Docente</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Transferir clases y unificar registros</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Se transferirán todas las clases del horario asignadas a <strong className="text-slate-900 dark:text-white">{mergeSourceTeacher.full_name}</strong> hacia el docente principal que selecciones:
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Docente Destino (Cuenta / Perfil principal):
                </label>
                <select
                  value={mergeTargetTeacherId}
                  onChange={(e) => setMergeTargetTeacherId(e.target.value)}
                  disabled={isMerging}
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Selecciona el docente principal --</option>
                  {teachers
                    .filter(t => t.id !== mergeSourceTeacher.id)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} {t.profile_id ? '✓ (Tiene cuenta vinculada)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                Al completar la fusión, el registro duplicado ({mergeSourceTeacher.full_name}) será eliminado para no generar inconsistencias.
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setMergeSourceTeacher(null)}
                disabled={isMerging}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmMerge}
                disabled={isMerging || !mergeTargetTeacherId}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMerging ? 'Fusionando...' : 'Confirmar Fusión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
