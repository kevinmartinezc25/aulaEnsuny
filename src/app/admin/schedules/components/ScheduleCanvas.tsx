'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, User, MapPin, Loader2, Plus, Trash2, Sparkles, Download, Coffee } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { generateTimeSlots, TimeSlot } from '../utils/timeCalculator'
import MobileTeacherSchedule from '@/app/(dashboard)/teacher/schedule/components/MobileTeacherSchedule'
import { toast } from 'sonner'
import { getScheduleSlotsAction, clearGroupScheduleSlotsAction, saveScheduleSlotsAction } from '@/modules/admin/application/actions'
import { getCurriculumAction } from '../actions'
import { ScheduleGenerator, GeneratorConfig } from '../engine/Generator'
import { RuleContext, ClassSession } from '../engine/types'

import SlotEditorModal from './SlotEditorModal'
import PrintableSchedule from './PrintableSchedule'
import UnassignedBlocksModal from './UnassignedBlocksModal'
import { isOfficialGradeGroup, isMeetingSubject } from '../utils/groupFilters'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

interface ScheduleCanvasProps {
  entityType?: 'group' | 'teacher'
  entityId: string
  entityName?: string
  directorName?: string
  readOnly?: boolean
  onNavigate?: (type: 'group' | 'teacher', id: string) => void
}

