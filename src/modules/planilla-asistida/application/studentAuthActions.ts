'use server'

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { createAdminClient } from '@/core/config/supabase/server'
import { resolveOfficialGroup } from './groupResolver'

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
  groupName?: string
  groupId?: string | null
  gradeLevel?: string
  academicYear?: string
  jornada?: string
}

/**
 * Autentica un estudiante usando ÚNICAMENTE su Documento de Identidad
 * Resuelve su identidad académica, matrícula activa y grupo correspondiente.
 */
export async function authenticatePlanillaStudent(documentId: string) {
  const doc = documentId.trim()
  
  if (!doc) {
    throw new Error('El documento de identidad es requerido')
  }

  const supabase = createAdminClient()

  // 1. Buscamos al estudiante en student_directory
  const directoryResult = await supabase
    .from('student_directory')
    .select('id, document_id, first_name, last_name, grade_level, group_name, academic_year, status, profile_id')
    .eq('document_id', doc)
    .eq('status', 'active')
    .single()

  let directoryData = directoryResult.data
  const dirError = directoryResult.error

  let linkedProfileId: string | null = directoryData?.profile_id || null

  if (dirError || !directoryData) {
    // Si no está en student_directory, buscamos en profiles
    const { data: profileData, error: profError } = await supabase
      .from('profiles')
      .select('id, document_number, first_name, last_name, status')
      .eq('document_number', doc)
      .eq('status', 'active')
      .single()
      
    if (profError || !profileData) {
      throw new Error('No encontramos un estudiante asociado a este documento.')
    }

    linkedProfileId = profileData.id
    
    // Buscar si existe un registro en student_directory con este profile_id
    const { data: linkedDir } = await supabase
      .from('student_directory')
      .select('id, grade_level, group_name, academic_year')
      .eq('profile_id', profileData.id)
      .single()
      
    directoryData = {
      id: linkedDir?.id || profileData.id,
      document_id: doc,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      grade_level: linkedDir?.grade_level || '',
      group_name: linkedDir?.group_name || '',
      academic_year: linkedDir?.academic_year || new Date().getFullYear().toString(),
      status: 'active',
      profile_id: profileData.id
    }
  }

  // 2. Resolver matrícula académica (jornada, grupo, año) si hay registros en student_enrollments
  let jornada = 'Mañana'
  let activeGroupName = directoryData.group_name || ''
  let activeGradeLevel = directoryData.grade_level || ''
  let academicYear = directoryData.academic_year || new Date().getFullYear().toString()

  if (linkedProfileId) {
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('jornada, group_name, grade_level, academic_year, enrollment_status')
      .eq('student_id', linkedProfileId)
      .eq('enrollment_status', 'active')
      .order('academic_year', { ascending: false })
      .limit(1)
      .single()

    if (enrollment) {
      if (enrollment.jornada) jornada = enrollment.jornada
      if (enrollment.group_name) activeGroupName = enrollment.group_name
      if (enrollment.grade_level) activeGradeLevel = enrollment.grade_level
      if (enrollment.academic_year) academicYear = enrollment.academic_year.toString()
    }
  }

  // 3. Vincular con sch_groups para obtener el ID de horario
  let groupId: string | null = null
  const fullName = `${directoryData.last_name} ${directoryData.first_name}`.trim()
  const { data: allGroups } = await supabase.from('sch_groups').select('id, name')

  if (allGroups && allGroups.length > 0) {
    let resolved = resolveOfficialGroup(allGroups, activeGradeLevel, activeGroupName)

    // Si aún no se resolvió el grupo oficial, buscar en las materias asistidas del estudiante
    if (!resolved) {
      const assistedSubIds: string[] = []
      
      if (directoryData.id) {
        const { data: byDir } = await supabase
          .from('assisted_students')
          .select('subject_id')
          .eq('directory_id', directoryData.id)
          .limit(5)
        if (byDir) assistedSubIds.push(...byDir.map(r => r.subject_id).filter(Boolean))
      }

      if (assistedSubIds.length === 0 && fullName) {
        const { data: byName } = await supabase
          .from('assisted_students')
          .select('subject_id')
          .ilike('full_name', fullName)
          .limit(5)
        if (byName) assistedSubIds.push(...byName.map(r => r.subject_id).filter(Boolean))
      }

      if (assistedSubIds.length > 0) {
        const { data: subData } = await supabase
          .from('assisted_subjects')
          .select('grade, group_number')
          .in('id', assistedSubIds)
          .limit(1)
          .single()

        if (subData) {
          const fallbackGrade = `${subData.grade}°`
          const fallbackGroup = `${subData.group_number}`
          resolved = resolveOfficialGroup(allGroups, fallbackGrade, fallbackGroup)
          if (resolved && !activeGradeLevel) {
            activeGradeLevel = resolved.gradeLevel
          }
        }
      }
    }

    if (resolved) {
      groupId = resolved.groupId
      activeGroupName = resolved.groupName
      if (!activeGradeLevel) activeGradeLevel = resolved.gradeLevel
    }
  }

  // 4. Crear sesión JWT con datos de solo lectura
  const payload: PlanillaStudentSession = {
    directoryId: directoryData.id,
    documentId: directoryData.document_id,
    firstName: directoryData.first_name,
    lastName: directoryData.last_name,
    fullName,
    groupName: activeGroupName,
    groupId,
    gradeLevel: activeGradeLevel,
    academicYear,
    jornada
  }

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(encodedSecret)

  // 5. Guardar en cookie HTTP-only
  const cookieStore = await cookies()
  cookieStore.set('planilla-student-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/'
  })

  return { 
    success: true, 
    studentName: fullName,
    groupName: activeGroupName,
    academicYear
  }
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
