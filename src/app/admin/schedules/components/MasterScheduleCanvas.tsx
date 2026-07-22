'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/core/config/supabase/client'
import { getAdminUsers } from '@/modules/admin/application/actions'
import { generateTimeSlots, TimeSlot } from '../utils/timeCalculator'
import { Loader2, Download, Printer, Sparkles, Trash2, AlertTriangle, Coffee } from 'lucide-react'
import { toast } from 'sonner'
import { ScheduleGenerator, GeneratorConfig } from '../engine/Generator'
import { RuleContext } from '../engine/types'
import UnassignedBlocksModal from './UnassignedBlocksModal'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

interface MasterScheduleCanvasProps {
  viewMode?: 'group' | 'teacher'
}

export default function MasterScheduleCanvas({ viewMode = 'group' }: MasterScheduleCanvasProps) {
  const [loading, setLoading] = useState(true)
  const [showUnassignedModal, setShowUnassignedModal] = useState(false)

  const [groups, setGroups] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [subjects, setSubjects] = useState<Record<string, any>>({})
  const [teachers, setTeachers] = useState<Record<string, any>>({})
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  
  // Progress UI State
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchGlobalData()
    loadSettings()
    setPortalNode(document.getElementById('canvas-actions-portal'))
  }, [])

  const loadSettings = () => {
    try {
      const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
      const startHour = settings.startHour || '07:00'
      const blockDuration = parseInt(settings.blockDuration || '55', 10)
      const periodsPerDay = parseInt(settings.periodsPerDay || '7', 10)
      const use12h = settings.timeFormat !== '24h'
      let breaks = settings.breaks
      
      if (!breaks && settings.breakPeriod) {
        breaks = [{ id: '1', name: 'Recreo', afterPeriod: parseInt(settings.breakPeriod, 10), durationMinutes: 30 }]
      } else if (!breaks) {
        breaks = []
      }

      setTimeSlots(generateTimeSlots(startHour, blockDuration, periodsPerDay, breaks, use12h))
    } catch(e) {
      console.error(e)
    }
  }

  const fetchGlobalData = async () => {
    setLoading(true)
    try {
      const [gData, slData, subData, oldTData, adminUsers] = await Promise.all([
        supabase.from('sch_groups').select('id, name'),
        supabase.from('sch_schedule_slots').select('*'),
        supabase.from('sch_subjects').select('id, name, color'),
        supabase.from('sch_teachers').select('id, name, alias'),
        getAdminUsers()
      ])

      if (gData.data) {
        setGroups(gData.data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })))
      }
      if (slData.data) setSlots(slData.data)
      
      const subMap: Record<string, any> = {}
      subData.data?.forEach(s => { subMap[s.id] = s })
      setSubjects(subMap)

      const tMap: Record<string, any> = {}
      oldTData.data?.forEach(t => {
        tMap[t.id] = { id: t.id, name: t.alias || t.name }
      })
      
      const teacherRoles = ['teacher']
      const teacherUsers = (adminUsers || []).filter(u => teacherRoles.includes(u.role))
      
      teacherUsers.forEach(t => {
        tMap[t.id] = { id: t.id, name: t.name }
      })
      
      // Filtrar a los docentes que tienen al menos un slot asignado o que vinieron explícitamente en las listas
      setTeachers(tMap)
    } catch (e) {
      toast.error('Error cargando el horario general')
    }
    setLoading(false)
  }

  // Encontrar el slot para una entidad, día y periodo
  const getSlot = (entityId: string, day: string, period: number) => {
    return slots.find(s => (viewMode === 'group' ? s.group_id === entityId : s.teacher_id === entityId) && s.day_of_week === day && s.period_id === period)
  }

  // Lista de entidades a iterar según el modo
  const entities = viewMode === 'group' 
    ? groups 
    : Object.values(teachers).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  const handleExportCSV = () => {
    let maxPeriods = 7;
    try {
      const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
      maxPeriods = parseInt(settings.periodsPerDay || '7', 10)
    } catch(e){}
    const PERIODS = Array.from({length: maxPeriods}, (_, i) => i + 1)

    // Generar CSV simple
    let csvContent = `data:text/csv;charset=utf-8,${viewMode === 'group' ? 'Grupo' : 'Docente'},`
    DAYS.forEach(day => {
      PERIODS.forEach(p => {
        csvContent += `${day} - ${p},`
      })
    })
    csvContent += "\n"

    entities.forEach(entity => {
      csvContent += `${entity.name},`
      DAYS.forEach(day => {
        PERIODS.forEach(p => {
          const slot = getSlot(entity.id, day, p)
          if (slot) {
            const sub = subjects[slot.subject_id]?.name || '?'
            const secondaryText = viewMode === 'group' 
              ? (teachers[slot.teacher_id]?.name || '')
              : (groups.find(g => g.id === slot.group_id)?.name || '')
            csvContent += `"${sub} ${secondaryText ? '('+secondaryText+')' : ''}",`
          } else {
            csvContent += `"--",`
          }
        })
      })
      csvContent += "\n"
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Master_Schedule_${new Date().getFullYear()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Archivo CSV exportado')
  }

  const executeClearGlobalSchedule = async () => {
    setLoading(true)
    const { error } = await supabase.from('sch_schedule_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000') 
    if (!error) {
      toast.success('El horario global ha sido vaciado.')
      fetchGlobalData()
    } else {
      toast.error('Error al limpiar el horario global.')
    }
    setLoading(false)
  }

  const clearGlobalSchedule = () => {
    toast('🚨 ¡Peligro! ¿Estás absolutamente seguro de eliminar TODOS los horarios en la institución?', {
      action: {
        label: 'Sí, eliminar',
        onClick: executeClearGlobalSchedule
      }
    })
  }

  const [unassignedBlocks, setUnassignedBlocks] = useState<any[]>([])

  const analyzeConflicts = async () => {
    if (unassignedBlocks.length > 0) {
      setShowUnassignedModal(true)
      return
    }

    const { data: currentSlots } = await supabase
      .from('sch_schedule_slots')
      .select('*, group:sch_groups(name), teacher:profiles(first_name, last_name), subject:sch_subjects(name)')

    if (currentSlots && currentSlots.length > 0) {
      const teacherSlotsMap = new Map<string, any[]>()
      currentSlots.forEach((s: any) => {
        if (!s.teacher_id) return
        const key = `${s.teacher_id}-${s.day_of_week}-${s.period_id}`
        if (!teacherSlotsMap.has(key)) teacherSlotsMap.set(key, [])
        teacherSlotsMap.get(key)!.push(s)
      })

      const conflicts = Array.from(teacherSlotsMap.entries()).filter(([_, list]) => list.length > 1)

      if (conflicts.length > 0) {
        toast.error(`Se detectaron ${conflicts.length} cruces de docente en los horarios guardados.`)
        return
      }
    }

    toast.success('Análisis global completado: Todos los bloques agendados están libres de cruces.')
  }



  const executeAutoGenerateGlobal = async () => {
    setGenerating(true)
    setProgress(0)
    setProgressMsg('Preparando motor de reglas...')
    
    // 1. Obtener mallas de todos los grupos
    const { data: currData } = await supabase.from('sch_curriculum').select('*')
    if (!currData || currData.length === 0) {
      toast.error('No hay mallas curriculares configuradas.')
      setGenerating(false)
      return
    }

    // 2. Obtener contexto (Reglas y Disponibilidad)
    const { data: constraintsData } = await supabase.from('sch_constraints').select('*')
    const { data: timeOffData } = await supabase.from('sch_time_off').select('*')
    
    const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
    let breaks = settings.breaks
    if (!breaks && settings.breakPeriod) {
      breaks = [{ id: '1', name: 'Recreo', afterPeriod: parseInt(settings.breakPeriod, 10), durationMinutes: 30 }]
    } else if (!breaks) {
      breaks = []
    }
    const breakPeriods = breaks.map((b: any) => b.afterPeriod)
    
    // Asumimos un máximo de 10 periodos si no se puede determinar
    const maxPeriodsPerDay = parseInt(settings.periodsPerDay || '7', 10)
    const blockSubjects = JSON.parse(localStorage.getItem('sch_block_subjects') || '[]')
    
    // Identificar materias multi-docente por grupo o por regla explícita
    const groupSubjectTeachers = new Map<string, Set<string>>()
    const multiTeacherSubjSet = new Set<string>()

    if (currData) {
      currData.forEach((row: any) => {
        if (!row.group_id || !row.subject_id || !row.teacher_id) return
        const key = `${row.group_id}-${row.subject_id}`
        if (!groupSubjectTeachers.has(key)) groupSubjectTeachers.set(key, new Set())
        groupSubjectTeachers.get(key)!.add(row.teacher_id)
      })
      for (const [key, tSet] of groupSubjectTeachers.entries()) {
        if (tSet.size > 1) {
          const subjectId = key.split('-')[1]
          if (subjectId) multiTeacherSubjSet.add(subjectId)
        }
      }
    }

    // Agregar materias explícitamente configuradas en la regla MULTI_TEACHER_SAME_SLOT
    const explicitRules = (constraintsData || []).find((c: any) => c.rule_type === 'MULTI_TEACHER_SAME_SLOT' && c.is_active !== false)
    if (explicitRules?.parameters?.rules && Array.isArray(explicitRules.parameters.rules)) {
      explicitRules.parameters.rules.forEach((r: any) => {
        if (r.subject_id && r.subject_id !== 'ALL') multiTeacherSubjSet.add(r.subject_id)
      })
    } else if (explicitRules?.parameters?.subject_id && explicitRules.parameters.subject_id !== 'ALL') {
      multiTeacherSubjSet.add(explicitRules.parameters.subject_id)
    }

    const multiTeacherSubjectIds = Array.from(multiTeacherSubjSet)
    const workloadConfig = (constraintsData || []).find((c: any) => c.rule_type === 'MULTI_TEACHER_WORKLOAD_CONFIG' && c.is_active !== false)
    const normalWorkloadSubjectIds = workloadConfig?.parameters?.normal_workload_subject_ids || []

    const context: RuleContext = {
      multiTeacherSubjectIds,
      normalWorkloadSubjectIds,

      constraints: (constraintsData || []).map((c: any) => ({

        ruleType: c.rule_type,
        targetEntityType: c.target_entity_type,
        targetEntityId: c.target_entity_id,
        parameters: c.parameters,
        weight: c.weight,
        isActive: c.is_active
      })),
      timeOff: (timeOffData || []).map((t: any) => ({
        id: t.id,
        entityType: t.entity_type,
        entityId: t.entity_id,
        teacherId: t.entity_type === 'TEACHER' ? t.entity_id : undefined,
        groupId: t.entity_type === 'GROUP' ? t.entity_id : undefined,
        classroomId: t.entity_type === 'CLASSROOM' ? t.entity_id : undefined,
        dayOfWeek: t.day_of_week,
        periodId: t.period_id,
        status: t.status
      })),
      maxPeriodsPerDay,
      breakPeriods
    }


    // 3. Obtener configuraciones globales
    const globalSettingsData = JSON.parse(localStorage.getItem('sch_settings') || '{}')
    let breaksGS = globalSettingsData.breaks
    if (!breaksGS && globalSettingsData.breakPeriod) {
      breaksGS = [{ id: '1', name: 'Recreo', afterPeriod: parseInt(globalSettingsData.breakPeriod, 10), durationMinutes: 30 }]
    } else if (!breaksGS) {
      breaksGS = []
    }
    const breakPeriodsGS = breaksGS.map((b: any) => b.afterPeriod)
    const periodsPerDay = parseInt(globalSettingsData.periodsPerDay || '7', 10)
    
    // 4. Preparar CurriculumBlocks para el Generador
    const blocksToAssign: any[] = []
    currData.forEach(c => {
      let hoursLeft = c.hours_per_week
      const isBlockSubject = blockSubjects.includes(c.subject_id)
      let slotIdx = 0

      if (isBlockSubject) {
        while (hoursLeft >= 2) {
          blocksToAssign.push({ subject_id: c.subject_id, teacher_id: c.teacher_id, group_id: c.group_id, duration: 2, slotIndex: slotIdx++ })
          hoursLeft -= 2
        }
      }
      while (hoursLeft > 0) {
        blocksToAssign.push({ subject_id: c.subject_id, teacher_id: c.teacher_id, group_id: c.group_id, duration: 1, slotIndex: slotIdx++ })
        hoursLeft -= 1
      }
    })


    const config: GeneratorConfig = {
      curriculum: blocksToAssign,
      context,
      days: DAYS,
      periodsPerDay,
      breakPeriods
    }

    // 5. Ejecutar Motor (con updates a la UI)
    const generator = new ScheduleGenerator()
    const result = await generator.generate(config, (p, msg) => {
      setProgress(p)
      setProgressMsg(msg)
    })

    setProgressMsg('Guardando en base de datos...')
    // 6. Limpiar DB e Insertar
    await supabase.from('sch_schedule_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (result.schedule.length > 0) {
      const toInsert = result.schedule.map(s => ({
        day_of_week: s.dayOfWeek,
        period_id: s.periodId,
        group_id: s.groupId,
        subject_id: s.subjectId,
        teacher_id: s.teacherId && s.teacherId.trim() !== '' ? s.teacherId : null,
        duration: s.duration || 1
      }))
      
      const { error } = await supabase.from('sch_schedule_slots').insert(toInsert)
      if (error) {
        console.error('Error insertando slots de horario global:', error)
        toast.error(`Error al guardar el horario: ${error.message || 'Error de base de datos'}`)
      } else {
        const enrichedUnassigned = (result.unassigned || []).map(b => ({
          ...b,
          subject_name: subjects[b.subject_id]?.name || b.subject_id,
          group_name: groups.find(g => g.id === b.group_id)?.name || b.group_id,
          teacher_name: teachers[b.teacher_id || '']?.name || 'Sin asignar'
        }))
        setUnassignedBlocks(enrichedUnassigned)
        if (enrichedUnassigned.length > 0) {
          setShowUnassignedModal(true)
          toast.warning(`Se encontraron ${enrichedUnassigned.length} bloques no asignados. Revisa los detalles en el modal.`)
        }
      }
    } else {
      toast.error('No se pudo asignar ninguna clase.')
    }

    setGenerating(false)
    fetchGlobalData()
  }

  const autoGenerateGlobalSchedule = () => {
    toast('🚨 PRECAUCIÓN: Esto eliminará todos los horarios actuales y recalculará la asignación para TODOS LOS GRUPOS. ¿Deseas proceder?', {
      action: {
        label: 'Sí, autogenerar',
        onClick: executeAutoGenerateGlobal
      }
    })
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden">
      
      {/* Modal de Diagnóstico de Bloques No Asignados */}
      <UnassignedBlocksModal
        isOpen={showUnassignedModal}
        onClose={() => setShowUnassignedModal(false)}
        unassignedBlocks={unassignedBlocks}
      />

      
      {/* Botones Flotantes movidos arriba mediante Portal */}
      {portalNode && createPortal(
        <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-2 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 z-50 no-print">
          {viewMode === 'group' && (
            <button 
              onClick={autoGenerateGlobalSchedule}
              className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              Autogenerar
            </button>
          )}
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          <button 
            onClick={analyzeConflicts}
            className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-500 transition-colors group"
            title="Analizar Conflictos"
          >
            <AlertTriangle className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          <button 
            onClick={() => window.print()} 
            className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors group"
            title="Imprimir"
          >
            <Printer className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors group"
            title="Exportar CSV"
          >
            <Download className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          <button 
            onClick={clearGlobalSchedule}
            className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-600 dark:text-red-500 transition-colors group"
            title="Limpiar Horario Global"
          >
            <Trash2 className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>,
        portalNode
      )}

      {loading ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar p-6 print:p-0 print:overflow-visible">
          
          <table className="w-max border-collapse bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden text-xs">
            <thead>
              {/* Nivel 1: Días */}
              <tr>
                <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700 p-2 min-w-[80px]"></th>
                {DAYS.map((day, dIdx) => (
                  <th key={day} colSpan={timeSlots.filter(s => s.type !== 'break').length} className={`bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-2 text-center uppercase tracking-wider font-black text-slate-600 dark:text-slate-300 ${dIdx < DAYS.length - 1 ? 'border-r-4 border-r-slate-300 dark:border-r-slate-600' : 'border-r border-slate-200 dark:border-slate-700'}`}>
                    {day}
                  </th>
                ))}
              </tr>
              {/* Nivel 2: Periodos */}
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800/50 border-b border-r border-slate-200 dark:border-slate-700 p-2 font-bold text-slate-500">{viewMode === 'group' ? 'GRUPO' : 'DOCENTE'}</th>
                {DAYS.map((day, dIdx) => {
                  const displayTimeSlots = timeSlots.filter(s => s.type !== 'break')
                  return (
                    <React.Fragment key={`periods-${day}`}>
                      {displayTimeSlots.map((slot, sIdx) => (
                        <th key={`${day}-${sIdx}`} className={`bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 p-1 min-w-[80px] text-center ${sIdx === displayTimeSlots.length - 1 && dIdx < DAYS.length - 1 ? 'border-r-4 border-r-slate-300 dark:border-r-slate-600' : 'border-r border-slate-200 dark:border-slate-700'}`}>
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <span className="text-xs font-bold">{slot.id}ª</span>
                            <span className="text-[8px] font-medium">{slot.startTime} - {slot.endTime}</span>
                          </div>
                        </th>
                      ))}
                    </React.Fragment>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {entities.map((entity, idx) => (
                <tr key={entity.id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 p-2 font-black text-slate-700 dark:text-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    {entity.name}
                  </td>
                  {DAYS.map((day, dIdx) => {
                    let skipUntilPeriod = -1
                    const displayTimeSlots = timeSlots.filter(s => s.type !== 'break')
                    return (
                      <React.Fragment key={`cells-${entity.id}-${day}`}>
                        {displayTimeSlots.map((timeSlot, sIdx) => {
                          const isLastInDay = sIdx === displayTimeSlots.length - 1
                          const borderClasses = isLastInDay && dIdx < DAYS.length - 1 
                            ? 'border-r-4 border-r-slate-300 dark:border-r-slate-600' 
                            : 'border-r border-slate-200 dark:border-slate-700'

                          const p = timeSlot.id!
                          if (p <= skipUntilPeriod) return null
                          
                          const globalSettingsData = JSON.parse(localStorage.getItem('sch_settings') || '{}')
                          const groupPeriods = JSON.parse(localStorage.getItem('sch_group_periods') || '{}')
                          const maxP = viewMode === 'group' ? (groupPeriods[entity.id] || parseInt(globalSettingsData.periodsPerDay || '7', 10)) : parseInt(globalSettingsData.periodsPerDay || '7', 10)
                          const isBlocked = p > maxP
                          
                          if (isBlocked) {
                            return (
                              <td key={`${entity.id}-${day}-${p}`} className={`border-b border-slate-200 dark:border-slate-700 p-0 relative bg-slate-100 dark:bg-slate-900 overflow-hidden ${borderClasses}`}>
                                <div className="absolute inset-0 pattern-diagonal-lines pattern-slate-200 dark:pattern-slate-800 pattern-bg-transparent pattern-size-4 opacity-50 flex items-center justify-center"></div>
                              </td>
                            )
                          }
                          
                          const slot = getSlot(entity.id, day, p)
                          const subject = slot ? subjects[slot.subject_id] : null
                          const teacher = slot ? teachers[slot.teacher_id] : null
                          const duration = slot?.duration || 1
                          
                          if (duration > 1) {
                            skipUntilPeriod = p + duration - 1
                          }

                          // Calculate colSpan accounting for breaks
                          let finalColSpan = duration
                          if (duration > 1) {
                            finalColSpan = duration
                          }

                          const secondaryText = viewMode === 'group' 
                            ? (teacher?.alias || teacher?.name.split(' ')[0])
                            : groups.find(g => g.id === slot?.group_id)?.name

                          return (
                            <td key={`${entity.id}-${day}-${p}`} colSpan={finalColSpan} className={`border-b border-slate-200 dark:border-slate-700 p-1 h-[50px] relative hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${borderClasses}`}>
                              {slot && subject ? (
                                <div className="w-full h-full rounded flex flex-col justify-center px-1 overflow-hidden" style={{ backgroundColor: `${subject.color}20`, borderLeft: `3px solid ${subject.color}` }}>
                                  <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 truncate leading-tight" title={subject.name}>
                                    {subject.name}
                                  </span>
                                  {secondaryText && (
                                    <span className="text-[8px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5" title={secondaryText}>
                                      {secondaryText}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <span className="text-[8px] text-slate-300">-</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}

      {/* OVERLAY DE PROGRESO */}
      {generating && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 text-center">
            <Loader2 className="animate-spin h-10 w-10 text-indigo-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Motor de Reglas trabajando</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{progressMsg}</p>
            
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-bold text-indigo-500 mt-2">{progress}%</p>
          </div>
        </div>
      )}
    </div>
  )
}
