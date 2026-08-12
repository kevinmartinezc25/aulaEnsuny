'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Trash2, Edit2, Loader2, Search, Save,
  Beaker, Library, GraduationCap, Users, X, ChevronDown
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { getAdminUsers } from '@/modules/admin/application/actions'
import { isOfficialGradeGroup } from '../utils/groupFilters'
import { saveMultiTeacherCurriculumAction, deleteMultiTeacherCurriculumAction } from '../actions'
import { toast } from 'sonner'

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f97316', '#14b8a6', '#ec4899', '#0ea5e9', '#6366f1']

// A "curriculum group" is a subject assigned to a group with 1..N teachers
interface CurriculumGroup {
  subjectId: string
  subjectName: string
  subjectColor: string
  hoursPerWeek: number
  teachers: { id: string; name: string; hours?: number }[]
  rowIds: string[] // all sch_curriculum row IDs for this subject+group combo
  isOfficialWorkload?: boolean
}

export default function SubjectsPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'curriculum' | 'multiteacher'>('catalog')
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

  const [curriculum, setCurriculum] = useState<CurriculumGroup[]>([])
  const [loadingCurriculum, setLoadingCurriculum] = useState(false)

  const [isAddingCurriculum, setIsAddingCurriculum] = useState(false)
  // When editing, stores the subjectId being edited
  const [editingSubjectCurriculum, setEditingSubjectCurriculum] = useState<string | null>(null)

  // MULTI-TEACHER NON-GROUP STATE
  const [multiTeacherCurriculum, setMultiTeacherCurriculum] = useState<CurriculumGroup[]>([])
  const [loadingMultiTeacher, setLoadingMultiTeacher] = useState(false)
  const [isAddingMultiTeacher, setIsAddingMultiTeacher] = useState(false)
  const [editingMultiTeacherSubId, setEditingMultiTeacherSubId] = useState<string | null>(null)
  const [institutionalGroupId, setInstitutionalGroupId] = useState<string | null>(null)
  const [teacherHoursMap, setTeacherHoursMap] = useState<Record<string, number>>({})
  const [isOfficialWorkload, setIsOfficialWorkload] = useState<boolean>(false)

  // Form state
  const [selectedSubId, setSelectedSubId] = useState('')
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([])
  const [hoursPerWeek, setHoursPerWeek] = useState(1)
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false)
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('')

  const filteredTeachers = useMemo(() => {
    if (!teacherSearchTerm.trim()) return teachers
    const term = teacherSearchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return teachers.filter((t: any) => {
      const name = (t.name || `${t.first_name || ''} ${t.last_name || ''}`).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      return name.includes(term)
    })
  }, [teachers, teacherSearchTerm])

  useEffect(() => {
    fetchSubjects()
    fetchGroupsAndTeachers()
    fetchMultiTeacherCurriculum()
  }, [])

  useEffect(() => {
    if (selectedGroupId) {
      fetchCurriculum()
    } else {
      setCurriculum([])
    }
  }, [selectedGroupId])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setTeacherDropdownOpen(false)
    if (teacherDropdownOpen) {
      document.addEventListener('click', handler)
    }
    return () => document.removeEventListener('click', handler)
  }, [teacherDropdownOpen])

  // --- MULTI-TEACHER NON-GROUP FUNCTIONS ---
  const fetchMultiTeacherCurriculum = async () => {
    setLoadingMultiTeacher(true)
    try {
      const [currRes, configRes] = await Promise.all([
        supabase
          .from('sch_curriculum')
          .select('id, hours_per_week, group_id, sch_groups(id, name), subject:sch_subjects(id, name, color), teacher:profiles(id, first_name, last_name)'),
        supabase
          .from('sch_constraints')
          .select('*')
          .eq('rule_type', 'MULTI_TEACHER_WORKLOAD_CONFIG')
          .maybeSingle()
      ])

      const normalWorkloadSubjectIds: string[] = configRes.data?.parameters?.normal_workload_subject_ids || []

      if (currRes.data) {
        // Filter rows that are non-academic (group_id is null OR !isOfficialGradeGroup(group.name))
        const nonGroupRows = currRes.data.filter((row: any) => !row.group_id || (row.sch_groups && !isOfficialGradeGroup(row.sch_groups.name)))

        const grouped = new Map<string, CurriculumGroup>()
        nonGroupRows.forEach((row: any) => {
          const subId = row.subject?.id
          if (!subId) return

          if (!grouped.has(subId)) {
            grouped.set(subId, {
              subjectId: subId,
              subjectName: row.subject.name,
              subjectColor: row.subject.color || '#8b5cf6',
              hoursPerWeek: row.hours_per_week,
              teachers: [],
              rowIds: [],
              isOfficialWorkload: normalWorkloadSubjectIds.includes(subId)
            })
          }
          const groupObj = grouped.get(subId)!
          groupObj.rowIds.push(row.id)
          if (row.teacher) {
            groupObj.teachers.push({
              id: row.teacher.id,
              name: `${row.teacher.first_name || ''} ${row.teacher.last_name || ''}`.trim(),
              hours: row.hours_per_week || 1
            })
          }
        })

        setMultiTeacherCurriculum(Array.from(grouped.values()))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMultiTeacher(false)
    }
  }

  const handleSaveMultiTeacherCurriculum = async () => {
    if (!selectedSubId || selectedTeacherIds.length === 0) return
    setLoadingMultiTeacher(true)

    try {
      const res = await saveMultiTeacherCurriculumAction({
        selectedSubId,
        selectedTeacherIds,
        teacherHoursMap,
        isOfficialWorkload,
        editingMultiTeacherSubId,
      })

      if (res?.success) {
        toast.success(editingMultiTeacherSubId ? "Asignación multi-docente actualizada" : "Materia multi-docente registrada")
        resetCurriculumForm()
        setIsAddingMultiTeacher(false)
        setEditingMultiTeacherSubId(null)
        setTeacherHoursMap({})
        setIsOfficialWorkload(false)
        await fetchMultiTeacherCurriculum()
      } else {
        toast.error(res?.error || "Error al guardar la asignación multi-docente")
      }
    } catch (e: any) {
      console.error("Excepción en handleSaveMultiTeacherCurriculum:", e)
      toast.error(`Ocurrió un error inesperado: ${e.message || ''}`)
    } finally {
      setLoadingMultiTeacher(false)
    }
  }

  const handleEditMultiTeacher = (group: CurriculumGroup) => {
    setEditingMultiTeacherSubId(group.subjectId)
    setSelectedSubId(group.subjectId)
    setSelectedTeacherIds(group.teachers.map(t => t.id))
    setIsOfficialWorkload(!!group.isOfficialWorkload)
    const hoursMap: Record<string, number> = {}
    group.teachers.forEach(t => {
      hoursMap[t.id] = t.hours || 1
    })
    setTeacherHoursMap(hoursMap)
    setIsAddingMultiTeacher(true)
  }

  const handleDeleteMultiTeacher = async (group: CurriculumGroup) => {
    const res = await deleteMultiTeacherCurriculumAction(group.rowIds)
    if (res?.success) {
      setMultiTeacherCurriculum(prev => prev.filter(c => c.subjectId !== group.subjectId))
      toast.success("Asignación multi-docente removida")
    } else {
      toast.error(res?.error || "Error al remover la asignación")
    }
  }

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
      const officialGroups = g.data.filter((group: any) => isOfficialGradeGroup(group.name))
      const sortedGroups = officialGroups.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      setGroups(sortedGroups)
      if (sortedGroups.length > 0) setSelectedGroupId(sortedGroups[0].id)
    }
    if (users) {
      const globalTeachers = users.filter((u: any) => u.role === 'teacher')
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
      // Group rows by subject_id
      const grouped = new Map<string, CurriculumGroup>()
      data.forEach((row: any) => {
        const subId = row.subject?.id
        if (!subId) return

        if (!grouped.has(subId)) {
          grouped.set(subId, {
            subjectId: subId,
            subjectName: row.subject.name,
            subjectColor: row.subject.color || '#6366f1',
            hoursPerWeek: row.hours_per_week,
            teachers: [],
            rowIds: [],
          })
        }
        const group = grouped.get(subId)!
        group.rowIds.push(row.id)
        if (row.teacher) {
          group.teachers.push({
            id: row.teacher.id,
            name: `${row.teacher.first_name || ''} ${row.teacher.last_name || ''}`.trim(),
          })
        }
      })

      setCurriculum(Array.from(grouped.values()))
    }
    setLoadingCurriculum(false)
  }

  const handleSaveCurriculum = async () => {
    if (!selectedSubId || hoursPerWeek < 1) return
    setLoadingCurriculum(true)

    // If editing: delete all existing rows for this subject in this group, then re-insert
    if (editingSubjectCurriculum) {
      const existingGroup = curriculum.find(c => c.subjectId === editingSubjectCurriculum)
      if (existingGroup) {
        await supabase.from('sch_curriculum').delete().in('id', existingGroup.rowIds)
      }
    }

    // Insert one row per selected teacher (or one row with null teacher if none selected)
    const teachersToInsert = selectedTeacherIds.length > 0 ? selectedTeacherIds : [null]
    const inserts = teachersToInsert.map(tid => ({
      group_id: selectedGroupId,
      subject_id: selectedSubId,
      teacher_id: tid,
      hours_per_week: hoursPerWeek,
    }))

    const { data, error } = await supabase
      .from('sch_curriculum')
      .insert(inserts)
      .select('id, hours_per_week, subject:sch_subjects(id, name, color), teacher:profiles(id, first_name, last_name)')

    if (!error && data) {
      toast.success(editingSubjectCurriculum ? "Malla actualizada" : "Materia asignada al grupo")
      resetCurriculumForm()
      await fetchCurriculum()
    } else {
      toast.error("Error al guardar la asignación")
    }

    setLoadingCurriculum(false)
  }

  const resetCurriculumForm = () => {
    setIsAddingCurriculum(false)
    setEditingSubjectCurriculum(null)
    setSelectedSubId('')
    setSelectedTeacherIds([])
    setHoursPerWeek(1)
    setTeacherDropdownOpen(false)
    setTeacherSearchTerm('')
  }

  const handleEditCurriculum = (group: CurriculumGroup) => {
    setEditingSubjectCurriculum(group.subjectId)
    setSelectedSubId(group.subjectId)
    setSelectedTeacherIds(group.teachers.map(t => t.id))
    setHoursPerWeek(group.hoursPerWeek)
    setIsAddingCurriculum(true)
  }

  const handleDeleteCurriculum = async (group: CurriculumGroup) => {
    const { error } = await supabase.from('sch_curriculum').delete().in('id', group.rowIds)
    if (!error) {
      setCurriculum(prev => prev.filter(c => c.subjectId !== group.subjectId))
      toast.success("Asignación removida")
    }
  }

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    )
  }

  const totalHours = curriculum.reduce((acc, c) => acc + c.hoursPerWeek, 0)

  return (
    <div className="p-8 h-full overflow-y-auto w-full">
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[80vh]">

        {/* Header Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-4 px-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'catalog' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <BookOpen className="h-4.5 w-4.5" />
            <span>Catálogo de Materias</span>
          </button>
          <button
            onClick={() => setActiveTab('curriculum')}
            className={`flex-1 py-4 px-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'curriculum' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Library className="h-4.5 w-4.5" />
            <span>Mallas Curriculares (Por Grupo)</span>
          </button>
          <button
            onClick={() => setActiveTab('multiteacher')}
            className={`flex-1 py-4 px-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'multiteacher' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Users className="h-4.5 w-4.5 text-purple-500" />
            <span>Materias Multi-Docente (Sin Grupo)</span>
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
            {/* Group selector header */}
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

            {/* Add/Edit form */}
            <AnimatePresence>
              {isAddingCurriculum && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{ overflow: teacherDropdownOpen ? 'visible' : 'hidden' }}
                  className="bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl p-5 shadow-sm"
                >
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
                    {editingSubjectCurriculum ? 'Editar Asignación' : 'Nueva Asignación para este grupo'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Materia *</label>
                      <select
                        value={selectedSubId}
                        onChange={e => setSelectedSubId(e.target.value)}
                        disabled={!!editingSubjectCurriculum}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Seleccione...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    {/* Multi-teacher selector */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Docentes Asignados
                        <span className="ml-1 text-indigo-500 font-normal">(puede ser más de uno)</span>
                      </label>

                      {/* Trigger button */}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setTeacherDropdownOpen(prev => !prev) }}
                        className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-left min-h-[38px]"
                      >
                        {selectedTeacherIds.length === 0 ? (
                          <span className="text-slate-400 italic">Sin asignar (Automático)</span>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {selectedTeacherIds.length} docente{selectedTeacherIds.length > 1 ? 's' : ''} seleccionado{selectedTeacherIds.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${teacherDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown */}
                      {teacherDropdownOpen && (
                        <div
                          onClick={e => e.stopPropagation()}
                          className="absolute z-50 bottom-full mb-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
                        >
                          {/* Search Input Box */}
                          <div className="p-2 border-b border-slate-100 dark:border-slate-700 relative bg-slate-50 dark:bg-slate-900/50">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Buscar docente por nombre..."
                                value={teacherSearchTerm}
                                onChange={e => setTeacherSearchTerm(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                              />
                              {teacherSearchTerm && (
                                <button
                                  type="button"
                                  onClick={() => setTeacherSearchTerm('')}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-48 overflow-y-auto">
                            {filteredTeachers.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">
                                {teachers.length === 0 ? 'No hay docentes registrados' : 'No se encontraron docentes'}
                              </div>
                            ) : (
                              filteredTeachers.map((t: any) => {
                                const isSelected = selectedTeacherIds.includes(t.id)
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => toggleTeacherSelection(t.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                                  >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                      {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                                    </div>
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                      {t.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="truncate">{t.name}</span>
                                  </button>
                                )
                              })
                            )}
                          </div>
                          {selectedTeacherIds.length > 0 && (
                            <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                              <button
                                type="button"
                                onClick={() => setSelectedTeacherIds([])}
                                className="w-full text-xs text-red-500 hover:text-red-600 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium"
                              >
                                Quitar todos ({selectedTeacherIds.length})
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected chips */}
                      {selectedTeacherIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedTeacherIds.map(tid => {
                            const t = teachers.find((t: any) => t.id === tid)
                            return t ? (
                              <span key={tid} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full">
                                {t.name}
                                <button
                                  type="button"
                                  onClick={() => toggleTeacherSelection(tid)}
                                  className="hover:text-red-500 transition-colors ml-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>

                    {/* Hours */}
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

                  {/* Multi-teacher info note */}
                  {selectedTeacherIds.length > 1 && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <Users className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>Sesión multi-docente:</strong> Los {selectedTeacherIds.length} docentes seleccionados serán agendados juntos en el mismo bloque horario (ideal para Comités, Reuniones de área, etc.)
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-5">
                    <button onClick={resetCurriculumForm} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleSaveCurriculum} disabled={!selectedSubId || hoursPerWeek < 1 || loadingCurriculum} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                      {loadingCurriculum ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingSubjectCurriculum ? 'Actualizar Malla' : 'Añadir a Malla'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CURRICULUM TABLE */}
            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col shadow-sm">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 font-bold text-xs text-slate-500 uppercase tracking-wider">
                <div className="col-span-4">Materia</div>
                <div className="col-span-5">Docentes</div>
                <div className="col-span-2 text-center">Hrs/Semana</div>
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
                      <div key={c.subjectId} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Subject */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.subjectColor }} />
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{c.subjectName}</span>
                        </div>

                        {/* Teachers */}
                        <div className="col-span-5">
                          {c.teachers.length === 0 ? (
                            <span className="italic text-slate-400 text-sm">Por Definir</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {c.teachers.map(t => (
                                <span key={t.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-full">
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                    {t.name.charAt(0).toUpperCase()}
                                  </div>
                                  {t.name}
                                </span>
                              ))}
                              {c.teachers.length > 1 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800">
                                  <Users className="h-3 w-3" />
                                  Multi-docente
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Hours */}
                        <div className="col-span-2 text-center">
                          <span className="inline-block px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-xs rounded-md">
                            {c.hoursPerWeek} hrs
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex justify-center gap-1">
                          <button onClick={() => handleEditCurriculum(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteCurriculum(c)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer totals */}
              <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-600 dark:text-slate-400">Total Horas Asignadas:</span>
                <span className={`font-black text-lg ${totalHours > 35 ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {totalHours} / 35
                </span>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: MULTI-TEACHER (SIN GRUPO) --- */}
        {activeTab === 'multiteacher' && (
          <div className="p-6 flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-900/30">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                    Materias Multi-Docente & Actividades Institucionales (Sin Grupo)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configura reuniones, comités y co-docencias sin asignación de grupo estudiantil.
                  </p>
                </div>
              </div>

              {!isAddingMultiTeacher && (
                <button
                  onClick={() => {
                    resetCurriculumForm()
                    setIsAddingMultiTeacher(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm self-start sm:self-center shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Asignar Materia Multi-Docente
                </button>
              )}
            </div>

            {/* Add / Edit Form */}
            <AnimatePresence>
              {isAddingMultiTeacher && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{ overflow: teacherDropdownOpen ? 'visible' : 'hidden' }}
                  className="bg-white dark:bg-slate-800 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-5 shadow-sm"
                >
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
                    {editingMultiTeacherSubId ? 'Editar Asignación Multi-Docente' : 'Nueva Asignación Multi-Docente (Sin Grupo)'}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Materia / Actividad *</label>
                      <select
                        value={selectedSubId}
                        onChange={e => setSelectedSubId(e.target.value)}
                        disabled={!!editingMultiTeacherSubId}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Seleccione materia...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    {/* Official Workload Toggle */}
                    <div className="flex items-center justify-between p-3 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 rounded-xl">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Tipo de Carga Académica</label>
                        <span className={`text-[11px] font-semibold ${isOfficialWorkload ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {isOfficialWorkload ? '✓ Suma a la Carga Lectiva Oficial' : '⚡ Horas Reunión (Exentas de Carga Oficial)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOfficialWorkload(prev => !prev)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isOfficialWorkload ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isOfficialWorkload ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Multi-teacher dropdown */}
                  <div className="relative mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Docentes Participantes *
                      <span className="ml-1 text-purple-500 font-normal">(seleccione uno o varios)</span>
                    </label>

                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setTeacherDropdownOpen(prev => !prev) }}
                      className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-left min-h-[38px]"
                    >
                      {selectedTeacherIds.length === 0 ? (
                        <span className="text-slate-400 italic">Seleccionar docentes...</span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {selectedTeacherIds.length} docente{selectedTeacherIds.length > 1 ? 's' : ''} seleccionado{selectedTeacherIds.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${teacherDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {teacherDropdownOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute z-50 bottom-full mb-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
                      >
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700 relative bg-slate-50 dark:bg-slate-900/50">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Buscar docente por nombre..."
                              value={teacherSearchTerm}
                              onChange={e => setTeacherSearchTerm(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              autoFocus
                              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                            />
                            {teacherSearchTerm && (
                              <button
                                type="button"
                                onClick={() => setTeacherSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto">
                          {filteredTeachers.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center">
                              {teachers.length === 0 ? 'No hay docentes registrados' : 'No se encontraron docentes'}
                            </div>
                          ) : (
                            filteredTeachers.map((t: any) => {
                              const isSelected = selectedTeacherIds.includes(t.id)
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => toggleTeacherSelection(t.id)}
                                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${isSelected ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                                  </div>
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                    {t.name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                  <span className="truncate">{t.name}</span>
                                </button>
                              )
                            })
                          )}
                        </div>
                        {selectedTeacherIds.length > 0 && (
                          <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <button
                              type="button"
                              onClick={() => setSelectedTeacherIds([])}
                              className="w-full text-xs text-red-500 hover:text-red-600 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium"
                            >
                              Quitar todos ({selectedTeacherIds.length})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Individual Teacher Hours Input */}
                  {selectedTeacherIds.length > 0 && (
                    <div className="mb-4 bg-purple-50/30 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-100 dark:border-purple-800/40">
                      <label className="block text-xs font-bold text-purple-900 dark:text-purple-300 mb-2">
                        Intensidad Horaria Asignada por Docente:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {selectedTeacherIds.map(tid => {
                          const t = teachers.find((t: any) => t.id === tid)
                          if (!t) return null
                          return (
                            <div key={tid} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mr-2" title={t.name}>{t.name}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={teacherHoursMap[tid] || 1}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 1
                                    setTeacherHoursMap(prev => ({ ...prev, [tid]: val }))
                                  }}
                                  className="w-16 px-2 py-1 text-xs font-black text-center bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:border-purple-500 text-purple-700 dark:text-purple-300"
                                />
                                <span className="text-[11px] font-bold text-slate-400">hrs</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-5">
                    <button
                      onClick={() => {
                        resetCurriculumForm()
                        setIsAddingMultiTeacher(false)
                        setEditingMultiTeacherSubId(null)
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveMultiTeacherCurriculum}
                      disabled={!selectedSubId || selectedTeacherIds.length === 0 || loadingMultiTeacher}
                      className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      {loadingMultiTeacher ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingMultiTeacherSubId ? 'Actualizar Asignación' : 'Guardar Asignación Multi-Docente'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Table */}
            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 font-bold text-xs text-slate-500 uppercase tracking-wider">
                <div className="col-span-4">Materia / Actividad Institucional</div>
                <div className="col-span-5">Docentes y Carga Individual</div>
                <div className="col-span-2 text-center">Tipo Carga</div>
                <div className="col-span-1 text-center">Acción</div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingMultiTeacher ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                ) : multiTeacherCurriculum.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                    <Users className="h-12 w-12 mb-3 opacity-20 text-purple-500" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">No hay materias multi-docente sin grupo registradas</p>
                    <p className="text-sm mt-1">Haz clic en "Asignar Materia Multi-Docente" para asociar reuniones de área o comités entre profesores.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {multiTeacherCurriculum.map(c => (
                      <div key={c.subjectId} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.subjectColor }} />
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{c.subjectName}</span>
                        </div>

                        <div className="col-span-5">
                          {c.teachers.length === 0 ? (
                            <span className="italic text-slate-400 text-sm">Sin asignar</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {c.teachers.map(t => (
                                <span key={t.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full border border-purple-100 dark:border-purple-800/40">
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                    {t.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span>{t.name}</span>
                                  <span className="bg-purple-200 dark:bg-purple-800/60 text-purple-900 dark:text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                                    {t.hours}h
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="col-span-2 text-center">
                          {c.isOfficialWorkload ? (
                            <span className="inline-block px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs rounded-full">
                              Carga Oficial
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-xs rounded-full">
                              Horas Reunión
                            </span>
                          )}
                        </div>

                        <div className="col-span-1 flex justify-center gap-1">
                          <button onClick={() => handleEditMultiTeacher(c)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-md transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteMultiTeacher(c)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
            {/* Group selector header */}
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

            {/* Add/Edit form */}
            <AnimatePresence>
              {isAddingCurriculum && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{ overflow: teacherDropdownOpen ? 'visible' : 'hidden' }}
                  className="bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl p-5 shadow-sm"
                >
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
                    {editingSubjectCurriculum ? 'Editar Asignación' : 'Nueva Asignación para este grupo'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Materia *</label>
                      <select
                        value={selectedSubId}
                        onChange={e => setSelectedSubId(e.target.value)}
                        disabled={!!editingSubjectCurriculum}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Seleccione...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    {/* Multi-teacher selector */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Docentes Asignados
                        <span className="ml-1 text-indigo-500 font-normal">(puede ser más de uno)</span>
                      </label>

                      {/* Trigger button */}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setTeacherDropdownOpen(prev => !prev) }}
                        className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-left min-h-[38px]"
                      >
                        {selectedTeacherIds.length === 0 ? (
                          <span className="text-slate-400 italic">Sin asignar (Automático)</span>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {selectedTeacherIds.length} docente{selectedTeacherIds.length > 1 ? 's' : ''} seleccionado{selectedTeacherIds.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${teacherDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown */}
                      {teacherDropdownOpen && (
                        <div
                          onClick={e => e.stopPropagation()}
                          className="absolute z-50 bottom-full mb-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
                        >
                          {/* Search Input Box */}
                          <div className="p-2 border-b border-slate-100 dark:border-slate-700 relative bg-slate-50 dark:bg-slate-900/50">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Buscar docente por nombre..."
                                value={teacherSearchTerm}
                                onChange={e => setTeacherSearchTerm(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                              />
                              {teacherSearchTerm && (
                                <button
                                  type="button"
                                  onClick={() => setTeacherSearchTerm('')}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-48 overflow-y-auto">
                            {filteredTeachers.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">
                                {teachers.length === 0 ? 'No hay docentes registrados' : 'No se encontraron docentes'}
                              </div>
                            ) : (
                              filteredTeachers.map((t: any) => {
                                const isSelected = selectedTeacherIds.includes(t.id)
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => toggleTeacherSelection(t.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                                  >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                      {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                                    </div>
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                      {t.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="truncate">{t.name}</span>
                                  </button>
                                )
                              })
                            )}
                          </div>
                          {selectedTeacherIds.length > 0 && (
                            <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                              <button
                                type="button"
                                onClick={() => setSelectedTeacherIds([])}
                                className="w-full text-xs text-red-500 hover:text-red-600 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium"
                              >
                                Quitar todos ({selectedTeacherIds.length})
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected chips */}
                      {selectedTeacherIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedTeacherIds.map(tid => {
                            const t = teachers.find((t: any) => t.id === tid)
                            return t ? (
                              <span key={tid} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full">
                                {t.name}
                                <button
                                  type="button"
                                  onClick={() => toggleTeacherSelection(tid)}
                                  className="hover:text-red-500 transition-colors ml-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>

                    {/* Hours */}
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

                  {/* Multi-teacher info note */}
                  {selectedTeacherIds.length > 1 && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <Users className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>Sesión multi-docente:</strong> Los {selectedTeacherIds.length} docentes seleccionados serán agendados juntos en el mismo bloque horario (ideal para Comités, Reuniones de área, etc.)
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-5">
                    <button onClick={resetCurriculumForm} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleSaveCurriculum} disabled={!selectedSubId || hoursPerWeek < 1 || loadingCurriculum} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                      {loadingCurriculum ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingSubjectCurriculum ? 'Actualizar Malla' : 'Añadir a Malla'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CURRICULUM TABLE */}
            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col shadow-sm">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 font-bold text-xs text-slate-500 uppercase tracking-wider">
                <div className="col-span-4">Materia</div>
                <div className="col-span-5">Docentes</div>
                <div className="col-span-2 text-center">Hrs/Semana</div>
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
                      <div key={c.subjectId} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Subject */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.subjectColor }} />
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{c.subjectName}</span>
                        </div>

                        {/* Teachers */}
                        <div className="col-span-5">
                          {c.teachers.length === 0 ? (
                            <span className="italic text-slate-400 text-sm">Por Definir</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {c.teachers.map(t => (
                                <span key={t.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-full">
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                    {t.name.charAt(0).toUpperCase()}
                                  </div>
                                  {t.name}
                                </span>
                              ))}
                              {c.teachers.length > 1 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800">
                                  <Users className="h-3 w-3" />
                                  Multi-docente
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Hours */}
                        <div className="col-span-2 text-center">
                          <span className="inline-block px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-xs rounded-md">
                            {c.hoursPerWeek} hrs
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex justify-center gap-1">
                          <button onClick={() => handleEditCurriculum(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteCurriculum(c)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer totals */}
              <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-600 dark:text-slate-400">Total Horas Asignadas:</span>
                <span className={`font-black text-lg ${totalHours > 35 ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {totalHours} / 35
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
