'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'

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

export async function createAssistedStudents(subjectId: string, students: { number: number, fullName: string, directoryId?: string }[]): Promise<boolean> {
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

  // 1. Obtener estudiantes existentes en la materia
  const { data: existingStudents, error: existingError } = await supabase
    .from('assisted_students')
    .select('id, full_name, directory_id, number')
    .eq('subject_id', subjectId)

  if (existingError) throw new Error('Error al verificar estudiantes existentes')

  const toInsert = []
  const updates: any[] = []

  // Mapas para búsqueda rápida
  const existingByDirId = new Map(
    (existingStudents || []).filter(s => s.directory_id).map(s => [s.directory_id, s])
  )
  const existingByName = new Map(
    (existingStudents || []).map(s => [s.full_name.trim().toLowerCase(), s])
  )

  for (const student of students) {
    const uppercaseName = student.fullName.toUpperCase().trim()
    let matchedExisting = null

    // Intentar emparejar por directoryId si existe
    if (student.directoryId && existingByDirId.has(student.directoryId)) {
      matchedExisting = existingByDirId.get(student.directoryId)
    } 
    // Si no tiene directoryId o no hizo match, intentar emparejar por nombre
    else if (existingByName.has(student.fullName.trim().toLowerCase())) {
      matchedExisting = existingByName.get(student.fullName.trim().toLowerCase())
    }

    if (matchedExisting) {
      // Si existe, preparamos la actualización si algo cambió
      if (
        matchedExisting.full_name !== uppercaseName || 
        matchedExisting.number !== student.number ||
        (student.directoryId && matchedExisting.directory_id !== student.directoryId)
      ) {
        updates.push(
          supabase
            .from('assisted_students')
            .update({ 
              full_name: uppercaseName, 
              number: student.number,
              directory_id: student.directoryId || matchedExisting.directory_id 
            })
            .eq('id', matchedExisting.id)
        )
      }
    } else {
      // Si no existe, preparamos para insertar
      toInsert.push({
        subject_id: subjectId,
        number: student.number,
        full_name: uppercaseName,
        directory_id: student.directoryId || null
      })
    }
  }

  // Ejecutar inserciones
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('assisted_students')
      .insert(toInsert)
    if (insertError) {
      console.error('Error inserting students:', insertError)
      throw new Error('Error al insertar nuevos estudiantes')
    }
  }

  // Ejecutar actualizaciones
  if (updates.length > 0) {
    await Promise.all(updates)
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
  is_published?: boolean
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

export async function toggleActivityPublishStatus(id: string, isPublished: boolean): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('assisted_activities')
    .update({ is_published: isPublished })
    .eq('id', id)

  if (error) throw new Error('Error al actualizar el estado de publicación: ' + error.message)
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

function formatCanonicalStudentName(lastName?: string | null, firstName?: string | null): string {
  const last = (lastName || '').trim().toUpperCase()
  const first = (firstName || '').trim().toUpperCase()
  if (!last && !first) return ''
  if (!last) return first
  if (!first) return last
  return `${last} ${first}`
}

function buildPlanillaGradeVariants(grade?: number | string | null): string[] {
  const gradeStr = String(grade || '').trim()
  if (!gradeStr) return []
  const gradeDigits = gradeStr.replace(/\D/g, '')
  const variants = new Set<string>([
    gradeStr,
    `${gradeStr}°`,
    gradeDigits,
    `${gradeDigits}°`,
    `${gradeDigits} °`
  ])
  if (gradeDigits === '12' || /pfc[\s\-_]?12/i.test(gradeStr)) {
    variants.add('PFC-12')
    variants.add('PFC 12')
    variants.add('PFC-12°')
    variants.add('PFC')
    variants.add('12')
    variants.add('12°')
    variants.add('12 °')
  }
  if (gradeDigits === '13' || /pfc[\s\-_]?13/i.test(gradeStr)) {
    variants.add('PFC-13')
    variants.add('PFC 13')
    variants.add('PFC-13°')
    variants.add('PFC')
    variants.add('13')
    variants.add('13°')
    variants.add('13 °')
  }
  if (/nivelat/i.test(gradeStr) || gradeStr === '0') {
    variants.add('Nivelatorio')
    variants.add('NIVELATORIO')
    variants.add('nivelatorio')
    variants.add('0')
    variants.add('0°')
  }
  return Array.from(variants).filter(Boolean)
}

function buildPlanillaGroupVariants(groupNumber?: number | string | null, grade?: number | string | null): string[] {
  const groupStr = String(groupNumber ?? '').trim()
  const gradeStr = String(grade ?? '').trim()
  const gradeDigits = gradeStr.replace(/\D/g, '')

  if (!groupStr || groupStr === 'null' || groupStr === 'undefined') {
    return []
  }

  const groupDigits = groupStr.replace(/\D/g, '')
  const variants = new Set<string>([
    groupStr,
    groupDigits,
    groupDigits ? `0${groupDigits}` : '',
    gradeDigits && groupDigits ? `${gradeDigits}-${groupDigits}` : '',
    gradeDigits && groupDigits ? `${gradeDigits}°-${groupDigits}` : '',
    gradeDigits && groupDigits ? `${gradeDigits}° ${groupDigits}` : ''
  ])

  if (gradeDigits === '12' || /pfc[\s\-_]?12/i.test(gradeStr)) {
    variants.add('PFC-12')
    variants.add('PFC 12')
    variants.add('1')
    variants.add('01')
    variants.add('UNICO')
    variants.add('ÚNICO')
  }
  if (gradeDigits === '13' || /pfc[\s\-_]?13/i.test(gradeStr)) {
    variants.add('PFC-13')
    variants.add('PFC 13')
    variants.add('1')
    variants.add('01')
    variants.add('2')
    variants.add('02')
    variants.add('3')
    variants.add('03')
    variants.add('UNICO')
    variants.add('ÚNICO')
  }
  if (/nivelat/i.test(gradeStr) || gradeStr === '0' || /nivelat/i.test(groupStr)) {
    variants.add('1')
    variants.add('01')
    variants.add('Nivelatorio')
    variants.add('UNICO')
    variants.add('ÚNICO')
  }

  return Array.from(variants).filter(Boolean)
}

export async function syncAssistedStudentsForCandidate(
  profileId: string | null | undefined,
  directoryId: string | null | undefined,
  canonicalName: string
): Promise<number> {
  const adminClient = createAdminClient()
  const candidateIds = [
    profileId ? `prof-${profileId}` : null,
    directoryId ? `dir-${directoryId}` : null,
    profileId || null,
    directoryId || null
  ].filter(Boolean) as string[]

  if (candidateIds.length === 0 || !canonicalName) return 0

  const { data, error } = await adminClient
    .from('assisted_students')
    .update({ full_name: canonicalName })
    .in('directory_id', candidateIds)
    .select('id')

  if (error) {
    console.warn('Error al sincronizar nombre en assisted_students:', error)
    return 0
  }
  return data?.length || 0
}

export async function getAssistedStudents(subjectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assisted_students')
    .select('*')
    .eq('subject_id', subjectId)
    .order('number', { ascending: true })

  if (error) throw new Error('Error al obtener los estudiantes')
  if (!data || data.length === 0) return []

  try {
    const adminClient = createAdminClient()

    // Extraer identificadores del directorio o perfil
    const dirIds: string[] = []
    const profIds: string[] = []
    const needsFallback: typeof data = []

    data.forEach(s => {
      if (s.directory_id) {
        if (s.directory_id.startsWith('dir-')) {
          dirIds.push(s.directory_id.replace('dir-', ''))
        } else if (s.directory_id.startsWith('prof-')) {
          profIds.push(s.directory_id.replace('prof-', ''))
        } else {
          dirIds.push(s.directory_id)
          profIds.push(s.directory_id)
        }
      } else {
        needsFallback.push(s)
      }
    })

    // Consultar directorios y perfiles
    const [dirRes, profRes] = await Promise.all([
      dirIds.length > 0
        ? adminClient.from('student_directory').select('id, first_name, last_name, profile_id').in('id', dirIds)
        : Promise.resolve({ data: [] }),
      profIds.length > 0
        ? adminClient.from('profiles').select('id, first_name, last_name').in('id', profIds)
        : Promise.resolve({ data: [] })
    ])

    const dirMap = new Map<string, { id: string; first_name: string; last_name: string; profile_id?: string | null }>()
    ;(dirRes.data || []).forEach(d => dirMap.set(d.id, d))

    const profMap = new Map<string, { id: string; first_name: string; last_name: string }>()
    ;(profRes.data || []).forEach(p => profMap.set(p.id, p))

    // Fallback inteligente para estudiantes sin directory_id
    let fallbackDirMap: Map<string, { id: string; canonicalName: string }> | null = null
    let fallbackProfMap: Map<string, { id: string; canonicalName: string }> | null = null

    if (needsFallback.length > 0) {
      const { data: subData } = await adminClient
        .from('assisted_subjects')
        .select('grade, group_number')
        .eq('id', subjectId)
        .maybeSingle()

      let dirQuery = adminClient.from('student_directory').select('id, first_name, last_name, grade_level, group_name')
      let profQuery = adminClient.from('profiles').select('id, first_name, last_name, grade_level, group_name, roles!inner(name)').eq('roles.name', 'student')

      if (subData?.grade) {
        const gradeVariants = buildPlanillaGradeVariants(subData.grade)
        dirQuery = dirQuery.in('grade_level', gradeVariants)
        profQuery = profQuery.in('grade_level', gradeVariants)
      }

      const [allDirRes, allProfRes] = await Promise.all([
        dirQuery.limit(500),
        profQuery.limit(500)
      ])

      fallbackDirMap = new Map()
      ;(allDirRes.data || []).forEach(d => {
        const canonical = formatCanonicalStudentName(d.last_name, d.first_name)
        const n1 = normalizeStudentName(canonical)
        const n2 = normalizeStudentName(`${d.first_name} ${d.last_name}`)
        if (n1) fallbackDirMap!.set(n1, { id: `dir-${d.id}`, canonicalName: canonical })
        if (n2) fallbackDirMap!.set(n2, { id: `dir-${d.id}`, canonicalName: canonical })
      })

      fallbackProfMap = new Map()
      ;(allProfRes.data || []).forEach(p => {
        const canonical = formatCanonicalStudentName(p.last_name, p.first_name)
        const n1 = normalizeStudentName(canonical)
        const n2 = normalizeStudentName(`${p.first_name} ${p.last_name}`)
        if (n1) fallbackProfMap!.set(n1, { id: `prof-${p.id}`, canonicalName: canonical })
        if (n2) fallbackProfMap!.set(n2, { id: `prof-${p.id}`, canonicalName: canonical })
      })
    }

    const pendingUpdates: { id: string; full_name: string; directory_id?: string }[] = []

    for (const student of data) {
      let canonicalName: string | null = null
      let resolvedDirId: string | null = null

      if (student.directory_id) {
        if (student.directory_id.startsWith('dir-')) {
          const rawId = student.directory_id.replace('dir-', '')
          const dirItem = dirMap.get(rawId)
          if (dirItem) {
            canonicalName = formatCanonicalStudentName(dirItem.last_name, dirItem.first_name)
          }
        } else if (student.directory_id.startsWith('prof-')) {
          const rawId = student.directory_id.replace('prof-', '')
          const profItem = profMap.get(rawId)
          if (profItem) {
            canonicalName = formatCanonicalStudentName(profItem.last_name, profItem.first_name)
          }
        } else {
          const dirItem = dirMap.get(student.directory_id)
          const profItem = profMap.get(student.directory_id)
          if (dirItem) {
            canonicalName = formatCanonicalStudentName(dirItem.last_name, dirItem.first_name)
            resolvedDirId = `dir-${dirItem.id}`
          } else if (profItem) {
            canonicalName = formatCanonicalStudentName(profItem.last_name, profItem.first_name)
            resolvedDirId = `prof-${profItem.id}`
          }
        }
      }

      // Si no se resolvió por directory_id, usar fallback
      if (!canonicalName && (fallbackDirMap || fallbackProfMap)) {
        const norm = normalizeStudentName(student.full_name)
        const dirMatch = fallbackDirMap?.get(norm)
        const profMatch = fallbackProfMap?.get(norm)
        if (dirMatch) {
          canonicalName = dirMatch.canonicalName
          resolvedDirId = dirMatch.id
        } else if (profMatch) {
          canonicalName = profMatch.canonicalName
          resolvedDirId = profMatch.id
        }
      }

      const needsNameUpdate = canonicalName && canonicalName !== student.full_name
      const needsDirUpdate = resolvedDirId && resolvedDirId !== student.directory_id

      if (needsNameUpdate || needsDirUpdate) {
        const updatedName = canonicalName || student.full_name
        const updatedDirId = resolvedDirId || student.directory_id

        student.full_name = updatedName
        if (resolvedDirId) student.directory_id = updatedDirId

        pendingUpdates.push({
          id: student.id,
          full_name: updatedName,
          ...(resolvedDirId ? { directory_id: updatedDirId } : {})
        })
      }
    }

    // Persistir las discrepancias encontradas en segundo plano
    if (pendingUpdates.length > 0) {
      Promise.all(
        pendingUpdates.map(u =>
          adminClient
            .from('assisted_students')
            .update({
              full_name: u.full_name,
              ...(u.directory_id ? { directory_id: u.directory_id } : {})
            })
            .eq('id', u.id)
        )
      ).catch(err => {
        console.warn('Error al persistir sincronización en assisted_students:', err)
      })
    }
  } catch (syncError) {
    console.warn('Error durante la resolución de nombres de Gestión de Estudiantes:', syncError)
  }

  return data
}

export async function saveAssistedGrades(gradesToSave: { student_id: string, activity_id: string, grade_value: number | null }[]) {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  if (gradesToSave.length === 0) return

  const toUpsert = gradesToSave.filter(g => g.grade_value !== null)
  const toDelete = gradesToSave.filter(g => g.grade_value === null)

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from('assisted_grades')
      .upsert(toUpsert, { onConflict: 'student_id, activity_id' })

    if (error) {
      console.error('Error al guardar notas:', error)
      throw new Error('Error al guardar las notas')
    }
  }

  if (toDelete.length > 0) {
    await Promise.all(toDelete.map(g => 
      supabase
        .from('assisted_grades')
        .delete()
        .match({ student_id: g.student_id, activity_id: g.activity_id })
    ))
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
  directory_id?: string
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
    number: data.number,
    directory_id: data.directory_id
  }
}

