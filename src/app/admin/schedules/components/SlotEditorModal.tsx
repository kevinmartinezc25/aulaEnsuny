'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Save } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { toast } from 'sonner'

interface SlotEditorModalProps {
  isOpen: boolean
  onClose: () => void
  day: string
  periodId: number
  groupId: string
  onSave: () => void
}

export default function SlotEditorModal({ isOpen, onClose, day, periodId, groupId, onSave }: SlotEditorModalProps) {
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  const [teachers, setTeachers] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classrooms, setClassrooms] = useState<any[]>([])

  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedClassroom, setSelectedClassroom] = useState('')

  const supabase = createClient()

  useEffect(() => {
    if (isOpen && !dataLoaded) {
      fetchCatalogs()
    }
  }, [isOpen])

  const fetchCatalogs = async () => {
    const [t, s, c] = await Promise.all([
      supabase.from('sch_teachers').select('id, name'),
      supabase.from('sch_subjects').select('id, name, color'),
      supabase.from('sch_classrooms').select('id, name')
    ])

    if (t.data) setTeachers(t.data)
    if (s.data) setSubjects(s.data)
    if (c.data) setClassrooms(c.data)
    
    setDataLoaded(true)
  }

  const handleSave = async () => {
    if (!selectedSubject || !groupId) return

    setLoading(true)
    const { error } = await supabase.from('sch_schedule_slots').insert([{
      day_of_week: day,
      period_id: periodId,
      subject_id: selectedSubject,
      teacher_id: selectedTeacher || null,
      classroom_id: selectedClassroom || null,
      group_id: groupId,
      duration: 1
    }])

    setLoading(false)
    if (!error) {
      onSave()
      onClose()
    } else {
      console.error(error)
      toast.error("Error al guardar: " + error.message)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                Añadir Clase - {day} ({periodId}ª Hora)
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Materia *</label>
                <select 
                  value={selectedSubject} 
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Selecciona una materia...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Docente</label>
                <select 
                  value={selectedTeacher} 
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">(Opcional) Selecciona docente...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Aula</label>
                <select 
                  value={selectedClassroom} 
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">(Opcional) Selecciona aula...</option>
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={loading || !selectedSubject || !groupId}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
