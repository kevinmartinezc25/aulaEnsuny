'use server'

import { createAdminClient, createClient } from '@/core/config/supabase/server'

export interface CourseJoinRequest {
  id: string
  course_id: string
  student_id: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  comments: string | null
  course_title?: string | null
  subject?: string | null
  student_name?: string | null
  student_email?: string | null
  student_document?: string | null
  student_avatar?: string | null
}

export interface CreateJoinRequestInput {
  courseId: string
  code?: string
}

export interface ReviewJoinRequestInput {
  requestId: string
  action: 'approved' | 'rejected'
  comments?: string
}

function generateJoinCode(): string {
  const prefix = 'TEC'
  const randomPart = Math.random().toString(36).toUpperCase().slice(2, 8)
  return `${prefix}${randomPart}`
}

export async function getCourseJoinCode(courseId: string): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('courses')
    .select('join_code')
    .eq('id', courseId)
    .single()

  if (error || !data?.join_code) {
    return ''
  }

  return data.join_code
}

export async function regenerateCourseJoinCode(courseId: string): Promise<string> {
  const supabase = createAdminClient()
  const joinCode = generateJoinCode()
  const { error } = await supabase
    .from('courses')
    .update({ join_code: joinCode })
    .eq('id', courseId)

  if (error) {
    throw new Error('No se pudo regenerar el código de ingreso')
  }

  return joinCode
}

export async function createJoinRequest(input: CreateJoinRequestInput): Promise<CourseJoinRequest> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user?.id) {
    throw new Error('Debes iniciar sesión para solicitar ingreso')
  }

  const normalizedCode = input.code?.trim().toUpperCase() || ''
  const normalizedCourseId = input.courseId?.trim() || ''
  const lookupValue = normalizedCode || normalizedCourseId

  if (!lookupValue) {
    throw new Error('El código o el curso es obligatorio')
  }

  const admin = createAdminClient()

  let courseQuery
  let courseError

  if (normalizedCode) {
    ;({ data: courseQuery, error: courseError } = await admin
      .from('courses')
      .select('id, join_enabled, join_code, teacher_id')
      .eq('join_code', normalizedCode)
      .maybeSingle())
  } else {
    ;({ data: courseQuery, error: courseError } = await admin
      .from('courses')
      .select('id, join_enabled, join_code, teacher_id')
      .eq('id', normalizedCourseId)
      .maybeSingle())
  }

  const course = courseQuery

  if (courseError || !course) {
    throw new Error('No se encontró el curso o el código de invitación no es válido')
  }

  if (!course.join_enabled) {
    throw new Error('Este curso no acepta solicitudes de ingreso')
  }

  if (normalizedCode && course.join_code && normalizedCode !== course.join_code) {
    throw new Error('El código de invitación no es válido')
  }

  const { data: existingEnrollment } = await admin
    .from('student_courses')
    .select('id')
    .eq('student_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (existingEnrollment) {
    throw new Error('Ya estás matriculado en este curso')
  }

  const { data: existingRequest } = await admin
    .from('course_join_requests')
    .select('id')
    .eq('student_id', user.id)
    .eq('course_id', course.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingRequest) {
    throw new Error('Ya tienes una solicitud pendiente para este curso')
  }

  const { data, error } = await admin
    .from('course_join_requests')
    .insert({
      course_id: course.id,
      student_id: user.id,
      status: 'pending',
      requested_at: new Date().toISOString(),
      comments: null
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error('No se pudo crear la solicitud')
  }

  return {
    id: data.id,
    course_id: data.course_id,
    student_id: data.student_id,
    status: data.status,
    requested_at: data.requested_at,
    reviewed_at: data.reviewed_at ?? null,
    reviewed_by: data.reviewed_by ?? null,
    comments: data.comments ?? null
  }
}

