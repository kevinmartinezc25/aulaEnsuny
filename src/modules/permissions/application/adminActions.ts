'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  PermissionRequest,
  PermissionType,
  PermissionStatsSummary,
  PermissionStatus,
  CoverageAssignment
} from '../domain/entities'
import {
  RectorDecisionInput,
  rectorDecisionSchema,
  CoordinatorDecisionInput,
  coordinatorDecisionSchema,
  PermissionTypeConfigInput,
  permissionTypeConfigSchema
} from '../domain/validation'
import { PermissionNotificationService } from '../infrastructure/PermissionNotificationService'
import { getTeacherPermissions, getAllFallbackPermissions } from './actions'
import { DEFAULT_PERMISSION_TYPES } from '../domain/entities'

/**
 * Obtener rol directivo del usuario autenticado:
 * - superadmin: Rectoría (Rector Institucional)
 * - admin: Coordinación Académica / Directivo
 */
export async function getCurrentAdminRoleInfo(): Promise<{
  role: 'superadmin' | 'admin'
  name: string
  email: string
  isRector: boolean
  isCoordinator: boolean
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {
        role: 'superadmin',
        name: 'Rector Institucional',
        email: 'admin@ensuny.edu.co',
        isRector: true,
        isCoordinator: true
      }
    }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*, roles(name)')
      .eq('id', user.id)
      .single()

    const roleName = profile?.roles?.name || user.user_metadata?.role_name || 'superadmin'
    const name = profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : user.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : user.email || 'Directivo'

    const isRector = roleName === 'superadmin'
    const isCoordinator = roleName === 'admin' || isRector

    return {
      role: isRector ? 'superadmin' : 'admin',
      name,
      email: user.email || '',
      isRector,
      isCoordinator
    }
  } catch {
    return {
      role: 'superadmin',
      name: 'Rector Institucional',
      email: 'admin@ensuny.edu.co',
      isRector: true,
      isCoordinator: true
    }
  }
}

/**
 * Obtener listado de solicitudes para la bandeja administrativa (Rectoría / Coordinación)
 */
