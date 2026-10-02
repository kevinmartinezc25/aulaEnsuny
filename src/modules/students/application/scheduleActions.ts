'use server'

import { createAdminClient, createClient } from '@/core/config/supabase/server'
import { ScheduleData, ScheduleDayKey } from '@/components/schedule/DayTabsScheduleView'
import { generateTimeSlots } from '@/app/admin/schedules/utils/timeCalculator'
import { resolveOfficialGroup } from '@/modules/planilla-asistida/application/groupResolver'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'

export interface StudentDashboardScheduleResponse {
  success: boolean
  hasGroup: boolean
  isPublished: boolean
  groupName: string
  groupId: string | null
  schedule: ScheduleData
  hasNovedadesToday?: boolean
  directoryGradeLevel?: string | null
  directoryGroupName?: string | null
  error?: string
}

export async function getStudentDashboardSchedule(): Promise<StudentDashboardScheduleResponse> {
  const supabase = createAdminClient()
  const authClient = await createClient()

  // 1. Obtener usuario autenticado o sesión del portal
  const { data: { user } } = await authClient.auth.getUser()
  const planillaSession = !user ? await getPlanillaStudentSession() : null
  
  if (!user && !planillaSession) {
    return {
      success: false,
      hasGroup: false,
      isPublished: false,
      groupName: '',
      groupId: null,
      schedule: { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [] },
      error: 'Usuario no autenticado'
    }
  }

  // 1.5 Verificar estado global de publicación
  const { data: publishedImports } = await supabase
    .from('academic_imports')
    .select('id')
    .eq('status', 'PUBLICADO')
    .limit(1)
  const isGloballyPublished = publishedImports && publishedImports.length > 0

  // 2. Resolver identidad y grupo del estudiante de manera robusta
  let docId: string | null = planillaSession?.documentId || null
  let activeGradeLevel = planillaSession?.gradeLevel || ''
  let activeGroupName = planillaSession?.groupName || ''
  let directoryData: any = null

  if (user) {
    // 2.1 Buscar detalles del perfil
    const { data: profileDetails } = await supabase
      .from('student_details')
      .select('document_number')
      .eq('student_id', user.id)
      .maybeSingle()

    if (profileDetails?.document_number) docId = profileDetails.document_number

    // 2.2 Buscar en directorio por profile_id
    const { data: dirByProfile } = await supabase
      .from('student_directory')
      .select('id, document_id, grade_level, group_name')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (dirByProfile) {
      directoryData = dirByProfile
      if (!docId && dirByProfile.document_id) docId = dirByProfile.document_id
      activeGradeLevel = dirByProfile.grade_level || ''
      activeGroupName = dirByProfile.group_name || ''
    }

    // 2.3 Si no se encontró por profile_id, buscar por documento
    if (!directoryData && docId) {
      const cleanDoc = docId.replace(/[^0-9a-zA-Z]/g, '')
      const { data: dirByDoc } = await supabase
        .from('student_directory')
        .select('id, document_id, grade_level, group_name')
        .or(`document_id.eq.${docId},document_id.eq.${cleanDoc}`)
        .limit(1)

      if (dirByDoc && dirByDoc.length > 0) {
        directoryData = dirByDoc[0]
        activeGradeLevel = directoryData.grade_level || ''
        activeGroupName = directoryData.group_name || ''
      }
    }

    // 2.4 Verificar matrícula activa en student_enrollments (tiene prioridad)
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('group_name, grade_level')
      .eq('student_id', user.id)
      .eq('enrollment_status', 'active')
      .order('academic_year', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (enrollment) {
      if (enrollment.group_name) activeGroupName = enrollment.group_name
      if (enrollment.grade_level) activeGradeLevel = enrollment.grade_level
    }
  }

  if (!activeGradeLevel || !activeGroupName) {
    return {
      success: true,
      hasGroup: false,
      isPublished: Boolean(isGloballyPublished),
      groupName: activeGroupName || 'Sin grupo asignado',
      groupId: null,
      directoryGradeLevel: activeGradeLevel || null,
      directoryGroupName: activeGroupName || null,
      schedule: { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [] }
    }
  }

  // 3. Resolver el grupo oficial
  const { data: allGroups } = await supabase.from('sch_groups').select('id, name')
  let targetGroupId: string | null = null
  let targetGroupName = activeGroupName

  if (allGroups && allGroups.length > 0) {
    const resolved = resolveOfficialGroup(allGroups, activeGradeLevel, activeGroupName)
    if (resolved) {
      targetGroupId = resolved.groupId
      targetGroupName = resolved.groupName
    }
  }

  if (!targetGroupId) {
    return {
      success: true,
      hasGroup: false,
      isPublished: Boolean(isGloballyPublished),
      groupName: targetGroupName,
      groupId: null,
      directoryGradeLevel: activeGradeLevel,
      directoryGroupName: activeGroupName,
      schedule: { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [] }
    }
  }

  // 4. Consultar el horario del grupo (horario regular y novedades de hoy)
  const emptySchedule: ScheduleData = {
    lunes: [], martes: [], miercoles: [], jueves: [], viernes: []
  }

  // Obtenemos la fecha actual en formato YYYY-MM-DD local (Bogotá/Colombia)
  const todayBogotaStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  const bogotaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const bogotaDow = bogotaDate.getDay() // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes

  const [regularRes, overridesRes] = await Promise.all([
    supabase
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
      .order('period_id', { ascending: true }),
    supabase
      .from('sch_daily_overrides')
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
      .eq('target_date', todayBogotaStr)
      .eq('group_id', targetGroupId)
      .order('period_id', { ascending: true })
  ])

  const slots = regularRes.data || []
  const overrideSlots = overridesRes.data || []

  if (regularRes.error) {
    console.error('Error al consultar horario de grupo para estudiante:', regularRes.error)
  }

  if (slots.length === 0 && overrideSlots.length === 0) {
    return {
      success: true,
      hasGroup: true,
      isPublished: Boolean(isGloballyPublished),
      groupName: targetGroupName,
      groupId: targetGroupId,
      directoryGradeLevel: activeGradeLevel,
      directoryGroupName: activeGroupName,
      schedule: emptySchedule,
      hasNovedadesToday: false
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

  const normalizeDayToKey = (day: any): ScheduleDayKey | null => {
    if (!day) return null
    const str = day.toString().toLowerCase().trim()
    const map: Record<string, ScheduleDayKey> = {
      '1': 'lunes', 'lunes': 'lunes',
      '2': 'martes', 'martes': 'martes',
      '3': 'miercoles', 'miércoles': 'miercoles',
      '4': 'jueves', 'jueves': 'jueves',
      '5': 'viernes', 'viernes': 'viernes'
    }
    return map[str] || null
  }

  let finalSlots = slots as any[]
  let hasNovedadesToday = false

  const normalizeDay = (day: any): string => {
    if (!day) return ''
    const d = day.toString().trim()
    const map: Record<string, string> = {
      'lunes': '1', 'martes': '2', 'miércoles': '3', 'miercoles': '3', 'jueves': '4', 'viernes': '5',
      '1': '1', '2': '2', '3': '3', '4': '4', '5': '5'
    }
    return map[d.toLowerCase()] || d
  }

  if (overrideSlots && overrideSlots.length > 0) {
    hasNovedadesToday = true
    const todayDayOfWeek = normalizeDay(overrideSlots[0].day_of_week)
    const filteredRegular = finalSlots.filter(s => normalizeDay(s.day_of_week) !== todayDayOfWeek)

    const mappedOverrides = overrideSlots.map(s => {
      const isIdentical = finalSlots.some(r => 
        normalizeDay(r.day_of_week) === normalizeDay(s.day_of_week) &&
        r.period_id?.toString() === s.period_id?.toString() &&
        r.teacher_id === s.teacher_id &&
        r.subject_id === s.subject_id &&
        (r.classroom as any)?.name === (s.classroom as any)?.name
      )
      return { ...s, isNovedad: !isIdentical }
    })

    finalSlots = [...filteredRegular, ...mappedOverrides]
  }

  const formattedSchedule: ScheduleData = {
    lunes: [], martes: [], miercoles: [], jueves: [], viernes: []
  }

  for (const slot of finalSlots) {
    const dayKey = normalizeDayToKey(slot.day_of_week)
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
      group: slot.group?.name || targetGroupName || undefined,
      period: slot.period_id,
      color: slot.subject?.color || '#059669',
      isNovedad: slot.isNovedad || false
    })
  }

  return {
    success: true,
    hasGroup: true,
    isPublished: true,
    groupName: targetGroupName || (slots[0] as any)?.group?.name || '',
    groupId: targetGroupId,
    directoryGradeLevel: activeGradeLevel,
    directoryGroupName: activeGroupName,
    schedule: formattedSchedule,
    hasNovedadesToday
  }
}
