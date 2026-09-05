'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import {
  PermissionRequest,
  PermissionType,
  TeacherSnapshot,
  PermissionStatus,
  PermissionStatsSummary,
  PermissionRequestHistory,
  DEFAULT_PERMISSION_TYPES,
} from '../domain/entities'
import { CreatePermissionRequestInput, createPermissionRequestSchema } from '../domain/validation'
import { PermissionNotificationService } from '../infrastructure/PermissionNotificationService'

// Memoria estática para soporte de sesión en modo demo / offline (inicia vacía para mostrar únicamente solicitudes reales)
const fallbackPermissions: PermissionRequest[] = []

export async function getAllFallbackPermissions(): Promise<PermissionRequest[]> {
  return fallbackPermissions
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCIONES DE DOCENTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtener perfil del docente actual autenticado para precarga automática
 */
export async function getTeacherPermissionProfile(): Promise<TeacherSnapshot> {
  try {
    // 1. Verificar si hay sesión demo en la cookie (donde TeacherSettingsScreen guarda los cambios)
    const cookieStore = await cookies()
    const demoCookie = cookieStore.get('aulaensuny-demo-session')?.value
    if (demoCookie) {
      try {
        const session = JSON.parse(decodeURIComponent(demoCookie))
        if (session) {
          return {
            id: session.id || 'demo-user-id',
            fullName: `${session.first_name || ''} ${session.last_name || ''}`.trim() || session.name || 'Prof. Alejandro Gómez',
            email: session.email || 'docente@colegio.edu',
            document: session.document_id || session.document || null,
            role: session.role === 'teacher' ? 'Docente de Aula' : session.role || 'Docente',
            campus: session.campus || 'Sede Principal',
            mainSubject: session.main_subject || session.bio || 'Física y Matemáticas',
            phone: session.phone || '312 456 7890'
          }
        }
      } catch (e) {
        console.error('Error parseando demo-session cookie en permisos:', e)
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Fallback demo
      return {
        id: 'demo-user-id',
        fullName: 'Prof. Alejandro Gómez',
        email: 'docente@colegio.edu',
        document: null,
        role: 'Docente',
        campus: 'Sede Principal',
        mainSubject: 'Física y Matemáticas',
        phone: '312 456 7890'
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, roles(name)')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      fullName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : user.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() : user.email || 'Docente',
      email: user.email || profile?.email || '',
      document: profile?.document_id || user.user_metadata?.document_id || user.user_metadata?.document || null,
      role: profile?.roles?.name || user.user_metadata?.role_name || user.user_metadata?.role || 'Docente',
      campus: profile?.campus || user.user_metadata?.campus || 'Sede Principal',
      mainSubject: profile?.bio || profile?.grade_level || user.user_metadata?.bio || 'Asignaturas Varias',
      phone: profile?.phone || user.user_metadata?.phone || null,
    }
  } catch (error) {
    console.error('Error al obtener perfil docente:', error)
    return {
      id: 'demo-user-id',
      fullName: 'Prof. Alejandro Gómez',
      email: 'docente@colegio.edu',
      document: null,
      role: 'Docente',
      campus: 'Sede Principal',
      mainSubject: 'Física y Matemáticas',
    }
  }
}

/**
 * Obtener cursos y asignaturas del docente para selección de impacto académico
 */
export async function getTeacherAcademicCourses(): Promise<Array<{ id: string; title: string; subject: string; gradeLevel: string; groupName: string }>> {
  try {
    const supabase = createAdminClient()
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, title, subject, grade_level, group_name')
      .order('title', { ascending: true })

    if (error || !courses || courses.length === 0) {
      return [
        { id: 'c-101', title: 'Física I - 10°-1', subject: 'Física', gradeLevel: '10°', groupName: '10°-1' },
        { id: 'c-102', title: 'Física II - 11°-2', subject: 'Física', gradeLevel: '11°', groupName: '11°-2' },
        { id: 'c-201', title: 'Matemáticas - 9°-1', subject: 'Matemáticas', gradeLevel: '9°', groupName: '9°-1' },
        { id: 'c-202', title: 'Matemáticas - 9°-2', subject: 'Matemáticas', gradeLevel: '9°', groupName: '9°-2' },
        { id: 'c-301', title: 'Tecnología - 8°-1', subject: 'Tecnología', gradeLevel: '8°', groupName: '8°-1' },
      ]
    }

    return courses.map(c => ({
      id: c.id,
      title: c.title,
      subject: c.subject || 'General',
      gradeLevel: c.grade_level || '',
      groupName: c.group_name || c.grade_level || 'Grupo 1'
    }))
  } catch (error) {
    return [
      { id: 'c-101', title: 'Física I - 10°-1', subject: 'Física', gradeLevel: '10°', groupName: '10°-1' },
      { id: 'c-102', title: 'Física II - 11°-2', subject: 'Física', gradeLevel: '11°', groupName: '11°-2' },
      { id: 'c-201', title: 'Matemáticas - 9°-1', subject: 'Matemáticas', gradeLevel: '9°', groupName: '9°-1' },
    ]
  }
}

/**
 * Obtener catálogo de tipos de permiso activos
 */
export async function getPermissionTypes(): Promise<PermissionType[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('permission_types')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (error || !data || data.length === 0) {
      return DEFAULT_PERMISSION_TYPES
    }

    return data.map(d => ({
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      requiresAttachment: d.requires_attachment,
      affectsClasses: d.affects_classes,
      active: d.active,
      sortOrder: d.sort_order,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }))
  } catch {
    return DEFAULT_PERMISSION_TYPES
  }
}

/**
 * Obtener solicitudes de permisos del docente actual con resumen estadístico
 */
export async function getTeacherPermissions(statusFilter?: string): Promise<{
  requests: PermissionRequest[]
  stats: PermissionStatsSummary
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const teacherId = user?.id || 'demo-user-id'

    // Intentar leer de Supabase
    const adminClient = createAdminClient()
    const { data: rows, error } = await adminClient
      .from('permission_requests')
      .select('*, permission_types(name, code, requires_attachment, affects_classes)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    let requests: PermissionRequest[] = []

    if (rows && rows.length > 0) {
      requests = rows.map(r => ({
        id: r.id,
        requestNumber: r.request_number,
        teacherId: r.teacher_id,
        teacherSnapshot: r.teacher_snapshot,
        typeId: r.type_id,
        typeSnapshot: r.type_snapshot,
        startDate: r.start_date,
        endDate: r.end_date,
        isFullDay: r.is_full_day,
        startTime: r.start_time,
        endTime: r.end_time,
        reason: r.reason,
        attachmentUrl: r.attachment_url,
        attachmentName: r.attachment_name,
        attachmentType: r.attachment_type,
        affectsAcademicDuty: r.affects_academic_duty,
        academicImpact: r.academic_impact || [],
        leavesStudentActivities: r.leaves_student_activities,
        studentActivities: r.student_activities || [],
        coveragePlan: r.coverage_plan || [],
        status: r.status as PermissionStatus,
        rectorId: r.rector_id,
        rectorApprovalDate: r.rector_approval_date,
        rectorNotes: r.rector_notes,
        coordinatorId: r.coordinator_id,
        coordinatorApprovalDate: r.coordinator_approval_date,
        coordinatorNotes: r.coordinator_notes,
        rejectionReason: r.rejection_reason,
        correctionNotes: r.correction_notes,
        verificationCode: r.verification_code,
        postSupportUrl: r.post_support_url || null,
        postSupportName: r.post_support_name || null,
        postSupportSubmittedAt: r.post_support_submitted_at || null,
        postSupportStatus: r.post_support_status || null,
        postSupportReviewNotes: r.post_support_review_notes || null,
        postSupportReviewedAt: r.post_support_reviewed_at || null,
        postSupportRectorId: r.post_support_rector_id || null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    }

    // Unificar con solicitudes locales del docente para no perder registros en ningún entorno
    const local = fallbackPermissions.filter(p => p.teacherId === teacherId || teacherId === 'demo-user-id')
    for (const l of local) {
      if (!requests.some(r => r.id === l.id || r.requestNumber === l.requestNumber)) {
        requests.push(l)
      }
    }

    const total = requests.length
    const pending = requests.filter(r => ['submitted', 'reviewing_rector', 'approved_rector', 'reviewing_coordinator'].includes(r.status)).length
    const approved = requests.filter(r => r.status === 'approved').length
    const rejected = requests.filter(r => r.status === 'rejected').length
    const returned = requests.filter(r => r.status === 'returned_correction').length

    let totalHoursAffected = 0
    requests.forEach(r => {
      if (r.academicImpact) {
        r.academicImpact.forEach(item => {
          totalHoursAffected += item.hoursCount || 0
        })
      }
    })

    const stats: PermissionStatsSummary = {
      total,
      pending,
      approved,
      rejected,
      returned,
      totalHoursAffected
    }

    let filtered = requests
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = requests.filter(r => ['submitted', 'reviewing_rector', 'approved_rector', 'reviewing_coordinator'].includes(r.status))
      } else {
        filtered = requests.filter(r => r.status === statusFilter)
      }
    }

    return { requests: filtered, stats }
  } catch (error) {
    console.error('Error al obtener permisos:', error)
    return {
      requests: fallbackPermissions,
      stats: {
        total: fallbackPermissions.length,
        pending: fallbackPermissions.filter(r => ['submitted', 'reviewing_rector', 'approved_rector', 'reviewing_coordinator'].includes(r.status)).length,
        approved: fallbackPermissions.filter(r => r.status === 'approved').length,
        rejected: fallbackPermissions.filter(r => r.status === 'rejected').length,
        returned: fallbackPermissions.filter(r => r.status === 'returned_correction').length,
        totalHoursAffected: 0
      }
    }
  }
}

/**
 * Obtener detalle completo de una solicitud por ID
 */
export async function getPermissionById(id: string): Promise<PermissionRequest | null> {
  try {
    const adminClient = createAdminClient()
    const { data: r, error } = await adminClient
      .from('permission_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !r) {
      const found = fallbackPermissions.find(p => p.id === id)
      return found || null
    }

    // Cargar historial
    const { data: histData } = await adminClient
      .from('permission_request_history')
      .select('*, profiles(first_name, last_name)')
      .eq('request_id', id)
      .order('created_at', { ascending: true })

    const history: PermissionRequestHistory[] = (histData || []).map(h => ({
      id: h.id,
      requestId: h.request_id,
      changedBy: h.changed_by,
      changedByName: h.profiles ? `${h.profiles.first_name} ${h.profiles.last_name}` : 'Sistema',
      action: h.action,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      notes: h.notes,
      createdAt: h.created_at,
      metadata: h.metadata
    }))

    return {
      id: r.id,
      requestNumber: r.request_number,
      teacherId: r.teacher_id,
      teacherSnapshot: r.teacher_snapshot,
      typeId: r.type_id,
      typeSnapshot: r.type_snapshot,
      startDate: r.start_date,
      endDate: r.end_date,
      isFullDay: r.is_full_day,
      startTime: r.start_time,
      endTime: r.end_time,
      reason: r.reason,
      attachmentUrl: r.attachment_url,
      attachmentName: r.attachment_name,
      attachmentType: r.attachment_type,
      affectsAcademicDuty: r.affects_academic_duty,
      academicImpact: r.academic_impact || [],
      leavesStudentActivities: r.leaves_student_activities,
      studentActivities: r.student_activities || [],
      coveragePlan: r.coverage_plan || [],
      status: r.status as PermissionStatus,
      rectorId: r.rector_id,
      rectorApprovalDate: r.rector_approval_date,
      rectorNotes: r.rector_notes,
      coordinatorId: r.coordinator_id,
      coordinatorApprovalDate: r.coordinator_approval_date,
      coordinatorNotes: r.coordinator_notes,
      rejectionReason: r.rejection_reason,
      correctionNotes: r.correction_notes,
      verificationCode: r.verification_code,
      postSupportUrl: r.post_support_url || null,
      postSupportName: r.post_support_name || null,
      postSupportSubmittedAt: r.post_support_submitted_at || null,
      postSupportStatus: r.post_support_status || null,
      postSupportReviewNotes: r.post_support_review_notes || null,
      postSupportReviewedAt: r.post_support_reviewed_at || null,
      postSupportRectorId: r.post_support_rector_id || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      history
    }
  } catch (error) {
    return fallbackPermissions.find(p => p.id === id) || null
  }
}

/**
 * Radicar una nueva solicitud de permiso
 */
export async function createPermissionRequest(
  input: CreatePermissionRequestInput
): Promise<{ success: boolean; requestNumber?: string; id?: string; error?: string }> {
  try {
    const validated = createPermissionRequestSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || 'Datos de solicitud inválidos.' }
    }

    const adminClient = createAdminClient()
    const teacher = await getTeacherPermissionProfile()
    const types = await getPermissionTypes()
    const selectedType = types.find(t => t.id === input.typeId) || DEFAULT_PERMISSION_TYPES[0]

    // Generar consecutivo institucional usando la función RPC oficial
    let requestNumber = ''
    try {
      const { data: rpcNum } = await adminClient.rpc('generate_permission_request_number')
      if (rpcNum) requestNumber = rpcNum
    } catch (e) {}

    if (!requestNumber) {
      const year = new Date().getFullYear()
      const randomSeq = Math.floor(1000 + Math.random() * 9000)
      requestNumber = `PER-${year}-${randomSeq}`
    }

    const id = randomUUID()
    const verificationCode = `ver-${Math.random().toString(36).substring(2, 12)}${Date.now().toString(36)}`
    const newStatus: PermissionStatus = input.isDraft ? 'draft' : 'submitted'

    // Asegurar UUID válido para teacher_id ante claves foráneas de BD
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    let dbTeacherId = teacher.id
    if (!uuidRegex.test(dbTeacherId)) {
      try {
        const { data: prof } = await adminClient.from('profiles').select('id').limit(1).maybeSingle()
        if (prof?.id) dbTeacherId = prof.id
      } catch (e) {}
    }

    // Asegurar UUID válido para type_id
    let dbTypeId = selectedType.id
    if (!uuidRegex.test(dbTypeId)) {
      try {
        const { data: dbType } = await adminClient
          .from('permission_types')
          .select('id')
          .eq('code', selectedType.code)
          .maybeSingle()
        if (dbType?.id) {
          dbTypeId = dbType.id
        } else {
          const { data: firstType } = await adminClient.from('permission_types').select('id').limit(1).maybeSingle()
          if (firstType?.id) dbTypeId = firstType.id
        }
      } catch (e) {}
    }

    const newRequest: PermissionRequest = {
      id,
      requestNumber,
      teacherId: teacher.id,
      teacherSnapshot: teacher,
      typeId: dbTypeId,
      typeSnapshot: {
        code: selectedType.code,
        name: selectedType.name,
        requiresAttachment: selectedType.requiresAttachment,
        affectsClasses: selectedType.affectsClasses
      },
      startDate: input.startDate,
      endDate: input.endDate,
      isFullDay: input.isFullDay,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      reason: input.reason,
      attachmentUrl: input.attachmentUrl || null,
      attachmentName: input.attachmentName || null,
      attachmentType: input.attachmentType || null,
      affectsAcademicDuty: input.affectsAcademicDuty,
      academicImpact: input.academicImpact || [],
      leavesStudentActivities: input.leavesStudentActivities,
      studentActivities: input.studentActivities || [],
      coveragePlan: [],
      status: newStatus,
      verificationCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: `h-${Date.now()}`,
          requestId: id,
          changedBy: teacher.id,
          changedByName: teacher.fullName,
          action: input.isDraft ? 'created' : 'submitted',
          fromStatus: null,
          toStatus: newStatus,
          notes: input.isDraft ? 'Borrador guardado' : 'Solicitud enviada a Rectoría para revisión',
          createdAt: new Date().toISOString()
        }
      ]
    }

    // Siempre registrar en memoria/fallback
    fallbackPermissions.unshift(newRequest)

    // Persistir en Supabase
    try {
      const { data, error } = await adminClient
        .from('permission_requests')
        .insert({
          id,
          request_number: requestNumber,
          teacher_id: dbTeacherId,
          teacher_snapshot: teacher,
          type_id: dbTypeId,
          type_snapshot: newRequest.typeSnapshot,
          start_date: input.startDate,
          end_date: input.endDate,
          is_full_day: input.isFullDay,
          start_time: input.startTime || null,
          end_time: input.endTime || null,
          reason: input.reason,
          attachment_url: input.attachmentUrl || null,
          attachment_name: input.attachmentName || null,
          attachment_type: input.attachmentType || null,
          affects_academic_duty: input.affectsAcademicDuty,
          academic_impact: input.academicImpact || [],
          leaves_student_activities: input.leavesStudentActivities,
          student_activities: input.studentActivities || [],
          coverage_plan: [],
          status: newStatus,
          verification_code: verificationCode
        })
        .select()
        .single()

      if (error) {
        console.error('Error al insertar solicitud en Supabase:', error)
      } else if (data) {
        try {
          await adminClient.from('permission_request_history').insert({
            request_id: data.id,
            changed_by: dbTeacherId,
            action: input.isDraft ? 'created' : 'submitted',
            from_status: null,
            to_status: newStatus,
            notes: input.isDraft ? 'Borrador guardado' : 'Solicitud enviada a Rectoría para revisión'
          })
        } catch (hErr) {
          console.warn('Error al registrar historial en Supabase:', hErr)
        }
      }
    } catch (insertErr) {
      console.error('Excepción al conectar con Supabase para insertar permiso:', insertErr)
    }

    // Enviar notificación a Rectoría si no es borrador
    if (!input.isDraft) {
      try {
        await PermissionNotificationService.notifyNewRequestSubmitted(newRequest)
      } catch (notifErr) {
        console.warn('Error al despachar notificación de nuevo permiso:', notifErr)
      }
    }

    revalidatePath('/teacher/permissions')
    revalidatePath('/admin/permissions')
    return { success: true, requestNumber, id }
  } catch (err: unknown) {
    console.error('Error en createPermissionRequest:', err)
    const message = err instanceof Error ? err.message : 'Error al radicar solicitud.'
    return { success: false, error: message }
  }
}