export async function addDirectoryStudents(subjectId: string, students: { full_name: string, directory_id: string }[]): Promise<AssistedStudent[]> {
  if (students.length === 0) return []
  
  const supabase = await createClient()
  
  // 1. Obtener estudiantes actuales de la base de datos
  const { data: currentStudents, error: fetchError } = await supabase
    .from('assisted_students')
    .select('id, full_name, directory_id, number')
    .eq('subject_id', subjectId)
    
  if (fetchError) throw new Error('Error al obtener estudiantes actuales')
    
  const allStudents: Array<{
    id: string;
    full_name: string;
    directory_id: string | null;
    number: number;
    isNew?: boolean;
  }> = [...(currentStudents || [])]
  const existingDirIds = new Set(allStudents.filter(s => s.directory_id).map(s => s.directory_id))
  
  // 2. Combinar y desduplicar preventivamente
  const newStudentsToInsert: any[] = []
  
  for (const s of students) {
    if (s.directory_id && existingDirIds.has(s.directory_id)) {
      continue // Evitar duplicar si ya existe en la materia
    }
    
    const newStudent = {
      subject_id: subjectId,
      full_name: s.full_name.trim().toUpperCase(),
      directory_id: s.directory_id,
      number: 0, // Placeholder, se reordenará después
      id: crypto.randomUUID(), // Temporario para manejar diferencias en array
      isNew: true
    }
    allStudents.push(newStudent)
    newStudentsToInsert.push(newStudent)
  }
  
  // 3. Ordenar todo el array alfabéticamente
  allStudents.sort((a, b) => {
    const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    const nameA = normalize(a.full_name)
    const nameB = normalize(b.full_name)
    return nameA.localeCompare(nameB, 'es')
  })
  
  // 4. Asignar números de lista de 1 a N
  const updates: any[] = []
  const inserts: any[] = []
  
  allStudents.forEach((student, index) => {
    const newNumber = index + 1
    
    if (student.isNew) {
      inserts.push({
        subject_id: subjectId,
        full_name: student.full_name,
        directory_id: student.directory_id,
        number: newNumber
      })
    } else {
      if (student.number !== newNumber) {
        updates.push(
          supabase
            .from('assisted_students')
            .update({ number: newNumber })
            .eq('id', student.id)
        )
      }
    }
  })
  
  // 5. Ejecutar operaciones BDD
  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from('assisted_students')
      .insert(inserts)
    
    if (insertError) throw new Error('Error al insertar nuevos estudiantes: ' + insertError.message)
  }
  
  if (updates.length > 0) {
    await Promise.all(updates)
  }
  
  // 6. Retornar todos los estudiantes ordenados
  const { data: freshStudents, error: fetchFreshError } = await supabase
    .from('assisted_students')
    .select('*')
    .eq('subject_id', subjectId)
    .order('number', { ascending: true })
    
  if (fetchFreshError) throw new Error('Error al recargar la planilla')
    
  return freshStudents.map(d => ({
    id: d.id,
    subject_id: d.subject_id,
    full_name: d.full_name,
    number: d.number,
    directory_id: d.directory_id
  }))
}

