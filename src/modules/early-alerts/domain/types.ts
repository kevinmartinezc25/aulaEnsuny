// ============================================================
// Módulo: Alertas Tempranas Académicas
// domain/types.ts
// ============================================================

export type AlertStatus = 'pending' | 'in_progress' | 'closed'

export interface EarlyAlert {
  id: string
  created_at: string
  updated_at: string
  student_name: string
  student_directory_id: string | null
  assisted_student_id: string | null
  group_label: string
  academic_period: string
  /** Snapshot de nombres de materias con bajo rendimiento al momento del registro */
  low_performance_areas: string[]
  status: AlertStatus
  notes: string | null
  registered_by: string | null
  registered_by_name: string | null
}

/** Resultado calculado desde Planilla Asistida — solo lectura, no se persiste */
export interface AtRiskStudent {
  assisted_student_id: string
  student_name: string
  directory_id: string | null
  group_label: string
  overall_avg: number
  /** Materias con promedio menor a 3.0 */
  low_subjects: string[]
  /** Todas las materias con su promedio para mostrar desglose */
  all_subjects: { name: string; avg: number; period: string }[]
  /** Si ya existe una alerta activa para este estudiante en el periodo seleccionado */
  has_alert: boolean
}

export interface CreateAlertInput {
  assisted_student_id: string
  student_name: string
  directory_id: string | null
  group_label: string
  academic_period: string
  /** Nombres de las materias que el coordinador selecciono para la alerta */
  low_performance_areas: string[]
  notes?: string
}
