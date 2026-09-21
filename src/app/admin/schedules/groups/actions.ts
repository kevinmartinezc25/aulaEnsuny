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