/**
 * Cancelar una solicitud por el docente (si aún no ha sido aprobada)
 */
export async function cancelPermissionRequest(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const teacher = await getTeacherPermissionProfile()
    const adminClient = createAdminClient()

    const { data: req } = await adminClient
      .from('permission_requests')
      .select('status, teacher_id')
      .eq('id', id)
      .single()

    const currentStatus = req?.status || fallbackPermissions.find(p => p.id === id)?.status

    if (currentStatus === 'approved') {
      return { success: false, error: 'No es posible cancelar un permiso que ya ha sido aprobado institucionalmente.' }
    }

    try {
      await adminClient
        .from('permission_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)

      await adminClient
        .from('permission_request_history')
        .insert({
          request_id: id,
          changed_by: teacher.id,
          action: 'cancelled',
          from_status: currentStatus || null,
          to_status: 'cancelled',
          notes: 'Cancelada por el docente solicitante'
        })
    } catch {
      // Fallback en memoria
      const found = fallbackPermissions.find(p => p.id === id)
      if (found) {
        found.status = 'cancelled'
        found.history = found.history || []
        found.history.push({
          id: `h-${Date.now()}`,
          requestId: id,
          changedBy: teacher.id,
          changedByName: teacher.fullName,
          action: 'cancelled',
          fromStatus: found.status,
          toStatus: 'cancelled',
          notes: 'Cancelada por el docente',
          createdAt: new Date().toISOString()
        })
      }
    }

    revalidatePath('/teacher/permissions')
    revalidatePath(`/teacher/permissions/${id}`)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al cancelar la solicitud.'
    return { success: false, error: message }
  }
}

