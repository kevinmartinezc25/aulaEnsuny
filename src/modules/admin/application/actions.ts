'use server'

import { createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'

import { AdminUser, AdminCourse, AcademicLevel, AcademicGroup, AdminTeacher, AdminStudent } from './types'

/**
 * -------------------------------------------------------------
 * ACCIONES DE GESTIÓN DE USUARIOS
 * -------------------------------------------------------------
 */

/**
 * Obtener todos los usuarios del sistema.
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const adminClient = createAdminClient()

    // 1. Obtener todos los perfiles de la BD (con su rol)
    const { data: profiles, error: pError } = await adminClient
      .from('profiles')
      .select('*, roles(name)')
      .order('created_at', { ascending: false })

    if (pError) throw new Error(pError.message)

    // 2. Obtener todos los usuarios de Supabase Auth para recuperar sus emails
    const { data: { users: authUsers }, error: uError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    if (uError) throw new Error(uError.message)

    // 3. Mapear y combinar los datos
    const mappedUsers: AdminUser[] = (profiles || []).map(profile => {
      const authUser = authUsers?.find(u => u.id === profile.id)
      return {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`,
        email: authUser?.email || profile.email || 'sin-correo@ensuny.edu',
        role: (profile.roles?.name || 'student') as 'student' | 'teacher' | 'admin' | 'superadmin',
        status: (profile.status || 'active') as 'active' | 'inactive',
        grade: profile.grade_level || undefined,
        createdAt: new Date(profile.created_at).toISOString().split('T')[0],
      }
    })

    return mappedUsers
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return []
  }
}

/**
 * Crear un nuevo usuario en Supabase Auth y sincronizar su perfil.
 */
export async function createAdminUser(data: {
  name: string
  email: string
  role: 'student' | 'teacher' | 'admin' | 'superadmin'
  status: 'active' | 'inactive'
  phone?: string
  grade?: string
  password?: string
}) {
  try {
    const adminClient = createAdminClient()

    // Separar nombre y apellido
    const nameParts = data.name.trim().split(' ')
    const firstName = nameParts[0] || 'Nuevo'
    const lastName = nameParts.slice(1).join(' ') || 'Usuario'

    // 1. Crear el usuario en Supabase Auth (confirmado por defecto)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.password && data.password.trim() !== '' ? data.password.trim() : 'Ensuny2026!',
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: data.name,
        phone: data.phone || null,
        role_name: data.role,
        grade_level: data.role === 'student' ? data.grade : null,
      }
    })

    if (createError) {
      return { error: createError.message }
    }

    if (!newUser.user) {
      return { error: 'No se pudo crear el usuario en Auth.' }
    }

    // 2. Dado que el trigger handle_new_user() crea el perfil automáticamente al insertarse en auth.users,
    // actualizamos el estado del perfil recién creado (status).
    const { error: updateProfileError } = await adminClient
      .from('profiles')
      .update({ status: data.status })
      .eq('id', newUser.user.id)

    if (updateProfileError) {
      console.error('Error al actualizar estado del perfil:', updateProfileError)
    }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    console.error('Error en createAdminUser:', error)
    return { error: error.message || 'Error interno al crear el usuario.' }
  }
}

/**
 * Actualizar los datos de un usuario existente.
 */
export async function updateAdminUser(
  id: string,
  data: {
    name: string
    email: string
    role: 'student' | 'teacher' | 'admin' | 'superadmin'
    status: 'active' | 'inactive'
    phone?: string
    grade?: string
    password?: string
  }
) {
  try {
    const adminClient = createAdminClient()

    // Separar nombre y apellido
    const nameParts = data.name.trim().split(' ')
    const firstName = nameParts[0] || 'Usuario'
    const lastName = nameParts.slice(1).join(' ') || 'Sistema'

    // 1. Buscar el UUID del rol correspondiente
    const { data: roleData, error: roleError } = await adminClient
      .from('roles')
      .select('id')
      .eq('name', data.role)
      .single()

    if (roleError || !roleData) {
      return { error: 'El rol especificado no es válido.' }
    }

    // 2. Actualizar la tabla profiles de la BD
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        role_id: roleData.id,
        grade_level: data.role === 'student' ? data.grade : null,
        status: data.status,
      })
      .eq('id', id)

    if (profileError) {
      return { error: profileError.message }
    }

    // 3. Actualizar Supabase Auth (si el usuario existe en Auth)
    const { data: authUserData, error: getAuthError } = await adminClient.auth.admin.getUserById(id)

    if (authUserData?.user) {
      const metadataPayload = {
        first_name: firstName,
        last_name: lastName,
        full_name: data.name,
        role_name: data.role,
        grade_level: data.role === 'student' ? data.grade : null,
      } as any
      if (data.phone) metadataPayload.phone = data.phone

      // Preparar payload de actualización para Auth
      const authPayload: any = {
        user_metadata: metadataPayload
      }

      // Solo actualizar email si efectivamente cambió
      if (data.email && authUserData.user.email !== data.email) {
        authPayload.email = data.email
        authPayload.email_confirm = true
      }

      // Solo actualizar contraseña si se envió una nueva
      if (data.password && data.password.trim() !== '') {
        authPayload.password = data.password.trim()
      }

      // 1. Ejecutar una sola actualización en Supabase Auth
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(id, authPayload)

      if (authUpdateError) {
        console.error('Error al actualizar en Supabase Auth:', authUpdateError)
        
        if (authUpdateError.status === 500 && (authUpdateError as any).code === 'unexpected_failure') {
          return { error: 'El correo electrónico ingresado ya se encuentra en uso por otro usuario. Por favor ingresa uno diferente.' }
        }

        return { error: `Error al actualizar credenciales: ${authUpdateError.message}` }
      }
    } else {
      console.warn(`Usuario ${id} no encontrado en Supabase Auth. Detalles del error:`, getAuthError)
    }

    revalidatePath('/admin/users')
    revalidatePath('/admin/teachers')
    return { success: true }
  } catch (error: any) {
    console.error('Error en updateAdminUser:', error)
    return { error: `[Excepción]: ${error.message || 'Error interno al actualizar.'}` }
  }
}

