'use server'

import { createAdminClient } from '@/core/config/supabase/server'
import { getPlanillaStudentSession } from './studentAuthActions'
import { AssistedActivity } from './actions'

export interface StudentSubjectView {
  id: string
  name: string
  grade: number
  group_number: number
  period: string
  studentIdInSubject: string
  achievementsCount: number
}

function getCandidateDirectoryIds(session: { directoryId?: string; profileId?: string | null }): string[] {
  const ids = new Set<string>()
  if (session.directoryId) {
    ids.add(session.directoryId)
    ids.add(`prof-${session.directoryId}`)
    ids.add(`dir-${session.directoryId}`)
  }
  if (session.profileId) {
    ids.add(session.profileId)
    ids.add(`prof-${session.profileId}`)
    ids.add(`dir-${session.profileId}`)
  }
  return Array.from(ids)
}

export async function getStudentSubjects(): Promise<StudentSubjectView[]> {
  const session = await getPlanillaStudentSession()
  if (!session) throw new Error('No autorizado')

  const supabase = createAdminClient()
  const trimmedFullName = session.fullName.trim()
  const candidateIds = getCandidateDirectoryIds(session)

  // 1. Obtener todas las inscripciones en planillas asistidas de este estudiante
  let enrollments: Array<{ id: string; subject_id: string }> = []

  if (candidateIds.length > 0) {
    const { data: byDir, error: dirError } = await supabase
      .from('assisted_students')
      .select('id, subject_id')
      .in('directory_id', candidateIds)

    if (!dirError && byDir) {
      enrollments.push(...byDir)
    }
  }

  if (trimmedFullName) {
    const { data: byName, error: nameError } = await supabase
      .from('assisted_students')
      .select('id, subject_id')
      .ilike('full_name', trimmedFullName)

    if (!nameError && byName) {
      for (const item of byName) {
        if (!enrollments.some(e => e.id === item.id)) {
          enrollments.push(item)
        }
      }
    }
  }

  // 1.5 Si no hay inscripciones o para garantizar que vea todas las materias creadas de su grado y grupo:
  let gradeNum: number | undefined = undefined
  let groupNum: number | undefined = undefined

  const cleanGrade = (session.gradeLevel || '').trim()
  const cleanGroup = (session.groupName || '').trim()

  if (/pfc[\s\-_]?12/i.test(cleanGrade) || /pfc[\s\-_]?12/i.test(cleanGroup)) {
    gradeNum = 12
    groupNum = 1
  } else if (/pfc[\s\-_]?13/i.test(cleanGrade) || /pfc[\s\-_]?13/i.test(cleanGroup)) {
    gradeNum = 13
    const explicitGrp = cleanGroup.replace(/\D/g, '')
    groupNum = explicitGrp && explicitGrp !== '13' ? parseInt(explicitGrp, 10) : 1
  } else if (/nivelat/i.test(cleanGrade) || /nivelat/i.test(cleanGroup)) {
    gradeNum = 0
    groupNum = 1
  } else {
    if (cleanGrade) {
      const d = cleanGrade.replace(/\D/g, '')
      if (d) gradeNum = parseInt(d, 10)
    }
    if (cleanGroup) {
      const d = cleanGroup.replace(/\D/g, '')
      if (d) groupNum = parseInt(d, 10)
    }
  }

  let cohortSubjectList: Array<{ id: string; name: string; grade: number; group_number: number; period: string }> = []
  if (gradeNum !== undefined) {
    let q = supabase
      .from('assisted_subjects')
      .select('id, name, grade, group_number, period')
      .eq('grade', gradeNum)
      .order('period', { ascending: false })

    if (groupNum !== undefined) {
      q = q.or(`group_number.eq.${groupNum},group_number.is.null`)
    }
    const { data: cData } = await q
    if (cData) cohortSubjectList = cData as typeof cohortSubjectList
  }

  // Unificar materias por ID
  const allSubjectMap = new Map<string, { id: string; name: string; grade: number; group_number: number; period: string; studentIdInSubject: string }>()

  // A. Primero las materias con inscripción confirmada
  if (enrollments.length > 0) {
    const enrolledIds = Array.from(new Set(enrollments.map(e => e.subject_id)))
    const { data: explicitSubs } = await supabase
      .from('assisted_subjects')
      .select('id, name, grade, group_number, period')
      .in('id', enrolledIds)
      .order('period', { ascending: false })

    for (const sub of explicitSubs || []) {
      const enId = enrollments.find(e => e.subject_id === sub.id)?.id || ''
      allSubjectMap.set(sub.id, { ...sub, studentIdInSubject: enId })
    }
  }

  // B. Luego incorporar materias de la cohorte institucional (12, 13, Nivelatorio, etc.)
  for (const sub of cohortSubjectList) {
    if (!allSubjectMap.has(sub.id)) {
      allSubjectMap.set(sub.id, { ...sub, studentIdInSubject: '' })
    }
  }

  if (allSubjectMap.size === 0) return []

  const finalSubjects = Array.from(allSubjectMap.values())
  const finalSubjectIds = finalSubjects.map(s => s.id)

  // 3. Obtener el conteo de logros para estas materias
  const { data: achievements } = await supabase
    .from('assisted_achievements')
    .select('id, subject_id')
    .in('subject_id', finalSubjectIds)

  const achievementCounts = new Map<string, number>()
  if (achievements) {
    achievements.forEach(a => {
      achievementCounts.set(a.subject_id, (achievementCounts.get(a.subject_id) || 0) + 1)
    })
  }

  return finalSubjects.map(sub => ({
    ...sub,
    achievementsCount: achievementCounts.get(sub.id) || 0
  }))
}

