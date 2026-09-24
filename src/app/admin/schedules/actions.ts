'use server'

import { createAdminClient } from '@/core/config/supabase/server'

export async function saveMultiTeacherCurriculumAction(params: {
  selectedSubId: string
  selectedTeacherIds: string[]
  teacherHoursMap: Record<string, number>
  isOfficialWorkload: boolean
  editingMultiTeacherSubId: string | null
}) {
  try {
    const adminClient = createAdminClient()

    // 1. Get or create DOCENTES_INSTITUCIONAL group
    let targetGroupId: string | null = null
    const { data: existingGrp } = await adminClient
      .from('sch_groups')
      .select('id')
      .eq('name', 'DOCENTES_INSTITUCIONAL')
      .maybeSingle()

    if (existingGrp) {
      targetGroupId = existingGrp.id
    } else {
      const { data: newGrp, error: newGrpErr } = await adminClient
        .from('sch_groups')
        .insert([{ name: 'DOCENTES_INSTITUCIONAL', level: 'Secundaria' }])
        .select('id')
        .single()

      if (newGrpErr) {
        return { error: `Error creando grupo institucional: ${newGrpErr.message}` }
      }
      if (newGrp) targetGroupId = newGrp.id
    }

    if (!targetGroupId) {
      return { error: "No se pudo obtener el ID del grupo de docentes institucionales." }
    }

    // 2. Delete existing curriculum rows for this subject in the institutional group
    const subIdToDelete = params.editingMultiTeacherSubId || params.selectedSubId
    const { error: delErr } = await adminClient
      .from('sch_curriculum')
      .delete()
      .eq('group_id', targetGroupId)
      .eq('subject_id', subIdToDelete)

    if (delErr) {
      return { error: `Error al eliminar asignaciones anteriores: ${delErr.message}` }
    }

    // 3. Insert one row per selected teacher with their individual hours
    const inserts = params.selectedTeacherIds.map(tid => ({
      group_id: targetGroupId,
      subject_id: params.selectedSubId,
      teacher_id: tid,
      hours_per_week: params.teacherHoursMap[tid] || 1,
    }))

    const { error: insErr } = await adminClient
      .from('sch_curriculum')
      .insert(inserts)

    if (insErr) {
      return { error: `Error insertando en la malla: ${insErr.message}` }
    }

    // 4. Sync MULTI_TEACHER_WORKLOAD_CONFIG in sch_constraints
    const { data: workloadConfig } = await adminClient
      .from('sch_constraints')
      .select('*')
      .eq('rule_type', 'MULTI_TEACHER_WORKLOAD_CONFIG')
      .maybeSingle()

    let currentNormalIds: string[] = workloadConfig?.parameters?.normal_workload_subject_ids || []
    if (params.isOfficialWorkload) {
      if (!currentNormalIds.includes(params.selectedSubId)) {
        currentNormalIds = [...currentNormalIds, params.selectedSubId]
      }
    } else {
      currentNormalIds = currentNormalIds.filter(id => id !== params.selectedSubId)
    }

    if (workloadConfig?.id) {
      await adminClient
        .from('sch_constraints')
        .update({
          is_active: true,
          parameters: { normal_workload_subject_ids: currentNormalIds }
        })
        .eq('id', workloadConfig.id)
    } else {
      await adminClient
        .from('sch_constraints')
        .insert([{
          rule_type: 'MULTI_TEACHER_WORKLOAD_CONFIG',
          is_active: true,
          parameters: { normal_workload_subject_ids: currentNormalIds }
        }])
    }

    return { success: true }
  } catch (e: any) {
    console.error("Excepción en saveMultiTeacherCurriculumAction:", e)
    return { error: e.message || 'Error inesperado en el servidor.' }
  }
}