/**
 * Eliminar un usuario del sistema.
 */
export async function deleteAdminUser(id: string) {
  try {
    const adminClient = createAdminClient()

    // Eliminar el usuario en auth.users (la cascada borrará automáticamente su registro en profiles)
    const { error } = await adminClient.auth.admin.deleteUser(id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    console.error('Error en deleteAdminUser:', error)
    return { error: error.message || 'Error interno al eliminar.' }
  }
}

/**
 * -------------------------------------------------------------
 * ACCIONES DE GESTIÓN DE CURSOS
 * -------------------------------------------------------------
 */

/**
 * Obtener todos los cursos del sistema con estadísticas integradas.
 */
export async function getAdminCourses(): Promise<AdminCourse[]> {
  try {
    const adminClient = createAdminClient()

    // 1. Obtener inscripciones reales de estudiantes por curso en student_courses
    const { data: enrollments, error: eError } = await adminClient
      .from('student_courses')
      .select('course_id')

    if (eError) {
      console.error('Error fetching enrollments:', eError.message)
    }

    // Agrupar conteo de estudiantes por curso
    const courseCounts: Record<string, number> = {}
    enrollments?.forEach(enrollment => {
      if (enrollment.course_id) {
        courseCounts[enrollment.course_id] = (courseCounts[enrollment.course_id] || 0) + 1
      }
    })

    // 2. Obtener los cursos con el nombre del docente
    const { data: courses, error: cError } = await adminClient
      .from('courses')
      .select('*, teacher:profiles!teacher_id(first_name, last_name)')
      .order('created_at', { ascending: false })

    if (cError) throw new Error(cError.message)

    // 3. Mapear y calcular estudiantes
    const mappedCourses: AdminCourse[] = (courses || []).map(course => {
      const teacherName = course.teacher
        ? `${course.teacher.first_name} ${course.teacher.last_name}`
        : 'Docente no asignado'

      return {
        id: course.id,
        title: course.title,
        teacher: teacherName,
        teacherId: course.teacher_id,
        subject: course.subject,
        students: courseCounts[course.id] || 0, // Cálculo real según inscripciones en student_courses
        status: (course.status || 'active') as 'active' | 'draft' | 'archived',
        grade: course.grade_level || 'General',
        createdAt: new Date(course.created_at).toISOString().split('T')[0]
      }
    })

    return mappedCourses
  } catch (error) {
    console.error('Error al obtener cursos:', error)
    return []
  }
}

/**
 * Obtener la lista de todos los profesores disponibles.
 */
export async function getTeachersList() {
  try {
    const adminClient = createAdminClient()

    const { data: teachers, error } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, roles!inner(name)')
      .eq('roles.name', 'teacher')
      .eq('status', 'active')

    if (error) throw new Error(error.message)

    return (teachers || []).map(t => ({
      id: t.id,
      name: `${t.first_name} ${t.last_name}`
    }))
  } catch (error) {
    console.error('Error al obtener lista de profesores:', error)
    return []
  }
}

/**
 * Crear un nuevo curso.
 */
export async function createAdminCourse(data: {
  title: string
  subject: string
  grade: string
  teacherId: string
  status: 'active' | 'draft' | 'archived'
}) {
  try {
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('courses')
      .insert({
        title: data.title,
        subject: data.subject,
        grade_level: data.grade,
        teacher_id: data.teacherId,
        status: data.status,
        description: `Curso de ${data.subject} diseñado para estudiantes de ${data.grade}.`
      })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/courses')
    return { success: true }
  } catch (error: any) {
    console.error('Error en createAdminCourse:', error)
    return { error: error.message || 'Error interno al crear el curso.' }
  }
}

/**
 * Actualizar los datos de un curso existente.
 */
export async function updateAdminCourse(
  id: string,
  data: {
    title: string
    subject: string
    grade: string
    teacherId: string
    status: 'active' | 'draft' | 'archived'
  }
) {
  try {
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('courses')
      .update({
        title: data.title,
        subject: data.subject,
        grade_level: data.grade,
        teacher_id: data.teacherId,
        status: data.status,
      })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/courses')
    return { success: true }
  } catch (error: any) {
    console.error('Error en updateAdminCourse:', error)
    return { error: error.message || 'Error interno al actualizar el curso.' }
  }
}

/**
 * Eliminar un curso.
 */
export async function deleteAdminCourse(id: string) {
  try {
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/courses')
    return { success: true }
  } catch (error: any) {
    console.error('Error en deleteAdminCourse:', error)
    return { error: error.message || 'Error interno al eliminar el curso.' }
  }
}



/**
 * -------------------------------------------------------------
 * ACCIONES DE GESTIÓN DE GRADOS / NIVELES
 * -------------------------------------------------------------
 */

/**
 * Obtener todos los grados académicos registrados.
 */
export async function getAcademicLevels(): Promise<AcademicLevel[]> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('academic_levels')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      createdAt: new Date(item.created_at).toISOString().split('T')[0]
    }))
  } catch (error) {
    console.error('Error al obtener grados, usando fallback mock:', error)
    // Retorna fallback mock si la tabla no existe o falla
    return [
      { id: '1', name: '8°', createdAt: '2026-01-01' },
      { id: '2', name: '9°', createdAt: '2026-01-01' },
      { id: '3', name: '10°', createdAt: '2026-01-01' },
      { id: '4', name: '11°', createdAt: '2026-01-01' }
    ]
  }
}

/**
 * Crear un nuevo grado académico.
 */
export async function createAcademicLevel(name: string) {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('academic_levels')
      .insert({ name })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/grade-levels')
    return { success: true }
  } catch (error: any) {
    console.error('Error en createAcademicLevel:', error)
    return { error: error.message || 'Error interno al crear el grado.' }
  }
}

/**
 * Eliminar un grado académico.
 */
export async function deleteAcademicLevel(id: string) {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('academic_levels')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/grade-levels')
    return { success: true }
  } catch (error: any) {
    console.error('Error en deleteAcademicLevel:', error)
    return { error: error.message || 'Error interno al eliminar el grado.' }
  }
}