export async function listCourseJoinRequests(courseId: string): Promise<CourseJoinRequest[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('course_join_requests')
    .select(`
      id,
      course_id,
      student_id,
      status,
      requested_at,
      reviewed_at,
      reviewed_by,
      comments,
      profiles!student_id(first_name, last_name, avatar_url)
    `)
    .eq('course_id', courseId)
    .order('requested_at', { ascending: false })

  if (error) {
    throw new Error('No se pudieron cargar las solicitudes')
  }

  // Enrich with email from auth and document from student_details in parallel
  const items = data || []
  const enriched = await Promise.all(
    items.map(async (item: any) => {
      let studentEmail: string | null = null
      let studentDocument: string | null = null

      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(item.student_id)
        studentEmail = authUser?.email ?? null
      } catch (_) {}

      try {
        const { data: detailData } = await supabase
          .from('student_details')
          .select('document_number')
          .eq('student_id', item.student_id)
          .maybeSingle()
        studentDocument = detailData?.document_number ?? null
      } catch (_) {}

      return {
        id: item.id,
        course_id: item.course_id,
        student_id: item.student_id,
        status: item.status,
        requested_at: item.requested_at,
        reviewed_at: item.reviewed_at ?? null,
        reviewed_by: item.reviewed_by ?? null,
        comments: item.comments ?? null,
        student_name: [item.profiles?.first_name, item.profiles?.last_name].filter(Boolean).join(' ') || 'Estudiante',
        student_email: studentEmail,
        student_document: studentDocument,
        student_avatar: item.profiles?.avatar_url || null
      }
    })
  )

  return enriched
}

export async function reviewJoinRequest(input: ReviewJoinRequestInput): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user?.id) {
    throw new Error('Debes iniciar sesión')
  }

  const admin = createAdminClient()
  const { data: request, error: requestError } = await admin
    .from('course_join_requests')
    .select('id, course_id, student_id, status')
    .eq('id', input.requestId)
    .single()

  if (requestError || !request) {
    throw new Error('No se encontró la solicitud')
  }

  if (request.status !== 'pending') {
    throw new Error('La solicitud ya fue resuelta')
  }

  const { data: course, error: courseError } = await admin
    .from('courses')
    .select('teacher_id')
    .eq('id', request.course_id)
    .single()

  if (courseError || !course) {
    throw new Error('No se encontró el curso')
  }

  if (course.teacher_id !== user.id) {
    throw new Error('Solo el docente asignado puede gestionar esta solicitud')
  }

  if (input.action === 'approved') {
    const { data: existingEnrollment } = await admin
      .from('student_courses')
      .select('id')
      .eq('student_id', request.student_id)
      .eq('course_id', request.course_id)
      .maybeSingle()

    if (!existingEnrollment) {
      const { error: insertError } = await admin.from('student_courses').insert({
        student_id: request.student_id,
        course_id: request.course_id,
        created_at: new Date().toISOString()
      })

      if (insertError) {
        throw new Error('No se pudo matricular al estudiante. Verifica que la tabla student_courses exista y tenga las columnas correctas.')
      }
    }
  }

  const { error } = await admin
    .from('course_join_requests')
    .update({
      status: input.action,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      comments: input.comments ?? null
    })
    .eq('id', input.requestId)

  if (error) {
    throw new Error('No se pudo actualizar la solicitud')
  }
}

export async function getStudentJoinRequests(): Promise<CourseJoinRequest[]> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user?.id) {
    throw new Error('Debes iniciar sesión')
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('course_join_requests')
    .select(`
      id,
      course_id,
      student_id,
      status,
      requested_at,
      reviewed_at,
      reviewed_by,
      comments,
      courses!course_id(title, subject)
    `)
    .eq('student_id', user.id)
    .order('requested_at', { ascending: false })

  if (error) {
    throw new Error('No se pudieron cargar tus solicitudes')
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    course_id: item.course_id,
    student_id: item.student_id,
    status: item.status,
    requested_at: item.requested_at,
    reviewed_at: item.reviewed_at ?? null,
    reviewed_by: item.reviewed_by ?? null,
    comments: item.comments ?? null,
    course_title: item.courses?.title || 'Curso Desconocido',
    subject: item.courses?.subject || 'General'
  }))
}

export async function cancelJoinRequest(requestId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user?.id) {
    throw new Error('Debes iniciar sesión')
  }

  const admin = createAdminClient()
  const { data: request, error } = await admin
    .from('course_join_requests')
    .select('student_id, status')
    .eq('id', requestId)
    .single()

  if (error || !request) {
    throw new Error('No se encontró la solicitud')
  }

  if (request.student_id !== user.id) {
    throw new Error('No tienes permiso para cancelar esta solicitud')
  }

  if (request.status !== 'pending') {
    throw new Error('Solo se pueden cancelar solicitudes pendientes')
  }

  const { error: deleteError } = await admin
    .from('course_join_requests')
    .delete()
    .eq('id', requestId)

  if (deleteError) {
    throw new Error('No se pudo cancelar la solicitud')
  }
}