export async function getStudentGradesView(subjectId: string) {
  if (!subjectId) throw new Error('Materia no especificada')

  const session = await getPlanillaStudentSession()
  if (!session) throw new Error('No autorizado')

  const supabase = createAdminClient()
  const trimmedFullName = session.fullName.trim()
  const candidateIds = getCandidateDirectoryIds(session)

  // 1. Validar pertenencia a la materia
  let enrollment: { id: string; number: number } | null = null

  if (candidateIds.length > 0) {
    const { data: byDir, error: dirError } = await supabase
      .from('assisted_students')
      .select('id, number')
      .eq('subject_id', subjectId)
      .in('directory_id', candidateIds)
      .limit(1)
      .maybeSingle()

    if (!dirError && byDir) {
      enrollment = byDir
    }
  }

  if (!enrollment && trimmedFullName) {
    const { data: byName, error: nameError } = await supabase
      .from('assisted_students')
      .select('id, number')
      .eq('subject_id', subjectId)
      .ilike('full_name', trimmedFullName)
      .limit(1)
      .maybeSingle()

    if (!nameError && byName) {
      enrollment = byName
    }
  }

  // Respaldo adicional con búsqueda difusa por si hay diferencias de espaciado o acentos
  if (!enrollment && trimmedFullName) {
    const { data: byFuzzy } = await supabase
      .from('assisted_students')
      .select('id, number')
      .eq('subject_id', subjectId)
      .ilike('full_name', `%${trimmedFullName}%`)
      .limit(1)

    if (byFuzzy && byFuzzy.length > 0) {
      enrollment = byFuzzy[0]
    }
  }

  // Si no está explícitamente en assisted_students, validar si la materia es de su cohorte
  if (!enrollment) {
    const { data: targetSub } = await supabase
      .from('assisted_subjects')
      .select('id, grade, group_number')
      .eq('id', subjectId)
      .maybeSingle()

    if (targetSub) {
      enrollment = { id: `pending-${session.directoryId || 'temp'}`, number: 0 }
    }
  }

  if (!enrollment) {
    console.warn(`[getStudentGradesView] Student not enrolled or not found in subject ${subjectId}: directoryId=${session.directoryId}, name=${trimmedFullName}`)
    throw new Error('No estás inscrito en esta materia')
  }
  const myStudentId = enrollment.id

  // 2. Obtener Materia
  const { data: subject, error: subjError } = await supabase
    .from('assisted_subjects')
    .select('*')
    .eq('id', subjectId)
    .single()

  if (subjError || !subject) throw new Error('Error al obtener materia')

  // 3. Obtener Logros
  const { data: achievements, error: achError } = await supabase
    .from('assisted_achievements')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true })

  if (achError) throw new Error('Error al cargar logros')

  // 4. Obtener Actividades (solo las publicadas)
  let activities: AssistedActivity[] = []
  if (achievements && achievements.length > 0) {
    const achIds = achievements.map(a => a.id)
    const { data: acts, error: actError } = await supabase
      .from('assisted_activities')
      .select('*')
      .in('achievement_id', achIds)
      .eq('is_published', true)
      .order('position_order', { ascending: true })
    if (!actError && acts) activities = acts
  }

  // 5. Obtener Mis Notas (Solo mis notas)
  const { data: grades, error: gradeError } = await supabase
    .from('assisted_grades')
    .select('*')
    .eq('student_id', myStudentId)

  if (gradeError) throw new Error('Error al cargar calificaciones')

  return { subject, achievements: achievements || [], activities, grades: grades || [] }
}

