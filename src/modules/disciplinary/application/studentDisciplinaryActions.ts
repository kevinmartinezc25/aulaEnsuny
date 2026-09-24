'use server'

import { createAdminClient } from '@/core/config/supabase/server'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { DisciplinaryReport, ReportStatus, StudentDisciplinaryHistory } from './actions'

export interface StudentPortalDisciplinaryData {
  summary: StudentDisciplinaryHistory
  reports: DisciplinaryReport[]
}

const emptySummary: StudentDisciplinaryHistory = {
  totalReports: 0,
  tipoI: 0,
  tipoII: 0,
  tipoIII: 0,
  openCases: 0,
  closedCases: 0,
  recentReports: []
}

function mapDisciplinaryReport(row: Record<string, unknown>): DisciplinaryReport {
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
    situationSnapshot: (row.situation_snapshot as DisciplinaryReport['situationSnapshot']) || {
      code: '',
      type: 'Tipo I',
      title: 'Situación de Convivencia',
      description: '',
      manualReference: null
    },
    teacherDescription: (row.teacher_description as string) || '',
    studentDefense: (row.student_defense as string) || null,
    studentCommitment: (row.student_commitment as string) || null,
    generatedReport: (row.generated_report as string) || '',
    studentSignatureUrl: (row.student_signature_url as string) || null,
    signatureConfirmed: (row.signature_confirmed as boolean) || false,
    status: (row.status as ReportStatus) || 'registered',
    reportDate: row.report_date as string,
    reportTime: row.report_time as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

/**
 * Obtiene el historial y reportes de convivencia escolar para el estudiante logueado
 * en el portal de Consulta Académica (Solo Lectura).
 */
export async function getStudentPortalDisciplinaryData(): Promise<StudentPortalDisciplinaryData> {
  try {
    const session = await getPlanillaStudentSession()
    if (!session) {
      return { summary: emptySummary, reports: [] }
    }

    const adminClient = createAdminClient()
    const orConditions: string[] = []

    if (session.directoryId) {
      orConditions.push(`student_directory_id.eq.${session.directoryId}`)
    }
    if (session.profileId) {
      orConditions.push(`student_profile_id.eq.${session.profileId}`)
    }
    if (session.documentId) {
      const cleanDoc = session.documentId.trim()
      orConditions.push(`student_document.eq.${cleanDoc}`)
      const alphanumericDoc = cleanDoc.replace(/[^0-9a-zA-Z]/g, '')
      if (alphanumericDoc !== cleanDoc && alphanumericDoc.length > 0) {
        orConditions.push(`student_document.eq.${alphanumericDoc}`)
      }
    }

    if (orConditions.length === 0) {
      return { summary: emptySummary, reports: [] }
    }

    const { data, error } = await adminClient
      .from('disciplinary_reports')
      .select('*')
      .is('deleted_at', null)
      .or(orConditions.join(','))
      .order('report_date', { ascending: false })
      .order('report_time', { ascending: false })

    if (error) {
      console.error('Error al consultar reportes de convivencia para el estudiante:', error)
      return { summary: emptySummary, reports: [] }
    }

    // Deduplicar en memoria por ID si alguna condición causó duplicación
    const seenIds = new Set<string>()
    const reports: DisciplinaryReport[] = []

    for (const row of data || []) {
      if (!seenIds.has(row.id)) {
        seenIds.add(row.id)
        reports.push(mapDisciplinaryReport(row as Record<string, unknown>))
      }
    }

    const openStatuses: ReportStatus[] = ['registered', 'reviewing', 'following']
    const closedStatuses: ReportStatus[] = ['closed', 'archived']

    const tipoI = reports.filter(r => r.situationSnapshot?.type === 'Tipo I').length
    const tipoII = reports.filter(r => r.situationSnapshot?.type === 'Tipo II').length
    const tipoIII = reports.filter(r => r.situationSnapshot?.type === 'Tipo III').length
    const openCases = reports.filter(r => openStatuses.includes(r.status)).length
    const closedCases = reports.filter(r => closedStatuses.includes(r.status)).length

    const summary: StudentDisciplinaryHistory = {
      totalReports: reports.length,
      tipoI,
      tipoII,
      tipoIII,
      openCases,
      closedCases,
      recentReports: reports.slice(0, 5).map(r => ({
        id: r.id,
        date: r.reportDate,
        type: r.situationSnapshot?.type || 'Tipo I',
        status: r.status
      }))
    }

    return {
      summary,
      reports
    }
  } catch (err) {
    console.error('Excepción en getStudentPortalDisciplinaryData:', err)
    return { summary: emptySummary, reports: [] }
  }
}