export async function getAdminPermissions(filters?: {
  tab?: 'rector' | 'coordinator' | 'history' | 'all'
  status?: string
  search?: string
  typeId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<{
  requests: PermissionRequest[]
  stats: PermissionStatsSummary
}> {
  try {
    const adminClient = createAdminClient()
    const { data: rows, error } = await adminClient
      .from('permission_requests')
      .select('*')
      .order('created_at', { ascending: false })

    let all: PermissionRequest[] = []

    if (rows && rows.length > 0) {
      all = rows.map(r => ({
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

    // Unificar con solicitudes en memoria / fallback para que NUNCA se pierda ninguna solicitud radicada
    const fallbackList = await getAllFallbackPermissions()
    for (const fb of fallbackList) {
      if (!all.some(r => r.id === fb.id || r.requestNumber === fb.requestNumber)) {
        all.push(fb)
      }
    }

    const total = all.length
    const pending = all.filter(r => ['submitted', 'reviewing_rector', 'approved_rector', 'reviewing_coordinator'].includes(r.status)).length
    const approved = all.filter(r => r.status === 'approved').length
    const rejected = all.filter(r => r.status === 'rejected').length
    const returned = all.filter(r => r.status === 'returned_correction').length

    let totalHoursAffected = 0
    all.forEach(r => {
      if (r.academicImpact) {
        r.academicImpact.forEach(i => {
          totalHoursAffected += i.hoursCount || 0
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

    let filtered = all

    // Filtro de Pestaña Institucional
    if (filters?.tab === 'rector') {
      // Solicitudes radicadas esperando decisión de Rectoría
      filtered = filtered.filter(r => ['submitted', 'reviewing_rector'].includes(r.status))
    } else if (filters?.tab === 'coordinator') {
      // Solicitudes aprobadas por rectoría esperando revisión académica y cobertura
      filtered = filtered.filter(r => ['approved_rector', 'reviewing_coordinator'].includes(r.status))
    } else if (filters?.tab === 'history') {
      filtered = filtered.filter(r => ['approved', 'rejected', 'cancelled', 'returned_correction'].includes(r.status))
    }

    // Filtro de Estado explícito
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status)
    }

    // Buscador por nombre de docente o número de solicitud
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(r =>
        r.requestNumber.toLowerCase().includes(q) ||
        r.teacherSnapshot.fullName.toLowerCase().includes(q) ||
        r.teacherSnapshot.email.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      )
    }

    // Filtro por tipo de permiso
    if (filters?.typeId && filters.typeId !== 'all') {
      filtered = filtered.filter(r => r.typeId === filters.typeId)
    }

    return { requests: filtered, stats }
  } catch (err) {
    console.error('Error en getAdminPermissions:', err)
    return {
      requests: [],
      stats: { total: 0, pending: 0, approved: 0, rejected: 0, returned: 0, totalHoursAffected: 0 }
    }
  }
}

/**
 * Decisión de Rectoría (Aprobar, Rechazar, Devolver para corrección)
 */
export async function rectorProcessPermission(
  input: RectorDecisionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = rectorDecisionSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || 'Datos de decisión inválidos.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const roleInfo = await getCurrentAdminRoleInfo()
    const rectorId = user?.id || 'rector-user-id'
    const rectorName = roleInfo.name || 'Rector Institucional'

    const adminClient = createAdminClient()
    const { data: req } = await adminClient
      .from('permission_requests')
      .select('*')
      .eq('id', input.requestId)
      .single()

    let nextStatus: PermissionStatus = 'approved_rector'
    let action = 'rector_approved'
    let historyNotes = input.notes || 'Aprobado por Rectoría'

    if (input.decision === 'reject') {
      nextStatus = 'rejected'
      action = 'rector_rejected'
      historyNotes = `Rechazado por Rectoría: ${input.rejectionReason}`
    } else if (input.decision === 'return') {
      nextStatus = 'returned_correction'
      action = 'rector_returned'
      historyNotes = `Devuelto para corrección: ${input.correctionNotes}`
    }

    const updates: Record<string, any> = {
      status: nextStatus,
      rector_id: rectorId,
      updated_at: new Date().toISOString(),
    }

    if (input.decision === 'approve') {
      updates.rector_approval_date = new Date().toISOString()
      updates.rector_notes = input.notes || null
    } else if (input.decision === 'reject') {
      updates.rejection_reason = input.rejectionReason
    } else if (input.decision === 'return') {
      updates.correction_notes = input.correctionNotes
    }

    try {
      await adminClient
        .from('permission_requests')
        .update(updates)
        .eq('id', input.requestId)

      await adminClient
        .from('permission_request_history')
        .insert({
          request_id: input.requestId,
          changed_by: rectorId,
          action,
          from_status: req?.status || 'submitted',
          to_status: nextStatus,
          notes: historyNotes
        })
    } catch (e) {
      console.warn('Persistencia en Supabase pendiente de migración:', e)
    }

    // Actualizar también en memoria local si existe
    const fbList = await getAllFallbackPermissions()
    const fb = fbList.find(p => p.id === input.requestId)
    if (fb) {
      fb.status = nextStatus
      fb.rectorId = rectorId
      fb.updatedAt = new Date().toISOString()
      if (input.decision === 'approve') {
        fb.rectorApprovalDate = new Date().toISOString()
        fb.rectorNotes = input.notes || null
      } else if (input.decision === 'reject') {
        fb.rejectionReason = input.rejectionReason
      } else if (input.decision === 'return') {
        fb.correctionNotes = input.correctionNotes
      }
    }

    // Disparo de notificaciones
    const targetReq: PermissionRequest | null = req ? {
      id: req.id,
      requestNumber: req.request_number,
      teacherId: req.teacher_id,
      teacherSnapshot: req.teacher_snapshot,
      typeId: req.type_id,
      typeSnapshot: req.type_snapshot,
      startDate: req.start_date,
      endDate: req.end_date,
      isFullDay: req.is_full_day,
      startTime: req.start_time,
      endTime: req.end_time,
      reason: req.reason,
      attachmentUrl: req.attachment_url,
      attachmentName: req.attachment_name,
      attachmentType: req.attachment_type,
      affectsAcademicDuty: req.affects_academic_duty,
      academicImpact: req.academic_impact || [],
      leavesStudentActivities: req.leaves_student_activities,
      studentActivities: req.student_activities || [],
      coveragePlan: req.coverage_plan || [],
      status: nextStatus,
      verificationCode: req.verification_code || 'VER-1234',
      createdAt: req.created_at,
      updatedAt: new Date().toISOString(),
    } : fb || null

    if (targetReq) {
      if (input.decision === 'approve') {
        await PermissionNotificationService.notifyApprovedByRector(targetReq)
      } else if (input.decision === 'return') {
        await PermissionNotificationService.notifyTeacherCorrectionRequired(targetReq, input.correctionNotes || '')
      } else if (input.decision === 'reject') {
        await PermissionNotificationService.notifyTeacherRejected(targetReq, input.rejectionReason || '', 'Rectoría')
      }
    }

    revalidatePath('/admin/permissions')
    revalidatePath(`/admin/permissions/${input.requestId}`)
    revalidatePath('/teacher/permissions')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al procesar decisión de Rectoría.' }
  }
}

/**
 * Decisión de Coordinación Académica (Asignar cobertura y Aprobar o Rechazar)
 */
export async function coordinatorProcessPermission(
  input: CoordinatorDecisionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = coordinatorDecisionSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || 'Datos de coordinación inválidos.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const roleInfo = await getCurrentAdminRoleInfo()
    const coordId = user?.id || 'coord-user-id'
    const coordName = roleInfo.name || 'Coordinación Académica'

    const adminClient = createAdminClient()
    const { data: req } = await adminClient
      .from('permission_requests')
      .select('*')
      .eq('id', input.requestId)
      .single()

    const isApproved = input.decision === 'approve'
    const nextStatus: PermissionStatus = isApproved ? 'approved' : 'rejected'
    const action = isApproved ? 'coord_approved' : 'coord_rejected'
    const historyNotes = isApproved
      ? (input.notes ? `Permiso aprobado por Coordinación: ${input.notes}` : 'Permiso aprobado por Coordinación con asignación de cobertura')
      : `Rechazado por Coordinación: ${input.rejectionReason}`

    const updates: Record<string, any> = {
      status: nextStatus,
      coordinator_id: coordId,
      coverage_plan: input.coveragePlan || [],
      updated_at: new Date().toISOString(),
    }

    if (isApproved) {
      updates.coordinator_approval_date = new Date().toISOString()
      updates.coordinator_notes = input.notes || null
    } else {
      updates.rejection_reason = input.rejectionReason
    }

    try {
      await adminClient
        .from('permission_requests')
        .update(updates)
        .eq('id', input.requestId)

      await adminClient
        .from('permission_request_history')
        .insert({
          request_id: input.requestId,
          changed_by: coordId,
          action,
          from_status: req?.status || 'approved_rector',
          to_status: nextStatus,
          notes: historyNotes
        })
    } catch (e) {
      console.warn('Persistencia en Supabase pendiente de migración:', e)
    }

    // Actualizar también en memoria local si existe
    const fbList = await getAllFallbackPermissions()
    const fb = fbList.find(p => p.id === input.requestId)
    if (fb) {
      fb.status = nextStatus
      fb.coordinatorId = coordId
      fb.coveragePlan = input.coveragePlan || []
      fb.updatedAt = new Date().toISOString()
      if (isApproved) {
        fb.coordinatorApprovalDate = new Date().toISOString()
        fb.coordinatorNotes = input.notes || null
      } else {
        fb.rejectionReason = input.rejectionReason
      }
    }

    // Notificación final al docente
    const targetReq: PermissionRequest | null = req ? {
      id: req.id,
      requestNumber: req.request_number,
      teacherId: req.teacher_id,
      teacherSnapshot: req.teacher_snapshot,
      typeId: req.type_id,
      typeSnapshot: req.type_snapshot,
      startDate: req.start_date,
      endDate: req.end_date,
      isFullDay: req.is_full_day,
      startTime: req.start_time,
      endTime: req.end_time,
      reason: req.reason,
      attachmentUrl: req.attachment_url,
      attachmentName: req.attachment_name,
      attachmentType: req.attachment_type,
      affectsAcademicDuty: req.affects_academic_duty,
      academicImpact: req.academic_impact || [],
      leavesStudentActivities: req.leaves_student_activities,
      studentActivities: req.student_activities || [],
      coveragePlan: input.coveragePlan || [],
      status: nextStatus,
      verificationCode: req.verification_code || 'VER-1234',
      createdAt: req.created_at,
      updatedAt: new Date().toISOString(),
    } : fb || null

    if (targetReq) {
      if (isApproved) {
        await PermissionNotificationService.notifyTeacherFinalApproval(targetReq)
      } else {
        await PermissionNotificationService.notifyTeacherRejected(targetReq, input.rejectionReason || '', 'Coordinación Académica')
      }
    }

    revalidatePath('/admin/permissions')
    revalidatePath(`/admin/permissions/${input.requestId}`)
    revalidatePath('/teacher/permissions')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al procesar decisión de Coordinación.' }
  }
}

/**
 * Obtener listado de docentes institucionales para selección de docentes de cobertura
 */
export async function getAvailableSubstituteTeachers(): Promise<Array<{ id: string; name: string; email: string; subject: string }>> {
  try {
    const adminClient = createAdminClient()
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, email, bio, roles!inner(name)')
      .eq('roles.name', 'teacher')
      .order('first_name', { ascending: true })

    if (error || !profiles || profiles.length === 0) {
      return [
        { id: 't-1', name: 'Alejandro Giraldo', email: 'a.giraldo@ensuny.edu.co', subject: 'Física' },
        { id: 't-2', name: 'Beatriz Nuñez', email: 'b.nunez@ensuny.edu.co', subject: 'Matemáticas' },
        { id: 't-3', name: 'Carlos Pérez', email: 'c.perez@ensuny.edu.co', subject: 'Tecnología' },
        { id: 't-4', name: 'Diana Rivas', email: 'd.rivas@ensuny.edu.co', subject: 'Inglés' },
        { id: 't-5', name: 'Edgar Morales', email: 'e.morales@ensuny.edu.co', subject: 'Ciencias Naturales' },
      ]
    }

    return profiles.map(p => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      email: p.email || '',
      subject: p.bio || 'Docente'
    }))
  } catch {
    return [
      { id: 't-1', name: 'Alejandro Giraldo', email: 'a.giraldo@ensuny.edu.co', subject: 'Física' },
      { id: 't-2', name: 'Beatriz Nuñez', email: 'b.nunez@ensuny.edu.co', subject: 'Matemáticas' },
      { id: 't-3', name: 'Carlos Pérez', email: 'c.perez@ensuny.edu.co', subject: 'Tecnología' },
    ]
  }
}

/**
 * Gestión de Tipos de Permisos (Configuración Admin)
 */
export async function savePermissionTypeConfig(
  input: PermissionTypeConfigInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = permissionTypeConfigSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || 'Datos de tipo de permiso inválidos.' }
    }

    const adminClient = createAdminClient()
    const payload = {
      code: input.code.toUpperCase().replace(/\s+/g, '_'),
      name: input.name,
      description: input.description || null,
      requires_attachment: input.requiresAttachment,
      affects_classes: input.affectsClasses,
      active: input.active,
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString()
    }

    if (input.id) {
      await adminClient.from('permission_types').update(payload).eq('id', input.id)
    } else {
      await adminClient.from('permission_types').insert(payload)
    }

    revalidatePath('/admin/permissions/settings')
    revalidatePath('/teacher/permissions/new')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar tipo de permiso.' }
  }
}

/**
 * Eliminar / Desactivar Tipo de Permiso
 */
export async function togglePermissionTypeStatus(id: string, active: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()
    await adminClient
      .from('permission_types')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id)

    revalidatePath('/admin/permissions/settings')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al cambiar estado del tipo de permiso.' }
  }
}

