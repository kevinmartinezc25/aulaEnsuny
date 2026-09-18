'use server'

import { createAdminClient } from '@/core/config/supabase/server'
import { getPlanillaStudentSession } from './studentAuthActions'
import { AssistedActivity } from './actions'

export interface StudentSubjectView {
  id: string
  name: string
  grade: number
  group_number: number
  period: string
  studentIdInSubject: string
  achievementsCount: number
}

export async function getStudentSubjects(): Promise<StudentSubjectView[]> {
  const session = await getPlanillaStudentSession()
  if (!session) throw new Error('No autorizado')

  const supabase = createAdminClient()
  const trimmedFullName = session.fullName.trim()

  // 1. Obtener todas las inscripciones en planillas asistidas de este estudiante
  let enrollments: Array<{ id: string; subject_id: string }> = []

  if (session.directoryId) {
    const { data: byDir, error: dirError } = await supabase
      .from('assisted_students')
      .select('id, subject_id')
      .eq('directory_id', session.directoryId)

    if (!dirError && byDir) {
      enrollments.push(...byDir)
    }
  }

  if (trimmedFullName) {
    const { data: byName, error: nameError } = await supabase
      .from('assisted_students')
      .select('id, subject_id')
      .ilike('full_name', trimmedFullName)

    if (!nameError && byName) {
      for (const item of byName) {
        if (!enrollments.some(e => e.id === item.id)) {
          enrollments.push(item)
        }
      }
    }
  }

  if (enrollments.length === 0) return []

  const subjectIds = Array.from(new Set(enrollments.map(e => e.subject_id)))

  // 2. Obtener los detalles de las materias
  const { data: subjects, error: subjError } = await supabase
    .from('assisted_subjects')
    .select('id, name, grade, group_number, period')
    .in('id', subjectIds)
    .order('period', { ascending: false })

  if (subjError) throw new Error('Error al cargar datos de materias')

  // 3. Obtener el conteo de logros para estas materias
  const { data: achievements } = await supabase
    .from('assisted_achievements')
    .select('id, subject_id')
    .in('subject_id', subjectIds)

  const achievementCounts = new Map<string, number>()
  if (achievements) {
    achievements.forEach(a => {
      achievementCounts.set(a.subject_id, (achievementCounts.get(a.subject_id) || 0) + 1)
    })
  }

  return (subjects || []).map(sub => ({
    ...sub,
    studentIdInSubject: enrollments.find(e => e.subject_id === sub.id)!.id,
    achievementsCount: achievementCounts.get(sub.id) || 0
  }))
}

export async function getStudentGradesView(subjectId: string) {
  if (!subjectId) throw new Error('Materia no especificada')

  const session = await getPlanillaStudentSession()
  if (!session) throw new Error('No autorizado')

  const supabase = createAdminClient()
  const trimmedFullName = session.fullName.trim()

  // 1. Validar pertenencia a la materia
  let enrollment: { id: string; number: number } | null = null

  if (session.directoryId) {
    const { data: byDir, error: dirError } = await supabase
      .from('assisted_students')
      .select('id, number')
      .eq('subject_id', subjectId)
      .eq('directory_id', session.directoryId)
      .maybeSingle()

    if (!dirError && byDir) {
      enrollment = byDir
    }
  }

  if (!enrollment && trimmedFullName) {
    const { data: byName, error: nameError } = await supabase
      .from('assisted_students')
      .select('id, number')
      .eq('subject_id', subjectId)
      .ilike('full_name', trimmedFullName)
      .maybeSingle()

    if (!nameError && byName) {
      enrollment = byName
    }
  }

  // Respaldo adicional con búsqueda difusa por si hay diferencias de espaciado o acentos
  if (!enrollment && trimmedFullName) {
    const { data: byFuzzy } = await supabase
      .from('assisted_students')
      .select('id, number')
      .eq('subject_id', subjectId)
      .ilike('full_name', `%${trimmedFullName}%`)
      .limit(1)

    if (byFuzzy && byFuzzy.length > 0) {
      enrollment = byFuzzy[0]
    }
  }

  if (!enrollment) {
    console.warn(`[getStudentGradesView] Student not enrolled or not found in subject ${subjectId}: directoryId=${session.directoryId}, name=${trimmedFullName}`)
    throw new Error('No estás inscrito en esta materia')
  }
  const myStudentId = enrollment.id

  // 2. Obtener Materia
  const { data: subject, error: subjError } = await supabase
    .from('assisted_subjects')
    .select('*')
    .eq('id', subjectId)
    .single()

  if (subjError || !subject) throw new Error('Error al obtener materia')

  // 3. Obtener Logros
  const { data: achievements, error: achError } = await supabase
    .from('assisted_achievements')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true })

  if (achError) throw new Error('Error al cargar logros')

  // 4. Obtener Actividades
  let activities: AssistedActivity[] = []
  if (achievements && achievements.length > 0) {
    const achIds = achievements.map(a => a.id)
    const { data: acts, error: actError } = await supabase
      .from('assisted_activities')
      .select('*')
      .in('achievement_id', achIds)
      .order('position_order', { ascending: true })
    if (!actError && acts) activities = acts
  }

  // 5. Obtener Mis Notas (Solo mis notas)
  const { data: grades, error: gradeError } = await supabase
    .from('assisted_grades')
    .select('*')
    .eq('student_id', myStudentId)

  if (gradeError) throw new Error('Error al cargar calificaciones')

  return { subject, achievements: achievements || [], activities, grades: grades || [] }
}