export async function deleteAssistedStudent(studentId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('assisted_students')
    .delete()
    .eq('id', studentId)
    
  if (error) throw new Error('Error al eliminar al estudiante')
}

export async function deleteAllAssistedStudents(subjectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  const { error } = await supabase
    .from('assisted_students')
    .delete()
    .eq('subject_id', subjectId)
    
  if (error) throw new Error('Error al vaciar la planilla')
}

function normalizeStudentName(name: string): string {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export interface PlanillaCandidateStudent {
  id: string             // "prof-<profileId>" or "dir-<dirId>"
  rawId: string          // raw UUID
  source: 'profiles' | 'directory'
  firstName: string
  lastName: string
  fullName: string
  documentNumber: string | null
  gradeLevel: string
  groupName: string
  isAlreadyInPlanilla: boolean
  currentPlanillaNumber?: number | null
}

export async function getPlanillaDirectoryCandidates(
  subjectId: string,
  rawGrade?: string | number | null,
  rawGroup?: string | number | null
): Promise<{
  candidates: PlanillaCandidateStudent[]
  totalFound: number
  alreadyInPlanillaCount: number
  missingCount: number
}> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  const adminClient = createAdminClient()

  // 1. Si no se pasaron grado o grupo, obtenerlos de la materia
  let grade = rawGrade
  let groupNumber = rawGroup

  if (!grade || !groupNumber) {
    const { data: subject } = await adminClient
      .from('assisted_subjects')
      .select('grade, group_number')
      .eq('id', subjectId)
      .maybeSingle()

    if (subject) {
      if (!grade) grade = subject.grade
      if (!groupNumber) groupNumber = subject.group_number
    }
  }

  // 2. Estudiantes existentes en la materia asistida
  const { data: existingStudents, error: existErr } = await adminClient
    .from('assisted_students')
    .select('id, full_name, directory_id, number')
    .eq('subject_id', subjectId)

  if (existErr) {
    console.error('Error al consultar estudiantes existentes:', existErr)
  }

  const existingDirIds = new Set(
    (existingStudents || []).map(s => s.directory_id).filter(Boolean)
  )
  const existingNames = new Map(
    (existingStudents || []).map(s => [normalizeStudentName(s.full_name), s.number])
  )

  // 3. Normalizar variantes de Grado y Grupo para compatibilidad con Gestión de Estudiantes y PFC
  const gradeStr = String(grade || '').trim()
  const groupStr = String(groupNumber || '').trim()
  const gradeVariants = buildPlanillaGradeVariants(grade)
  const groupVariants = buildPlanillaGroupVariants(groupNumber, grade)

  // 4. Obtener perfiles de estudiantes (con cuenta en campus)
  let profQuery = adminClient
    .from('profiles')
    .select('id, first_name, last_name, grade_level, group_name, status, roles!inner(name)')
    .eq('roles.name', 'student')
    .in('grade_level', gradeVariants)
    .eq('status', 'active')

  if (groupVariants.length > 0) {
    profQuery = profQuery.in('group_name', groupVariants)
  }

  const { data: profiles, error: pError } = await profQuery

  if (pError) {
    console.error('Error al obtener perfiles:', pError)
  }

  // Obtener documentos de student_details para los perfiles encontrados
  const profileIds = (profiles || []).map(p => p.id)
  const detailsMap = new Map<string, string>()
  if (profileIds.length > 0) {
    const { data: details } = await adminClient
      .from('student_details')
      .select('student_id, document_number')
      .in('student_id', profileIds)

    for (const d of details || []) {
      if (d.document_number) detailsMap.set(d.student_id, d.document_number)
    }
  }

  // 5. Obtener del directorio (sin cuenta en campus: profile_id IS NULL)
  let dirQuery = adminClient
    .from('student_directory')
    .select('id, first_name, last_name, document_id, grade_level, group_name, status, profile_id')
    .in('grade_level', gradeVariants)
    .is('profile_id', null)
    .eq('status', 'active')

  if (groupVariants.length > 0) {
    dirQuery = dirQuery.in('group_name', groupVariants)
  }

  const { data: directory, error: dError } = await dirQuery

  if (dError) {
    console.error('Error al obtener directorio:', dError)
  }

  // 6. Unificar y determinar estado contra la planilla
  const candidates: PlanillaCandidateStudent[] = []
  const seenDocs = new Set<string>()
  const seenNames = new Set<string>()

  // A. Agregar estudiantes con cuenta (profiles)
  for (const p of profiles || []) {
    const fullName = `${p.last_name || ''} ${p.first_name || ''}`.trim().toUpperCase()
    const norm = normalizeStudentName(fullName)
    const docNumber = detailsMap.get(p.id) || null
    const candidateIds = [p.id, `prof-${p.id}`, `dir-${p.id}`]

    let isInPlanilla = false
    let currentNumber: number | null = null

    for (const cid of candidateIds) {
      if (existingDirIds.has(cid)) {
        isInPlanilla = true
        break
      }
    }

    if (!isInPlanilla && existingNames.has(norm)) {
      isInPlanilla = true
      currentNumber = existingNames.get(norm) ?? null
    } else if (isInPlanilla) {
      const match = (existingStudents || []).find(e => candidateIds.includes(e.directory_id))
      currentNumber = match?.number ?? existingNames.get(norm) ?? null
    }

    if (docNumber) seenDocs.add(docNumber.trim().toLowerCase())
    seenNames.add(norm)

    candidates.push({
      id: `prof-${p.id}`,
      rawId: p.id,
      source: 'profiles',
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      fullName,
      documentNumber: docNumber,
      gradeLevel: p.grade_level || gradeStr,
      groupName: p.group_name || groupStr,
      isAlreadyInPlanilla: isInPlanilla,
      currentPlanillaNumber: currentNumber
    })
  }

  // B. Agregar estudiantes del directorio (sin cuenta)
  for (const d of directory || []) {
    const fullName = `${d.last_name || ''} ${d.first_name || ''}`.trim().toUpperCase()
    const norm = normalizeStudentName(fullName)
    const doc = d.document_id ? d.document_id.trim() : null

    // Deduplicación preventiva si el estudiante ya fue procesado como perfil
    if (doc && seenDocs.has(doc.toLowerCase())) continue
    if (seenNames.has(norm)) continue

    const candidateIds = [d.id, `dir-${d.id}`, `prof-${d.id}`]

    let isInPlanilla = false
    let currentNumber: number | null = null

    for (const cid of candidateIds) {
      if (existingDirIds.has(cid)) {
        isInPlanilla = true
        break
      }
    }

    if (!isInPlanilla && existingNames.has(norm)) {
      isInPlanilla = true
      currentNumber = existingNames.get(norm) ?? null
    } else if (isInPlanilla) {
      const match = (existingStudents || []).find(e => candidateIds.includes(e.directory_id))
      currentNumber = match?.number ?? existingNames.get(norm) ?? null
    }

    candidates.push({
      id: `dir-${d.id}`,
      rawId: d.id,
      source: 'directory',
      firstName: d.first_name || '',
      lastName: d.last_name || '',
      fullName,
      documentNumber: doc,
      gradeLevel: d.grade_level || gradeStr,
      groupName: d.group_name || groupStr,
      isAlreadyInPlanilla: isInPlanilla,
      currentPlanillaNumber: currentNumber
    })
  }

  // Ordenar alfabéticamente
  candidates.sort((a, b) => a.fullName.localeCompare(b.fullName))

  const alreadyCount = candidates.filter(c => c.isAlreadyInPlanilla).length
  const missingCount = candidates.filter(c => !c.isAlreadyInPlanilla).length

  return {
    candidates,
    totalFound: candidates.length,
    alreadyInPlanillaCount: alreadyCount,
    missingCount
  }
}

