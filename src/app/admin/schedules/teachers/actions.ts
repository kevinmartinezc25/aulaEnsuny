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
