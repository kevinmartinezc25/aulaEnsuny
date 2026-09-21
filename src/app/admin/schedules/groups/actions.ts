'use server'

import { createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'

export async function assignGroupDirector(groupId: string, profileId: string | null) {
  try {
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from('sch_groups')
      .update({ director_id: profileId })
      .eq('id', groupId)

    if (error) {
      console.error('Error assigning director:', error)
      return { success: false, error: 'Error al asignar el director de grupo' }
    }

    revalidatePath('/admin/schedules/groups')
    return { success: true }
  } catch (err: any) {
    console.error('Action Error:', err)
    return { success: false, error: 'Error inesperado' }
  }
}

export async function updateGroupLevel(groupId: string, level: string | null) {
  try {
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from('sch_groups')
      .update({ level })
      .eq('id', groupId)

    if (error) {
      console.error('Error updating level:', error)
      return { success: false, error: 'Error al actualizar el nivel del grupo' }
    }

    revalidatePath('/admin/schedules/groups')
    return { success: true }
  } catch (err: any) {
    console.error('Action Error:', err)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Elimina un grupo escolar. Solo se permite si el grupo no tiene cargas académicas asociadas.
 * Usado para limpiar grupos duplicados o corruptos generados por importaciones previas.
 */
export async function deleteGroupAction(groupId: string) {
  try {
    const supabase = createAdminClient()

    // Verificar si tiene cargas académicas asociadas
    const { count, error: checkError } = await supabase
      .from('academic_loads')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)

    if (checkError) return { success: false, error: 'Error al verificar el grupo' }

    if ((count ?? 0) > 0) {
      return {
        success: false,
        error: `Este grupo tiene ${count} carga(s) académica(s) asociada(s). Elimínalas primero desde el horario.`
      }
    }

    // Verificar slots de horario
    const { count: slotCount } = await supabase
      .from('sch_slots')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)

    if ((slotCount ?? 0) > 0) {
      return {
        success: false,
        error: `Este grupo tiene ${slotCount} entrada(s) de horario. Reimporta el horario con el cotejo correcto.`
      }
    }

    const { error } = await supabase
      .from('sch_groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      console.error('Error deleting group:', error)
      return { success: false, error: 'Error al eliminar el grupo' }
    }

    revalidatePath('/admin/schedules/groups')
    return { success: true }
  } catch (err: any) {
    console.error('deleteGroupAction Error:', err)
    return { success: false, error: 'Error inesperado' }
  }
}