export async function getStudentsFromDirectory(grade: number | string, groupNumber: number | string) {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  const adminClient = createAdminClient()

  const gradeVariants = buildPlanillaGradeVariants(grade)
  const groupVariants = buildPlanillaGroupVariants(groupNumber, grade)

  // 1. Obtener de perfiles (estudiantes ya registrados)
  let profQuery = adminClient
    .from('profiles')
    .select('id, first_name, last_name, roles!inner(name)')
    .eq('roles.name', 'student')
    .in('grade_level', gradeVariants)
    .eq('status', 'active')

  if (groupVariants.length > 0) {
    profQuery = profQuery.in('group_name', groupVariants)
  }

  // 2. Obtener del directorio (estudiantes sin cuenta)
  let dirQuery = adminClient
    .from('student_directory')
    .select('id, first_name, last_name')
    .in('grade_level', gradeVariants)
    .is('profile_id', null)
    .eq('status', 'active')

  if (groupVariants.length > 0) {
    dirQuery = dirQuery.in('group_name', groupVariants)
  }

  const [{ data: profiles, error: pError }, { data: directory, error: dError }] = await Promise.all([
    profQuery,
    dirQuery
  ])

  if (pError || dError) {
    console.error('Error fetching students:', pError, dError)
    throw new Error('Error al obtener estudiantes del directorio')
  }

  // Combinar ambos
  const combined = [
    ...(profiles || []).map(p => ({ id: `prof-${p.id}`, first_name: p.first_name, last_name: p.last_name })),
    ...(directory || []).map(d => ({ id: `dir-${d.id}`, first_name: d.first_name, last_name: d.last_name }))
  ]

  // Ordenar alfabéticamente
  combined.sort((a, b) => {
    const nameA = `${a.last_name} ${a.first_name}`.toUpperCase()
    const nameB = `${b.last_name} ${b.first_name}`.toUpperCase()
    return nameA.localeCompare(nameB)
  })

  // Mapear al formato esperado
  return combined.map((student, index) => ({
    id: student.id,
    number: index + 1,
    fullName: `${student.last_name} ${student.first_name}`.trim()
  }))
}
