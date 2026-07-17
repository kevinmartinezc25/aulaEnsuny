'use server'

import { createAdminClient } from '@/core/config/supabase/server'

export async function selfRegisterStudent(data: {
  firstName: string
  lastName: string
  documentType: string
  documentNumber: string
  birthDate: string
  gradeLevel: string
  groupName: string
  email: string
  password: string
}) {
  try {
    const adminClient = createAdminClient()

    // 1. Crear el usuario en Supabase Auth usando la API de admin (confirmado por defecto)
    // El estudiante entra con la contraseña inicial que él mismo creó.
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        role_name: 'student',
        document_type: data.documentType,
        document_number: data.documentNumber.trim(),
        birth_date: data.birthDate
      }
    })

    if (createError) {
      return { success: false, error: createError.message }
    }

    if (!newUser.user) {
      return { success: false, error: 'No se pudo crear el usuario en Auth.' }
    }

    const studentId = newUser.user.id

    // 1.5 Actualizar Grado y Grupo en la tabla de perfiles (creada automáticamente por el Trigger)
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        grade_level: data.gradeLevel,
        group_name: data.groupName
      })
      .eq('id', studentId)

    if (profileError) {
      console.error('Error actualizando grado y grupo en profiles:', profileError)
    }

    // 2. Insertar los detalles mínimos en student_details para que aparezcan en la Ficha Académica del SuperAdmin
    const { error: detailsError } = await adminClient.from('student_details').insert({
      student_id: studentId,
      document_type: data.documentType,
      document_number: data.documentNumber.trim(),
      first_name: data.firstName.trim(),
      first_surname: data.lastName.trim(),
      birth_date: data.birthDate,
      gender: 'M', // Valor por defecto
      nationality: 'Colombiana' // Valor por defecto
    })

    if (detailsError) {
      console.error('Error insertando en student_details:', detailsError)
      // No fallamos la petición completa porque el usuario ya se creó, pero lo registramos
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error en selfRegisterStudent:', error)
    return { success: false, error: error.message || 'Error interno al registrar al estudiante.' }
  }
}
