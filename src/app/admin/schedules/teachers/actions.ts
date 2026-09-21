'use server'

import { createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'

export async function linkTeacherProfile(academicTeacherId: string, profileId: string) {
  try {
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from('academic_teachers')
      .update({ profile_id: profileId })
      .eq('id', academicTeacherId)

    if (error) {
      console.error('Error linking teacher:', error)
      return { success: false, error: 'Error al vincular el docente en la base de datos' }
    }

    revalidatePath('/admin/schedules/teachers')
    return { success: true }
  } catch (err: any) {
    console.error('Action Error:', err)
    return { success: false, error: 'Error inesperado al vincular docente' }
  }
}

export async function unlinkTeacherProfile(academicTeacherId: string) {
  try {
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from('academic_teachers')
      .update({ profile_id: null })
      .eq('id', academicTeacherId)

    if (error) {
      console.error('Error unlinking teacher:', error)
      return { success: false, error: 'Error al desvincular el docente' }
    }

    revalidatePath('/admin/schedules/teachers')
    return { success: true }
  } catch (err: any) {
    console.error('Action Error:', err)
    return { success: false, error: 'Error inesperado al desvincular docente' }
  }
}

/**
 * Elimina un docente obsoleto del sistema académico.
 * Solo es posible si el docente NO tiene cuenta vinculada y NO tiene
 * clases activas en el horario (sch_schedule_slots).
 */
export async function removeObsoleteTeacherAction(
  academicTeacherId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 1. Verificar que no tenga cuenta vinculada
    const { data: teacher } = await supabase
      .from('academic_teachers')
      .select('id, full_name, profile_id')
      .eq('id', academicTeacherId)
      .single()

    if (!teacher) return { success: false, error: 'Docente no encontrado.' }
    if (teacher.profile_id) {
      return {
        success: false,
        error: 'No se puede eliminar: el docente tiene una cuenta de acceso vinculada. Desvincula primero la cuenta.'
      }
    }

    // 2. Verificar que no tenga slots activos en el horario
    const { count } = await supabase
      .from('sch_schedule_slots')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', academicTeacherId)

    if (count && count > 0) {
      return {
        success: false,
        error: `No se puede eliminar: ${teacher.full_name} tiene ${count} clase(s) asignada(s) en el horario activo.`
      }
    }

    // 3. Eliminar asignaciones académicas huérfanas del docente
    await supabase
      .from('academic_assignments')
      .delete()
      .eq('teacher_id', academicTeacherId)

    // 4. Eliminar el registro del docente
    const { error: deleteError } = await supabase
      .from('academic_teachers')
      .delete()
      .eq('id', academicTeacherId)

    if (deleteError) throw new Error(deleteError.message)

    revalidatePath('/admin/schedules/teachers')
    return { success: true }
  } catch (err: any) {
    console.error('Error eliminando docente obsoleto:', err)
    return { success: false, error: err.message || 'Error inesperado al eliminar docente' }
  }
}
