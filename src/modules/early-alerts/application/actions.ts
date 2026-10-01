'use server'

import { createAdminClient } from '@/core/config/supabase/server'
import type { AlertStatus, AtRiskStudent, CreateAlertInput, EarlyAlert } from '../domain/types'

// ============================================================
// Módulo: Alertas Tempranas Académicas
// application/actions.ts
// ============================================================

// ── 1. Períodos disponibles desde Planilla Asistida ──────────────────────────
/**
 * Lee los valores únicos del campo `period` de assisted_subjects
 * para poblar el selector de período en la UI.
 */
export async function getAvailablePeriods(): Promise<string[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('assisted_subjects')
    .select('period')
    .not('period', 'is', null)
    .order('period', { ascending: true })

  if (error) {
    console.error('[EarlyAlerts] Error fetching periods:', error)
    return []
  }

  const unique = Array.from(
    new Set((data || []).map((r: any) => r.period as string).filter(Boolean))
  )
  return unique
}

// ── 2. Estudiantes en riesgo desde Planilla Asistida ────────────────────────
/**
 * Calcula qué estudiantes tienen al menos una materia con promedio < 3.0
 * en el período seleccionado. No modifica ningún dato de la Planilla.
 */
export async function getStudentsAtRisk(
  period: string,
  gradeFilter?: string
): Promise<AtRiskStudent[]> {
  const admin = createAdminClient()

  // Obtener calificaciones del período con datos de materia y estudiante
  const { data: grades, error } = await admin
    .from('assisted_grades')
    .select(`
      grade_value,
      student_id,
      assisted_students!inner (
        id,
        full_name,
        directory_id,
        assisted_subjects!inner (
          id,
          name,
          grade,
          group_number,
          period
        )
      )
    `)
    .eq('assisted_students.assisted_subjects.period', period)

  if (error) {
    console.error('[EarlyAlerts] Error fetching at-risk students:', error)
    return []
  }

  // Verificar alertas existentes en este período para marcar has_alert
  const { data: existingAlerts } = await admin
    .from('early_alerts')
    .select('assisted_student_id, status')
    .eq('academic_period', period)
    .in('status', ['pending', 'in_progress'])

  const alertedIds = new Set<string>(
    (existingAlerts || []).map((a: any) => a.assisted_student_id).filter(Boolean)
  )

  // Agrupar por (assisted_student_id, subject_id) → calcular promedio por materia
  type SubjectAgg = { name: string; period: string; sum: number; count: number }
  const studentMap = new Map<string, {
    student_name: string
    directory_id: string | null
    group_label: string
    subjects: Map<string, SubjectAgg>
  }>()

  for (const g of grades || []) {
    const student = (g as any).assisted_students
    if (!student) continue
    const subject = student.assisted_subjects
    if (!subject) continue

    // Filtrar por grado si se especificó
    if (gradeFilter && String(subject.grade) !== gradeFilter) continue

    const sid: string = student.id
    const subjectId: string = subject.id

    if (!studentMap.has(sid)) {
      const rawName: string = student.full_name || 'Estudiante'
      const formattedName = rawName
        .toLowerCase()
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

      const groupLabel = subject.grade
        ? `Grado ${subject.grade}°${subject.group_number ? ` · Grupo ${subject.group_number}` : ''}`
        : 'Sin Grado'

      studentMap.set(sid, {
        student_name: formattedName,
        directory_id: student.directory_id || null,
        group_label: groupLabel,
        subjects: new Map()
      })
    }

    const studentEntry = studentMap.get(sid)!
    if (!studentEntry.subjects.has(subjectId)) {
      studentEntry.subjects.set(subjectId, {
        name: subject.name,
        period: subject.period || period,
        sum: 0,
        count: 0
      })
    }

    const subjectEntry = studentEntry.subjects.get(subjectId)!
    subjectEntry.sum += Number(g.grade_value)
    subjectEntry.count += 1
  }

  // Construir resultado final — solo estudiantes con al menos 1 materia en riesgo
  const result: AtRiskStudent[] = []

  studentMap.forEach((entry, sid) => {
    const allSubjects: { name: string; avg: number; period: string }[] = []
    const lowSubjects: string[] = []
    let totalSum = 0
    let totalCount = 0

    entry.subjects.forEach((sub) => {
      if (sub.count === 0) return
      const avg = Number((sub.sum / sub.count).toFixed(2))
      allSubjects.push({ name: sub.name, avg, period: sub.period })
      totalSum += sub.sum
      totalCount += sub.count
      if (avg < 3.0) lowSubjects.push(sub.name)
    })

    if (lowSubjects.length === 0) return // sin riesgo, omitir

    const overallAvg = totalCount > 0
      ? Number((totalSum / totalCount).toFixed(2))
      : 0

    result.push({
      assisted_student_id: sid,
      student_name: entry.student_name,
      directory_id: entry.directory_id,
      group_label: entry.group_label,
      overall_avg: overallAvg,
      low_subjects: lowSubjects,
      all_subjects: allSubjects,
      has_alert: alertedIds.has(sid)
    })
  })

  // Ordenar: mayor cantidad de materias en riesgo primero
  return result.sort((a, b) => b.low_subjects.length - a.low_subjects.length)
}

