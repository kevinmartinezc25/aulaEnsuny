'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS EXPORTADOS
// ─────────────────────────────────────────────────────────────────────────────

export type ReportStatus = 'registered' | 'reviewing' | 'following' | 'closed' | 'archived'

export interface DisciplinarySituation {
  id: string
  code: string
  type: 'Tipo I' | 'Tipo II' | 'Tipo III'
  title: string
  description: string
  category: string | null
  manualReference: string | null
  active: boolean
  sortOrder: number
}

export interface StudentRef {
  source: 'profile' | 'directory'
  id: string                    // profiles.id o student_directory.id
  firstName: string
  lastName: string
  fullName: string
  documentId: string | null
  gradeLevel: string
  groupName: string
}

export interface CreateReportInput {
  student: StudentRef
  situationId: string
  situationSnapshot: {
    code: string
    type: string
    title: string
    description: string
    manualReference: string | null
  }
  teacherDescription: string
  generatedReport: string
  studentSignatureUrl?: string
  signatureConfirmed?: boolean
  reportDate?: string
  reportTime?: string
}

export interface DisciplinaryReport {
  id: string
  teacherId: string
  teacherName: string
  studentFullName: string
  studentDocument: string | null
  studentGrade: string
  studentGroup: string
  studentProfileId: string | null
  studentDirectoryId: string | null
  situationId: string
  situationSnapshot: {
    code: string
    type: string
    title: string
    description: string
    manualReference: string | null
  }
  teacherDescription: string
  generatedReport: string
  studentSignatureUrl: string | null
  signatureConfirmed: boolean
  status: ReportStatus
  reportDate: string
  reportTime: string
  createdAt: string
  updatedAt: string
  hasAlert?: boolean // Flag for 3 or more total reports
}

export interface ReportHistoryEntry {
  id: string
  changedBy: string
  changedByName: string
  oldStatus: ReportStatus | null
  newStatus: ReportStatus
  notes: string | null
  createdAt: string
}

