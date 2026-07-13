'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'

export interface AcademicPeriod {
  id: string
  name: string
  year: number
  start_date?: string
  end_date?: string
  status: 'active' | 'inactive'
}

// Obtener períodos académicos
export async function getAcademicPeriods(): Promise<AcademicPeriod[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('academic_periods')
    .select('*')
    .order('year', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error al obtener períodos académicos:', error)
    return [
      { id: 'p1', name: 'Periodo 1', year: 2026, status: 'inactive' },
      { id: 'p2', name: 'Periodo 2', year: 2026, status: 'active' },
      { id: 'p3', name: 'Periodo 3', year: 2026, status: 'active' },
      { id: 'p4', name: 'Periodo 4', year: 2026, status: 'active' },
    ]
  }

  return data || []
}

// Obtener cursos del docente autenticado
export async function getTeacherCourses(): Promise<{ id: string; title: string; subject: string; gradeLevel: string; groupName: string }[]> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('No autorizado')
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('courses')
    .select('id, title, subject, grade_level, group_name')
    .eq('teacher_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching teacher courses:', error)
    return []
  }

  return (data || []).map(c => ({
    id: c.id,
    title: c.title,
    subject: c.subject,
    gradeLevel: c.grade_level,
    groupName: c.group_name || '1'
  }))
}