/**
 * Obtener los grupos de un grado escolar.
 */
export async function getAcademicGroups(levelId: string): Promise<AcademicGroup[]> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('academic_groups')
      .select('*')
      .eq('academic_level_id', levelId)
      .order('name', { ascending: true })

    if (error) throw error

    return (data || []).map(item => ({
      id: item.id,
      academicLevelId: item.academic_level_id,
      name: item.name,
      createdAt: new Date(item.created_at).toISOString().split('T')[0]
    }))
  } catch (error) {
    console.error('Error al obtener grupos académicos, usando fallback:', error)
    return [
      { id: 'g-1', academicLevelId: levelId, name: '1', createdAt: '2026-01-01' },
      { id: 'g-2', academicLevelId: levelId, name: '2', createdAt: '2026-01-01' }
    ]
  }
}

/**
 * Crear un nuevo grupo académico para un grado.
 */
export async function createAcademicGroup(levelId: string, name: string) {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('academic_groups')
      .insert({ academic_level_id: levelId, name: name.trim() })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/grade-levels')
    return { success: true }
  } catch (error: any) {
    console.error('Error en createAcademicGroup:', error)
    return { error: error.message || 'Error interno al crear el grupo.' }
  }
}

/**
 * Eliminar un grupo académico.
 */
export async function deleteAcademicGroup(id: string) {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('academic_groups')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/grade-levels')
    return { success: true }
  } catch (error: any) {
    console.error('Error en deleteAcademicGroup:', error)
    return { error: error.message || 'Error interno al eliminar el grupo.' }
  }
}



/**
 * Obtener todos los docentes en el sistema con sus datos de perfil y auth.
 */
