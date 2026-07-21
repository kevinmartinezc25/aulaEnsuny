'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, ToggleLeft, ToggleRight, Save, Info, Loader2, Clock, ChevronDown, ChevronUp, Users, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'
import { getAdminUsers } from '@/modules/admin/application/actions'

// Mapeo entre las llaves del UI y los rule_type en BD
const RULE_MAP: Record<string, string> = {
  preventTeacherConflict: 'TEACHER_OVERLAP',
  preventClassroomConflict: 'CLASSROOM_OVERLAP',
  enforceMaxHours: 'MAX_HOURS_DAY',
  minimizeGaps: 'MAX_GAPS_DAY',
  limitConsecutiveClasses: 'MAX_CONSECUTIVE_CLASSES',
  maxClassesPerDay: 'MAX_SUBJECT_CLASSES_DAY',
  distributeHardSubjects: 'DISTRIBUTE_HARD_SUBJECTS',
  earlyHardSubjects: 'EARLY_HARD_SUBJECTS',
  preferredDays: 'PREFERRED_DAYS',
  evenDistribution: 'EVEN_DISTRIBUTION',
  labRoomPriority: 'LAB_ROOM_PRIORITY',
  groupMovementMinimization: 'HOME_ROOM_PRIORITY',
  lunchBreakEnforcement: 'LUNCH_BREAK_ENFORCEMENT'
}

interface TeacherSubject {
  subjectId: string
  subjectName: string
  color: string
}

interface TeacherAvailability {
  teacherId: string
  teacherName: string
  teacherEmail: string
  subjects: TeacherSubject[]
  startTime: string
  endTime: string
  saving: boolean
  expanded: boolean
}

interface SubjectRule {
  subjectId: string
  subjectName: string
  color: string
  isActive: boolean
  startPeriod: number
  endPeriod: number
  maxHoursPerDay: number
  saving: boolean
  expanded: boolean
}