export interface StudentDisciplinaryHistory {
  totalReports: number
  tipoI: number
  tipoII: number
  tipoIII: number
  openCases: number
  closedCases: number
  recentReports: { id: string; date: string; type: string; status: ReportStatus }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function mapReport(row: Record<string, unknown>): DisciplinaryReport {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    teacherName: (row.teacher_name as string) || 'Docente',
    studentFullName: row.student_full_name as string,
    studentDocument: (row.student_document as string) || null,
    studentGrade: row.student_grade as string,
    studentGroup: row.student_group as string,
    studentProfileId: (row.student_profile_id as string) || null,
    studentDirectoryId: (row.student_directory_id as string) || null,
    situationId: row.situation_id as string,
    situationSnapshot: row.situation_snapshot as DisciplinaryReport['situationSnapshot'],
    teacherDescription: row.teacher_description as string,
    generatedReport: row.generated_report as string,
    studentSignatureUrl: (row.student_signature_url as string) || null,
    signatureConfirmed: (row.signature_confirmed as boolean) || false,
    status: row.status as ReportStatus,
    reportDate: row.report_date as string,
    reportTime: row.report_time as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREAR REPORTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea un nuevo reporte de novedad.
 * Solo puede ser invocado por un docente autenticado.
 */
export async function createDisciplinaryReport(
  input: CreateReportInput
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'No autorizado' }

    const adminClient = createAdminClient()

    // Obtener nombre del docente
    const { data: profile } = await adminClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()
      
    const teacherName = profile ? `${profile.first_name} ${profile.last_name}` : 'Docente Desconocido'

    const insertData = {
      teacher_id: user.id,
      teacher_name: teacherName,
      // Referencia al estudiante según la fuente
      student_profile_id: input.student.source === 'profile' ? input.student.id : null,
      student_directory_id: input.student.source === 'directory' ? input.student.id : null,
      // Snapshot del estudiante
      student_full_name: `${input.student.lastName} ${input.student.firstName}`,
      student_document: input.student.documentId || null,
      student_grade: input.student.gradeLevel,
      student_group: input.student.groupName,
      // Situación
      situation_id: input.situationId,
      situation_snapshot: input.situationSnapshot,
      // Narrativa
      teacher_description: input.teacherDescription,
      generated_report: input.generatedReport,
      // Firma
      student_signature_url: input.studentSignatureUrl || null,
      signature_confirmed: input.signatureConfirmed ?? false,
      // Estado inicial
      status: 'registered' as const,
      report_date: input.reportDate || new Date().toISOString().split('T')[0],
      report_time: input.reportTime || new Date().toTimeString().split(' ')[0],
    }

    const { data, error } = await adminClient
      .from('disciplinary_reports')
      .insert(insertData)
      .select('id')
      .single()

    if (error) throw error

    // Registrar en historial
    await adminClient
      .from('disciplinary_report_history')
      .insert({
        report_id: data.id,
        changed_by: user.id,
        changed_by_name: teacherName,
        previous_status: null,
        new_status: 'registered',
        notes: 'Reporte creado',
      })

    revalidatePath('/teacher/disciplinary')

    return { success: true, reportId: data.id }
  } catch (error: any) {
    const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error))
    console.error('Error al crear reporte:', msg, error)
    return { success: false, error: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OBTENER REPORTES DEL DOCENTE
// ─────────────────────────────────────────────────────────────────────────────

export async function getTeacherReports(filters?: {
  status?: ReportStatus | 'all'
  dateFrom?: string
  dateTo?: string
  search?: string
  grade?: string
  group?: string
}): Promise<DisciplinaryReport[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const adminClient = createAdminClient()

    let query = adminClient
      .from('disciplinary_reports')
      .select('*')
      .eq('teacher_id', user.id)
      .is('deleted_at', null)
      .order('report_date', { ascending: false })
      .order('report_time', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.grade) {
      const cleanGrade = filters.grade.replace('°', '')
      query = query.in('student_grade', [cleanGrade, `${cleanGrade}°`])
    }
    if (filters?.group) {
      query = query.eq('student_group', filters.group)
    }
    if (filters?.dateFrom) {
      query = query.gte('report_date', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('report_date', filters.dateTo)
    }

    const { data, error } = await query
    if (error) throw error

    let reports = (data || []).map(r => mapReport(r as Record<string, unknown>))

    // Filtro por nombre en memoria (evita complejidad de FTS)
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      reports = reports.filter(r =>
        r.studentFullName.toLowerCase().includes(q) ||
        (r.studentDocument || '').includes(q)
      )
    }

    return reports
  } catch (error) {
    console.error('Error al obtener reportes del docente:', error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DETALLE DE UN REPORTE
// ─────────────────────────────────────────────────────────────────────────────

export async function getReportDetail(
  reportId: string
): Promise<{ report: DisciplinaryReport; history: ReportHistoryEntry[] } | null> {
  try {
    const adminClient = createAdminClient()

    const { data: report, error } = await adminClient
      .from('disciplinary_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (error || !report) {
      console.error('Error fetching report detail:', error?.message || 'Report not found', error)
      return null
    }

    const { data: historyRows } = await adminClient
      .from('disciplinary_report_history')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })

    const history: ReportHistoryEntry[] = (historyRows || []).map(h => {
      return {
        id: h.id as string,
        changedBy: h.changed_by as string,
        changedByName: (h.changed_by_name as string) || 'Usuario',
        oldStatus: (h.previous_status as ReportStatus) || null,
        newStatus: h.new_status as ReportStatus,
        notes: (h.notes as string) || null,
        createdAt: h.created_at as string,
      }
    })

    return { report: mapReport(report as Record<string, unknown>), history }
  } catch (error) {
    console.error('Error al obtener detalle del reporte:', error)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORIAL DISCIPLINARIO DEL ESTUDIANTE
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentDisciplinaryHistory(
  studentProfileId?: string,
  studentDirectoryId?: string
): Promise<StudentDisciplinaryHistory> {
  const empty: StudentDisciplinaryHistory = {
    totalReports: 0, tipoI: 0, tipoII: 0, tipoIII: 0,
    openCases: 0, closedCases: 0, recentReports: [],
  }

  if (!studentProfileId && !studentDirectoryId) return empty

  try {
    const adminClient = createAdminClient()

    let query = adminClient
      .from('disciplinary_reports')
      .select('id, report_date, situation_snapshot, status')
      .is('deleted_at', null)
      .order('report_date', { ascending: false })

    if (studentProfileId) {
      query = query.eq('student_profile_id', studentProfileId)
    } else if (studentDirectoryId) {
      query = query.eq('student_directory_id', studentDirectoryId)
    }

    const { data, error } = await query
    if (error) throw error

    const reports = data || []
    const openStatuses: ReportStatus[] = ['registered', 'reviewing', 'following']
    const closedStatuses: ReportStatus[] = ['closed', 'archived']

    return {
      totalReports: reports.length,
      tipoI: reports.filter(r => (r.situation_snapshot as { type: string })?.type === 'Tipo I').length,
      tipoII: reports.filter(r => (r.situation_snapshot as { type: string })?.type === 'Tipo II').length,
      tipoIII: reports.filter(r => (r.situation_snapshot as { type: string })?.type === 'Tipo III').length,
      openCases: reports.filter(r => openStatuses.includes(r.status as ReportStatus)).length,
      closedCases: reports.filter(r => closedStatuses.includes(r.status as ReportStatus)).length,
      recentReports: reports.slice(0, 5).map(r => ({
        id: r.id,
        date: r.report_date,
        type: (r.situation_snapshot as { type: string })?.type || '',
        status: r.status as ReportStatus,
      })),
    }
  } catch (error) {
    console.error('Error al obtener historial del estudiante:', error)
    return empty
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTUALIZAR ESTADO (solo admin)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateReportStatus(
  reportId: string,
  newStatus: ReportStatus,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const adminClient = createAdminClient()

    // Obtener estado actual para el historial
    const { data: current, error: fetchError } = await adminClient
      .from('disciplinary_reports')
      .select('status')
      .eq('id', reportId)
      .single()

    if (fetchError || !current) return { success: false, error: 'Reporte no encontrado' }

    const { error: updateError } = await adminClient
      .from('disciplinary_reports')
      .update({ status: newStatus })
      .eq('id', reportId)

    if (updateError) throw updateError

    const adminName = `${user.user_metadata.last_name || ''} ${user.user_metadata.first_name || ''}`.trim() || 'Administrador'

    // Registrar cambio en historial
    const { error: historyError } = await adminClient
      .from('disciplinary_report_history')
      .insert({
        report_id: reportId,
        changed_by: user.id,
        changed_by_name: adminName,
        previous_status: current.status,
        new_status: newStatus,
        notes: notes || null,
      })

    if (historyError) {
      console.error('Error al registrar historial:', historyError)
    }

    revalidatePath('/admin/disciplinary')
    revalidatePath(`/admin/disciplinary/${reportId}`)
    revalidatePath('/teacher/disciplinary')

    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ELIMINACIÓN LÓGICA (solo admin)
// ─────────────────────────────────────────────────────────────────────────────

export async function softDeleteReport(
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('disciplinary_reports')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq('id', reportId)

    if (error) throw error

    revalidatePath('/admin/disciplinary')
    revalidatePath('/teacher/disciplinary')

    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTES ADMIN (con filtros avanzados)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAdminReports(filters?: {
  status?: ReportStatus | 'all'
  teacherId?: string
  studentSearch?: string
  situationType?: 'Tipo I' | 'Tipo II' | 'Tipo III' | 'all'
  grade?: string
  group?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}): Promise<{ reports: DisciplinaryReport[]; total: number }> {
  try {
    const adminClient = createAdminClient()

    const page = filters?.page ?? 0
    const pageSize = filters?.pageSize ?? 20
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = adminClient
      .from('disciplinary_reports')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('report_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.teacherId) {
      query = query.eq('teacher_id', filters.teacherId)
    }
    if (filters?.grade) {
      // Soporta buscar tanto '11°' como '11' para evitar falsos positivos con ilike '1%' (que traería 10 y 11)
      const cleanGrade = filters.grade.replace('°', '')
      query = query.in('student_grade', [cleanGrade, `${cleanGrade}°`])
    }
    if (filters?.group) {
      query = query.eq('student_group', filters.group)
    }
    if (filters?.dateFrom) {
      query = query.gte('report_date', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('report_date', filters.dateTo)
    }

    const { data, error, count } = await query
    if (error) throw error

    let reports = (data || []).map(r => mapReport(r as Record<string, unknown>))

    // Filtros en memoria
    if (filters?.studentSearch) {
      const q = filters.studentSearch.toLowerCase()
      reports = reports.filter(r =>
        r.studentFullName.toLowerCase().includes(q) ||
        (r.studentDocument || '').includes(q)
      )
    }
    if (filters?.situationType && filters.situationType !== 'all') {
      reports = reports.filter(r => r.situationSnapshot?.type === filters.situationType)
    }

    // Compute hasAlert for students in the current page
    const profileIds = reports.map(r => r.studentProfileId).filter(Boolean) as string[]
    const directoryIds = reports.map(r => r.studentDirectoryId).filter(Boolean) as string[]

    const alertMap = new Map<string, boolean>()

    if (profileIds.length > 0) {
      const uniqueProfiles = Array.from(new Set(profileIds))
      await Promise.all(uniqueProfiles.map(async (id) => {
        const { count } = await adminClient.from('disciplinary_reports').select('*', { count: 'exact', head: true }).eq('student_profile_id', id).is('deleted_at', null)
        if (count && count >= 3) alertMap.set(id, true)
      }))
    }

    if (directoryIds.length > 0) {
      const uniqueDirectory = Array.from(new Set(directoryIds))
      await Promise.all(uniqueDirectory.map(async (id) => {
        const { count } = await adminClient.from('disciplinary_reports').select('*', { count: 'exact', head: true }).eq('student_directory_id', id).is('deleted_at', null)
        if (count && count >= 3) alertMap.set(id, true)
      }))
    }

    reports = reports.map(r => {
      const key = r.studentProfileId || r.studentDirectoryId
      if (key && alertMap.get(key)) {
        return { ...r, hasAlert: true }
      }
      return r
    })

    return { reports, total: count || 0 }
  } catch (error) {
    console.error('Error al obtener reportes admin:', error)
    return { reports: [], total: 0 }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTADÍSTICAS ADMIN
// ─────────────────────────────────────────────────────────────────────────────

export async function getDisciplinaryStats(year?: number): Promise<{
  total: number
  tipoI: number
  tipoII: number
  tipoIII: number
  openCases: number
  byMonth: { month: string; count: number }[]
  byGrade: { grade: string; count: number }[]
}> {
  try {
    const adminClient = createAdminClient()
    const currentYear = year ?? new Date().getFullYear()

    const { data, error } = await adminClient
      .from('disciplinary_reports')
      .select('situation_snapshot, status, report_date, student_grade')
      .is('deleted_at', null)
      .gte('report_date', `${currentYear}-01-01`)
      .lte('report_date', `${currentYear}-12-31`)

    if (error) throw error

    const reports = data || []
    const openStatuses = ['registered', 'reviewing', 'following']

    // Contar por mes
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, '0')
      const monthName = new Date(currentYear, i, 1)
        .toLocaleString('es-CO', { month: 'short' })
      return {
        month: monthName,
        count: reports.filter(r => r.report_date?.startsWith(`${currentYear}-${month}`)).length,
      }
    })

    // Contar por grado
    const gradeMap = new Map<string, number>()
    reports.forEach(r => {
      const g = r.student_grade || 'Sin grado'
      gradeMap.set(g, (gradeMap.get(g) || 0) + 1)
    })
    const byGrade = Array.from(gradeMap.entries())
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => b.count - a.count)

    return {
      total: reports.length,
      tipoI: reports.filter(r => (r.situation_snapshot as { type: string })?.type === 'Tipo I').length,
      tipoII: reports.filter(r => (r.situation_snapshot as { type: string })?.type === 'Tipo II').length,
      tipoIII: reports.filter(r => (r.situation_snapshot as { type: string })?.type === 'Tipo III').length,
      openCases: reports.filter(r => openStatuses.includes(r.status)).length,
      byMonth,
      byGrade,
    }
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    return { total: 0, tipoI: 0, tipoII: 0, tipoIII: 0, openCases: 0, byMonth: [], byGrade: [] }
  }
}