export async function getAdminTeachers(): Promise<AdminTeacher[]> {
  try {
    const adminClient = createAdminClient()

    // 1. Obtener perfiles de docentes
    const { data: profiles, error: pError } = await adminClient
      .from('profiles')
      .select('*, roles!inner(name)')
      .eq('roles.name', 'teacher')
      .order('created_at', { ascending: false })

    if (pError) throw pError

    // 2. Obtener usuarios de Auth para recuperar sus emails
    const { data: { users: authUsers }, error: uError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    if (uError) throw uError

    // 3. Obtener todos los cursos del sistema para mapear materias reales asignadas
    const { data: courses, error: cError } = await adminClient
      .from('courses')
      .select('id, title, teacher_id')

    if (cError) throw cError

    return (profiles || []).map(p => {
      const authUser = authUsers?.find(u => u.id === p.id)
      
      // Buscar cursos reales asignados en la tabla courses
      const teacherCourses = (courses || [])
        .filter(c => c.teacher_id === p.id)
        .map(c => c.title)

      // Fallback a bio si no tiene cursos en la tabla, de lo contrario vacío []
      const subjects = teacherCourses.length > 0 
        ? teacherCourses 
        : ((p as any).bio ? (p as any).bio.split(',').map((s: string) => s.trim()) : [])

      return {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        email: authUser?.email || (p as any).email || 'sin-correo@ensuny.edu.co',
        phone: authUser?.user_metadata?.phone || authUser?.phone || (p as any).phone || 'No registrado',
        subjects,
        status: (p.status || 'active') as 'active' | 'inactive',
        joinedDate: new Date(p.created_at).toISOString().split('T')[0]
      }
    })
  } catch (error) {
    console.error('Error al obtener docentes:', error)
    return []
  }
}

/**
 * Obtener todos los estudiantes en el sistema con sus datos de perfil y auth.
 */
export async function getAdminStudents(): Promise<AdminStudent[]> {
  try {
    const adminClient = createAdminClient()

    // 1. Obtener perfiles de estudiantes
    const { data: profiles, error: pError } = await adminClient
      .from('profiles')
      .select('*, roles!inner(name)')
      .eq('roles.name', 'student')
      .order('created_at', { ascending: false })

    if (pError) throw pError

    // 2. Obtener usuarios de Auth para recuperar sus emails
    const { data: { users: authUsers }, error: uError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    if (uError) throw uError

    return (profiles || []).map(p => {
      const authUser = authUsers?.find(u => u.id === p.id)
      return {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        firstName: p.first_name || '',
        lastName: p.last_name || '',
        email: authUser?.email || (p as any).email || 'sin-correo@ensuny.edu.co',
        gradeLevel: p.grade_level || '8°',
        groupName: p.group_name || '',
        status: (p.status || 'active') as 'active' | 'inactive',
        joinedDate: new Date(p.created_at).toISOString().split('T')[0]
      }
    })
  } catch (error) {
    console.error('Error al obtener estudiantes:', error)
    return []
  }
}

/**
 * Obtener estadísticas consolidadas para el dashboard de administrador.
 */
export async function getAdminDashboardStats() {
  try {
    const adminClient = createAdminClient()

    // 1. Obtener perfiles reales con roles
    const { data: dbProfiles, error: profilesErr } = await adminClient
      .from('profiles')
      .select('*, roles!inner(name)')

    if (profilesErr) throw profilesErr

    const students = (dbProfiles || []).filter(p => p.roles.name === 'student')
    const teachers = (dbProfiles || []).filter(p => p.roles.name === 'teacher')

    // 2. Obtener cursos activos
    const { data: dbCourses, error: coursesErr } = await adminClient
      .from('courses')
      .select('id, title, status, subject, grade_level')

    if (coursesErr) throw coursesErr
    const activeCoursesCount = (dbCourses || []).filter(c => c.status === 'active').length

    // 3. Obtener calificaciones (para el promedio académico global)
    const { data: dbGrades, error: gradesErr } = await adminClient
      .from('grades')
      .select('score, student_id, course_id, created_at')

    if (gradesErr) throw gradesErr

    const gradesCount = dbGrades?.length || 0
    const totalScore = dbGrades?.reduce((sum, g) => sum + Number(g.score), 0) || 0
    const avgGradeVal = gradesCount > 0 ? (totalScore / gradesCount).toFixed(1) : '0.0'

    // 3b. Obtener el número real de quizzes realizados (intentos en quiz_attempts)
    const { count: quizAttemptsCount, error: attemptsErr } = await adminClient
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })

    if (attemptsErr) throw attemptsErr
    const quizzesCount = quizAttemptsCount || 0

    // 4. Obtener total de recursos
    const { count: resourcesCount, error: resErr } = await adminClient
      .from('resources')
      .select('*', { count: 'exact', head: true })

    const resourcesTotal = resourcesCount || 0

    // 5. Historial de rendimiento mensual
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const gradesByMonth: Record<string, { sum: number; count: number }> = {}
    dbGrades?.forEach(g => {
      const date = new Date(g.created_at)
      const monthName = months[date.getMonth()]
      if (!gradesByMonth[monthName]) {
        gradesByMonth[monthName] = { sum: 0, count: 0 }
      }
      gradesByMonth[monthName].sum += Number(g.score)
      gradesByMonth[monthName].count += 1
    })

    // Obtener los últimos 6 meses de forma dinámica basados en la fecha de hoy
    const generatedPerformanceData = []
    const today = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthName = months[d.getMonth()]
      const item = gradesByMonth[monthName]
      generatedPerformanceData.push({
        month: monthName,
        promedio: item && item.count > 0 ? Number((item.sum / item.count).toFixed(1)) : 0.0
      })
    }

    // 6. Calcular estudiantes en riesgo (< 3.0 promedio)
    const studentGrades: Record<string, { sum: number; count: number }> = {}
    dbGrades?.forEach(g => {
      if (!studentGrades[g.student_id]) {
        studentGrades[g.student_id] = { sum: 0, count: 0 }
      }
      studentGrades[g.student_id].sum += Number(g.score)
      studentGrades[g.student_id].count += 1
    })

    const generatedAtRisk: any[] = []
    students.forEach(s => {
      const gradesInfo = studentGrades[s.id]
      if (gradesInfo && gradesInfo.count > 0) {
        const avg = Number((gradesInfo.sum / gradesInfo.count).toFixed(2))
        if (avg < 3.0) {
          const name = `${s.first_name} ${s.last_name || ''}`.trim()
          const initials = `${s.first_name[0] || ''}${s.last_name ? s.last_name[0] : ''}`.toUpperCase()
          generatedAtRisk.push({
            name,
            grade: s.grade_level ? `Grado ${s.grade_level}` : 'Sin Grado',
            avg,
            initials
          })
        }
      }
    })

    // 7. Calcular cursos más activos usando inscripciones reales
    const { data: dashEnrollments } = await adminClient
      .from('student_courses')
      .select('course_id')
      
    const dashCourseCounts: Record<string, number> = {}
    dashEnrollments?.forEach(e => {
      if (e.course_id) {
        dashCourseCounts[e.course_id] = (dashCourseCounts[e.course_id] || 0) + 1
      }
    })

    const generatedTopCourses = (dbCourses || []).map(c => {
      const courseGrades = dbGrades?.filter(g => g.course_id === c.id) || []
      const studentsInCourse = dashCourseCounts[c.id] || 0
      const completionPct = courseGrades.length > 0
        ? Math.min(Math.round((courseGrades.filter(g => Number(g.score) >= 3.0).length / courseGrades.length) * 100), 100)
        : 0

      return {
        name: c.title,
        completionPct: completionPct,
        students: studentsInCourse
      }
    }).sort((a, b) => b.completionPct - a.completionPct).slice(0, 4)

    // 8. Actividad real de la plataforma: consultar eventos de progreso completado
    const { data: dbProgress } = await adminClient
      .from('student_progress')
      .select('completed_at')
      .eq('completed', true)

    const activityDays: Record<string, number> = { Lun: 0, Mar: 0, Mié: 0, Jue: 0, Vie: 0, Sáb: 0, Dom: 0 }
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

    const addActivityDate = (dateStr: string | null) => {
      if (!dateStr) return
      const date = new Date(dateStr)
      const dayName = dayNames[date.getDay()]
      if (dayName in activityDays) {
        activityDays[dayName]++
      }
    }

    dbGrades?.forEach(g => addActivityDate(g.created_at))
    dbProgress?.forEach(p => addActivityDate(p.completed_at))

    // Formatear accesos sumando un base pasivo (para simular tráfico de lectura)
    const accessData = Object.entries(activityDays).map(([day, count]) => ({
      day,
      accesos: (count * 15) + 45
    }))

    return {
      studentCount: students.length,
      teacherCount: teachers.length,
      activeCoursesCount,
      quizzesCount,
      avgGradeVal,
      resourcesCount: resourcesTotal,
      performanceData: generatedPerformanceData,
      atRiskStudents: generatedAtRisk.sort((a, b) => a.avg - b.avg).slice(0, 5),
      topCourses: generatedTopCourses,
      accessData
    }
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error)
    return null
  }
}

/**
 * Obtener todos los intentos de exámenes (evaluaciones) en tiempo real con datos de Supabase.
 */
