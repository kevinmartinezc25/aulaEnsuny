'use server'

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { createAdminClient } from '@/core/config/supabase/server'

// Mantenemos el secreto en las variables de entorno, o usamos uno fallback (en dev)
const JWT_SECRET = process.env.JWT_SECRET || 'aulaensuny_planilla_super_secret_key_12345'
const encodedSecret = new TextEncoder().encode(JWT_SECRET)

// Duración de la sesión: 2 horas
const SESSION_DURATION = 2 * 60 * 60 * 1000 

export interface PlanillaStudentSession {
  directoryId: string
  documentId: string
  firstName: string
  lastName: string
  fullName: string
}

/**
 * Autentica un estudiante usando su Documento de Identidad
 */
export async function authenticatePlanillaStudent(documentId: string) {
  const doc = documentId.trim()
  
  if (!doc) {
    throw new Error('El documento de identidad es requerido')
  }

  const supabase = createAdminClient()

  // 1. Buscamos al estudiante en student_directory
  // Como la contraseña inicial es el mismo documento, basta con encontrarlo activo.
  const directoryResult = await supabase
    .from('student_directory')
    .select('id, document_id, first_name, last_name, status')
    .eq('document_id', doc)
    .eq('status', 'active')
    .single()

  let directoryData = directoryResult.data
  const dirError = directoryResult.error

  if (dirError || !directoryData) {
    // Si no está en el directorio, buscamos en los perfiles como respaldo (por si está sincronizado)
    const { data: profileData, error: profError } = await supabase
      .from('profiles')
      .select('id, document_number, first_name, last_name, status')
      .eq('document_number', doc)
      .eq('status', 'active')
      .single()
      
    if (profError || !profileData) {
      throw new Error('Credenciales inválidas o estudiante no encontrado')
    }
    
    // Aquí el profileData no tiene un `directoryId` explícito a menos que lo extraigamos, 
    // pero idealmente todos los estudiantes deberían estar en student_directory o vinculados a él.
    // Para simplificar, buscamos si existe algún student_directory con este profile_id
    const { data: linkedDir, error: linkError } = await supabase
      .from('student_directory')
      .select('id')
      .eq('profile_id', profileData.id)
      .single()
      
    if (linkError || !linkedDir) {
      throw new Error('El estudiante no está habilitado en el directorio académico.')
    }
    
    directoryData = {
      id: linkedDir.id,
      document_id: doc,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      status: 'active'
    }
  }

  // En una versión futura aquí se verificaría la contraseña hasheada contra assisted_student_credentials
  
  // 2. Crear sesión JWT
  const fullName = `${directoryData.last_name} ${directoryData.first_name}`.trim()
  
  const payload: PlanillaStudentSession = {
    directoryId: directoryData.id,
    documentId: directoryData.document_id,
    firstName: directoryData.first_name,
    lastName: directoryData.last_name,
    fullName
  }

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(encodedSecret)

  // 3. Guardar en cookies
  const cookieStore = await cookies()
  cookieStore.set('planilla-student-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/'
  })

  return { success: true, studentName: fullName }
}

/**
 * Obtiene la sesión actual del estudiante
 */
export async function getPlanillaStudentSession(): Promise<PlanillaStudentSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('planilla-student-session')?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, encodedSecret)
    return payload as unknown as PlanillaStudentSession
  } catch (error) {
    return null
  }
}

/**
 * Cierra la sesión
 */
export async function logoutPlanillaStudent() {
  const cookieStore = await cookies()
  cookieStore.delete('planilla-student-session')
}
