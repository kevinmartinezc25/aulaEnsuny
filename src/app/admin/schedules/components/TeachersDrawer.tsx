'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Plus, User, Clock, Trash2, Edit2, Loader2, Save, CalendarOff, ArrowLeft } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import TimeOffGrid from './TimeOffGrid'
import { getAdminUsers } from '@/modules/admin/application/actions'

interface Teacher {
  id: string
  name: string
  max_hours: number
}

export default function TeachersDrawer({ isOpen }: { isOpen: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTeacherTimeOff, setActiveTeacherTimeOff] = useState<Teacher | null>(null)
  
  const [newName, setNewName] = useState('')
  const [newMaxHours, setNewMaxHours] = useState<number>(22)

  const supabase = createClient()

  const getDefaultMaxHours = () => {
    try {
      const stored = localStorage.getItem('sch_settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        return parseInt(parsed.maxHoursSecondary || '22', 10)
      }
    } catch (e) {}
    return 22
  }

  useEffect(() => {
    if (isOpen) {
      fetchTeachers()
    }
  }, [isOpen])

  const fetchTeachers = async () => {
    setLoading(true)
    try {
      const users = await getAdminUsers()
      const globalTeachers = (users || []).filter(u => u.role === 'teacher')

      const { data: settings } = await supabase.from('sch_teacher_settings').select('*')
      const settingsMap = new Map()
      if (settings) {
        settings.forEach(s => settingsMap.set(s.teacher_id, s.max_hours))
      }

      const defaultMax = getDefaultMaxHours()

      const combined: Teacher[] = globalTeachers.map(t => ({
        id: t.id,
        name: t.name,
        max_hours: settingsMap.get(t.id) || defaultMax
      }))

      setTeachers(combined.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    router.push(pathname) // Removes query params
  }

  const handleSave = async () => {
    if (!editingId) return
    
    // UPSERT in sch_teacher_settings
    const { error } = await supabase
      .from('sch_teacher_settings')
      .upsert({ teacher_id: editingId, max_hours: newMaxHours }, { onConflict: 'teacher_id' })

    if (!error) {
      setTeachers(teachers.map(t => t.id === editingId ? { ...t, max_hours: newMaxHours } : t))
      resetForm()
      toast.success('Carga horaria actualizada')
    } else {
      toast.error('Error al actualizar carga horaria')
    }
  }

  const resetForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setNewName('')
    setNewMaxHours(getDefaultMaxHours())
  }

  const handleEditClick = (teacher: Teacher) => {
    setEditingId(teacher.id)
    setNewName(teacher.name)
    setNewMaxHours(teacher.max_hours)
    setIsAdding(true)
  }

  const filteredTeachers = teachers.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay (solo para difuminar un poco el canvas, opcional) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-4 top-4 bottom-4 z-50 w-[400px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Docentes</h3>
                <p className="text-xs font-medium text-slate-500">Gestión del personal y carga horaria</p>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Toolbar / Grid */}
            {activeTeacherTimeOff ? (
              <div className="flex items-center gap-2 p-4 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0 bg-slate-50 dark:bg-slate-800/50">
                <button 
                  onClick={() => setActiveTeacherTimeOff(null)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="font-semibold text-sm text-slate-700 dark:text-slate-200">Volver a lista</div>
              </div>
            ) : (
              <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar docente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-200"
                />
              </div>
              
              {!isAdding ? (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium text-center">
                    Los docentes se administran desde el panel de Superadmin. Aquí puedes ajustar su disponibilidad y carga máxima.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <div className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500 font-medium">
                    {newName}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Max. Horas:</span>
                    <input 
                      type="number"
                      value={newMaxHours}
                      onChange={(e) => setNewMaxHours(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-center focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="flex-1 flex justify-center items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg text-xs font-bold transition-colors">
                      <Save className="h-3 w-3" /> {editingId ? 'Actualizar' : 'Guardar'}
                    </button>
                    <button onClick={resetForm} className="flex-1 flex justify-center items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 py-1.5 rounded-lg text-xs font-bold transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* List or Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {activeTeacherTimeOff ? (
                <div className="h-full">
                  <TimeOffGrid 
                    entityType="TEACHER" 
                    entityId={activeTeacherTimeOff.id} 
                    entityName={activeTeacherTimeOff.name} 
                  />
                </div>
              ) : loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                </div>
              ) : filteredTeachers.length === 0 ? (
                <p className="text-center text-sm font-medium text-slate-400 py-10">No hay docentes registrados.</p>
              ) : (
                filteredTeachers.map(teacher => (
                  <div key={teacher.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 rounded-xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{teacher.name}</p>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Max {teacher.max_hours} hrs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setActiveTeacherTimeOff(teacher)} className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-md hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors" title="Disponibilidad">
                        <CalendarOff className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleEditClick(teacher)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors" title="Editar Carga Máxima">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
