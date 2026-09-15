'use server'

import { createClient } from '@/core/config/supabase/server'

export interface AssistedSubject {
  id: string
  teacher_id: string
  name: string
  description?: string
  grade?: number
  group_number?: number
  period?: string
  created_at: string
  students_count?: number
}

export async function getAssistedSubjects(): Promise<AssistedSubject[]> {
  const supabase = await createClient()
  
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    throw new Error('No autorizado')
  }

  const { data, error } = await supabase
    .from('assisted_subjects')
    .select('*, assisted_students(count)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching assisted subjects:', error)
    throw new Error('Error al obtener las materias de Planilla Asistida')
  }

  return data.map((subject: any) => ({
    ...subject,
    students_count: subject.assisted_students?.[0]?.count || 0
  })) as AssistedSubject[]
}

export async function createAssistedSubject(data: { name: string, description?: string, grade?: number, group_number?: number, period?: string }): Promise<AssistedSubject> {
  const supabase = await createClient()
  const { data: user, error: userError } = await supabase.auth.getUser()
  if (userError || !user.user) throw new Error('Usuario no autenticado')

  const { data: subject, error } = await supabase
    .from('assisted_subjects')
    .insert([{ ...data, teacher_id: user.user.id }])
    .select('*')
    .single()

  if (error) {
    console.error('Error creating assisted subject:', error)
    throw new Error('Error al crear la materia de Planilla Asistida')
  }

  return subject as AssistedSubject
}

export async function createAssistedStudents(subjectId: string, students: { number: number, fullName: string }[]): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    throw new Error('No autorizado')
  }

  // Verifica que la materia pertenece al docente (para seguridad, aunque RLS lo hace)
  const { data: subjectCheck, error: subjectError } = await supabase
    .from('assisted_subjects')
    .select('id')
    .eq('id', subjectId)
    .eq('teacher_id', userData.user.id)
    .single()

  if (subjectError || !subjectCheck) {
    throw new Error('Materia no encontrada o acceso denegado')
  }

  const payload = students.map(student => ({
    subject_id: subjectId,
    number: student.number,
    full_name: student.fullName
  }))

  const { error } = await supabase
    .from('assisted_students')
    .insert(payload)

  if (error) {
    console.error('Error creating assisted students:', error)
    throw new Error('Error al guardar los estudiantes')
  }

  return true
}

export interface AchievementCodeConfig {
  type: 'none' | 'single' | 'by_range'
  singleCode?: string
  rangeCodes?: {
    bajo: string
    basico: string
    alto: string
    superior: string
  }
}

export interface AssistedAchievement {
  id: string
  subject_id: string
  name: string
  description: string | null
  position_order: number
  code_config?: AchievementCodeConfig
}

export interface AssistedActivity {
  id: string
  achievement_id: string
  component_type: 'hacer' | 'saber' | 'ser'
  name: string
  position_order: number
}

export async function createAssistedAchievement(subjectId: string, name: string, description?: string, codeConfig?: AchievementCodeConfig): Promise<AssistedAchievement> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  // Obtener el máximo order actual
  const { data: currentAchievements } = await supabase
    .from('assisted_achievements')
    .select('position_order')
    .eq('subject_id', subjectId)
    .order('position_order', { ascending: false })
    .limit(1)
  
  const nextOrder = currentAchievements && currentAchievements.length > 0 ? currentAchievements[0].position_order + 1 : 1

  const { data, error } = await supabase
    .from('assisted_achievements')
    .insert({
      subject_id: subjectId,
      name,
      description: description || null,
      position_order: nextOrder,
      code_config: codeConfig || { type: 'none' }
    })
    .select()
    .single()

  if (error) throw new Error('Error al crear el logro')
  return data as AssistedAchievement
}

export async function updateAssistedAchievement(id: string, name: string, description: string, codeConfig?: AchievementCodeConfig): Promise<AssistedAchievement> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assisted_achievements')
    .update({ name: name.toUpperCase(), description: description, code_config: codeConfig || { type: 'none' } })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error('Error al actualizar el logro: ' + error.message)

  return data as AssistedAchievement
}

export async function deleteAssistedAchievement(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('assisted_achievements')
    .delete()
    .eq('id', id)

  if (error) throw new Error('Error al eliminar el logro: ' + error.message)
}

export async function createAssistedActivity(achievementId: string, componentType: 'hacer' | 'saber' | 'ser', name: string): Promise<AssistedActivity> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  const { data: currentActivities } = await supabase
    .from('assisted_activities')
    .select('position_order')
    .eq('achievement_id', achievementId)
    .eq('component_type', componentType)
    .order('position_order', { ascending: false })
    .limit(1)

  const nextOrder = currentActivities && currentActivities.length > 0 ? currentActivities[0].position_order + 1 : 1

  const { data, error } = await supabase
    .from('assisted_activities')
    .insert({
      achievement_id: achievementId,
      component_type: componentType,
      name,
      position_order: nextOrder
    })
    .select()
    .single()

  if (error) throw new Error('Error al crear la actividad')
  return data as AssistedActivity
}

