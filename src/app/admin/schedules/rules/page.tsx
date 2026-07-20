'use client'

import React, { useState, useEffect } from 'react'
import { ShieldCheck, ToggleLeft, ToggleRight, Save, Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'

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
  const supabase = createClient()

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('sch_constraints').select('rule_type, is_active')
    if (data && !error) {
      const newRules = { ...rules }
      // Iterar sobre data y actualizar state
      for (const row of data) {
        // Encontrar la key de UI que corresponde a este rule_type
        const uiKey = Object.keys(RULE_MAP).find(k => RULE_MAP[k] === row.rule_type)
        if (uiKey) {
          newRules[uiKey] = row.is_active
        }
      }
      setRules(newRules)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Eliminar todas las configuraciones globales actuales para recrearlas
      await supabase.from('sch_constraints').delete().is('target_entity_id', null)

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

  if (loading) {
    return (
      <div className="p-8 h-full flex justify-center items-center">
        <Loader2 className="animate-spin text-indigo-500 h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
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
    </div>
  )
}