export async function deleteMultiTeacherCurriculumAction(rowIds: string[]) {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('sch_curriculum').delete().in('id', rowIds)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

/**
 * Obtiene las mallas curriculares con sus relaciones hacia grupos, asignaturas y perfiles de docentes.
 * Utiliza el adminClient para bypass de RLS y garantizar compatibilidad con public.profiles.
 */
export async function getCurriculumAction(groupId?: string): Promise<{
  success: boolean
  data: any[]
  error?: string
}> {
  try {
    const adminClient = createAdminClient()
    let query = adminClient
      .from('sch_curriculum')
      .select('*, group:sch_groups(name), subject:sch_subjects(name, is_academic_workload), teacher:profiles(id, first_name, last_name)')

    if (groupId) {
      query = query.eq('group_id', groupId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error en getCurriculumAction:', error)
      return { success: false, data: [], error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (e: any) {
    console.error('Excepción en getCurriculumAction:', e)
    return { success: false, data: [], error: e.message || 'Error inesperado al consultar la malla curricular.' }
  }
}

/**
 * Obtiene la lista de IDs de materias configuradas en bloque (2h continuas).
 */
export async function getBlockSubjectsAction(): Promise<{
  success: boolean
  subjectIds: string[]
  error?: string
}> {
  try {
    const adminClient = createAdminClient()
    const { data: constraint, error } = await adminClient
      .from('sch_constraints')
      .select('parameters')
      .eq('rule_type', 'BLOCK_SUBJECTS_CONFIG')
      .maybeSingle()

    if (error) {
      return { success: false, subjectIds: [], error: error.message }
    }

    if (constraint?.parameters?.subject_ids && Array.isArray(constraint.parameters.subject_ids)) {
      return { success: true, subjectIds: constraint.parameters.subject_ids }
    }

    return { success: true, subjectIds: [] }
  } catch (e: any) {
    return { success: false, subjectIds: [], error: e.message }
  }
}

/**
 * Guarda las materias configuradas en bloque (2h continuas) en sch_constraints.
 */
export async function saveBlockSubjectsAction(subjectIds: string[]): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const adminClient = createAdminClient()
    const { data: existingBlock } = await adminClient
      .from('sch_constraints')
      .select('id')
      .eq('rule_type', 'BLOCK_SUBJECTS_CONFIG')
      .maybeSingle()

    if (existingBlock) {
      const { error: updErr } = await adminClient
        .from('sch_constraints')
        .update({ parameters: { subject_ids: subjectIds }, is_active: true })
        .eq('id', existingBlock.id)

      if (updErr) return { success: false, error: updErr.message }
    } else {
      const { error: insErr } = await adminClient
        .from('sch_constraints')
        .insert({
          rule_type: 'BLOCK_SUBJECTS_CONFIG',
          target_entity_type: 'GLOBAL',
          target_entity_id: null,
          parameters: { subject_ids: subjectIds },
          weight: 'STRICT',
          is_active: true
        })

      if (insErr) return { success: false, error: insErr.message }
    }

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export interface GeneralSchedulePeriodsConfig {
  periods: Array<{
    period: number
    name: string
    startTime: string
    endTime: string
  }>
  startHour?: string
  blockDuration?: number
  periodsPerDay?: number
  breaks?: Array<{
    id: string
    name: string
    afterPeriod: number
    durationMinutes: number
  }>
}

/**
 * Obtiene la configuración de horas y periodos del horario general desde sch_constraints.
 */
export async function getGeneralSchedulePeriodsAction(): Promise<{
  success: boolean
  config?: GeneralSchedulePeriodsConfig
  error?: string
}> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('sch_constraints')
      .select('parameters')
      .eq('rule_type', 'GENERAL_SCHEDULE_PERIODS')
      .eq('is_active', true)
      .maybeSingle()

    if (error) return { success: false, error: error.message }
    if (data?.parameters) {
      return { success: true, config: data.parameters as GeneralSchedulePeriodsConfig }
    }
    return { success: true, config: undefined }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Guarda la configuración de inicio y fin de horas del horario general en sch_constraints.
 */
export async function saveGeneralSchedulePeriodsAction(
  config: GeneralSchedulePeriodsConfig
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const adminClient = createAdminClient()
    const { data: existing } = await adminClient
      .from('sch_constraints')
      .select('id')
      .eq('rule_type', 'GENERAL_SCHEDULE_PERIODS')
      .maybeSingle()

    if (existing) {
      const { error: updErr } = await adminClient
        .from('sch_constraints')
        .update({ parameters: config, is_active: true })
        .eq('id', existing.id)

      if (updErr) return { success: false, error: updErr.message }
    } else {
      const { error: insErr } = await adminClient
        .from('sch_constraints')
        .insert({
          rule_type: 'GENERAL_SCHEDULE_PERIODS',
          target_entity_type: 'GLOBAL',
          target_entity_id: null,
          parameters: config,
          weight: 'STRICT',
          is_active: true
        })

      if (insErr) return { success: false, error: insErr.message }
    }

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}