/**
 * Adjuntar soporte posterior al cumplimiento del permiso (Req 1 & 2)
 */
export async function submitPermissionPostSupport(
  requestId: string,
  data: {
    fileUrl: string
    fileName: string
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const teacher = await getTeacherPermissionProfile()
    const adminClient = createAdminClient()

    const now = new Date().toISOString()
    const updatePayload = {
      post_support_url: data.fileUrl,
      post_support_name: data.fileName,
      post_support_submitted_at: now,
      post_support_status: 'submitted',
      post_support_review_notes: data.notes || null,
      updated_at: now
    }

    try {
      await adminClient
        .from('permission_requests')
        .update(updatePayload)
        .eq('id', requestId)

      await adminClient
        .from('permission_request_history')
        .insert({
          request_id: requestId,
          changed_by: teacher.id,
          action: 'submit_post_support',
          from_status: 'approved',
          to_status: 'approved',
          notes: data.notes || 'Soporte post-permiso adjuntado para revisión de Rectoría'
        })
    } catch {
      // Ignorar si las columnas de DB están en migración y continuar en memoria
    }

    // Actualizar siempre la memoria fallback
    const found = fallbackPermissions.find(p => p.id === requestId)
    if (found) {
      found.postSupportUrl = data.fileUrl
      found.postSupportName = data.fileName
      found.postSupportSubmittedAt = now
      found.postSupportStatus = 'submitted'
      found.postSupportReviewNotes = data.notes || null
      found.updatedAt = now
      found.history = found.history || []
      found.history.push({
        id: `h-${Date.now()}`,
        requestId,
        changedBy: teacher.id,
        changedByName: teacher.fullName,
        action: 'submit_post_support',
        fromStatus: 'approved',
        toStatus: 'approved',
        notes: data.notes || 'Soporte de cumplimiento adjuntado para revisión por Rectoría',
        createdAt: now
      })
    }

    // Notificar a Rectoría
    try {
      await PermissionNotificationService.notifyNewRequestSubmitted(
        found || ({ requestNumber: 'Permiso', teacherSnapshot: teacher } as unknown as PermissionRequest)
      )
    } catch {
      // Notificación silenciosa
    }

    revalidatePath('/teacher/permissions')
    revalidatePath(`/teacher/permissions/${requestId}`)
    revalidatePath('/admin/permissions')
    revalidatePath(`/admin/permissions/${requestId}`)

    return { success: true }
  } catch (error: unknown) {
    console.error('Error al radicar soporte post-permiso:', error)
    const message = error instanceof Error ? error.message : 'Error al adjuntar el soporte.'
    return { success: false, error: message }
  }
}

