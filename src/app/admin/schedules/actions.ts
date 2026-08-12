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
