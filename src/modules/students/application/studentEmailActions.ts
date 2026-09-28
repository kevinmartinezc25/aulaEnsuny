'use server'

import { createAdminClient, createClient } from '@/core/config/supabase/server'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'

export interface StudentEmailStatus {
  hasEmail: boolean
  email: string
  fullName: string
  profileId: string | null
  directoryId: string | null
  documentId: string | null
  hasCourses: boolean
}

/**
 * Consulta el estado del correo electrónico y cursos del estudiante activo,
 * verificando tanto la sesión de Supabase Auth como la sesión del portal por documento.
 */
export async function getStudentEmailStatus(): Promise<StudentEmailStatus> {
  const adminClient = createAdminClient()
  const authClient = await createClient()

  // 1. Obtener usuario de Supabase Auth o sesión del portal
  const { data: { user } } = await authClient.auth.getUser()
  const planillaSession = !user ? await getPlanillaStudentSession() : null

  let profileId: string | null = user?.id || planillaSession?.profileId || null
  let directoryId: string | null = planillaSession?.directoryId || null
  let documentId: string | null = planillaSession?.documentId || null
  let currentEmail = user?.email || ''
  let fullName = planillaSession?.fullName || ''

  // 2. Si tenemos profileId, consultar perfil en profiles
  if (profileId) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', profileId)
      .maybeSingle()

    if (profile) {
      if (!currentEmail && profile.email) currentEmail = profile.email
      if (!fullName) fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    }

    // Si aún no tenemos correo, consultar en student_contacts
    if (!currentEmail) {
      const { data: contact } = await adminClient
        .from('student_contacts')
        .select('student_email')
        .eq('student_id', profileId)
        .maybeSingle()
      if (contact?.student_email) currentEmail = contact.student_email
    }
  }

  // 3. Si no hay profileId o no hay correo, buscar por student_directory
  if (!currentEmail && directoryId) {
    const { data: dirStudent } = await adminClient
      .from('student_directory')
      .select('id, profile_id, document_id, first_name, last_name')
      .eq('id', directoryId)
      .maybeSingle()

    if (dirStudent) {
      if (!profileId && dirStudent.profile_id) profileId = dirStudent.profile_id
      if (!documentId && dirStudent.document_id) documentId = dirStudent.document_id
      if (!fullName) fullName = `${dirStudent.first_name || ''} ${dirStudent.last_name || ''}`.trim()
    }
  }

  // 4. Si aún no tenemos correo y tenemos documentId, buscar en student_details
  if (!currentEmail && documentId) {
    const cleanDoc = documentId.replace(/[^0-9a-zA-Z]/g, '')
    const { data: details } = await adminClient
      .from('student_details')
      .select('student_id')
      .or(`document_number.eq.${documentId},document_number.eq.${cleanDoc}`)
      .limit(1)
      .maybeSingle()

    if (details?.student_id && !profileId) {
      profileId = details.student_id
      const { data: contact } = await adminClient
        .from('student_contacts')
        .select('student_email')
        .eq('student_id', details.student_id)
        .maybeSingle()
      if (contact?.student_email) currentEmail = contact.student_email
    }
  }

  // 5. Verificar si tiene cursos asignados en student_courses
  let hasCourses = false
  if (profileId) {
    const { count } = await adminClient
      .from('student_courses')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', profileId)

    hasCourses = (count || 0) > 0
  }

  return {
    hasEmail: Boolean(currentEmail && currentEmail.trim().length > 0),
    email: currentEmail.trim(),
    fullName: fullName || 'Estudiante',
    profileId,
    directoryId,
    documentId,
    hasCourses
  }
}

/**
 * Guarda o actualiza el correo electrónico del estudiante,
 * sincronizando tanto profiles como auth.users (si existe cuenta).
 */
export async function saveOrUpdateStudentEmail(newEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = newEmail.trim().toLowerCase()
    
    // Validación de formato básico de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Por favor ingresa un correo electrónico válido.' }
    }

    const adminClient = createAdminClient()
    const authClient = await createClient()

    // 1. Obtener identidad actual
    const { data: { user } } = await authClient.auth.getUser()
    const planillaSession = !user ? await getPlanillaStudentSession() : null

    const profileId = user?.id || planillaSession?.profileId || null
    const directoryId = planillaSession?.directoryId || null
    const documentId = planillaSession?.documentId || null

    if (!profileId && !directoryId && !documentId) {
      return { success: false, error: 'No se pudo identificar la sesión del estudiante.' }
    }

    // 2. Verificar que el correo no esté ya asignado a OTRA cuenta distinta
    const { data: existingUser } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existingUser && existingUser.id !== profileId) {
      return {
        success: false,
        error: 'Este correo electrónico ya está registrado por otra cuenta en la plataforma.'
      }
    }

    // 3. Si tiene profileId (cuenta creada en profiles)
    if (profileId) {
      // 3.1 Actualizar profiles
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({ email: cleanEmail })
        .eq('id', profileId)

      if (profileError) {
        console.error('Error actualizando profiles.email:', profileError)
      }

      // 3.2 Sincronizar en auth.users de Supabase
      try {
        const { error: authError } = await adminClient.auth.admin.updateUserById(profileId, {
          email: cleanEmail,
          email_confirm: true
        })
        if (authError) {
          console.warn('Aviso sincronizando auth.users:', authError.message)
        }
      } catch (authErr) {
        console.warn('No se pudo actualizar auth.users directamente:', authErr)
      }

      // 3.3 Actualizar student_contacts si existe
      await adminClient
        .from('student_contacts')
        .upsert({
          student_id: profileId,
          student_email: cleanEmail
        }, { onConflict: 'student_id' })
    }

    // 4. Si el estudiante aún no tenía profileId pero tiene registro en student_directory
    if (!profileId && directoryId) {
      // Si profiles tiene campo id o profile_id vinculado
      const { data: dirStudent } = await adminClient
        .from('student_directory')
        .select('profile_id')
        .eq('id', directoryId)
        .maybeSingle()

      if (dirStudent?.profile_id) {
        await adminClient
          .from('profiles')
          .update({ email: cleanEmail })
          .eq('id', dirStudent.profile_id)

        try {
          await adminClient.auth.admin.updateUserById(dirStudent.profile_id, {
            email: cleanEmail,
            email_confirm: true
          })
        } catch(e) {}
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error al guardar correo del estudiante:', error)
    return { success: false, error: error.message || 'Error inesperado al guardar el correo.' }
  }
}