// ── 3. Registrar alerta ──────────────────────────────────────────────────────
export async function createEarlyAlert(
  input: CreateAlertInput,
  registeredByName?: string
): Promise<EarlyAlert> {
  const admin = createAdminClient()

  // Verificar si ya existe una alerta activa para este estudiante en el período
  const { data: existing } = await admin
    .from('early_alerts')
    .select('id')
    .eq('assisted_student_id', input.assisted_student_id)
    .eq('academic_period', input.academic_period)
    .in('status', ['pending', 'in_progress'])
    .maybeSingle()

  if (existing) {
    throw new Error('Ya existe una alerta activa para este estudiante en el período seleccionado.')
  }

  const { data, error } = await admin
    .from('early_alerts')
    .insert({
      student_name: input.student_name,
      student_directory_id: input.directory_id,
      assisted_student_id: input.assisted_student_id,
      group_label: input.group_label,
      academic_period: input.academic_period,
      low_performance_areas: input.low_performance_areas,
      notes: input.notes || null,
      registered_by_name: registeredByName || null,
      status: 'pending'
    })
    .select('*')
    .single()

  if (error) {
    console.error('[EarlyAlerts] Error creating alert:', error)
    throw new Error('Error al registrar la alerta. Intente nuevamente.')
  }

  return data as EarlyAlert
}

// ── 4. Listar alertas registradas ───────────────────────────────────────────
export async function getEarlyAlerts(filters?: {
  status?: AlertStatus | 'all'
  period?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ alerts: EarlyAlert[]; total: number }> {
  const admin = createAdminClient()
  const page = filters?.page ?? 0
  const pageSize = filters?.pageSize ?? 20
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = admin
    .from('early_alerts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.period) {
    query = query.eq('academic_period', filters.period)
  }

  if (filters?.search) {
    query = query.ilike('student_name', `%${filters.search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[EarlyAlerts] Error fetching alerts:', error)
    return { alerts: [], total: 0 }
  }

  return { alerts: (data || []) as EarlyAlert[], total: count || 0 }
}

// ── 5. Cambiar estado de alerta ──────────────────────────────────────────────
export async function updateAlertStatus(
  id: string,
  status: AlertStatus,
  notes?: string
): Promise<void> {
  const admin = createAdminClient()

  const updatePayload: Record<string, unknown> = { status }
  if (notes !== undefined) updatePayload.notes = notes

  const { error } = await admin
    .from('early_alerts')
    .update(updatePayload)
    .eq('id', id)

  if (error) {
    console.error('[EarlyAlerts] Error updating alert status:', error)
    throw new Error('Error al actualizar el estado de la alerta.')
  }
}

// ── 6. Eliminar alerta (Deshacer) ───────────────────────────────────────────
export async function deleteEarlyAlert(id: string): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('early_alerts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[EarlyAlerts] Error deleting alert:', error)
    throw new Error('Error al deshacer el registro de la alerta.')
  }
}

// ── 7. Obtener Director de Grupo ────────────────────────────────────────────
export async function getGroupDirectorName(groupLabel: string): Promise<string> {
  const gradeMatch = groupLabel.match(/Grado (\d+)/)
  const groupMatch = groupLabel.match(/Grupo (\d+)/)
  
  if (!gradeMatch || !groupMatch) return 'No Asignado'
  
  const groupName = `${gradeMatch[1]}°-${groupMatch[1]}`
  
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sch_groups')
    .select('director:profiles(first_name, last_name)')
    .eq('name', groupName)
    .single()

  if (error || !data || !data.director) return 'No Asignado'
  
  const director = data.director as any
  return `${director.first_name} ${director.last_name}`
}
