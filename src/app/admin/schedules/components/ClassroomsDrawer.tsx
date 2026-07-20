'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Plus, DoorOpen, Trash2, Edit2, Loader2, Save, Beaker, Users } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

interface Classroom {
  id: string
  name: string
  capacity: number
  is_lab: boolean
}

export default function ClassroomsDrawer({ isOpen }: { isOpen: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [newName, setNewName] = useState('')
  const [newCapacity, setNewCapacity] = useState(30)
  const [newIsLab, setNewIsLab] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchClassrooms()
    }
  }, [isOpen])

  const fetchClassrooms = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sch_classrooms')
      .select('*')
      .order('name')
    
    if (!error && data) {
      setClassrooms(data)
    }
    setLoading(false)
  }

  const handleClose = () => {
    router.push(pathname)
  }

  const handleSave = async () => {
    if (!newName.trim()) return
    
    if (editingId) {
      const { data, error } = await supabase
        .from('sch_classrooms')
        .update({ name: newName, capacity: newCapacity, is_lab: newIsLab })
        .eq('id', editingId)
        .select()

      if (!error && data) {
        setClassrooms(classrooms.map(c => c.id === editingId ? data[0] : c).sort((a, b) => a.name.localeCompare(b.name)))
        resetForm()
      }
    } else {
      const { data, error } = await supabase
        .from('sch_classrooms')
        .insert([{ name: newName, capacity: newCapacity, is_lab: newIsLab }])
        .select()

      if (!error && data) {
        setClassrooms([...classrooms, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
        resetForm()
      }
    }
  }

  const resetForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setNewName('')
    setNewCapacity(30)
    setNewIsLab(false)
  }

  const handleEditClick = (classroom: Classroom) => {
    setEditingId(classroom.id)
    setNewName(classroom.name)
    setNewCapacity(classroom.capacity)
    setNewIsLab(classroom.is_lab)
    setIsAdding(true)
  }

  const handleDelete = (id: string) => {
    toast('¿Eliminar aula?', {
      action: {
        label: 'Sí, eliminar',
        onClick: async () => {
          const { error } = await supabase.from('sch_classrooms').delete().eq('id', id)
          if (!error) {
            setClassrooms(prev => prev.filter(t => t.id !== id))
            toast.success('Aula eliminada')
          } else {
            toast.error('Error al eliminar aula')
          }
        }
      }
    })
  }

  const filteredClassrooms = classrooms.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
          />

          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-4 top-4 bottom-4 z-50 w-[400px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Aulas</h3>
                <p className="text-xs font-medium text-slate-500">Gestión de espacios físicos y laboratorios</p>
              </div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar aula..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-200"
                />
              </div>
              
              {!isAdding ? (
                <button 
                  onClick={() => {
                    resetForm()
                    setIsAdding(true)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl text-sm font-bold transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Añadir Aula
                </button>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <input 
                    autoFocus
                    placeholder="Nombre del aula (ej: Lab Sistemas 1)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white"
                  />
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Capacidad (alumnos):</span>
                    <input 
                      type="number"
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-center focus:outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input 
                      type="checkbox"
                      checked={newIsLab}
                      onChange={(e) => setNewIsLab(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Es Laboratorio / Taller Especial</span>
                  </label>

                  <div className="flex gap-2 pt-2">
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

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                </div>
              ) : filteredClassrooms.length === 0 ? (
                <p className="text-center text-sm font-medium text-slate-400 py-10">No hay aulas registradas.</p>
              ) : (
                filteredClassrooms.map(room => (
                  <div key={room.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 rounded-xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        {room.is_lab ? (
                          <Beaker className="h-4 w-4 text-indigo-500" />
                        ) : (
                          <DoorOpen className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{room.name}</p>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          <Users className="h-3 w-3" /> {room.capacity} alumnos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditClick(room)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(room.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
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
