'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Briefcase, BookOpen, Users, Clock, HelpCircle, CheckCircle2 } from 'lucide-react'
import { CurriculumBlock } from '../engine/Generator'
import { TimeSlot } from '../utils/timeCalculator'
import { isMeetingSubject } from '../utils/groupFilters'

interface UnassignedBlocksModalProps {
  isOpen: boolean
  onClose: () => void
  unassignedBlocks: CurriculumBlock[]
  timeSlots?: TimeSlot[]
  currentSlots?: any[]
  onAssign?: (blockOrBlocks: CurriculumBlock | CurriculumBlock[], day: string, period: number) => Promise<void>
}

interface GroupedBlock {
  key: string
  isMeeting: boolean
  subject_id: string
  subject_name?: string
  group_id: string
  group_name?: string
  duration: number
  slotIndex?: number
  teachers: Array<{ id?: string; name?: string }>
  blocks: CurriculumBlock[]
  reason?: string
}

export default function UnassignedBlocksModal({
  isOpen,
  onClose,
  unassignedBlocks,
  timeSlots,
  currentSlots,
  onAssign
}: UnassignedBlocksModalProps) {
  const [assigningKey, setAssigningKey] = React.useState<string | null>(null)
  const [selectedDay, setSelectedDay] = React.useState<string>('Lunes')
  const [selectedPeriod, setSelectedPeriod] = React.useState<number>(1)
  const [isSaving, setIsSaving] = React.useState(false)

  // Agrupar bloques de reunión multi-docente para tratamiento coordinado
  const groupedBlocks = React.useMemo(() => {
    const map = new Map<string, GroupedBlock>()

    unassignedBlocks.forEach((b, idx) => {
      const isMeeting = isMeetingSubject(b.subject_name, b.group_name, b.group_id, b.is_academic_workload)
      const key = isMeeting
        ? `${b.group_id}-${b.subject_id}-slot${b.slotIndex ?? 0}`
        : `${b.group_id}-${b.subject_id}-${b.teacher_id || 'no-teacher'}-slot${b.slotIndex ?? idx}-${idx}`

      if (!map.has(key)) {
        map.set(key, {
          key,
          isMeeting,
          subject_id: b.subject_id,
          subject_name: b.subject_name,
          group_id: b.group_id,
          group_name: b.group_name,
          duration: b.duration || 1,
          slotIndex: b.slotIndex,
          teachers: [],
          blocks: [],
          reason: b.reason
        })
      }

      const item = map.get(key)!
      item.blocks.push(b)
      if (b.teacher_id && !item.teachers.some(t => t.id === b.teacher_id)) {
        item.teachers.push({ id: b.teacher_id, name: b.teacher_name })
      }
      if (b.duration > item.duration) {
        item.duration = b.duration
      }
    })

    return Array.from(map.values())
  }, [unassignedBlocks])

  const handleAssignGroup = async (item: GroupedBlock) => {
    if (!onAssign) return
    setIsSaving(true)
    try {
      await onAssign(item.blocks, selectedDay, selectedPeriod)
      setAssigningKey(null)
    } finally {
      setIsSaving(false)
    }
  }

  const getSuggestionText = (day: string, period: number, item: GroupedBlock) => {
    if (!currentSlots) return ''
    
    // Si es un grupo oficial de estudiantes, verificar si el grupo está ocupado con otra materia
    const groupSlots = currentSlots.filter(s => s.group_id === item.group_id && s.day_of_week === day && s.period_id === period)
    const isGroupBusyWithOtherSubject = groupSlots.length > 0 && groupSlots.some(s => s.subject_id !== item.subject_id)

    // Evaluar ocupación de todos los docentes convocados
    const busyTeachers: string[] = []
    for (const t of item.teachers) {
      if (!t.id) continue
      const isBusy = currentSlots.some(s => s.teacher_id === t.id && s.day_of_week === day && s.period_id === period)
      if (isBusy) {
        busyTeachers.push(t.name || t.id.substring(0, 8))
      }
    }

    if (item.teachers.length > 1) {
      if (busyTeachers.length === 0) return `✅ Todos los ${item.teachers.length} docentes libres`
      if (busyTeachers.length === item.teachers.length) return '❌ Todos los docentes ocupados'
      return `⚠️ Ocupado(s): ${busyTeachers.slice(0, 2).join(', ')}${busyTeachers.length > 2 ? ` (+${busyTeachers.length - 2})` : ''}`
    }

    // Docente individual
    const teacherBusy = busyTeachers.length > 0
    if (isGroupBusyWithOtherSubject && teacherBusy) return '❌ Grupo y Docente ocupados'
    if (isGroupBusyWithOtherSubject) return '⚠️ Grupo ocupado'
    if (teacherBusy) return '⚠️ Docente ocupado'
    return '✅ Libre'
  }

  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 z-50 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  Analizador de Conflictos y Bloques No Asignados
                  <span className="px-2.5 py-0.5 text-xs font-black bg-amber-500 text-white rounded-full">
                    {unassignedBlocks.length} horas ({groupedBlocks.length} espacios)
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Las materias multi-docente y reuniones se agrupan automáticamente para sincronizar a todos los profesores en la misma franja.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
            {groupedBlocks.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Materia / Actividad</th>
                      <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Grupo</th>
                      <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Docentes Convocados</th>
                      <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center">Duración</th>
                      <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Diagnóstico del Conflicto</th>
                      {onAssign && (
                        <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center min-w-[170px]">Acción Sincrónica</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {groupedBlocks.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3.5 py-3 font-medium text-slate-800 dark:text-slate-200">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span>{item.subject_name || item.subject_id}</span>
                            </div>
                            {item.isMeeting && (
                              <span className="inline-flex items-center gap-1 w-fit px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                                👥 Horas Reunión
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{item.group_name || item.group_id}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">
                          {item.teachers.length > 1 ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 shrink-0" />
                                {item.teachers.length} Docentes en sincronía
                              </span>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {item.teachers.map((t, tIdx) => (
                                  <span key={tIdx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-medium rounded text-slate-700 dark:text-slate-300">
                                    {t.name || t.id?.substring(0, 8)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{item.teachers[0]?.name || item.teachers[0]?.id?.substring(0, 8) || 'Sin asignar'}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center align-middle">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold text-[11px]">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {item.duration} h
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-amber-700 dark:text-amber-400 font-medium">
                          <div className="flex items-start gap-1.5 bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                            <HelpCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-[11px] leading-tight">
                              {item.teachers.length > 1
                                ? `Reunión de ${item.teachers.length} docentes: Ninguna franja semanal libre coincidió simultáneamente para todo el equipo.`
                                : (item.reason || 'Cruces de horario con la disponibilidad o carga del docente.')}
                            </span>
                          </div>
                        </td>
                        {onAssign && (
                          <td className="px-3.5 py-3 align-middle text-center">
                            {assigningKey === item.key ? (
                              <div className="flex flex-col gap-1.5 items-center bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <select 
                                  value={selectedDay}
                                  onChange={(e) => setSelectedDay(e.target.value)}
                                  className="w-full text-xs p-1.5 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 font-medium"
                                >
                                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select
                                  value={selectedPeriod}
                                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                                  className="w-full text-xs p-1.5 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 font-medium"
                                >
                                  {timeSlots?.filter(s => s.type === 'period').map(s => {
                                    const suggestion = getSuggestionText(selectedDay, Number(s.id), item)
                                    return (
                                      <option key={s.id} value={s.id}>
                                        {s.id}ª {suggestion ? `- ${suggestion}` : ''}
                                      </option>
                                    )
                                  })}
                                </select>
                                <div className="flex gap-1.5 w-full mt-1">
                                  <button
                                    onClick={() => handleAssignGroup(item)}
                                    disabled={isSaving}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-1.5 rounded-lg disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {item.teachers.length > 1 ? 'Guardar Todos' : 'Guardar'}
                                  </button>
                                  <button
                                    onClick={() => setAssigningKey(null)}
                                    disabled={isSaving}
                                    className="px-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-bold py-1.5 rounded-lg"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setAssigningKey(item.key)
                                  setSelectedDay('Lunes')
                                  setSelectedPeriod(1)
                                }}
                                className={`font-bold text-[11px] px-3.5 py-1.5 rounded-lg border transition-colors flex items-center justify-center gap-1.5 mx-auto ${
                                  item.teachers.length > 1
                                    ? 'bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                    : 'bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                                }`}
                              >
                                {item.teachers.length > 1 ? (
                                  <>
                                    <Users className="h-3.5 w-3.5" />
                                    Sincronizar Todos
                                  </>
                                ) : (
                                  'Forzar / Asignar'
                                )}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">¡No hay bloques sin asignar!</p>
                <p className="text-xs text-slate-400 mt-1">Todos los docentes y materias coinciden en sus horarios sin conflictos.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Cerrar Analizador
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