export async function getAdminEvaluations(): Promise<any[]> {
  try {
    const adminClient = createAdminClient()

    // 1. Obtener todos los intentos de quiz con sus relaciones
    const { data: dbAttempts, error: attemptsError } = await adminClient
      .from('quiz_attempts')
      .select(`
        id,
        score,
        is_passed,
        completed_at,
        student_id,
        quiz_id,
        profiles (first_name, last_name, grade_level),
        quizzes (
          title,
          lessons (
            module_id,
            course_modules (
              course_id,
              courses (title, subject)
            )
          )
        )
      `)
      .order('completed_at', { ascending: false })

    if (attemptsError) throw attemptsError

    // 2. Obtener usuarios de Auth para emails
    const { data: { users: authUsers }, error: uError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    const authMap = new Map((authUsers || []).map(u => [u.id, u.email]))

    // 3. Mapear
    const mapped = (dbAttempts || []).map((att: any) => {
      const student = att.profiles || {}
      const quiz = att.quizzes || {}
      const lesson = quiz.lessons || {}
      const module = lesson.course_modules || {}
      const course = module.courses || {}
      
      const email = authMap.get(att.student_id) || 'sin-correo@ensuny.edu.co'
      const scoreNum = Number(att.score)
      
      return {
        id: att.id,
        studentName: `${student.first_name || 'Estudiante'} ${student.last_name || 'Nuevo'}`,
        studentEmail: email,
        gradeLevel: student.grade_level || '—',
        courseTitle: course.title || 'Curso General',
        subject: course.subject || 'General',
        quizTitle: quiz.title || 'Evaluación Regular',
        score: scoreNum,
        isPassed: att.is_passed,
        durationMinutes: 15, // Por defecto simulado
        date: new Date(att.completed_at).toISOString().replace('T', ' ').slice(0, 16),
        status: 'graded'
      }
    })

    return mapped
  } catch (error) {
    console.error('Error al obtener historial de evaluaciones:', error)
    return []
  }
}

/**
 * -------------------------------------------------------------
 * ESTRUCTURAS Y ACCIONES PARA LA MATRÍCULA Y FICHA ACADÉMICA COMPLETAS
 * -------------------------------------------------------------
 */

import {
  StudentDetails, StudentContact, StudentGuardians, StudentMedicalInfo,
  StudentDocument, StudentEnrollment, StudentAcademicHistory, FullStudentData
} from './types'

/**
 * Obtener la ficha completa de un estudiante por su ID.
 */
export async function getAdminStudentById(id: string): Promise<FullStudentData | null> {
  try {
    const adminClient = createAdminClient()

    // 1. Obtener perfil básico
    const { data: profile, error: pError } = await adminClient
      .from('profiles')
      .select('*, roles!inner(name)')
      .eq('id', id)
      .eq('roles.name', 'student')
      .single()

    if (pError) throw pError
    if (!profile) return null

    // 2. Obtener email de Auth
    const { data: { user: authUser }, error: uError } = await adminClient.auth.admin.getUserById(id)
    const email = authUser?.email || (profile as any).email || 'sin-correo@ensuny.edu.co'

    // 3. Consultar tablas relacionadas en paralelo (y tolerar que no existan filas)
    const [
      { data: details },
      { data: contact },
      { data: guardians },
      { data: medical },
      { data: documents },
      { data: enrollments },
      { data: academicHistory },
      { data: studentCourses }
    ] = await Promise.all([
      adminClient.from('student_details').select('*').eq('student_id', id).maybeSingle(),
      adminClient.from('student_contacts').select('*').eq('student_id', id).maybeSingle(),
      adminClient.from('student_guardians').select('*').eq('student_id', id).maybeSingle(),
      adminClient.from('student_medical_info').select('*').eq('student_id', id).maybeSingle(),
      adminClient.from('student_documents').select('*').eq('student_id', id),
      adminClient.from('student_enrollments').select('*').eq('student_id', id).order('academic_year', { ascending: false }),
      adminClient.from('student_academic_history').select('*').eq('student_id', id).order('year', { ascending: false }),
      adminClient.from('student_courses').select('course_id').eq('student_id', id)
    ])

    // Reconstruir detalles
    let mappedDetails: StudentDetails | undefined = undefined
    if (details) {
      mappedDetails = {
        documentType: details.document_type,
        documentNumber: details.document_number,
        expeditionDate: details.expedition_date || undefined,
        expeditionPlace: details.expedition_place || undefined,
        firstName: details.first_name,
        secondName: details.second_name || undefined,
        firstSurname: details.first_surname,
        secondSurname: details.second_surname || undefined,
        birthDate: details.birth_date,
        gender: details.gender,
        bloodType: details.blood_type || undefined,
        rh: details.rh || undefined,
        nationality: details.nationality,
        birthMunicipality: details.birth_municipality || undefined,
        birthDepartment: details.birth_department || undefined
      }
    }

    // Reconstruir contacto
    let mappedContact: StudentContact | undefined = undefined
    if (contact) {
      mappedContact = {
        address: contact.address,
        neighborhood: contact.neighborhood || undefined,
        municipality: contact.municipality,
        department: contact.department,
        zone: contact.zone as 'Urbana' | 'Rural',
        phone: contact.phone || undefined,
        studentCellphone: contact.student_cellphone || undefined,
        studentEmail: contact.student_email || undefined
      }
    }

    // Reconstruir familiares
    let mappedGuardians: StudentGuardians | undefined = undefined
    if (guardians) {
      mappedGuardians = {
        fatherName: guardians.father_name || undefined,
        fatherDocument: guardians.father_document || undefined,
        fatherPhone: guardians.father_phone || undefined,
        fatherEmail: guardians.father_email || undefined,
        fatherOccupation: guardians.father_occupation || undefined,
        motherName: guardians.mother_name || undefined,
        motherDocument: guardians.mother_document || undefined,
        motherPhone: guardians.mother_phone || undefined,
        motherEmail: guardians.mother_email || undefined,
        motherOccupation: guardians.mother_occupation || undefined,
        guardianName: guardians.guardian_name,
        guardianDocument: guardians.guardian_document,
        guardianRelationship: guardians.guardian_relationship,
        guardianPhone: guardians.guardian_phone,
        guardianEmail: guardians.guardian_email || undefined,
        guardianAddress: guardians.guardian_address || undefined,
        guardianOccupation: guardians.guardian_occupation || undefined
      }
    }

    // Reconstruir salud
    let mappedMedical: StudentMedicalInfo | undefined = undefined
    if (medical) {
      mappedMedical = {
        eps: medical.eps,
        affiliationType: medical.affiliation_type || undefined,
        ips: medical.ips || undefined,
        allergies: medical.allergies || undefined,
        diseases: medical.diseases || undefined,
        medicines: medical.medicines || undefined,
        observations: medical.observations || undefined
      }
    }

    // Reconstruir documentos
    const mappedDocs: StudentDocument[] = (documents || []).map(d => ({
      id: d.id,
      category: d.document_category as any,
      name: d.document_name,
      fileUrl: d.file_url,
      fileName: d.file_name
    }))

    // Reconstruir matrícula actual (último registro)
    let mappedEnrollment: StudentEnrollment | undefined = undefined
    if (enrollments && enrollments.length > 0) {
      const activeEnroll = enrollments[0]
      mappedEnrollment = {
        academicYear: activeEnroll.academic_year,
        enrollmentDate: activeEnroll.enrollment_date,
        enrollmentStatus: activeEnroll.enrollment_status as any,
        sede: activeEnroll.sede,
        jornada: activeEnroll.jornada as any,
        gradeLevel: activeEnroll.grade_level,
        groupName: activeEnroll.group_name,
        enrollmentNumber: activeEnroll.enrollment_number || undefined,
        simatBeneficiary: activeEnroll.simat_beneficiary || false,
        estrato: activeEnroll.estrato || undefined,
        sisben: activeEnroll.sisben || undefined,
        conflictVictim: activeEnroll.conflict_victim || false,
        specialPopulation: activeEnroll.special_population || undefined,
        previousInstitution: activeEnroll.previous_institution || undefined,
        previousMunicipality: activeEnroll.previous_municipality || undefined,
        previousDepartment: activeEnroll.previous_department || undefined,
        previousGrade: activeEnroll.previous_grade || undefined,
        previousYear: activeEnroll.previous_year || undefined,
        observations: activeEnroll.observations || undefined
      }
    }

    // Reconstruir historial académico
    const mappedHist: StudentAcademicHistory[] = (academicHistory || []).map(h => ({
      id: h.id,
      year: h.year,
      gradeLevel: h.grade_level,
      groupName: h.group_name,
      finalStatus: h.final_status,
      finalAverage: h.final_average ? Number(h.final_average) : undefined,
      result: h.result || undefined
    }))

    // Reconstruir cursos LMS
    const mappedCourses: string[] = (studentCourses || []).map(c => c.course_id)

    return {
      id: profile.id,
      name: `${profile.first_name} ${profile.last_name}`,
      email,
      status: (profile.status || 'active') as 'active' | 'inactive',
      joinedDate: new Date(profile.created_at).toISOString().split('T')[0],
      details: mappedDetails,
      contact: mappedContact,
      guardians: mappedGuardians,
      medical: mappedMedical,
      documents: mappedDocs,
      enrollment: mappedEnrollment,
      academicHistory: mappedHist,
      courses: mappedCourses
    }
  } catch (error) {
    console.error('Error al obtener ficha de estudiante por ID:', error)
    return null
  }
}

/**
 * Matricular (crear) un nuevo estudiante en el sistema (Estándar Colombia).
 */
export async function enrollStudent(data: FullStudentData) {
  try {
    const adminClient = createAdminClient()

    if (!data.details || !data.enrollment || !data.guardians || !data.contact || !data.medical) {
      return { error: 'Los datos requeridos de matrícula están incompletos.' }
    }

    // 1. Obtener ID del rol de estudiante
    const { data: roleData, error: roleError } = await adminClient
      .from('roles')
      .select('id')
      .eq('name', 'student')
      .single()

    if (roleError || !roleData) {
      return { error: 'El rol de estudiante no está configurado.' }
    }

    // 2. Separar nombres y apellidos
    const firstName = `${data.details.firstName} ${data.details.secondName || ''}`.trim()
    const lastName = `${data.details.firstSurname} ${data.details.secondSurname || ''}`.trim()

    // 3. Crear el usuario en Supabase Auth
    const tempPassword = `Ensuny${new Date().getFullYear()}!`
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role_name: 'student',
        grade_level: data.enrollment.gradeLevel,
      }
    })

    if (createError) {
      return { error: `Error en Autenticación: ${createError.message}` }
    }

    if (!newUser.user) {
      return { error: 'No se pudo generar el usuario del sistema.' }
    }

    const studentId = newUser.user.id

    // 4. Actualizar el perfil básico (creado automáticamente por disparador)
    const { error: updateProfileError } = await adminClient
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        grade_level: data.enrollment.gradeLevel,
        group_name: data.enrollment.groupName,
        status: data.enrollment.enrollmentStatus === 'active' ? 'active' : 'inactive'
      })
      .eq('id', studentId)

    if (updateProfileError) {
      throw new Error(`Error en Perfil Principal: ${updateProfileError.message}`)
    }

    // 5. Insertar registros en tablas relacionales de soporte en paralelo
    const relationInserts = [
      adminClient.from('student_details').insert({
        student_id: studentId,
        document_type: data.details.documentType,
        document_number: data.details.documentNumber,
        expedition_date: data.details.expeditionDate || null,
        expedition_place: data.details.expeditionPlace || null,
        first_name: data.details.firstName,
        second_name: data.details.secondName || null,
        first_surname: data.details.firstSurname,
        second_surname: data.details.secondSurname || null,
        birth_date: data.details.birthDate || new Date().toISOString().split('T')[0],
        gender: data.details.gender,
        blood_type: data.details.bloodType || null,
        rh: data.details.rh || null,
        nationality: data.details.nationality,
        birth_municipality: data.details.birthMunicipality || null,
        birth_department: data.details.birthDepartment || null
      }),
      adminClient.from('student_contacts').insert({
        student_id: studentId,
        address: data.contact.address,
        neighborhood: data.contact.neighborhood || null,
        municipality: data.contact.municipality,
        department: data.contact.department,
        zone: data.contact.zone,
        phone: data.contact.phone || null,
        student_cellphone: data.contact.studentCellphone || null,
        student_email: data.contact.studentEmail || null
      }),
      adminClient.from('student_guardians').insert({
        student_id: studentId,
        father_name: data.guardians.fatherName || null,
        father_document: data.guardians.fatherDocument || null,
        father_phone: data.guardians.fatherPhone || null,
        father_email: data.guardians.fatherEmail || null,
        father_occupation: data.guardians.fatherOccupation || null,
        mother_name: data.guardians.motherName || null,
        mother_document: data.guardians.motherDocument || null,
        mother_phone: data.guardians.motherPhone || null,
        mother_email: data.guardians.motherEmail || null,
        mother_occupation: data.guardians.motherOccupation || null,
        guardian_name: data.guardians.guardianName,
        guardian_document: data.guardians.guardianDocument,
        guardian_relationship: data.guardians.guardianRelationship,
        guardian_phone: data.guardians.guardianPhone,
        guardian_email: data.guardians.guardianEmail || null,
        guardian_address: data.guardians.guardianAddress || null,
        guardian_occupation: data.guardians.guardianOccupation || null
      }),
      adminClient.from('student_medical_info').insert({
        student_id: studentId,
        eps: data.medical.eps,
        affiliation_type: data.medical.affiliationType || null,
        ips: data.medical.ips || null,
        allergies: data.medical.allergies || null,
        diseases: data.medical.diseases || null,
        medicines: data.medical.medicines || null,
        observations: data.medical.observations || null
      }),
      adminClient.from('student_enrollments').upsert({
        student_id: studentId,
        academic_year: data.enrollment.academicYear,
        enrollment_date: data.enrollment.enrollmentDate,
        enrollment_status: data.enrollment.enrollmentStatus,
        sede: data.enrollment.sede,
        jornada: data.enrollment.jornada,
        grade_level: data.enrollment.gradeLevel,
        group_name: data.enrollment.groupName,
        enrollment_number: data.enrollment.enrollmentNumber || null,
        simat_beneficiary: data.enrollment.simatBeneficiary,
        estrato: data.enrollment.estrato || null,
        sisben: data.enrollment.sisben || null,
        conflict_victim: data.enrollment.conflictVictim,
        special_population: data.enrollment.specialPopulation || null,
        previous_institution: data.enrollment.previousInstitution || null,
        previous_municipality: data.enrollment.previousMunicipality || null,
        previous_department: data.enrollment.previousDepartment || null,
        previous_grade: data.enrollment.previousGrade || null,
        previous_year: data.enrollment.previousYear || null,
        observations: data.enrollment.observations || null,
        created_at: new Date().toISOString()
      }, { onConflict: 'student_id,academic_year' })
    ]

    const results = await Promise.all(relationInserts)
    for (const r of results) {
      if (r.error) throw new Error(`Error en relaciones de ficha: ${r.error.message}`)
    }

    // 6. Registrar historial académico de años anteriores
    if (data.academicHistory && data.academicHistory.length > 0) {
      const histInserts = data.academicHistory.map(h => ({
        student_id: studentId,
        year: h.year,
        grade_level: h.gradeLevel,
        group_name: h.groupName,
        final_status: h.finalStatus,
        final_average: h.finalAverage || null,
        result: h.result || null
      }))
      const { error: histError } = await adminClient
        .from('student_academic_history')
        .insert(histInserts)
      if (histError) throw new Error(`Error en historial académico: ${histError.message}`)
    }

    // 7. Registrar documentos soporte adjuntos
    if (data.documents && data.documents.length > 0) {
      const docInserts = data.documents.map(d => ({
        student_id: studentId,
        document_category: d.category,
        document_name: d.name,
        file_url: d.fileUrl,
        file_name: d.fileName
      }))
      const { error: docError } = await adminClient
        .from('student_documents')
        .insert(docInserts)
      if (docError) throw new Error(`Error en documentos: ${docError.message}`)
    }

    // 8. Asignar materias / cursos del LMS de forma explícita
    if (data.courses && data.courses.length > 0) {
      const courseInserts = data.courses.map(courseId => ({
        student_id: studentId,
        course_id: courseId
      }))
      const { error: cError } = await adminClient
        .from('student_courses')
        .insert(courseInserts)
      if (cError) throw new Error(`Error al asignar materias LMS: ${cError.message}`)
    }

    revalidatePath('/admin/students')
    return { success: true, password: tempPassword }
  } catch (error: any) {
    console.error('Error en enrollStudent:', error)
    return { error: error.message || 'Error interno al matricular estudiante.' }
  }
}