export async function updateAssistedActivity(id: string, name: string): Promise<AssistedActivity> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assisted_activities')
    .update({ name: name })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error('Error al actualizar la actividad: ' + error.message)

  return {
    id: data.id,
    achievement_id: data.achievement_id,
    component_type: data.component_type,
    name: data.name,
    position_order: data.position_order
  }
}

export async function deleteAssistedActivity(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('assisted_activities')
    .delete()
    .eq('id', id)

  if (error) throw new Error('Error al eliminar la actividad: ' + error.message)
}

export interface AssistedGrade {
  id: string
  student_id: string
  activity_id: string
  grade_value: number
}

export async function getAssistedGrades(subjectId: string): Promise<AssistedGrade[]> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  // Obtenemos los estudiantes de la materia
  const { data: students, error: studError } = await supabase
    .from('assisted_students')
    .select('id')
    .eq('subject_id', subjectId)

  if (studError) throw new Error('Error al cargar estudiantes para obtener notas')
  const studentIds = students.map(s => s.id)

  if (studentIds.length === 0) return []

  // Obtenemos las notas de esos estudiantes
  const { data: grades, error: gradError } = await supabase
    .from('assisted_grades')
    .select('*')
    .in('student_id', studentIds)

  if (gradError) throw new Error('Error al cargar notas')

  return grades as AssistedGrade[]
}

export async function getAssistedStudents(subjectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assisted_students')
    .select('*')
    .eq('subject_id', subjectId)
    .order('number', { ascending: true })

  if (error) throw new Error('Error al obtener los estudiantes')
  return data
}

export async function saveAssistedGrades(gradesToSave: { student_id: string, activity_id: string, grade_value: number }[]) {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  if (gradesToSave.length === 0) return

  const { error } = await supabase
    .from('assisted_grades')
    .upsert(gradesToSave, { onConflict: 'student_id, activity_id' })

  if (error) {
    console.error('Error al guardar notas:', error)
    throw new Error('Error al guardar las notas')
  }

  return true
}

export async function getAssistedAchievementsAndActivities(subjectId: string): Promise<{ achievements: AssistedAchievement[], activities: AssistedActivity[] }> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  const { data: achievements, error: achError } = await supabase
    .from('assisted_achievements')
    .select('*')
    .eq('subject_id', subjectId)
    .order('position_order', { ascending: true })

  if (achError) throw new Error('Error al obtener los logros')

  const achievementIds = achievements.map(a => a.id)
  
  let activities: AssistedActivity[] = []
  if (achievementIds.length > 0) {
    const { data: acts, error: actError } = await supabase
      .from('assisted_activities')
      .select('*')
      .in('achievement_id', achievementIds)
      .order('position_order', { ascending: true })
    
    if (actError) throw new Error('Error al obtener las actividades')
    activities = acts
  }

  return { achievements, activities }
}

export async function getAssistedSubjectById(subjectId: string): Promise<AssistedSubject> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assisted_subjects')
    .select('*')
    .eq('id', subjectId)
    .single()

  if (error || !data) throw new Error('Materia no encontrada')
  return data as AssistedSubject
}

export async function updateAssistedSubject(subjectId: string, data: { name: string, description?: string, grade?: number, group_number?: number, period?: string }): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('assisted_subjects')
    .update(data)
    .eq('id', subjectId)
    
  if (error) throw new Error('Error al actualizar la materia')
}

export async function deleteAssistedSubject(subjectId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('assisted_subjects')
    .delete()
    .eq('id', subjectId)
    
  if (error) throw new Error('Error al eliminar la materia')
}

export interface AssistedStudent {
  id: string
  subject_id: string
  full_name: string
  number: number
}

export async function createAssistedStudent(subjectId: string, fullName: string, number: number): Promise<AssistedStudent> {
  const supabase = await createClient()
  
  const newStudent = {
    subject_id: subjectId,
    full_name: fullName.toUpperCase(),
    number: number
  }

  const { data, error } = await supabase
    .from('assisted_students')
    .insert([newStudent])
    .select('*')
    .single()

  if (error) {
    throw new Error('Error al crear el estudiante: ' + error.message)
  }

  return {
    id: data.id,
    subject_id: data.subject_id,
    full_name: data.full_name,
    number: data.number
  }
}

export async function deleteAssistedStudent(studentId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('assisted_students')
    .delete()
    .eq('id', studentId)
    
  if (error) throw new Error('Error al eliminar al estudiante')
}

