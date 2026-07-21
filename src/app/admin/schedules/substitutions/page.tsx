'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { Calendar, UserMinus, Plus, Trash2, ArrowRight, Save, ShieldCheck, Ban, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { getTeachersList } from '@/modules/admin/application/actions'
import DailyImpactCanvas from '../components/DailyImpactCanvas'

export default function SubstitutionsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [absences, setAbsences] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeAbsence, setActiveAbsence] = useState<any | null>(null)
  
  // Clases del profesor ausente para el día seleccionado
  const [absentClasses, setAbsentClasses] = useState<any[]>([])
  const [substitutions, setSubstitutions] = useState<any[]>([])

  // UI Modal de Nueva Ausencia
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newAbsence, setNewAbsence] = useState({ teacher_id: '', reason: '' })

  const supabase = createClient()

  useEffect(() => {
    fetchTeachers()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      fetchAbsences()
      setActiveAbsence(null)
    }
  }, [selectedDate])

  useEffect(() => {
    if (activeAbsence) {
      fetchClassesAndSubstitutions(activeAbsence)
    }
  }, [activeAbsence])

  const fetchTeachers = async () => {
    const data = await getTeachersList()
    if (data) setTeachers(data)
  }

  const fetchAbsences = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sch_absences')
      .select('*, teacher:profiles!teacher_id(first_name, last_name)')
      .eq('absence_date', selectedDate)
    
    if (data) {
      const mapped = data.map((ab: any) => ({
        ...ab,
        teacher: { name: ab.teacher ? `${ab.teacher.first_name} ${ab.teacher.last_name}` : 'Desconocido' }
      }))
      setAbsences(mapped)
    }
    setLoading(false)
  }

  const fetchClassesAndSubstitutions = async (absence: any) => {
    setLoading(true)
    
    // Parse selectedDate carefully to avoid timezone shifts
    // Date input format is 'YYYY-MM-DD'. In JS:
    const [y, m, d] = selectedDate.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const dayOfWeek = days[dateObj.getDay()]

    // Traer las clases del maestro para ese día
    const { data: classesData } = await supabase
      .from('sch_schedule_slots')
      .select('*, subject:sch_subjects(name, color), group:sch_groups(name)')
      .eq('teacher_id', absence.teacher_id)
      .eq('day_of_week', dayOfWeek)
      .order('period_id')

    if (classesData) setAbsentClasses(classesData)

    // Traer las sustituciones guardadas para esa ausencia
    const { data: subsData } = await supabase
      .from('sch_substitutions')
      .select('*')
      .eq('absence_id', absence.id)
    
    if (subsData) setSubstitutions(subsData)
    setLoading(false)
  }

  const handleAddAbsence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAbsence.teacher_id) return toast.error('Selecciona un docente')
    
    const { error } = await supabase.from('sch_absences').insert({
      teacher_id: newAbsence.teacher_id,
      absence_date: selectedDate,
      reason: newAbsence.reason
    })

    if (error) {
      console.error('Error insertando ausencia:', error)
      toast.error(`Error: ${error.message || 'No se pudo registrar la ausencia'}`)
    } else {
      toast.success('Ausencia registrada')
      setIsAddModalOpen(false)
      fetchAbsences()
    }
  }

  const handleDeleteAbsence = (id: string) => {
    toast('¿Eliminar esta ausencia y sus suplencias?', {
      action: {
        label: 'Sí, eliminar',
        onClick: async () => {
          const { error } = await supabase.from('sch_absences').delete().eq('id', id)
          if (error) toast.error('Error al eliminar')
          else {
            toast.success('Ausencia eliminada')
            if (activeAbsence?.id === id) setActiveAbsence(null)
            fetchAbsences()
          }
        }
      }
    })
  }

  const handleUpdateSubstitution = async (slotId: string, subTeacherId: string, status: string, periodId: number) => {
    const existing = substitutions.find(s => s.original_schedule_slot_id === slotId)
    
    if (existing) {
      if (!subTeacherId && status === 'COVERED') {
        // Delete if empty and was covered
        await supabase.from('sch_substitutions').delete().eq('id', existing.id)
      } else {
        // Update
        await supabase.from('sch_substitutions').update({
          substitute_teacher_id: subTeacherId || null,
          status
        }).eq('id', existing.id)
      }
    } else {
      // Insert
      if (subTeacherId || status === 'CANCELLED') {
        await supabase.from('sch_substitutions').insert({
          absence_id: activeAbsence.id,
          original_schedule_slot_id: slotId,
          substitute_teacher_id: subTeacherId || null,
          period_id: periodId,
          status
        })
      }
    }
    fetchClassesAndSubstitutions(activeAbsence)
    toast.success('Cambio guardado')
  }

  // Obtenemos el nombre del día y fecha completa para display
  const [y, m, d] = selectedDate.split('-').map(Number)
  const dateObjForDisplay = new Date(y, m - 1, d)
  const displayDayName = dateObjForDisplay.toLocaleDateString('es-ES', { weekday: 'long' })
  const displayFullDate = dateObjForDisplay.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  // Tab State
  const [activeTab, setActiveTab] = useState<'manage' | 'impact'>('manage')

  return (
    <div className="w-full h-full p-6 flex flex-col gap-6">
      {/* Header & Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <UserMinus className="h-7 w-7 text-rose-500" />
            Sustituciones y Ausencias
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona los reemplazos diarios sin alterar el Horario Maestro</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'manage' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Gestión de Ausencias
            </button>
            <button
              onClick={() => setActiveTab('impact')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'impact' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Impacto General
            </button>
          </div>

          <div className="flex items-center gap-3 pl-0 sm:pl-4 sm:border-l border-slate-200 dark:border-slate-700">
            <Calendar className="h-5 w-5 text-slate-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {activeTab === 'manage' ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
        
        {/* Panel Izquierdo: Ausencias del Día */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h2 className="font-bold">Ausencias ({absences.length})</h2>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {absences.map(ab => (
              <div 
                key={ab.id}
                onClick={() => setActiveAbsence(ab)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${activeAbsence?.id === ab.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ backgroundColor: '#6366f1' }}>
                      {ab.teacher?.name?.charAt(0)}{ab.teacher?.name?.split(' ')?.[1]?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{ab.teacher?.name}</p>
                      <p className="text-xs text-slate-500">{ab.reason || 'Sin motivo especificado'}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteAbsence(ab.id) }} className="text-slate-400 hover:text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {absences.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                <UserMinus className="h-10 w-10 mx-auto opacity-20 mb-3" />
                <p>No hay ausencias registradas para esta fecha.</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho: Suplencias */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {activeAbsence ? (
            <>
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h2 className="font-bold flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                  Clases a cubrir de {activeAbsence.teacher?.name}
                </h2>
                <p className="text-sm text-slate-500 ml-7 capitalize">Día de la semana: {displayDayName}, {displayFullDate}</p>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {absentClasses.length === 0 ? (
                  <p className="text-center text-slate-500 mt-10">Este docente no tiene clases programadas en el horario maestro para el día seleccionado.</p>
                ) : (
                  absentClasses.map(cls => {
                    const sub = substitutions.find(s => s.original_schedule_slot_id === cls.id)
                    const isCancelled = sub?.status === 'CANCELLED'
                    const subTeacherId = sub?.substitute_teacher_id || ''

                    return (
                      <div key={cls.id} className={`p-4 border rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between transition-colors ${isCancelled ? 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-900/10' : subTeacherId ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
                        
                        {/* Info de la clase */}
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold text-slate-600 dark:text-slate-300">
                              Hora {cls.period_id}
                            </span>
                            <span className="font-bold">{cls.group?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.subject?.color }} />
                            {cls.subject?.name}
                          </div>
                        </div>

                        {/* Controles de sustitución */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <select 
                            value={subTeacherId}
                            onChange={(e) => handleUpdateSubstitution(cls.id, e.target.value, 'COVERED', cls.period_id)}
                            disabled={isCancelled}
                            className="flex-1 md:w-56 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <option value="">(Sin asignar) Seleccionar suplente...</option>
                            {teachers.filter(t => t.id !== activeAbsence.teacher_id).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>

                          {/* Botón Cancelar Lección */}
                          <button
                            onClick={() => handleUpdateSubstitution(cls.id, '', isCancelled ? 'COVERED' : 'CANCELLED', cls.period_id)}
                            className={`p-2 rounded-lg border transition-colors ${isCancelled ? 'bg-rose-100 border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700'}`}
                            title={isCancelled ? 'Restaurar' : 'Cancelar clase (Hora libre)'}
                          >
                            <Ban className="h-5 w-5" />
                          </button>
                        </div>

                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
              <ShieldCheck className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-700" />
              <h3 className="text-xl font-bold mb-2">Módulo de Sustituciones</h3>
              <p className="max-w-md">Selecciona una ausencia en el panel izquierdo para asignar suplentes a las clases afectadas.</p>
            </div>
          )}
        </div>
        </div>
      ) : (
        <DailyImpactCanvas selectedDate={selectedDate} />
      )}

      {/* MODAL NUEVA AUSENCIA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-indigo-500" />
                Registrar Ausencia
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleAddAbsence} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Docente Ausente</label>
                <select 
                  required
                  value={newAbsence.teacher_id}
                  onChange={e => setNewAbsence({...newAbsence, teacher_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccione...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Motivo (Opcional)</label>
                <input 
                  type="text" 
                  value={newAbsence.reason}
                  onChange={e => setNewAbsence({...newAbsence, reason: e.target.value})}
                  placeholder="Ej. Licencia por enfermedad, Permiso..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