/**
 * Actualizar la ficha completa de un estudiante.
 */
export async function updateStudent(id: string, data: FullStudentData) {
  try {
    const adminClient = createAdminClient()

    if (!data.details || !data.enrollment || !data.guardians || !data.contact || !data.medical) {
      return { error: 'Los datos de ficha académica están incompletos.' }
    }

    // 1. Reconstruir nombres y apellidos
    const firstName = `${data.details.firstName} ${data.details.secondName || ''}`.trim()
    const lastName = `${data.details.firstSurname} ${data.details.secondSurname || ''}`.trim()

    // 2. Actualizar profiles
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        grade_level: data.enrollment.gradeLevel,
        group_name: data.enrollment.groupName,
        status: data.enrollment.enrollmentStatus === 'active' ? 'active' : 'inactive'
      })
      .eq('id', id)

    if (profileError) throw profileError

    // 3. Actualizar Auth
    const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
      email: data.email,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role_name: 'student',
        grade_level: data.enrollment.gradeLevel
      }
    })
    if (authError) {
      console.warn('Error al actualizar correo en Supabase Auth:', authError.message)
    }

    // 3b. Actualizar contraseña si se proporcionó una nueva
    if (data.password && data.password.trim().length > 0) {
      const { error: passwordError } = await adminClient.auth.admin.updateUserById(id, {
        password: data.password
      })
      if (passwordError) {
        return { error: `Error actualizando contraseña: ${passwordError.message}` }
      }
    }

    // 4. Actualizar tablas de soporte (mediante upsert o insert/update)
    const relationUpdates = [
      adminClient.from('student_details').upsert({
        student_id: id,
        document_type: data.details.documentType,
        document_number: data.details.documentNumber,
        expedition_date: data.details.expeditionDate || null,
        expedition_place: data.details.expeditionPlace || null,
        first_name: data.details.firstName,
        second_name: data.details.secondName || null,
        first_surname: data.details.firstSurname,
        second_surname: data.details.secondSurname || null,
        birth_date: data.details.birthDate || new Date().toISOString().split('T')[0],
        gender: data.details.gender,
        blood_type: data.details.bloodType || null,
        rh: data.details.rh || null,
        nationality: data.details.nationality,
        birth_municipality: data.details.birthMunicipality || null,
        birth_department: data.details.birthDepartment || null,
        updated_at: new Date().toISOString()
      }),
      adminClient.from('student_contacts').upsert({
        student_id: id,
        address: data.contact.address,
        neighborhood: data.contact.neighborhood || null,
        municipality: data.contact.municipality,
        department: data.contact.department,
        zone: data.contact.zone,
        phone: data.contact.phone || null,
        student_cellphone: data.contact.studentCellphone || null,
        student_email: data.contact.studentEmail || null,
        updated_at: new Date().toISOString()
      }),
      adminClient.from('student_guardians').upsert({
        student_id: id,
        father_name: data.guardians.fatherName || null,
        father_document: data.guardians.fatherDocument || null,
        father_phone: data.guardians.fatherPhone || null,
        father_email: data.guardians.fatherEmail || null,
        father_occupation: data.guardians.fatherOccupation || null,
        mother_name: data.guardians.motherName || null,
        mother_document: data.guardians.motherDocument || null,
        mother_phone: data.guardians.motherPhone || null,
        mother_email: data.guardians.motherEmail || null,
        mother_occupation: data.guardians.motherOccupation || null,
        guardian_name: data.guardians.guardianName,
        guardian_document: data.guardians.guardianDocument,
        guardian_relationship: data.guardians.guardianRelationship,
        guardian_phone: data.guardians.guardianPhone,
        guardian_email: data.guardians.guardianEmail || null,
        guardian_address: data.guardians.guardianAddress || null,
        guardian_occupation: data.guardians.guardianOccupation || null,
        updated_at: new Date().toISOString()
      }),
      adminClient.from('student_medical_info').upsert({
        student_id: id,
        eps: data.medical.eps,
        affiliation_type: data.medical.affiliationType || null,
        ips: data.medical.ips || null,
        allergies: data.medical.allergies || null,
        diseases: data.medical.diseases || null,
        medicines: data.medical.medicines || null,
        observations: data.medical.observations || null,
        updated_at: new Date().toISOString()
      }),
      adminClient.from('student_enrollments').upsert({
        student_id: id,
        academic_year: data.enrollment.academicYear,
        enrollment_date: data.enrollment.enrollmentDate,
        enrollment_status: data.enrollment.enrollmentStatus,
        sede: data.enrollment.sede,
        jornada: data.enrollment.jornada,
        grade_level: data.enrollment.gradeLevel,
        group_name: data.enrollment.groupName,
        enrollment_number: data.enrollment.enrollmentNumber || null,
        simat_beneficiary: data.enrollment.simatBeneficiary,
        estrato: data.enrollment.estrato || null,
        sisben: data.enrollment.sisben || null,
        conflict_victim: data.enrollment.conflictVictim,
        special_population: data.enrollment.specialPopulation || null,
        previous_institution: data.enrollment.previousInstitution || null,
        previous_municipality: data.enrollment.previousMunicipality || null,
        previous_department: data.enrollment.previousDepartment || null,
        previous_grade: data.enrollment.previousGrade || null,
        previous_year: data.enrollment.previousYear || null,
        observations: data.enrollment.observations || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id,academic_year' })
    ]

    const results = await Promise.all(relationUpdates)
    for (const r of results) {
      if (r.error) throw new Error(`Error en relaciones de actualización: ${r.error.message}`)
    }

    // 5. Actualizar historial académico (borrar anteriores e insertar actuales)
    const { error: delHistError } = await adminClient
      .from('student_academic_history')
      .delete()
      .eq('student_id', id)
    if (delHistError) throw delHistError

    if (data.academicHistory && data.academicHistory.length > 0) {
      const histInserts = data.academicHistory.map(h => ({
        student_id: id,
        year: h.year,
        grade_level: h.gradeLevel,
        group_name: h.groupName,
        final_status: h.finalStatus,
        final_average: h.finalAverage || null,
        result: h.result || null
      }))
      const { error: histError } = await adminClient
        .from('student_academic_history')
        .insert(histInserts)
      if (histError) throw histError
    }

    // 6. Actualizar documentos soporte (borrar anteriores de base de datos e insertar actuales)
    const { error: delDocsError } = await adminClient
      .from('student_documents')
      .delete()
      .eq('student_id', id)
    if (delDocsError) throw delDocsError

    if (data.documents && data.documents.length > 0) {
      const docInserts = data.documents.map(d => ({
        student_id: id,
        document_category: d.category,
        document_name: d.name,
        file_url: d.fileUrl,
        file_name: d.fileName
      }))
      const { error: docError } = await adminClient
        .from('student_documents')
        .insert(docInserts)
      if (docError) throw docError
    }

    // 7. Actualizar asignación de cursos (borrar anteriores de base de datos e insertar actuales)
    const { error: delCoursesError } = await adminClient
      .from('student_courses')
      .delete()
      .eq('student_id', id)
    if (delCoursesError) throw delCoursesError

    if (data.courses && data.courses.length > 0) {
      const courseInserts = data.courses.map(courseId => ({
        student_id: id,
        course_id: courseId
      }))
      const { error: cError } = await adminClient
        .from('student_courses')
        .insert(courseInserts)
      if (cError) throw cError
    }

    revalidatePath('/admin/students')
    return { success: true }
  } catch (error: any) {
    console.error('Error en updateStudent:', error)
    return { error: error.message || 'Error interno al actualizar estudiante.' }
  }
}

export interface ModulePermission {
  id?: string
  module_key: string
  module_name: string
  is_enabled: boolean
  updated_at?: string
}

export async function getAdminModulePermissions(): Promise<ModulePermission[]> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('admin_module_permissions')
      .select('*')
      .order('module_name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error al obtener permisos de módulos:', err)
    return []
  }
}

export async function saveAdminModulePermissions(permissions: { module_key: string; is_enabled: boolean }[]) {
  try {
    const adminClient = createAdminClient()
    
    for (const item of permissions) {
      const { error } = await adminClient
        .from('admin_module_permissions')
        .update({ is_enabled: item.is_enabled, updated_at: new Date().toISOString() })
        .eq('module_key', item.module_key)
      
      if (error) throw error
    }

    revalidatePath('/admin/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Error al guardar permisos de módulos:', err)
    return { error: err.message || 'Error al guardar los permisos' }
  }
}