/**
 * Radicar oficialmente una solicitud que estaba en borrador (Req 5)
 */
export async function submitDraftPermission(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const teacher = await getTeacherPermissionProfile()
    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    try {
      await adminClient
        .from('permission_requests')
        .update({ status: 'submitted', updated_at: now })
        .eq('id', id)

      await adminClient
        .from('permission_request_history')
        .insert({
          request_id: id,
          changed_by: teacher.id,
          action: 'submit_draft',
          from_status: 'draft',
          to_status: 'submitted',
          notes: 'Solicitud en borrador radicada oficialmente para revisión de Rectoría'
        })
    } catch {
      // Fallback
    }

    const found = fallbackPermissions.find(p => p.id === id)
    if (found) {
      found.status = 'submitted'
      found.updatedAt = now
      found.history = found.history || []
      found.history.push({
        id: `h-${Date.now()}`,
        requestId: id,
        changedBy: teacher.id,
        changedByName: teacher.fullName,
        action: 'submit_draft',
        fromStatus: 'draft',
        toStatus: 'submitted',
        notes: 'Borrador radicado para revisión institucional',
        createdAt: now
      })
    }

    try {
      await PermissionNotificationService.notifyNewRequestSubmitted(
        found || ({ requestNumber: 'Permiso', teacherSnapshot: teacher } as unknown as PermissionRequest)
      )
    } catch {
      // Notificación silenciosa
    }

    revalidatePath('/teacher/permissions')
    revalidatePath(`/teacher/permissions/${id}`)
    revalidatePath('/admin/permissions')
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al radicar el borrador.'
    return { success: false, error: message }
  }
}

/**
 * Eliminar una solicitud en borrador (Req 5)
 */
export async function deleteDraftPermission(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()

    try {
      await adminClient
        .from('permission_request_history')
        .delete()
        .eq('request_id', id)

      await adminClient
        .from('permission_requests')
        .delete()
        .eq('id', id)
        .eq('status', 'draft')
    } catch {
      // Fallback
    }

    const idx = fallbackPermissions.findIndex(p => p.id === id)
    if (idx !== -1) {
      fallbackPermissions.splice(idx, 1)
    }

    revalidatePath('/teacher/permissions')
    revalidatePath(`/teacher/permissions/${id}`)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al eliminar el borrador.'
    return { success: false, error: message }
  }
}
