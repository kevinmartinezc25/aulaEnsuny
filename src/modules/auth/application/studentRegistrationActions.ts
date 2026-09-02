'use server'

import { createAdminClient } from '@/core/config/supabase/server'

export async function checkStudentPreloaded(documentNumber: string) {
  try {
    const adminClient = createAdminClient()
    const doc = documentNumber.trim()

    // 1. Check if already active in student_details
    const { data: detailsData } = await adminClient
      .from('student_details')
      .select('student_id')
      .eq('document_number', doc)
      .single()
    
    if (detailsData) {
      return { found: false, alreadyRegistered: true }
    }

    // 2. Check student_directory
    const { data: dirData, error } = await adminClient
      .from('student_directory')
      .select('id, first_name, last_name, grade_level, group_name, profile_id')
      .eq('document_id', doc)
      .single()

    if (error || !dirData) {
      return { found: false, alreadyRegistered: false }
    }

    if (dirData.profile_id) {
      return { found: false, alreadyRegistered: true }
    }

    return {
      found: true,
      alreadyRegistered: false,
      student: {
        firstName: dirData.first_name,
        lastName: dirData.last_name,
        gradeLevel: dirData.grade_level,
        groupName: dirData.group_name
      }
    }
  } catch (error) {
    console.error('Error checking preloaded student:', error)
    return { found: false, alreadyRegistered: false }
  }
}

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

    // 0. Verificar si el estudiante ya está registrado completamente
    const doc = data.documentNumber.trim()
    const { data: existingDetail } = await adminClient
      .from('student_details')
      .select('student_id')
      .eq('document_number', doc)
      .single()
    
    if (existingDetail) {
      return { success: false, error: 'Este documento de identidad ya se encuentra registrado. Por favor, inicia sesión.' }
    }

    // 0.5 Verificar si el estudiante existe en el directorio (Carga masiva)
    let finalGrade = data.gradeLevel
    let finalGroup = data.groupName
    let directoryId = null

    const { data: dirData } = await adminClient
      .from('student_directory')
      .select('id, grade_level, group_name, profile_id')
      .eq('document_id', doc)
      .single()
    
    if (dirData) {
      if (dirData.profile_id) {
        return { success: false, error: 'Esta cuenta pre-cargada ya ha sido reclamada. Por favor, inicia sesión.' }
      }
      // Forzar el grado y grupo de la institución
      finalGrade = dirData.grade_level
      finalGroup = dirData.group_name
      directoryId = dirData.id
    }

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
        grade_level: finalGrade,
        group_name: finalGroup
      })
      .eq('id', studentId)

    if (profileError) {
      console.error('Error actualizando grado y grupo en profiles:', profileError)
    }

    // 1.8 Si venía de una carga masiva, vincular la cuenta en el directorio
    if (directoryId) {
      const { error: dirError } = await adminClient
        .from('student_directory')
        .update({ profile_id: studentId })
        .eq('id', directoryId)
      
      if (dirError) {
        console.error('Error vinculando cuenta al student_directory:', dirError)
      }
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