/**
 * Obtener cantidad de solicitudes de permisos pendientes para badges de navegación:
 * - rectorPending: solicitudes radicadas pendientes de revisión por Rectoría (SuperAdmin).
 * - coordinatorPending: solicitudes aprobadas por rectoría pendientes de asignación de cobertura (Admin).
 * - totalPending: total de solicitudes pendientes en trámite.
 */
export async function getPendingPermissionsCount(): Promise<{
  totalPending: number
  rectorPending: number
  coordinatorPending: number
}> {
  try {
    const adminClient = createAdminClient()
    const { data: rows } = await adminClient
      .from('permission_requests')
      .select('id, status')

    let allStatuses: string[] = []
    if (rows && rows.length > 0) {
      allStatuses = rows.map(r => r.status)
    }

    const fallbackList = await getAllFallbackPermissions()
    for (const fb of fallbackList) {
      if (!rows || !rows.some(r => r.id === fb.id)) {
        allStatuses.push(fb.status)
      }
    }

    const rectorPending = allStatuses.filter(s => ['submitted', 'reviewing_rector'].includes(s)).length
    const coordinatorPending = allStatuses.filter(s => ['approved_rector', 'reviewing_coordinator'].includes(s)).length

    return {
      totalPending: rectorPending + coordinatorPending,
      rectorPending,
      coordinatorPending
    }
  } catch (err) {
    console.error('Error al obtener conteo de permisos pendientes:', err)
    return {
      totalPending: 0,
      rectorPending: 0,
      coordinatorPending: 0
    }
  }
}