export default function RulesPage() {
  const [rules, setRules] = useState<Record<string, boolean>>({
    preventTeacherConflict: true,
    preventClassroomConflict: true,
    enforceMaxHours: true,
    minimizeGaps: true,
    maxClassesPerDay: true,
    preferredDays: false,
    distributeHardSubjects: true,
    earlyHardSubjects: true,
    limitConsecutiveClasses: true,
    labRoomPriority: true,
    lunchBreakEnforcement: true,
    groupMovementMinimization: false,
    evenDistribution: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Teacher availability state
  const [teacherAvailabilities, setTeacherAvailabilities] = useState<TeacherAvailability[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)

  // Subject rules state
  const [subjectRules, setSubjectRules] = useState<SubjectRule[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchRules()
    fetchTeacherAvailabilities()
    fetchSubjectRules()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('sch_constraints').select('rule_type, is_active')
    if (data && !error) {
      const newRules = { ...rules }
      for (const row of data) {
        const uiKey = Object.keys(RULE_MAP).find(k => RULE_MAP[k] === row.rule_type)
        if (uiKey) {
          newRules[uiKey] = row.is_active
        }
      }
      setRules(newRules)
    }
    setLoading(false)
  }

  const fetchTeacherAvailabilities = async () => {
    setLoadingTeachers(true)
    try {
      // 1. Get all teachers
      const users = await getAdminUsers()
      const teachers = (users || []).filter((u: any) => u.role === 'teacher')

      // 2. Get curriculum with subjects for each teacher
      const { data: curriculumRows } = await supabase
        .from('sch_curriculum')
        .select('teacher_id, subject:sch_subjects(id, name, color)')

      // 3. Get existing TEACHER_TIME_WINDOW constraints
      const { data: constraints } = await supabase
        .from('sch_constraints')
        .select('target_entity_id, parameters')
        .eq('rule_type', 'TEACHER_TIME_WINDOW')
        .eq('target_entity_type', 'TEACHER')

      const constraintMap = new Map<string, { start_time: string; end_time: string }>()
      if (constraints) {
        constraints.forEach((c: any) => {
          constraintMap.set(c.target_entity_id, {
            start_time: c.parameters?.start_time || '07:00',
            end_time: c.parameters?.end_time || '18:00',
          })
        })
      }

      // 4. Build subject map per teacher
      const subjectMap = new Map<string, TeacherSubject[]>()
      if (curriculumRows) {
        curriculumRows.forEach((row: any) => {
          if (!row.teacher_id || !row.subject) return
          if (!subjectMap.has(row.teacher_id)) {
            subjectMap.set(row.teacher_id, [])
          }
          const list = subjectMap.get(row.teacher_id)!
          // Avoid duplicates
          if (!list.find(s => s.subjectId === row.subject.id)) {
            list.push({
              subjectId: row.subject.id,
              subjectName: row.subject.name,
              color: row.subject.color || '#6366f1',
            })
          }
        })
      }

      // 5. Combine
      const availabilities: TeacherAvailability[] = teachers.map((t: any) => {
        const constraint = constraintMap.get(t.id)
        return {
          teacherId: t.id,
          teacherName: t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email,
          teacherEmail: t.email || '',
          subjects: subjectMap.get(t.id) || [],
          startTime: constraint?.start_time || '07:00',
          endTime: constraint?.end_time || '18:00',
          saving: false,
          expanded: false,
        }
      })

      setTeacherAvailabilities(availabilities)
    } catch (e) {
      console.error('Error loading teacher availabilities:', e)
    }
    setLoadingTeachers(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('sch_constraints').delete().is('target_entity_id', null).neq('rule_type', 'TEACHER_TIME_WINDOW')

      const toInsert = Object.entries(rules).map(([uiKey, isActive]) => ({
        rule_type: RULE_MAP[uiKey],
        target_entity_type: 'GLOBAL',
        target_entity_id: null,
        parameters: {},
        weight: 'HIGH',
        is_active: isActive
      }))

      const { error } = await supabase.from('sch_constraints').insert(toInsert)
      if (error) throw error

      toast.success('Reglas de negocio guardadas correctamente en la base de datos.')
    } catch (e) {
      console.error(e)
      toast.error('Error al guardar las reglas.')
    }
    setSaving(false)
  }

  const toggleRule = (key: string) => {
    setRules(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateTeacherTime = (teacherId: string, field: 'startTime' | 'endTime', value: string) => {
    setTeacherAvailabilities(prev =>
      prev.map(t => t.teacherId === teacherId ? { ...t, [field]: value } : t)
    )
  }

  const toggleTeacherExpanded = (teacherId: string) => {
    setTeacherAvailabilities(prev =>
      prev.map(t => t.teacherId === teacherId ? { ...t, expanded: !t.expanded } : t)
    )
  }

  const handleSaveTeacherAvailability = async (teacher: TeacherAvailability) => {
    setTeacherAvailabilities(prev =>
      prev.map(t => t.teacherId === teacher.teacherId ? { ...t, saving: true } : t)
    )
    try {
      // Upsert: delete existing for this teacher then insert
      await supabase
        .from('sch_constraints')
        .delete()
        .eq('rule_type', 'TEACHER_TIME_WINDOW')
        .eq('target_entity_type', 'TEACHER')
        .eq('target_entity_id', teacher.teacherId)

      const { error } = await supabase.from('sch_constraints').insert({
        rule_type: 'TEACHER_TIME_WINDOW',
        target_entity_type: 'TEACHER',
        target_entity_id: teacher.teacherId,
        parameters: {
          start_time: teacher.startTime,
          end_time: teacher.endTime,
        },
        weight: 'HIGH',
        is_active: true,
      })
      if (error) throw error
      toast.success(`Disponibilidad de ${teacher.teacherName} guardada.`)
    } catch (e) {
      console.error(e)
      toast.error('Error al guardar la disponibilidad.')
    }
    setTeacherAvailabilities(prev =>
      prev.map(t => t.teacherId === teacher.teacherId ? { ...t, saving: false } : t)
    )
  }

  const fetchSubjectRules = async () => {
    setLoadingSubjects(true)
    try {
      const { data: subjectsData, error: subjErr } = await supabase
        .from('sch_subjects')
        .select('id, name, color')
        .order('name')
      if (subjErr) throw subjErr

      const { data: constraints, error: constErr } = await supabase
        .from('sch_constraints')
        .select('target_entity_id, parameters, is_active')
        .eq('rule_type', 'SUBJECT_RULES')
        .eq('target_entity_type', 'SUBJECT')
      if (constErr) throw constErr

      const constraintMap = new Map<string, any>()
      if (constraints) {
        constraints.forEach((c: any) => {
          constraintMap.set(c.target_entity_id, c)
        })
      }

      const list: SubjectRule[] = (subjectsData || []).map((s: any) => {
        const c = constraintMap.get(s.id)
        return {
          subjectId: s.id,
          subjectName: s.name,
          color: s.color || '#6366f1',
          isActive: c ? c.is_active : false,
          startPeriod: c?.parameters?.start_period || 1,
          endPeriod: c?.parameters?.end_period || 7,
          maxHoursPerDay: c?.parameters?.max_hours_per_day || 2,
          saving: false,
          expanded: false
        }
      })
      setSubjectRules(list)
    } catch (e) {
      console.error('Error loading subject rules:', e)
    }
    setLoadingSubjects(false)
  }

  const handleSaveSubjectRule = async (subj: SubjectRule) => {
    setSubjectRules(prev =>
      prev.map(s => s.subjectId === subj.subjectId ? { ...s, saving: true } : s)
    )
    try {
      // Delete existing rule if any
      await supabase
        .from('sch_constraints')
        .delete()
        .eq('rule_type', 'SUBJECT_RULES')
        .eq('target_entity_type', 'SUBJECT')
        .eq('target_entity_id', subj.subjectId)

      // Insert new rule if active
      if (subj.isActive) {
        const { error } = await supabase.from('sch_constraints').insert({
          rule_type: 'SUBJECT_RULES',
          target_entity_type: 'SUBJECT',
          target_entity_id: subj.subjectId,
          parameters: {
            start_period: subj.startPeriod,
            end_period: subj.endPeriod,
            max_hours_per_day: subj.maxHoursPerDay,
          },
          weight: 'STRICT',
          is_active: true,
        })
        if (error) throw error
      }
      toast.success(`Reglas de ${subj.subjectName} guardadas correctamente.`)
    } catch (e) {
      console.error(e)
      toast.error('Error al guardar las reglas de la materia.')
    }
    setSubjectRules(prev =>
      prev.map(s => s.subjectId === subj.subjectId ? { ...s, saving: false } : s)
    )
  }

  const toggleSubjectActive = (subjectId: string) => {
    setSubjectRules(prev =>
      prev.map(s => s.subjectId === subjectId ? { ...s, isActive: !s.isActive } : s)
    )
  }

  const toggleSubjectExpanded = (subjectId: string) => {
    setSubjectRules(prev =>
      prev.map(s => s.subjectId === subjectId ? { ...s, expanded: !s.expanded } : s)
    )
  }

  const updateSubjectRuleField = (subjectId: string, field: 'startPeriod' | 'endPeriod' | 'maxHoursPerDay', value: number) => {
    setSubjectRules(prev =>
      prev.map(s => s.subjectId === subjectId ? { ...s, [field]: value } : s)
    )
  }

  if (loading) {
    return (
      <div className="p-8 h-full flex justify-center items-center">
        <Loader2 className="animate-spin text-indigo-500 h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* === CARD: REGLAS DE NEGOCIO === */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-indigo-500" />
                Reglas de Negocio
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Configura las restricciones lógicas que utilizará el motor de Autogeneración de horarios.
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
              Guardar Cambios
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">

            <section className="space-y-4">
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Conflictos Duros</h3>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Choque de Docente</p>
                  <p className="text-xs text-slate-500 mt-1">Evita que un docente sea asignado a dos clases simultáneamente.</p>
                </div>
                <button onClick={() => toggleRule('preventTeacherConflict')} className={`transition-colors ${rules.preventTeacherConflict ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.preventTeacherConflict ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Choque de Aula</p>
                  <p className="text-xs text-slate-500 mt-1">Garantiza que un salón físico no tenga dos grupos distintos al mismo tiempo.</p>
                </div>
                <button onClick={() => toggleRule('preventClassroomConflict')} className={`transition-colors ${rules.preventClassroomConflict ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.preventClassroomConflict ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Carga Horaria y Pedagógica</h3>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Respetar Máximo de Horas</p>
                  <p className="text-xs text-slate-500 mt-1">El motor no agendará más horas de las estipuladas en el contrato de cada docente.</p>
                </div>
                <button onClick={() => toggleRule('enforceMaxHours')} className={`transition-colors ${rules.enforceMaxHours ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.enforceMaxHours ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Límite de Clases Consecutivas</p>
                  <p className="text-xs text-slate-500 mt-1">Evita agendar a un docente más de 4 bloques seguidos sin descanso.</p>
                </div>
                <button onClick={() => toggleRule('limitConsecutiveClasses')} className={`transition-colors ${rules.limitConsecutiveClasses ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.limitConsecutiveClasses ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Máximo de clases por día</p>
                  <p className="text-xs text-slate-500 mt-1">Evita que una misma materia se dicte excesivamente en un solo día.</p>
                </div>
                <button onClick={() => toggleRule('maxClassesPerDay')} className={`transition-colors ${rules.maxClassesPerDay ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.maxClassesPerDay ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Distribuir Materias Pesadas</p>
                  <p className="text-xs text-slate-500 mt-1">Evita programar materias como Matemáticas y Física en bloques consecutivos.</p>
                </div>
                <button onClick={() => toggleRule('distributeHardSubjects')} className={`transition-colors ${rules.distributeHardSubjects ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.distributeHardSubjects ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Materias Pesadas Temprano</p>
                  <p className="text-xs text-slate-500 mt-1">Prioriza agendar materias troncales en las primeras horas de la mañana.</p>
                </div>
                <button onClick={() => toggleRule('earlyHardSubjects')} className={`transition-colors ${rules.earlyHardSubjects ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.earlyHardSubjects ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex gap-3 items-start">
                <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">
                  Estas reglas son <strong>estrictas</strong> para el algoritmo de Autogeneración. Si desactivas alguna, el generador priorizará rellenar los horarios aunque se generen conflictos reales, marcándolos en rojo en el lienzo para revisión manual.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Calidad del Horario (Soft Rules)</h3>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Minimizar Ventanas (Huecos)</p>
                  <p className="text-xs text-slate-500 mt-1">Evita que los docentes tengan bloques libres improductivos entre clases.</p>
                </div>
                <button onClick={() => toggleRule('minimizeGaps')} className={`transition-colors ${rules.minimizeGaps ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.minimizeGaps ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Garantizar Hora de Almuerzo</p>
                  <p className="text-xs text-slate-500 mt-1">Asegura que todos los docentes tengan al menos un bloque libre al mediodía.</p>
                </div>
                <button onClick={() => toggleRule('lunchBreakEnforcement')} className={`transition-colors ${rules.lunchBreakEnforcement ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.lunchBreakEnforcement ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Respetar Días Preferidos</p>
                  <p className="text-xs text-slate-500 mt-1">Intenta agrupar las horas en los días de preferencia del docente (Part-time).</p>
                </div>
                <button onClick={() => toggleRule('preferredDays')} className={`transition-colors ${rules.preferredDays ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.preferredDays ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Distribución Equitativa</p>
                  <p className="text-xs text-slate-500 mt-1">Distribuye las horas de una materia a lo largo de la semana en lugar de agruparlas.</p>
                </div>
                <button onClick={() => toggleRule('evenDistribution')} className={`transition-colors ${rules.evenDistribution ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.evenDistribution ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Infraestructura y Aulas</h3>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Prioridad de Aulas Especiales (Labs)</p>
                  <p className="text-xs text-slate-500 mt-1">Fuerza que materias como Química se asignen únicamente a Laboratorios.</p>
                </div>
                <button onClick={() => toggleRule('labRoomPriority')} className={`transition-colors ${rules.labRoomPriority ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.labRoomPriority ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Minimizar Movimiento de Grupos</p>
                  <p className="text-xs text-slate-500 mt-1">Mantiene a los alumnos en su "Aula Base" y hace que los docentes sean los que roten.</p>
                </div>
                <button onClick={() => toggleRule('groupMovementMinimization')} className={`transition-colors ${rules.groupMovementMinimization ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`}>
                  {rules.groupMovementMinimization ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                </button>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Save className="h-4 w-4" /> Guardar Reglas
            </button>
          </div>
        </div>

        {/* === CARD: DISPONIBILIDAD DE DOCENTES === */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <Clock className="h-6 w-6 text-emerald-500" />
              Disponibilidad de Docentes
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Define la ventana horaria global en la que cada docente puede ser agendado. El motor no asignará clases fuera de ese rango.
            </p>
          </div>

          <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
            {loadingTeachers ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-indigo-400 h-7 w-7" />
              </div>
            ) : teacherAvailabilities.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay docentes registrados aún.</p>
              </div>
            ) : (
              teacherAvailabilities.map(teacher => (
                <div
                  key={teacher.teacherId}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all"
                >
                  {/* Row Header — always visible */}
                  <div
                    className="flex items-center justify-between p-4 bg-slate-50/60 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => toggleTeacherExpanded(teacher.teacherId)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {teacher.teacherName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{teacher.teacherName}</p>
                        {/* Subject chips */}
                        {teacher.subjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {teacher.subjects.map(s => (
                              <span
                                key={s.subjectId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                                style={{ backgroundColor: s.color }}
                              >
                                <BookOpen className="h-2.5 w-2.5" />
                                {s.subjectName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-0.5 italic">Sin materias asignadas</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {/* Time preview (collapsed) */}
                      {!teacher.expanded && (
                        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                          <Clock className="h-3.5 w-3.5 text-emerald-500" />
                          {teacher.startTime} – {teacher.endTime}
                        </div>
                      )}
                      {teacher.expanded
                        ? <ChevronUp className="h-4 w-4 text-slate-400" />
                        : <ChevronDown className="h-4 w-4 text-slate-400" />
                      }
                    </div>
                  </div>

                  {/* Expanded Panel */}
                  {teacher.expanded && (
                    <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                        Ventana Horaria Global (Lunes a Viernes)
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                            Hora mínima de inicio
                          </label>
                          <input
                            type="time"
                            value={teacher.startTime}
                            onChange={e => updateTeacherTime(teacher.teacherId, 'startTime', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                            Hora máxima de fin
                          </label>
                          <input
                            type="time"
                            value={teacher.endTime}
                            onChange={e => updateTeacherTime(teacher.teacherId, 'endTime', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                          />
                        </div>
                        <button
                          onClick={() => handleSaveTeacherAvailability(teacher)}
                          disabled={teacher.saving}
                          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-emerald-500/20 whitespace-nowrap"
                        >
                          {teacher.saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                          Guardar
                        </button>
                      </div>

                      {/* Visual time bar */}
                      <div className="mt-5">
                        <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          {(() => {
                            const toMinutes = (t: string) => {
                              const [h, m] = t.split(':').map(Number)
                              return h * 60 + m
                            }
                            const dayStart = 6 * 60  // 06:00
                            const dayEnd = 22 * 60   // 22:00
                            const totalDay = dayEnd - dayStart
                            const startMin = Math.max(toMinutes(teacher.startTime), dayStart)
                            const endMin = Math.min(toMinutes(teacher.endTime), dayEnd)
                            const leftPct = ((startMin - dayStart) / totalDay) * 100
                            const widthPct = ((endMin - startMin) / totalDay) * 100
                            return (
                              <div
                                className="absolute h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-300"
                                style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0)}%` }}
                              />
                            )
                          })()}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                          <span>06:00</span>
                          <span>10:00</span>
                          <span>14:00</span>
                          <span>18:00</span>
                          <span>22:00</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* === CARD: RESTRICCIONES DE MATERIAS === */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-indigo-500" />
              Restricciones y Horarios de Materias
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Define los periodos específicos de la jornada en los que debe dictarse cada materia (ej. para comisiones/comités) y sus límites de horas diarias.
            </p>
          </div>

          <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
            {loadingSubjects ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-indigo-400 h-7 w-7" />
              </div>
            ) : subjectRules.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay materias registradas aún.</p>
              </div>
            ) : (
              subjectRules.map(subj => (
                <div
                  key={subj.subjectId}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all"
                >
                  {/* Row Header — always visible */}
                  <div
                    className="flex items-center justify-between p-4 bg-slate-50/60 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => toggleSubjectExpanded(subj.subjectId)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Color Dot/Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: subj.color }}
                      >
                        {subj.subjectName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{subj.subjectName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${subj.isActive ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {subj.isActive ? 'Restricción Activa' : 'Sin Restricción'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {/* Preview when collapsed */}
                      {!subj.expanded && subj.isActive && (
                        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                          <span>P{subj.startPeriod} – P{subj.endPeriod}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Máx: {subj.maxHoursPerDay}h/día</span>
                        </div>
                      )}
                      {subj.expanded
                        ? <ChevronUp className="h-4 w-4 text-slate-400" />
                        : <ChevronDown className="h-4 w-4 text-slate-400" />
                      }
                    </div>
                  </div>

                  {/* Expanded Panel */}
                  {subj.expanded && (
                    <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Configuración de Restricciones
                        </span>
                        <button
                          onClick={() => toggleSubjectActive(subj.subjectId)}
                          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${subj.isActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-850 dark:text-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                        >
                          {subj.isActive ? <ToggleRight className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                          {subj.isActive ? 'Habilitado' : 'Deshabilitado'}
                        </button>
                      </div>

                      {subj.isActive && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                              Periodo Inicial Permitido
                            </label>
                            <select
                              value={subj.startPeriod}
                              onChange={e => updateSubjectRuleField(subj.subjectId, 'startPeriod', parseInt(e.target.value))}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                                <option key={p} value={p}>Periodo {p}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                              Periodo Final Permitido
                            </label>
                            <select
                              value={subj.endPeriod}
                              onChange={e => updateSubjectRuleField(subj.subjectId, 'endPeriod', parseInt(e.target.value))}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                                <option key={p} value={p}>Periodo {p}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                              Horas Límites por Día
                            </label>
                            <select
                              value={subj.maxHoursPerDay}
                              onChange={e => updateSubjectRuleField(subj.subjectId, 'maxHoursPerDay', parseInt(e.target.value))}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                            >
                              {[1, 2, 3, 4, 5, 6].map(h => (
                                <option key={h} value={h}>{h} {h === 1 ? 'hora' : 'horas'}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleSaveSubjectRule(subj)}
                          disabled={subj.saving}
                          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-indigo-500/20 whitespace-nowrap"
                        >
                          {subj.saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                          Guardar Reglas
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
