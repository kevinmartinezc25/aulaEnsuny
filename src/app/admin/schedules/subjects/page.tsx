'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Trash2, Edit2, Loader2, Search, Save, Beaker, Library, GraduationCap } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { getAdminUsers } from '@/modules/admin/application/actions'
import { toast } from 'sonner'

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f97316', '#14b8a6', '#ec4899', '#0ea5e9', '#6366f1']

export default function SubjectsPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'curriculum'>('catalog')
  const supabase = createClient()

  // CATALOG STATE
  const [subjects, setSubjects] = useState<any[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [searchSubject, setSearchSubject] = useState('')
  const [isAddingSubject, setIsAddingSubject] = useState(false)
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  
  const [newSubName, setNewSubName] = useState('')
  const [newSubColor, setNewSubColor] = useState(COLORS[0])
  const [newSubRoomType, setNewSubRoomType] = useState('aula')

  // CURRICULUM STATE
  const [groups, setGroups] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  
  const [curriculum, setCurriculum] = useState<any[]>([])
  const [loadingCurriculum, setLoadingCurriculum] = useState(false)
  
  const [isAddingCurriculum, setIsAddingCurriculum] = useState(false)
  const [editingCurriculumId, setEditingCurriculumId] = useState<string | null>(null)
  const [selectedSubId, setSelectedSubId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState(1)

  useEffect(() => {
    fetchSubjects()
    fetchGroupsAndTeachers()
  }, [])

  useEffect(() => {
    if (selectedGroupId) {
      fetchCurriculum()
    } else {
      setCurriculum([])
    }
  }, [selectedGroupId])

  // --- CATALOG FUNCTIONS ---
  const fetchSubjects = async () => {
    setLoadingSubjects(true)
    const { data } = await supabase.from('sch_subjects').select('*').order('name')
    if (data) setSubjects(data)
    setLoadingSubjects(false)
  }

  const handleSaveSubject = async () => {
    if (!newSubName.trim()) return
    
    if (editingSubjectId) {
      const { data, error } = await supabase
        .from('sch_subjects')
        .update({ name: newSubName, color: newSubColor, room_type: newSubRoomType })
        .eq('id', editingSubjectId)
        .select()
      if (!error && data) {
        setSubjects(subjects.map(s => s.id === editingSubjectId ? data[0] : s).sort((a, b) => a.name.localeCompare(b.name)))
        resetSubjectForm()
        toast.success("Materia actualizada")
      }
    } else {
      const { data, error } = await supabase
        .from('sch_subjects')
        .insert([{ name: newSubName, color: newSubColor, room_type: newSubRoomType }])
        .select()
      if (!error && data) {
        setSubjects([...subjects, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
        resetSubjectForm()
        toast.success("Materia creada")
      }
    }
  }

  const resetSubjectForm = () => {
    setIsAddingSubject(false)
    setEditingSubjectId(null)
    setNewSubName('')
    setNewSubColor(COLORS[0])
    setNewSubRoomType('aula')
  }

  const handleDeleteSubject = (id: string) => {
    toast('¿Seguro de eliminar esta materia?', {
      action: {
        label: 'Sí, eliminar',
        onClick: async () => {
          const { error } = await supabase.from('sch_subjects').delete().eq('id', id)
          if (!error) {
            setSubjects(prev => prev.filter(s => s.id !== id))
            toast.success("Materia eliminada")
          }
        }
      }
    })
  }

  // --- CURRICULUM FUNCTIONS ---
  const fetchGroupsAndTeachers = async () => {
    const [g, users] = await Promise.all([
      supabase.from('sch_groups').select('id, name'),
      getAdminUsers()
    ])
    if (g.data) {
      const sortedGroups = g.data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      setGroups(sortedGroups)
      if (sortedGroups.length > 0) setSelectedGroupId(sortedGroups[0].id)
    }
    if (users) {
      const globalTeachers = users.filter(u => u.role === 'teacher')
      setTeachers(globalTeachers)
    }
  }

  const fetchCurriculum = async () => {
    setLoadingCurriculum(true)
    const { data } = await supabase
      .from('sch_curriculum')
      .select('id, hours_per_week, subject:sch_subjects(id, name, color), teacher:profiles(id, first_name, last_name)')
      .eq('group_id', selectedGroupId)
    
    if (data) {
      const mapped = data.map((d: any) => ({
        ...d,
        teacher: d.teacher ? { id: d.teacher.id, name: `${d.teacher.first_name} ${d.teacher.last_name}`.trim() } : null
      }))
      setCurriculum(mapped)
    }
    setLoadingCurriculum(false)
  }

  const handleSaveCurriculum = async () => {
    if (!selectedSubId || hoursPerWeek < 1) return

    setLoadingCurriculum(true)

    if (editingCurriculumId) {
      const { data, error } = await supabase.from('sch_curriculum')
        .update({
          teacher_id: selectedTeacherId || null,
          hours_per_week: hoursPerWeek
        })
        .eq('id', editingCurriculumId)
        .select('*, subject:sch_subjects(id, name, color), teacher:profiles(id, first_name, last_name)')

      if (!error && data) {
        const mappedData = {
          ...data[0],
          teacher: data[0].teacher ? { id: data[0].teacher.id, name: `${data[0].teacher.first_name} ${data[0].teacher.last_name}`.trim() } : null
        }
        setCurriculum(curriculum.map(c => c.id === editingCurriculumId ? mappedData : c))
        toast.success("Malla actualizada")
        resetCurriculumForm()
      } else {
        toast.error("Error al actualizar")
      }
    } else {
      const { data, error } = await supabase.from('sch_curriculum')
        .insert([{
          group_id: selectedGroupId,
          subject_id: selectedSubId,
          teacher_id: selectedTeacherId || null,
          hours_per_week: hoursPerWeek
        }])
        .select('*, subject:sch_subjects(id, name, color), teacher:profiles(id, first_name, last_name)')

      if (!error && data) {
        const mappedData = {
          ...data[0],
          teacher: data[0].teacher ? { id: data[0].teacher.id, name: `${data[0].teacher.first_name} ${data[0].teacher.last_name}`.trim() } : null
        }
        setCurriculum([...curriculum, mappedData])
        toast.success("Materia asignada al grupo")
        resetCurriculumForm()
      } else {
        toast.error("Error al asignar materia")
      }
    }
    
    setLoadingCurriculum(false)
  }

  const resetCurriculumForm = () => {
    setIsAddingCurriculum(false)
    setEditingCurriculumId(null)
    setSelectedSubId('')
    setSelectedTeacherId('')
    setHoursPerWeek(1)
  }

  const handleEditCurriculum = (curr: any) => {
    setEditingCurriculumId(curr.id)
    setSelectedSubId(curr.subject.id)
    setSelectedTeacherId(curr.teacher?.id || '')
    setHoursPerWeek(curr.hours_per_week)
    setIsAddingCurriculum(true)
  }

  const handleDeleteCurriculum = async (id: string) => {
    const { error } = await supabase.from('sch_curriculum').delete().eq('id', id)
    if (!error) {
      setCurriculum(curriculum.filter(c => c.id !== id))
      toast.success("Asignación removida")
    }
  }

  return (
    <div className="p-8 h-full overflow-y-auto w-full">
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[80vh]">
        
        {/* Header Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex">
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-colors border-b-2 ${activeTab === 'catalog' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <BookOpen className="h-5 w-5" />
            Catálogo de Materias
          </button>
          <button 
            onClick={() => setActiveTab('curriculum')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-colors border-b-2 ${activeTab === 'curriculum' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Library className="h-5 w-5" />
            Mallas Curriculares (Por Grupo)
          </button>
        </div>

        {/* --- TAB: CATALOG --- */}
        {activeTab === 'catalog' && (
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar materia..." 
                  value={searchSubject}
                  onChange={(e) => setSearchSubject(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              {!isAddingSubject && (
                <button 
                  onClick={() => setIsAddingSubject(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Materia
                </button>
              )}
            </div>

            <AnimatePresence>
              {isAddingSubject && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Nombre</label>
                      <input 
                        type="text" 
                        value={newSubName} 
                        onChange={(e) => setNewSubName(e.target.value)}
                        placeholder="Ej. Matemáticas"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Color Etiqueta</label>
                      <div className="flex gap-2 h-[38px] items-center">
                        {COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setNewSubColor(c)}
                            className={`w-6 h-6 rounded-full transition-transform ${newSubColor === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900' : 'hover:scale-110'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="mt-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Aula Requerida</label>
                      <select 
                        value={newSubRoomType}
                        onChange={(e) => setNewSubRoomType(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="aula">Aula Normal</option>
                        <option value="lab">Laboratorio</option>
                        <option value="sistemas">Aula de Sistemas</option>
                        <option value="biblioteca">Biblioteca</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-800/50">
                    <button onClick={resetSubjectForm} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleSaveSubject} disabled={!newSubName.trim()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                      <Save className="h-4 w-4" />
                      {editingSubjectId ? 'Actualizar' : 'Guardar'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2">
              {loadingSubjects ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjects.filter(s => s.name.toLowerCase().includes(searchSubject.toLowerCase())).map(subject => (
                    <div key={subject.id} className="group p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={subject.name}>{subject.name}</p>
                          {subject.room_type && subject.room_type !== 'aula' && (
                            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                              <Beaker className="h-3 w-3" /> 
                              {subject.room_type === 'lab' ? 'Laboratorio' : 
                               subject.room_type === 'sistemas' ? 'Sistemas' : 
                               subject.room_type === 'biblioteca' ? 'Biblioteca' : 'Especial'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => { setEditingSubjectId(subject.id); setNewSubName(subject.name); setNewSubColor(subject.color); setNewSubRoomType(subject.room_type || 'aula'); setIsAddingSubject(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteSubject(subject.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB: CURRICULUM --- */}
        {activeTab === 'curriculum' && (
          <div className="p-6 flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-900/30">
            <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Grupo a Configurar</label>
                  <select 
                    value={selectedGroupId}
                    onChange={e => setSelectedGroupId(e.target.value)}
                    className="bg-transparent text-slate-800 dark:text-slate-100 font-bold text-lg focus:outline-none border-b-2 border-indigo-500 pb-1 cursor-pointer"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!isAddingCurriculum && selectedGroupId && (
                <button 
                  onClick={() => setIsAddingCurriculum(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Asignar Materia
                </button>
              )}
            </div>

            <AnimatePresence>
              {isAddingCurriculum && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl p-5 shadow-sm overflow-hidden"
                >
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Nueva Asignación para este grupo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Materia *</label>
                      <select 
                        value={selectedSubId}
                        onChange={e => setSelectedSubId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                      >
                        <option value="">Seleccione...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Docente Asignado (Opcional)</label>
                      <select 
                        value={selectedTeacherId}
                        onChange={e => setSelectedTeacherId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Sin asignar (Automático)</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Horas Semanales (Bloques) *</label>
                      <input 
                        type="number"
                        min="1"
                        max="20"
                        value={hoursPerWeek}
                        onChange={e => setHoursPerWeek(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-5">
                    <button onClick={resetCurriculumForm} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleSaveCurriculum} disabled={!selectedSubId || hoursPerWeek < 1} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                      <Save className="h-4 w-4" />
                      {editingCurriculumId ? 'Actualizar Malla' : 'Añadir a Malla'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CURRICULUM TABLE */}
            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 font-bold text-xs text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">Materia</div>
                <div className="col-span-4">Docente Titular</div>
                <div className="col-span-2 text-center">Horas/Semana</div>
                <div className="col-span-1 text-center">Acción</div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loadingCurriculum ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                ) : curriculum.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                    <Library className="h-12 w-12 mb-3 opacity-20" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">Malla Curricular Vacía</p>
                    <p className="text-sm mt-1">Este grupo no tiene materias asignadas. Haz clic en "Asignar Materia" para comenzar.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {curriculum.map(c => (
                      <div key={c.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="col-span-5 flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.subject?.color || '#cbd5e1' }} />
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{c.subject?.name || 'Materia Eliminada'}</span>
                        </div>
                        <div className="col-span-4 text-sm text-slate-600 dark:text-slate-400 truncate">
                          {c.teacher?.name || <span className="italic opacity-50">Por Definir</span>}
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="inline-block px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-xs rounded-md">
                            {c.hours_per_week} hrs
                          </span>
                        </div>
                        <div className="col-span-1 flex justify-center gap-1">
                          <button onClick={() => handleEditCurriculum(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteCurriculum(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-600 dark:text-slate-400">Total Horas Asignadas:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-lg">
                  {curriculum.reduce((acc, curr) => acc + curr.hours_per_week, 0)} / 35
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