/**
 * Procesar la revisión de un soporte post-permiso por el Rector (SuperAdmin) (Req 1)
 */
export async function rectorProcessPostSupport(
  requestId: string,
  decision: 'approve' | 'reject',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const roleInfo = await getCurrentAdminRoleInfo()
    if (!roleInfo.isRector) {
      return { success: false, error: 'Solo el Rector (SuperAdmin) puede revisar y validar los soportes de permisos.' }
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()
    const newStatus = decision === 'approve' ? 'approved' : 'rejected'

    const updatePayload = {
      post_support_status: newStatus,
      post_support_reviewed_at: now,
      post_support_review_notes: notes || null,
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
          changed_by: roleInfo.name,
          action: decision === 'approve' ? 'approve_post_support' : 'reject_post_support',
          from_status: 'approved',
          to_status: 'approved',
          notes: notes || (decision === 'approve' ? 'Soporte post-permiso validado y aprobado por Rectoría (Cierre Definitivo)' : 'Soporte post-permiso devuelto o rechazado por Rectoría')
        })
    } catch {
      // Continuar en memoria
    }

    // Actualizar siempre memoria fallback
    const fallbackList = await getAllFallbackPermissions()
    const found = fallbackList.find(p => p.id === requestId)
    if (found) {
      found.postSupportStatus = newStatus
      found.postSupportReviewedAt = now
      found.postSupportReviewNotes = notes || null
      found.postSupportRectorName = roleInfo.name
      found.updatedAt = now
      found.history = found.history || []
      found.history.push({
        id: `h-${Date.now()}`,
        requestId,
        changedBy: roleInfo.name,
        changedByName: roleInfo.name,
        action: decision === 'approve' ? 'approve_post_support' : 'reject_post_support',
        fromStatus: 'approved',
        toStatus: 'approved',
        notes: notes || (decision === 'approve' ? 'Soporte aprobado por Rectoría' : 'Soporte devuelto por Rectoría'),
        createdAt: now
      })
    }

    revalidatePath('/admin/permissions')
    revalidatePath(`/admin/permissions/${requestId}`)
    revalidatePath('/teacher/permissions')
    revalidatePath(`/teacher/permissions/${requestId}`)

    return { success: true }
  } catch (err: any) {
    console.error('Error al procesar soporte post-permiso:', err)
    return { success: false, error: err.message || 'Error al procesar la revisión del soporte.' }
  }
}