export default function ScheduleCanvas({
  entityType = 'group',
  entityId,
  entityName = '',
  directorName = '',
  readOnly = false,
  onNavigate
}: ScheduleCanvasProps) {
  const [showUnassignedModal, setShowUnassignedModal] = useState(false)
  const [unassignedBlocks, setUnassignedBlocks] = useState<any[]>([])

  const getUnassignedId = React.useCallback((b: any, idx: number) => {
    return `unassigned-${b.group_id}-${b.subject_id}-${b.teacher_id || 'none'}-${b.slotIndex ?? idx}`
  }, [])

  useEffect(() => {
    if (!entityId) return
    try {
      const storedLocal = localStorage.getItem(`sch_local_unassigned_${entityId}`)
      const storedGlobal = localStorage.getItem('sch_global_unassigned')
      
      let blocks: any[] = []
      
      if (storedLocal) {
        blocks = JSON.parse(storedLocal)
      } else if (storedGlobal) {
        const globalBlocks = JSON.parse(storedGlobal)
        // Filter global blocks for this entity
        blocks = globalBlocks.filter((b: any) => 
          entityType === 'group' ? b.group_id === entityId : b.teacher_id === entityId
        )
      }
      
      setUnassignedBlocks(blocks)
    } catch (e) {
      console.error(e)
    }
  }, [entityId, entityType])

  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [globalSlots, setGlobalSlots] = useState<any[]>([])
  const [constraints, setConstraints] = useState<any[]>([])
  const [timeOffBlocks, setTimeOffBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  
  // Responsive
  const [isMobile, setIsMobile] = useState(false)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1)
  
  // Progress UI State
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')

  // Print Date State for Substitutions
  const [printDate, setPrintDate] = useState('')
  const [activeSubstitutions, setActiveSubstitutions] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadSettings()
    if (entityId) fetchSchedule()
    setPortalNode(document.getElementById('canvas-actions-portal'))
  }, [entityId, entityType])

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

  const fetchSchedule = async () => {
    setLoading(true)
    let data: any[] = []
    try {
      data = await getScheduleSlotsAction(entityType, entityId)
    } catch (e) {
      console.error('Error fetching slots with action:', e)
    }

    if (!data || data.length === 0) {
      const query = supabase
        .from('sch_schedule_slots')
        .select(`
          id,
          day_of_week,
          period_id,
          duration,
          group:sch_groups(name),
          teacher:profiles(first_name, last_name),
          subject:sch_subjects(name, color, room_type),
          classroom:sch_classrooms(name)
        `)
        
      if (entityType === 'teacher') {
        query.eq('teacher_id', entityId)
      } else {
        query.eq('group_id', entityId)
      }

      // Fetch global slots, constraints, and time_off for validation during drag
      const [{ data: gSlots }, { data: constr }, { data: timeOffData }] = await Promise.all([
        supabase.from('sch_schedule_slots').select('id, group_id, teacher_id, day_of_week, period_id, duration'),
        supabase.from('sch_constraints').select('*'),
        supabase.from('sch_time_off').select('*')
      ])
      if (gSlots) setGlobalSlots(gSlots)
      if (constr) setConstraints(constr)
      if (timeOffData) setTimeOffBlocks(timeOffData)
    }

    if (data) {
      const groupedSlots = new Map<string, any>()
      
      data.forEach((d: any) => {
        // If viewing Student Group Schedule (entityType === 'group'), omit non-academic / multi-teacher meeting slots
        if (entityType === 'group') {
          if (d.group?.name && !isOfficialGradeGroup(d.group.name)) {
            return
          }
        }

        const slotKey = `${d.day_of_week}-${d.period_id}-${entityType === 'group' ? d.subject_id : (d.subject_id || d.group_id)}`
        if (!groupedSlots.has(slotKey)) {
          groupedSlots.set(slotKey, {
            id: d.id,
            day: d.day_of_week,
            period: d.period_id,
            duration: d.duration || 1,
            subject: d.subject?.name || 'Libre',
            teachers: [],
            groups: [],
            color: d.subject?.color || '#ffffff',
            room: d.classroom?.name || ''
          })
        }
        const item = groupedSlots.get(slotKey)!
        if (d.teacher) {
          const tName = `${d.teacher.first_name || ''} ${d.teacher.last_name || ''}`.trim()
          if (tName && !item.teachers.includes(tName)) item.teachers.push(tName)
        }
        if (d.group?.name && !item.groups.includes(d.group.name)) {
          item.groups.push(d.group.name)
        }
      })

      const formattedClasses = Array.from(groupedSlots.values()).map((item: any) => {
        const officialGroupNames = item.groups.filter((gName: string) => isOfficialGradeGroup(gName))
        const displayGroup = officialGroupNames.length > 0 
          ? officialGroupNames.join(', ') 
          : (item.groups.length > 0 ? 'Comité / Reunión Docente' : 'Docentes')

        return {
          id: item.id,
          day: item.day,
          period: item.period,
          duration: item.duration,
          subject: item.subject,
          teacher: entityType === 'teacher' 
            ? displayGroup 
            : (item.teachers.join(', ') || 'Sin asignar'),
          room: item.room,
          color: item.color,
          group: displayGroup
        }
      })
      setClasses(formattedClasses)
    }
    setLoading(false)
  }

  // Effect to fetch substitutions when printDate changes
  useEffect(() => {
    if (printDate) {
      fetchSubstitutionsForDate(printDate)
    } else {
      setActiveSubstitutions([])
    }
  }, [printDate])

  const fetchSubstitutionsForDate = async (date: string) => {
    // Buscar ausencias para esa fecha
    const { data: absences } = await supabase.from('sch_absences').select('id').eq('absence_date', date)
    if (!absences || absences.length === 0) {
      setActiveSubstitutions([])
      return
    }
    
    const absenceIds = absences.map(a => a.id)
    const { data: subs } = await supabase.from('sch_substitutions').select('*, substitute:profiles(first_name, last_name)').in('absence_id', absenceIds)
    
    if (subs) {
      const formattedSubs = subs.map((s: any) => ({
        ...s,
        substitute: s.substitute ? { name: `${s.substitute.first_name} ${s.substitute.last_name}`.trim() } : null
      }))
      setActiveSubstitutions(formattedSubs)
    }
  }

  const updateSlot = async (id: string, newDay: string, newPeriod: number) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, day: newDay, period: newPeriod } : c))
    
    const { error } = await supabase
      .from('sch_schedule_slots')
      .update({ day_of_week: newDay, period_id: newPeriod })
      .eq('id', id)

    if (error) {
      console.error("Error al mover clase:", error)
      fetchSchedule()
      toast.error("No se pudo mover la clase.")
    }
  }

  const deleteSlot = (id: string) => {
    toast.error('¿Estás seguro de eliminar esta clase?', {
      action: {
        label: 'Sí, eliminar',
        onClick: async () => {
          setClasses(prev => prev.filter(c => c.id !== id)) 
          const { error } = await supabase.from('sch_schedule_slots').delete().eq('id', id)
          if (error) { fetchSchedule(); toast.error("Error al eliminar.") }
        }
      }
    })
  }

  const executeClearSchedule = async () => {
    setLoading(true)
    const { error } = await supabase.from('sch_schedule_slots').delete().eq(entityType === 'teacher' ? 'teacher_id' : 'group_id', entityId)
    setLoading(false)

    if (error) {
      toast.error('Error al limpiar el horario.')
    } else {
      toast.success('Horario limpiado exitosamente.')
      fetchSchedule()
    }
  }

  const clearSchedule = () => {
    toast('¿Estás seguro de eliminar todo el horario de este ' + (entityType === 'teacher' ? 'profesor' : 'grupo') + '? Esta acción no se puede deshacer.', {
      action: {
        label: 'Sí, limpiar',
        onClick: executeClearSchedule
      }
    })
  }

  const analyzeConflicts = () => {
    if (unassignedBlocks.length > 0) {
      setShowUnassignedModal(true)
      return
    }
    toast.info('Análisis heurístico ejecutado: No se encontraron choques duros en el grupo actual.')
  }

  const handleManualAssign = async (blockOrBlocks: any, day: string, period: number) => {
    const blocksList: any[] = Array.isArray(blockOrBlocks) ? blockOrBlocks : [blockOrBlocks]
    
    // Si es un bloque individual pero pertenece a una reunión con otros docentes en unassignedBlocks, agruparlos sin duplicar docentes
    let allRelatedBlocks = [...blocksList]
    if (blocksList.length === 1) {
      const single = blocksList[0]
      const isMeeting = isMeetingSubject(single.subject_name, single.group_name, single.group_id, single.is_academic_workload)
      if (isMeeting) {
        const addedTeachers = new Set<string>()
        if (single.teacher_id) addedTeachers.add(single.teacher_id)
        
        for (const b of unassignedBlocks) {
          if (b === single) continue
          if (b.group_id !== single.group_id || b.subject_id !== single.subject_id) continue
          if (single.slotIndex !== undefined && b.slotIndex !== undefined && b.slotIndex !== single.slotIndex) continue
          
          const tId = b.teacher_id && b.teacher_id.trim() !== '' ? b.teacher_id : null
          if (tId && addedTeachers.has(tId)) continue
          
          if (tId) addedTeachers.add(tId)
          allRelatedBlocks.push(b)
        }
      }
    }

    // Asegurar que ningún docente aparezca más de una vez en esta misma celda/franja
    const distinctBlocks: any[] = []
    const seenTeachers = new Set<string>()
    for (const b of allRelatedBlocks) {
      const tId = b.teacher_id && b.teacher_id.trim() !== '' ? b.teacher_id : null
      const teacherKey = tId || `no_teacher_${b.subject_id}_${Math.random()}`
      if (!seenTeachers.has(teacherKey)) {
        seenTeachers.add(teacherKey)
        distinctBlocks.push(b)
      }
    }

    const toInsert = distinctBlocks.map(b => ({
      day_of_week: day,
      period_id: period,
      group_id: b.group_id,
      subject_id: b.subject_id,
      teacher_id: b.teacher_id && b.teacher_id.trim() !== '' ? b.teacher_id : null,
      duration: b.duration || 1
    }))

    const saveResult = await saveScheduleSlotsAction(toInsert)
    if (!saveResult.success) {
      console.error('Error al guardar bloque(s) manual(es):', saveResult.error)
      toast.error(`Error al asignar bloque(s): ${saveResult.error || 'Error desconocido'}`)
      throw new Error(saveResult.error)
    }

    if (distinctBlocks.length > 1) {
      toast.success(`👥 Reunión sincronizada: ${distinctBlocks.length} docentes asignados a ${day} ${period}ª hora.`)
    } else {
      toast.success('Bloque asignado correctamente.')
    }
    
    const assignedSet = new Set(distinctBlocks)
    const newUnassigned = unassignedBlocks.filter(b => !assignedSet.has(b))
    setUnassignedBlocks(newUnassigned)
    localStorage.setItem(`sch_local_unassigned_${entityId}`, JSON.stringify(newUnassigned))
    fetchSchedule()
  }


  const executeAutoGenerate = async () => {
    if (entityType === 'teacher') {
      toast.info('La autogeneración de horarios se realiza por Grupo o desde la vista de Autogeneración Global.')
      return
    }

    setGenerating(true)
    setProgress(0)
    setProgressMsg('Preparando motor de reglas...')
    
    // 1. Limpiar horario actual del grupo usando Server Action (bypass RLS)
    const clearResult = await clearGroupScheduleSlotsAction(entityId)
    if (!clearResult.success) {
      toast.error(`Error al limpiar el horario: ${clearResult.error || ''}`)
      setGenerating(false)
      return
    }

    let currData: any[] | null = null
    const actionRes = await getCurriculumAction(entityId)
    if (actionRes.success && actionRes.data) {
      currData = actionRes.data
    } else {
      const { data: fallbackData, error: currError } = await supabase
        .from('sch_curriculum')
        .select('*, subject:sch_subjects(name, is_academic_workload), teacher:profiles(id, first_name, last_name)')
        .eq('group_id', entityId)

      if (currError) {
        console.error('Error al consultar la malla del grupo:', currError)
        toast.error(`Error al cargar la malla curricular: ${currError.message || actionRes.error}`)
        setGenerating(false)
        return
      }
      currData = fallbackData
    }

    if (!currData || currData.length === 0) {
      toast.error('Malla Curricular no configurada.')
      setGenerating(false)
      return
    }

    // 2. Obtener contexto (Reglas y Disponibilidad)
    const { data: constraintsData } = await supabase.from('sch_constraints').select('*')
    const { data: timeOffData } = await supabase.from('sch_time_off').select('*')

    // Identificar materias multi-docente por grupo o por regla explícita
    const { data: allCurriculumData } = await supabase.from('sch_curriculum').select('group_id, subject_id, teacher_id')
    const groupSubjectTeachers = new Map<string, { subjectId: string; teachers: Set<string> }>()
    const multiTeacherSubjSet = new Set<string>()

    if (allCurriculumData) {
      allCurriculumData.forEach((row: any) => {
        if (!row.group_id || !row.subject_id || !row.teacher_id) return
        const key = `${row.group_id}___${row.subject_id}`
        if (!groupSubjectTeachers.has(key)) {
          groupSubjectTeachers.set(key, { subjectId: row.subject_id, teachers: new Set() })
        }
        groupSubjectTeachers.get(key)!.teachers.add(row.teacher_id)
      })
      for (const info of groupSubjectTeachers.values()) {
        if (info.teachers.size > 1) {
          multiTeacherSubjSet.add(info.subjectId)
        }
      }
    }

    // Agregar materias explícitamente configuradas en la regla MULTI_TEACHER_SAME_SLOT
    const explicitRulesList = (constraintsData || []).filter((c: any) => c.rule_type === 'MULTI_TEACHER_SAME_SLOT' && c.is_active !== false)
    for (const explicitRules of explicitRulesList) {
      if (explicitRules?.parameters?.rules && Array.isArray(explicitRules.parameters.rules)) {
        explicitRules.parameters.rules.forEach((r: any) => {
          if (r.subject_id && r.subject_id !== 'ALL') multiTeacherSubjSet.add(r.subject_id)
        })
      } else if (explicitRules?.parameters?.subject_id && explicitRules.parameters.subject_id !== 'ALL') {
        multiTeacherSubjSet.add(explicitRules.parameters.subject_id)
      }
    }

    const multiTeacherSubjectIds = Array.from(multiTeacherSubjSet)

    // Obtener los slots agendados de otros grupos para evitar cruces de docentes
    const { data: existingSlotsData } = await supabase
      .from('sch_schedule_slots')
      .select('*')
      .neq('group_id', entityId)

    const existingSchedule: ClassSession[] = (existingSlotsData || []).map((slot: any) => ({
      id: `existing-${slot.id}`,
      groupId: slot.group_id,
      subjectId: slot.subject_id,
      teacherId: slot.teacher_id,
      classroomId: slot.classroom_id,
      dayOfWeek: slot.day_of_week,
      periodId: slot.period_id,
      duration: slot.duration || 1
    }))

    const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
    let breaks = settings.breaks
    if (!breaks && settings.breakPeriod) {
      breaks = [{ id: '1', name: 'Recreo', afterPeriod: parseInt(settings.breakPeriod, 10), durationMinutes: 30 }]
    } else if (!breaks) {
      breaks = []
    }
    const breakPeriods: number[] = []
    
    const groupPeriods = JSON.parse(localStorage.getItem('sch_group_periods') || '{}')
    const periodsPerDay = groupPeriods[entityId] || parseInt(settings.periodsPerDay || '7', 10)

    const workloadConfig = (constraintsData || []).find((c: any) => c.rule_type === 'MULTI_TEACHER_WORKLOAD_CONFIG' && c.is_active !== false)
    const normalWorkloadSubjectIds = workloadConfig?.parameters?.normal_workload_subject_ids || []

    const context: RuleContext = {
      multiTeacherSubjectIds,
      normalWorkloadSubjectIds,
      constraints: (constraintsData || []).map((c: any) => {
        if (c.rule_type === 'TEACHER_TIME_WINDOW') {
          return {
            ruleType: c.rule_type,
            targetEntityType: c.target_entity_type,
            targetEntityId: c.target_entity_id,
            parameters: {
              start_time: c.parameters?.start_time || '07:00',
              end_time: c.parameters?.end_time || '14:00',
              specific_day: c.parameters?.specific_day
            },
            weight: c.weight,
            isActive: c.is_active
          }
        }
        return {
          ruleType: c.rule_type,
          targetEntityType: c.target_entity_type,
          targetEntityId: c.target_entity_id,
          parameters: c.parameters,
          weight: c.weight,
          isActive: c.is_active
        }
      }),
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
      timeSlots: timeSlots.filter(s => s.type === 'period').map(s => ({
        id: Number(s.id),
        startTime: s.startTime,
        endTime: s.endTime
      })),
      maxPeriodsPerDay: periodsPerDay,
      breakPeriods
    }

    const dbBlockConstraint = (constraintsData || []).find((c: any) => c.rule_type === 'BLOCK_SUBJECTS_CONFIG' && c.is_active !== false)
    const blockSubjects: string[] = dbBlockConstraint?.parameters?.subject_ids && Array.isArray(dbBlockConstraint.parameters.subject_ids)
      ? dbBlockConstraint.parameters.subject_ids
      : JSON.parse(localStorage.getItem('sch_block_subjects') || '[]')

    const blocksToAssign: any[] = []
    const slotCounters = new Map<string, number>()
    currData.forEach(c => {
      let hoursLeft = c.hours_per_week
      const isBlockSubject = blockSubjects.includes(c.subject_id)
      const counterKey = `${c.group_id}-${c.subject_id}-${c.teacher_id}`
      let slotIdx = slotCounters.get(counterKey) || 0
      const teacherName = c.teacher
        ? `${c.teacher.first_name || ''} ${c.teacher.last_name || ''}`.trim()
        : undefined

      if (isBlockSubject) {
        while (hoursLeft >= 2) {
          blocksToAssign.push({
            subject_id: c.subject_id,
            subject_name: c.subject?.name,
            teacher_id: c.teacher_id,
            teacher_name: teacherName,
            group_id: c.group_id,
            group_name: entityType === 'group' ? entityName : undefined,
            duration: 2,
            slotIndex: slotIdx++,
            is_academic_workload: c.subject?.is_academic_workload
          })
          hoursLeft -= 2
        }
      }
      while (hoursLeft > 0) {
        blocksToAssign.push({
          subject_id: c.subject_id,
          subject_name: c.subject?.name,
          teacher_id: c.teacher_id,
          teacher_name: teacherName,
          group_id: c.group_id,
          group_name: entityType === 'group' ? entityName : undefined,
          duration: 1,
          slotIndex: slotIdx++,
          is_academic_workload: c.subject?.is_academic_workload
        })
        hoursLeft -= 1
      }
      slotCounters.set(counterKey, slotIdx)
    })


    const groupPeriodsRaw = localStorage.getItem('sch_group_periods')
    const groupPeriodsCfg = groupPeriodsRaw ? JSON.parse(groupPeriodsRaw) : {}

    const config: GeneratorConfig = {
      curriculum: blocksToAssign,
      existingSchedule,
      context,
      days: DAYS,
      periodsPerDay,
      breakPeriods,
      groupPeriods: groupPeriodsCfg
    }


    // 5. Ejecutar Motor (con updates a la UI)
    const generator = new ScheduleGenerator()
    const result = await generator.generate(config, (p, msg) => {
      setProgress(p)
      setProgressMsg(msg)
    })

    setProgressMsg('Guardando en base de datos...')
    
    if (result.schedule.length > 0) {
      if (entityType === 'group' && entityId) {
        await clearGroupScheduleSlotsAction(entityId)
      }

      const toInsert = result.schedule.map(s => ({
        day_of_week: s.dayOfWeek,
        period_id: s.periodId,
        group_id: s.groupId,
        subject_id: s.subjectId,
        teacher_id: s.teacherId && s.teacherId.trim() !== '' ? s.teacherId : null,
        duration: s.duration || 1
      }))
      
      const saveResult = await saveScheduleSlotsAction(toInsert)
      if (!saveResult.success) {
        console.error('Error insertando slots de horario:', saveResult.error)
        toast.error(`Error al guardar el horario: ${saveResult.error || 'Error de base de datos'}`)
      } else {
        const { data: subjsData } = await supabase.from('sch_subjects').select('id, name')
        const { data: profsData } = await supabase.from('profiles').select('id, first_name, last_name')
        const subMap = new Map((subjsData || []).map((s: any) => [s.id, s.name]))
        const profMap = new Map((profsData || []).map((p: any) => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim()]))

        const enrichedUnassigned = (result.unassigned || []).map(b => ({
          ...b,
          group_name: entityName || b.group_id,
          subject_name: subMap.get(b.subject_id) || b.subject_id,
          teacher_name: profMap.get(b.teacher_id || '') || 'Sin asignar'
        }))
        setUnassignedBlocks(enrichedUnassigned)
        localStorage.setItem(`sch_local_unassigned_${entityId}`, JSON.stringify(enrichedUnassigned))
        if (enrichedUnassigned.length > 0) {
          setShowUnassignedModal(true)
          toast.warning(`${enrichedUnassigned.length} bloques no pudieron asignarse. Revisa el desglose en el modal.`)
        } else {
          toast.success(`✅ Horario del grupo generado: ${result.schedule.length} sesiones asignadas.`)
        }
      }

    } else {
      toast.error('No se pudo asignar ninguna clase.')
    }

    setGenerating(false)
    fetchSchedule()
  }


  const autoGenerateSchedule = () => {
    toast('¿Deseas autogenerar el horario basado en la Malla Curricular? Esto reemplazará el horario actual.', {
      action: {
        label: 'Sí, generar',
        onClick: executeAutoGenerate
      }
    })
  }

  const exportPDF = () => {
    window.print();
  }

  return (
    <>
      <UnassignedBlocksModal
        isOpen={showUnassignedModal}
        onClose={() => setShowUnassignedModal(false)}
        unassignedBlocks={unassignedBlocks}
        timeSlots={timeSlots}
        constraints={constraints}
        onAssign={handleManualAssign}
        onNavigate={onNavigate}
      />

      <div className="block lg:hidden print:hidden h-full">
        <MobileTeacherSchedule 
          classes={classes} 
          timeSlots={timeSlots} 
          entityType={entityType} 
          entityId={entityId} 
          entityName={entityName}
          onUpdate={fetchSchedule} 
        />
      </div>
      <div className="hidden lg:block print:block w-full h-full relative">
        <div className="w-full h-full flex flex-col px-4 pt-0 pb-2 print:hidden relative">
        {portalNode && !readOnly && createPortal(
          <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 mr-2 pointer-events-auto">
            <button onClick={autoGenerateSchedule} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">
              <Sparkles className="h-4 w-4" />
              Autogenerar
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

            <button onClick={analyzeConflicts} className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-500 transition-colors group relative" title="Analizar Conflictos">
              <AlertTriangle className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
              {unassignedBlocks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                  {unassignedBlocks.length}
                </span>
              )}
            </button>
            
            <button onClick={exportPDF} className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors group" title="Exportar PDF">
              <Download className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <button onClick={clearSchedule} className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-600 dark:text-red-500 transition-colors group" title="Limpiar Horario">
              <Trash2 className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
            </button>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
            
            <div className="flex flex-col text-xs gap-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Imprimir Suplencias</span>
              <input 
                type="date" 
                value={printDate} 
                onChange={e => setPrintDate(e.target.value)} 
                title="Selecciona fecha para imprimir con suplencias"
                className="border border-slate-200 dark:border-slate-700 bg-transparent rounded px-1 py-0.5 h-6 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>,
          portalNode
        )}

      {loading && (
        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      )}



      <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-20 relative">
        <div className="flex flex-col min-w-[1000px]">
          {/* Header de Horas */}
          <div className="grid gap-3 mb-4 shrink-0 sticky top-0 z-30 bg-white dark:bg-slate-900 pt-2 pb-2" style={{ gridTemplateColumns: `6rem repeat(${timeSlots.filter(s => s.type !== 'break').length}, 1fr)` }}>
            <div />
            {timeSlots.filter(s => s.type !== 'break').map((s, i) => {
              const groupPeriods = JSON.parse(localStorage.getItem('sch_group_periods') || '{}')
              const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
              const maxP = entityType === 'group' ? (groupPeriods[entityId] || parseInt(settings.periodsPerDay || '7', 10)) : parseInt(settings.periodsPerDay || '7', 10)
              const isBlocked = s.id! > maxP
              return (
              <div key={i} className={`flex flex-col items-center rounded-lg py-1 border shadow-sm border-slate-200 ${isBlocked ? 'bg-slate-200/50 dark:bg-slate-800/50 opacity-50' : 'bg-white/50 dark:bg-slate-800/50'}`}>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.id}ª</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400">{s.startTime} - {s.endTime}</span>
              </div>
            )})}
          </div>

          {/* Filas de Días */}
          <div className="flex flex-col gap-4">
          {DAYS.map((day, idx) => {
            const groupPeriods = JSON.parse(localStorage.getItem('sch_group_periods') || '{}')
            const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
            const maxP = entityType === 'group' ? (groupPeriods[entityId] || parseInt(settings.periodsPerDay || '7', 10)) : parseInt(settings.periodsPerDay || '7', 10)
            const displayTimeSlots = timeSlots.filter(s => s.type !== 'break')
            return (
              <React.Fragment key={day}>
                <div className="grid gap-3 h-24 relative" style={{ gridTemplateColumns: `6rem repeat(${displayTimeSlots.length}, 1fr)` }}>
                <div className="flex items-center justify-end pr-3" style={{ gridRow: 1, gridColumn: 1 }}>
                  <span className="text-xs font-bold text-slate-600">{day}</span>
                </div>
                {displayTimeSlots.map((s, i) => {
                  const p = s.id!
                  const isBlocked = p > maxP
                  const isOccupied = classes.some(c => c.day === day && p >= c.period && p < c.period + (c.duration || 1));

                  const activeDragClass = activeDragId ? 
                    (classes.find(c => c.id === activeDragId) || 
                     unassignedBlocks.find((b, idx) => getUnassignedId(b, idx) === activeDragId)) 
                    : null;
                    
                  let isDragValid = false;
                  if (activeDragClass) {
                    const pArr = Array.from({ length: activeDragClass.duration || 1 }, (_, idx) => p + idx);
                    const outOfBounds = pArr.some(px => px > maxP);
                    const otherClasses = classes.filter(c => c.id !== activeDragClass.id);
                    const hasLocalConflict = otherClasses.some(c => {
                      if (c.day !== day) return false;
                      const cArr = Array.from({ length: c.duration || 1 }, (_, idx) => c.period + idx);
                      return pArr.some(px => cArr.includes(px));
                    });

                    // Get dragging entity details
                    const isUnassigned = activeDragId!.startsWith('unassigned-');
                    const selfGlobalSlot = !isUnassigned ? globalSlots.find(gs => gs.id === activeDragClass.id) : null;
                    const targetGroupId = isUnassigned ? activeDragClass.group_id : selfGlobalSlot?.group_id;
                    const targetTeacherId = isUnassigned ? activeDragClass.teacher_id : selfGlobalSlot?.teacher_id;

                    // Global Conflict Check
                    let hasGlobalConflict = false;
                    if (globalSlots.length > 0) {
                      hasGlobalConflict = globalSlots.some(gs => {
                        if (!isUnassigned && gs.id === activeDragClass.id) return false;
                        if (gs.day_of_week !== day) return false;
                        const gsArr = Array.from({ length: gs.duration || 1 }, (_, idx) => gs.period_id + idx);
                        const overlaps = pArr.some(px => gsArr.includes(px));
                        if (!overlaps) return false;

                        const sameGroup = targetGroupId && gs.group_id === targetGroupId;
                        const sameTeacher = targetTeacherId && gs.teacher_id === targetTeacherId;
                        return sameGroup || sameTeacher;
                      });
                    }

                    // 7ma hora Rule Check
                    let violatesSeventhRule = false;
                    const groupSeventhRule = constraints.find(c => c.rule_type === 'GROUP_SEVENTH_PERIOD_CONFIG' && c.is_active !== false)
                    const groupsWithSeventh = groupSeventhRule?.parameters?.group_ids || []
                    const exceptions = groupSeventhRule?.parameters?.exception_teacher_ids || []

                    if (targetGroupId && groupsWithSeventh.includes(targetGroupId)) {
                      if (pArr.includes(1) && (!targetTeacherId || !exceptions.includes(targetTeacherId))) {
                        violatesSeventhRule = true;
                      }
                    } else if (targetGroupId && !groupsWithSeventh.includes(targetGroupId)) {
                      if (pArr.includes(7)) {
                        violatesSeventhRule = true;
                      }
                    }

                    // Time Off Check
                    let hasTimeOffConflict = false;
                    if (timeOffBlocks.length > 0) {
                      hasTimeOffConflict = timeOffBlocks.some(t => {
                        if (t.day_of_week !== day) return false;
                        if (t.status !== 'FORBIDDEN') return false; 
                        const overlaps = pArr.includes(t.period_id);
                        if (!overlaps) return false;

                        return (t.entity_type === 'GROUP' && t.entity_id === targetGroupId) ||
                               (t.entity_type === 'TEACHER' && t.entity_id === targetTeacherId);
                      });
                    }

                    // Time Window Check
                    let outOfTimeWindow = false;
                    const globalTimeWindow = constraints.find(c => c.rule_type === 'GLOBAL_TEACHER_TIME_WINDOW' && c.is_active !== false);
                    const teacherTimeWindow = constraints.find(c => c.rule_type === 'TEACHER_TIME_WINDOW' && c.target_entity_id === targetTeacherId && c.is_active !== false);
                    
                    let ruleToApply = null;
                    if (globalTimeWindow) ruleToApply = globalTimeWindow;
                    else if (teacherTimeWindow) ruleToApply = teacherTimeWindow;

                    if (ruleToApply && targetTeacherId) {
                      const { start_time, end_time, specific_day } = ruleToApply.parameters;
                      if (!specific_day || specific_day === 'Todos los días' || specific_day === day) {
                        const startPeriod = timeSlots.find(ts => Number(ts.id) === pArr[0]);
                        const endPeriod = timeSlots.find(ts => Number(ts.id) === pArr[pArr.length - 1]);
                        
                        if (startPeriod && endPeriod) {
                          if (startPeriod.startTime < (start_time || '07:00') || endPeriod.endTime > (end_time || '14:00')) {
                            outOfTimeWindow = true;
                          }
                        }
                      }
                    }

                    isDragValid = !outOfBounds && !hasLocalConflict && !hasGlobalConflict && !violatesSeventhRule && !hasTimeOffConflict && !outOfTimeWindow;
                  }

                  let cellBg = isOccupied ? 'bg-white/30 dark:bg-slate-800/30' : 'bg-white/30 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group';
                  if (isBlocked) {
                    cellBg = 'bg-slate-200/50 dark:bg-slate-800/50 cursor-not-allowed opacity-50';
                  } else if (activeDragClass) {
                    cellBg = isDragValid 
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800/50' 
                      : 'bg-rose-50/50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800/50';
                  }

                  return (
                    <div 
                      key={i} 
                      data-drop-day={day} 
                      data-drop-period={p} 
                      data-drop-valid={activeDragClass ? (isDragValid ? 'true' : 'false') : undefined}
                      onClick={() => { if(!readOnly && !isOccupied && !isBlocked && !activeDragId){ setSelectedDay(day); setSelectedPeriod(p); setIsModalOpen(true) } }} 
                      className={`h-full rounded-2xl relative transition-colors ${!readOnly ? 'border-2 border-dashed border-slate-200 dark:border-slate-700' : ''} ${cellBg}`}
                      style={{ gridRow: 1, gridColumn: i + 2 }}
                    >
                      {!readOnly && !isOccupied && !isBlocked && !activeDragId && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><Plus className="h-6 w-6 text-indigo-400" /></div>}
                      {isBlocked && <div className="absolute inset-0 pattern-diagonal-lines pattern-slate-300 dark:pattern-slate-700 pattern-bg-transparent pattern-size-4 opacity-30 flex items-center justify-center"></div>}
                    </div>
                  )
                })}
                {(() => {
                  const dayClasses = classes.filter(c => c.day === day)
                  return dayClasses.map(cls => {
                    const startCol = displayTimeSlots.findIndex(s => s.id === cls.period) + 2
                    const endCol = startCol + (cls.duration || 1)

                    // Detectar cruces/colisiones en el mismo horario
                    const clsStart = cls.period
                    const clsEnd = cls.period + (cls.duration || 1)
                    const overlapping = dayClasses.filter(other => {
                      const oStart = other.period
                      const oEnd = other.period + (other.duration || 1)
                      return Math.max(clsStart, oStart) < Math.min(clsEnd, oEnd)
                    })

                    overlapping.sort((a, b) => a.period - b.period || a.id.localeCompare(b.id))
                    const totalOverlaps = overlapping.length
                    const overlapIndex = overlapping.findIndex(c => c.id === cls.id)
                    const hasConflict = totalOverlaps > 1

                    // Posicionamiento horizontal dinámico cuando hay colisión para que no se monten una encima de otra
                    const widthStyle = hasConflict ? `calc(${100 / totalOverlaps}% - 4px)` : 'calc(100% - 8px)'
                    const leftStyle = hasConflict ? `calc(${(100 / totalOverlaps) * overlapIndex}% + 2px)` : '4px'

                    return (
                      <div key={cls.id} className="h-full relative z-10 pointer-events-none" style={{ gridColumnStart: startCol, gridColumnEnd: endCol, gridRow: 1 }}>
                        <motion.div
                          drag={!readOnly}
                          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                          dragElastic={1}
                          onDragStart={() => setActiveDragId(cls.id)}
                          onDragEnd={async (event, info) => {
                            setActiveDragId(null)
                            const el = event.target as HTMLElement;
                            const originalPointerEvents = el.style.pointerEvents;
                            el.style.pointerEvents = 'none';
                            const elementsUnderCursor = document.elementsFromPoint(info.point.x, info.point.y);
                            el.style.pointerEvents = originalPointerEvents;
                            const dropZone = elementsUnderCursor.find(e => e.getAttribute('data-drop-day'));
                            if (dropZone) {
                              const isValid = dropZone.getAttribute('data-drop-valid') !== 'false';
                              if (!isValid) {
                                toast.error("Movimiento inválido: Cruce de horarios o incumplimiento de reglas (ej. 7ma hora).");
                                return;
                              }
                              const targetDay = dropZone.getAttribute('data-drop-day');
                              const targetPeriod = parseInt(dropZone.getAttribute('data-drop-period') || '0', 10);
                              if (targetDay && targetPeriod && (targetDay !== cls.day || targetPeriod !== cls.period)) {
                                updateSlot(cls.id, targetDay, targetPeriod);
                              }
                            }
                          }}
                          whileHover={!readOnly ? { scale: 1.01, y: -2 } : {}}
                          whileDrag={!readOnly ? { scale: 1.03, zIndex: 50, rotate: 1 } : {}}
                          style={{
                            width: widthStyle,
                            left: leftStyle,
                            top: '4px',
                            bottom: '4px'
                          }}
                          className={`absolute rounded-xl shadow-sm border overflow-hidden bg-white dark:bg-slate-800 flex flex-col pointer-events-auto ${hasConflict ? 'border-rose-500 ring-2 ring-rose-400/40 dark:ring-rose-500/30' : ''} ${!readOnly ? 'cursor-grab active:cursor-grabbing group/card' : ''} ${activeDragId === cls.id ? 'opacity-80 shadow-2xl z-50' : ''}`}
                        >
                          <div className="h-1.5 w-full shrink-0 flex items-center justify-between" style={{ backgroundColor: cls.color === '#ffffff' ? '#94a3b8' : cls.color }}>
                            {hasConflict && (
                              <span className="bg-rose-600 text-white text-[8px] font-black px-1 rounded-br uppercase tracking-tight flex items-center gap-0.5 shadow-sm">
                                <AlertTriangle className="h-2 w-2" /> Cruce ({overlapIndex + 1}/{totalOverlaps})
                              </span>
                            )}
                          </div>
                          {!readOnly && (
                            <button onClick={(e) => { e.stopPropagation(); deleteSlot(cls.id); }} className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/80 hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover/card:opacity-100 z-20" title="Eliminar clase">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                          <div className="p-2 flex-1 flex flex-col justify-between relative overflow-hidden">
                            <div>
                              <h4 className="text-[12px] leading-tight font-extrabold text-slate-800 dark:text-slate-100 pr-2 line-clamp-2" title={cls.subject}>{cls.subject}</h4>
                              {entityType !== 'teacher' && (
                                <p className="text-[9px] font-medium text-slate-500 flex items-center gap-1 mt-0.5 truncate" title={cls.teacher}><User className="h-2.5 w-2.5 shrink-0" /> <span className="truncate">{cls.teacher}</span></p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1 pt-0.5 border-t border-slate-100 dark:border-slate-700">
                              <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-0.5 truncate"><MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" /> <span className="truncate">{cls.room || 'Aula'}</span></p>
                              <span className="text-[10px] px-1 py-[1px] bg-slate-200/60 dark:bg-slate-700/60 rounded text-slate-800 dark:text-slate-100 font-black uppercase tracking-wider shadow-sm truncate max-w-[65px]" title={cls.group}>{cls.group}</span>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )
                  })
                })()}
            </div>
            {idx !== DAYS.length - 1 && <div className="border-b border-slate-200 dark:border-slate-700" />}
          </React.Fragment>
          )})}
          </div>
          
          {/* BANDEJA DE BLOQUES NO ASIGNADOS (DRAG & DROP) */}
          {!readOnly && unassignedBlocks.length > 0 && (
            <div className="mt-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Bloques Pendientes por Asignar ({unassignedBlocks.length})
              </h3>
              <div className="flex flex-wrap gap-3">
                {unassignedBlocks.map((b, idx) => {
                  const bId = getUnassignedId(b, idx)
                  return (
                    <motion.div
                      key={bId}
                      drag
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      dragElastic={1}
                      onDragStart={() => setActiveDragId(bId)}
                      onDragEnd={async (event, info) => {
                        setActiveDragId(null)
                        const el = event.target as HTMLElement;
                        const originalPointerEvents = el.style.pointerEvents;
                        el.style.pointerEvents = 'none';
                        const elementsUnderCursor = document.elementsFromPoint(info.point.x, info.point.y);
                        el.style.pointerEvents = originalPointerEvents;
                        const dropZone = elementsUnderCursor.find(e => e.getAttribute('data-drop-day'));
                        
                        if (dropZone) {
                          const isValid = dropZone.getAttribute('data-drop-valid') !== 'false';
                          if (!isValid) {
                            toast.error("Movimiento inválido: Cruce de horarios o incumplimiento de reglas (ej. 7ma hora).");
                            return;
                          }
                          const targetDay = dropZone.getAttribute('data-drop-day');
                          const targetPeriod = parseInt(dropZone.getAttribute('data-drop-period') || '0', 10);
                          
                          if (targetDay && targetPeriod) {
                            setLoading(true)
                            const toInsert = [{
                              day_of_week: targetDay,
                              period_id: targetPeriod,
                              group_id: b.group_id,
                              subject_id: b.subject_id,
                              teacher_id: b.teacher_id || null,
                              duration: b.duration || 1
                            }]
                            const res = await saveScheduleSlotsAction(toInsert)
                            if (res.success) {
                              fetchSchedule()
                              
                              // Remove from unassignedBlocks memory
                              const newUnassigned = unassignedBlocks.filter((_, i) => i !== idx)
                              setUnassignedBlocks(newUnassigned)
                              localStorage.setItem(`sch_local_unassigned_${entityId}`, JSON.stringify(newUnassigned))
                              
                              // Update global memory as well to keep Master view in sync
                              try {
                                const storedGlobal = localStorage.getItem('sch_global_unassigned')
                                if (storedGlobal) {
                                  let globalBlocks = JSON.parse(storedGlobal)
                                  globalBlocks = globalBlocks.filter((gb: any) => 
                                    !(gb.group_id === b.group_id && gb.subject_id === b.subject_id && gb.teacher_id === b.teacher_id)
                                  )
                                  localStorage.setItem('sch_global_unassigned', JSON.stringify(globalBlocks))
                                }
                              } catch(e) {}
                              
                            } else {
                              toast.error(`Error al asignar: ${res.error}`)
                              setLoading(false)
                            }
                          }
                        }
                      }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileDrag={{ scale: 1.05, zIndex: 50, rotate: 2 }}
                      className={`relative w-32 h-16 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col pointer-events-auto cursor-grab active:cursor-grabbing overflow-hidden ${activeDragId === bId ? 'opacity-80 shadow-2xl z-50' : ''}`}
                    >
                      <div className="h-1 w-full bg-amber-400 shrink-0" />
                      <div className="p-1.5 flex-1 flex flex-col justify-center text-center">
                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{b.subject_name || b.subject_id}</p>
                        <p className="text-[9px] text-slate-500 truncate">{entityType === 'group' ? (b.teacher_name || 'Sin docente') : (b.group_name || b.group_id)}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
          
        </div>
      </div>
      
      <SlotEditorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={entityType === 'group' ? entityId : ''} // Solo se permite añadir en modo grupo por ahora
        day={selectedDay}
        periodId={selectedPeriod}
        onSave={() => { fetchSchedule(); setIsModalOpen(false) }}
      />
      </div>
      
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
      
      {/* Componente Oculto para Impresión Nativa (Solo visible en Print) */}
      <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:z-[99999] w-full">
        <PrintableSchedule 
          groupName={entityName || 'Sin Nombre'}
          directorName={directorName}
          isTeacherView={entityType === 'teacher'}
          classes={classes.map(cls => {
            if (!printDate) return cls;
            const sub = activeSubstitutions.find(s => s.original_schedule_slot_id === cls.id);
            if (sub) {
              if (sub.status === 'CANCELLED') {
                return { ...cls, teacher: '(CLASE CANCELADA)', color: '#fca5a5' }
              } else if (sub.substitute) {
                return { ...cls, teacher: `(Cubierto por: ${sub.substitute.name})`, color: '#fcd34d' } // Muted orange/yellow para el docente ausente
              }
            }
            return cls;
          })}
          timeSlots={timeSlots}
          groupMax={entityType === 'group' ? (JSON.parse(localStorage.getItem('sch_group_periods') || '{}')[entityId] || parseInt(JSON.parse(localStorage.getItem('sch_settings') || '{}').periodsPerDay || '7', 10)) : parseInt(JSON.parse(localStorage.getItem('sch_settings') || '{}').periodsPerDay || '7', 10)}
        />
      </div>
      </div>
    </>
  )
}
