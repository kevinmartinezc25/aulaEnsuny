/**
 * Entidades y tipos del Módulo de Solicitud de Permisos para Docentes
 * aulaEnsuny — Proceso Institucional Digital y Trazable
 */

export type PermissionStatus =
  | 'draft'                  // Borrador
  | 'submitted'              // Solicitud enviada (pendiente de Rectoría)
  | 'reviewing_rector'       // En revisión por Rectoría
  | 'approved_rector'        // Aprobada por Rectoría (pasa a Coordinación)
  | 'reviewing_coordinator'  // En revisión por Coordinación Académica
  | 'approved'               // Aprobada definitivamente
  | 'rejected'               // Rechazada
  | 'returned_correction'    // Devuelta para corrección
  | 'cancelled'              // Cancelada por el docente

export const PERMISSION_STATUS_LABELS: Record<PermissionStatus, string> = {
  draft: 'Borrador',
  submitted: 'Solicitud enviada',
  reviewing_rector: 'En revisión por Rectoría',
  approved_rector: 'Aprobada por Rectoría',
  reviewing_coordinator: 'En revisión por Coordinación Académica',
  approved: 'Permiso aprobado',
  rejected: 'Rechazada',
  returned_correction: 'Devuelta para corrección',
  cancelled: 'Cancelada',
}

export const PERMISSION_STATUS_COLORS: Record<PermissionStatus, { bg: string; text: string; border: string; badge: string }> = {
  draft: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  submitted: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  reviewing_rector: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  approved_rector: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
  reviewing_coordinator: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  approved: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  rejected: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  },
  returned_correction: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  },
  cancelled: {
    bg: 'bg-zinc-50 dark:bg-zinc-900/40',
    text: 'text-zinc-600 dark:text-zinc-400',
    border: 'border-zinc-200 dark:border-zinc-700',
    badge: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
  },
}

export interface PermissionType {
  id: string
  code: string
  name: string
  description?: string | null
  requiresAttachment: boolean
  affectsClasses: boolean
  active: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface TeacherSnapshot {
  id: string
  fullName: string
  email: string
  document?: string | null
  role: string
  campus?: string | null
  mainSubject?: string | null
  phone?: string | null
}

export interface AcademicImpactItem {
  id?: string
  date: string
  startTime?: string
  endTime?: string
  courseId?: string
  courseName: string
  gradeGroup: string
  subject: string
  hoursCount: number
}

export interface StudentActivityPlan {
  id?: string
  courseId?: string
  courseName?: string
  groupName: string
  title: string
  instructions: string
  resourceLinks?: string[]
}

export interface CoverageAssignment {
  academicItemIndex: number
  groupName: string
  subject: string
  periodOrTime: string
  substituteTeacherId?: string
  substituteTeacherName?: string
  observations?: string
}

export interface PermissionRequestHistory {
  id: string
  requestId: string
  changedBy: string
  changedByName?: string
  action: string
  fromStatus: PermissionStatus | null
  toStatus: PermissionStatus
  notes?: string | null
  createdAt: string
  metadata?: Record<string, any>
}

export interface PermissionRequest {
  id: string
  requestNumber: string
  teacherId: string
  teacherSnapshot: TeacherSnapshot
  typeId: string
  typeSnapshot: {
    code: string
    name: string
    requiresAttachment: boolean
    affectsClasses: boolean
  }
  startDate: string
  endDate: string
  isFullDay: boolean
  startTime?: string | null
  endTime?: string | null
  reason: string
  attachmentUrl?: string | null
  attachmentName?: string | null
  attachmentType?: string | null
  affectsAcademicDuty: boolean
  academicImpact: AcademicImpactItem[]
  leavesStudentActivities: boolean
  studentActivities: StudentActivityPlan[]
  coveragePlan: CoverageAssignment[]
  status: PermissionStatus
  rectorId?: string | null
  rectorName?: string | null
  rectorApprovalDate?: string | null
  rectorNotes?: string | null
  coordinatorId?: string | null
  coordinatorName?: string | null
  coordinatorApprovalDate?: string | null
  coordinatorNotes?: string | null
  rejectionReason?: string | null
  correctionNotes?: string | null
  verificationCode: string
  // Soporte posterior al cumplimiento del permiso
  postSupportUrl?: string | null
  postSupportName?: string | null
  postSupportSubmittedAt?: string | null
  postSupportStatus?: 'pending_upload' | 'submitted' | 'approved' | 'rejected' | null
  postSupportReviewNotes?: string | null
  postSupportReviewedAt?: string | null
  postSupportRectorId?: string | null
  postSupportRectorName?: string | null
  createdAt: string
  updatedAt: string
  history?: PermissionRequestHistory[]
}

export interface PermissionStatsSummary {
  total: number
  pending: number
  approved: number
  rejected: number
  returned: number
  totalHoursAffected: number
}

export interface PermissionReportMetrics {
  totalRequests: number
  approvedCount: number
  rejectedCount: number
  pendingCount: number
  totalHoursAffected: number
  monthlyData: Array<{ month: string; total: number; approved: number; rejected: number }>
  byTypeData: Array<{ name: string; count: number }>
  topTeachers: Array<{ name: string; email: string; count: number; hours: number }>
}

export const DEFAULT_PERMISSION_TYPES: PermissionType[] = [
  { id: 'calamidad-1', code: 'CALAMIDAD', name: 'Calamidad doméstica', description: 'Grave suceso familiar o doméstico que afecta al docente.', requiresAttachment: false, affectsClasses: true, active: true, sortOrder: 1 },
  { id: 'cita-med-2', code: 'CITA_MEDICA', name: 'Cita médica', description: 'Atención médica o especializada programada en EPS o prepagada.', requiresAttachment: true, affectsClasses: true, active: true, sortOrder: 2 },
  { id: 'cita-odont-3', code: 'CITA_ODONTOLOGICA', name: 'Cita odontológica', description: 'Consulta o procedimiento odontológico programado.', requiresAttachment: true, affectsClasses: true, active: true, sortOrder: 3 },
  { id: 'incap-4', code: 'INCAPACIDAD', name: 'Incapacidad médica', description: 'Incapacidad expedida por la EPS o entidad de salud.', requiresAttachment: true, affectsClasses: true, active: true, sortOrder: 4 },
  { id: 'asunto-pers-5', code: 'ASUNTO_PERSONAL', name: 'Asunto personal', description: 'Diligencia o compromiso de índole particular inaplazable.', requiresAttachment: false, affectsClasses: true, active: true, sortOrder: 5 },
  { id: 'capacit-6', code: 'CAPACITACION', name: 'Capacitación académica', description: 'Eventos, cursos o talleres de formación y cualificación docente.', requiresAttachment: true, affectsClasses: true, active: true, sortOrder: 6 },
  { id: 'repres-7', code: 'REPRESENTACION', name: 'Representación institucional', description: 'Comisión o representación oficial en nombre de la institución.', requiresAttachment: true, affectsClasses: true, active: true, sortOrder: 7 },
  { id: 'licencia-8', code: 'LICENCIA', name: 'Licencia reglamentaria', description: 'Licencias contempladas en la normativa laboral y estatuto docente.', requiresAttachment: true, affectsClasses: true, active: true, sortOrder: 8 },
  { id: 'otro-9', code: 'OTRO', name: 'Otro tipo de permiso', description: 'Otro motivo justificado no contemplado en las opciones anteriores.', requiresAttachment: false, affectsClasses: true, active: true, sortOrder: 9 },
]
