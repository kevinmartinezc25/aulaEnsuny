'use server'

import { createAdminClient, createClient } from '@/core/config/supabase/server'
import { ScheduleData, ScheduleDayKey } from '@/components/schedule/DayTabsScheduleView'
import { generateTimeSlots } from '@/app/admin/schedules/utils/timeCalculator'
import { resolveOfficialGroup } from '@/modules/planilla-asistida/application/groupResolver'

export interface StudentDashboardScheduleResponse {
  success: boolean
  hasGroup: boolean
  isPublished: boolean
  groupName: string
  groupId: string | null
  schedule: ScheduleData
  directoryGradeLevel?: string | null
  directoryGroupName?: string | null
  error?: string
}

export async function getStudentDashboardSchedule(): Promise<StudentDashboardScheduleResponse> {
  const supabase = createAdminClient()
  const authClient = await createClient()

  // 1. Obtener usuario autenticado
  const { data: { user }, error: userError } = await authClient.auth.getUser()
  
  if (userError || !user) {
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
  let docId: string | null = null
  let activeGradeLevel = ''
  let activeGroupName = ''
  let directoryData: any = null

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

  // 4. Consultar el horario del grupo
  const emptySchedule: ScheduleData = {
    lunes: [], martes: [], miercoles: [], jueves: [], viernes: []
  }

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
      isPublished: Boolean(isGloballyPublished),
      groupName: targetGroupName,
      groupId: targetGroupId,
      directoryGradeLevel: activeGradeLevel,
      directoryGroupName: activeGroupName,
      schedule: emptySchedule,
      error: 'Error al consultar el horario en la base de datos.'
    }
  }

  if (!slots || slots.length === 0) {
    return {
      success: true,
      hasGroup: true,
      isPublished: Boolean(isGloballyPublished),
      groupName: targetGroupName,
      groupId: targetGroupId,
      directoryGradeLevel: activeGradeLevel,
      directoryGroupName: activeGroupName,
      schedule: emptySchedule
    }
  }

  // Generar franjas horarias estándar de la institución
  const defaultTimeSlots = generateTimeSlots('07:00', 55, 7, [
    { id: '1', name: 'Recreo', afterPeriod: 4, durationMinutes: 30 }
  ], true).filter(s => s.type === 'period')

  const dayKeyMap: Record<number, ScheduleDayKey> = {
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes'
  }

  const formattedSchedule: ScheduleData = {
    lunes: [], martes: [], miercoles: [], jueves: [], viernes: []
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
      teacher: slot.teacher?.full_name || undefined,
      location: slot.classroom?.name || undefined,
      group: slot.group?.name || targetGroupName || undefined,
      period: slot.period_id,
      color: slot.subject?.color || '#059669'
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
    schedule: formattedSchedule
  }
}