import { generateTimeSlots } from '@/app/admin/schedules/utils/timeCalculator'
import { ScheduleData, ScheduleDayKey } from '@/components/schedule/DayTabsScheduleView'
import { resolveOfficialGroup } from './groupResolver'

export interface StudentScheduleResponse {
  success: boolean
  hasGroup: boolean
  isPublished: boolean
  groupName: string
  groupId: string | null
  schedule: ScheduleData
  error?: string
}

/**
 * Consulta de forma segura el horario del grupo matriculado del estudiante.
 * El estudiante NO envía group_id, se resuelve desde su sesión activa.
 */
export async function getStudentGroupSchedule(): Promise<StudentScheduleResponse> {
  const session = await getPlanillaStudentSession()
  if (!session) {
    throw new Error('No autorizado. Debes iniciar sesión con tu documento.')
  }

  const emptySchedule: ScheduleData = {
    lunes: [],
    martes: [],
    miercoles: [],
    jueves: [],
    viernes: []
  }

  const supabase = createAdminClient()
  let targetGroupId = session.groupId
  let targetGroupName = session.groupName || ''

  // Si groupId no estaba en sesión o no ha sido resuelto, buscarlo dinámicamente
  if (!targetGroupId) {
    const { data: allGroups } = await supabase.from('sch_groups').select('id, name')

    if (allGroups && allGroups.length > 0) {
      let resolved = resolveOfficialGroup(allGroups, session.gradeLevel, session.groupName)

      if (!resolved) {
        const assistedSubIds: string[] = []
        const candidateIds = getCandidateDirectoryIds(session)
        if (candidateIds.length > 0) {
          const { data: byDir } = await supabase
            .from('assisted_students')
            .select('subject_id')
            .in('directory_id', candidateIds)
            .limit(5)
          if (byDir) assistedSubIds.push(...byDir.map(r => r.subject_id).filter(Boolean))
        }

        if (assistedSubIds.length === 0 && session.fullName) {
          const { data: byName } = await supabase
            .from('assisted_students')
            .select('subject_id')
            .ilike('full_name', session.fullName.trim())
            .limit(5)
          if (byName) assistedSubIds.push(...byName.map(r => r.subject_id).filter(Boolean))
        }

        if (assistedSubIds.length > 0) {
          const { data: subData } = await supabase
            .from('assisted_subjects')
            .select('grade, group_number')
            .in('id', assistedSubIds)
            .limit(1)
            .single()

          if (subData) {
            resolved = resolveOfficialGroup(allGroups, `${subData.grade}°`, `${subData.group_number}`)
          }
        }
      }

      if (resolved) {
        targetGroupId = resolved.groupId
        targetGroupName = resolved.groupName
      }
    }
  }

  if (!targetGroupId) {
    return {
      success: true,
      hasGroup: false,
      isPublished: false,
      groupName: targetGroupName || session.groupName || 'Sin grupo asignado',
      groupId: null,
      schedule: emptySchedule
    }
  }

  // Obtener los slots del horario oficial para este grupo
  const { data: slots, error } = await supabase
    .from('sch_schedule_slots')
    .select(`
      id,
      day_of_week,
      period_id,
      duration,
      group_id,
      subject_id,
      teacher_id,
      group:sch_groups(id, name),
      teacher:academic_teachers(id, full_name),
      subject:sch_subjects(id, name, color, room_type),
      classroom:sch_classrooms(id, name)
    `)
    .eq('group_id', targetGroupId)
    .order('period_id', { ascending: true })

  if (error) {
    console.error('Error al consultar horario de grupo para estudiante:', error)
    return {
      success: false,
      hasGroup: true,
      isPublished: false,
      groupName: session.groupName || '',
      groupId: targetGroupId,
      schedule: emptySchedule,
      error: 'Error al consultar el horario en la base de datos.'
    }
  }

  if (!slots || slots.length === 0) {
    return {
      success: true,
      hasGroup: true,
      isPublished: false,
      groupName: session.groupName || '',
      groupId: targetGroupId,
      schedule: emptySchedule
    }
  }

  // Obtener franjas horarias configuradas en Ajustes (o estándar institucional)
  const { data: periodConstraint } = await supabase
    .from('sch_constraints')
    .select('parameters')
    .eq('rule_type', 'GENERAL_SCHEDULE_PERIODS')
    .eq('is_active', true)
    .maybeSingle()

  const customPeriods = periodConstraint?.parameters?.periods
  const startHour = periodConstraint?.parameters?.startHour || '07:00'
  const blockDuration = periodConstraint?.parameters?.blockDuration || 55
  const periodsPerDay = periodConstraint?.parameters?.periodsPerDay || 7

  const defaultTimeSlots = generateTimeSlots(
    startHour, 
    blockDuration, 
    periodsPerDay, 
    [], 
    true, 
    customPeriods
  ).filter(s => s.type === 'period')

  const dayKeyMap: Record<number, ScheduleDayKey> = {
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes'
  }

  const formattedSchedule: ScheduleData = {
    lunes: [],
    martes: [],
    miercoles: [],
    jueves: [],
    viernes: []
  }

  for (const slot of (slots as any[])) {
    const dayKey = dayKeyMap[slot.day_of_week]
    if (!dayKey) continue

    const startSlot = defaultTimeSlots.find(t => t.id === slot.period_id)
    const endPeriod = slot.period_id + (slot.duration || 1) - 1
    const endSlot = defaultTimeSlots.find(t => t.id === endPeriod)

    formattedSchedule[dayKey].push({
      id: slot.id,
      startTime: startSlot?.startTime || `Bloque ${slot.period_id}`,
      endTime: endSlot?.endTime || startSlot?.endTime || '',
      subject: slot.subject?.name || 'Materia sin asignar',
      teacher: slot.teacher?.full_name || 'Trabajo Autónomo',
      location: slot.classroom?.name || undefined,
      group: slot.group?.name || session.groupName || undefined,
      period: slot.period_id,
      color: slot.subject?.color || '#059669'
    })
  }

  return {
    success: true,
    hasGroup: true,
    isPublished: true,
    groupName: session.groupName || (slots[0] as any)?.group?.name || '',
    groupId: targetGroupId,
    schedule: formattedSchedule
  }
}
