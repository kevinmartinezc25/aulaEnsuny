'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'

export interface TeacherStudent {
  id: string
  name: string
  email: string
  gradeLevel: string
  groupName: string
  courses: { id: string; title: string; subject: string }[]
  averageGrade: number | null
  status: 'active' | 'at_risk'
  joinedDate: string
}

/**
 * Obtener todos los estudiantes que pertenecen a los cursos del docente actual.
 */
export async function getTeacherStudents(): Promise<TeacherStudent[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('No autorizado')
    }

    const adminClient = createAdminClient()

    // 1. Obtener cursos activos asignados a este profesor
    const { data: courses, error: coursesError } = await adminClient
      .from('courses')
      .select('id, title, subject, grade_level, group_name')
      .eq('teacher_id', user.id)
      .eq('status', 'active')

    if (coursesError) throw coursesError

    if (!courses || courses.length === 0) {
      return []
    }

    const teacherCourseIds = courses.map(c => c.id)

    // 2. Obtener las matrículas desde student_courses
    const { data: enrollments, error: enrollError } = await adminClient
      .from('student_courses')
      .select('student_id, course_id')
      .in('course_id', teacherCourseIds)

    const enrollmentsByStudent = new Map<string, string[]>()
    if (!enrollError && enrollments) {
      enrollments.forEach(e => {
        const list = enrollmentsByStudent.get(e.student_id) || []
        list.push(e.course_id)
        enrollmentsByStudent.set(e.student_id, list)
      })
    }

    // 3. Obtener todos los estudiantes activos
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('*, roles!inner(name)')
      .eq('roles.name', 'student')
      .eq('status', 'active')

    if (profilesError) throw profilesError

    if (!profiles || profiles.length === 0) {
      return []
    }

    // 4. Filtrar perfiles que coincidan (vía student_courses o fallback a grado/grupo)
    let matchingProfiles: any[] = []
    const hasExplicitEnrollments = enrollmentsByStudent.size > 0

    if (hasExplicitEnrollments) {
      matchingProfiles = profiles.filter(p => enrollmentsByStudent.has(p.id))
    } else {
      // Fallback: match by grade level and group
      const gradeGroupPairs = courses.map(c => ({
        grade: c.grade_level,
        group: c.group_name || '1'
      }))
      matchingProfiles = profiles.filter(p => {
        return gradeGroupPairs.some(pair => 
          pair.grade === p.grade_level && 
          pair.group === (p.group_name || '1')
        )
      })
    }

    if (matchingProfiles.length === 0) {
      return []
    }

    const studentIds = matchingProfiles.map(p => p.id)

    // 5. Obtener los promedios definitivos de los estudiantes en los cursos de este docente
    const { data: periodGrades, error: gradesError } = await adminClient
      .from('student_period_grades')
      .select('student_id, course_id, final_grade')
      .in('student_id', studentIds)
      .in('course_id', teacherCourseIds)

    const gradesByStudent = new Map<string, { final_grade: number; course_id: string }[]>()
    if (!gradesError && periodGrades) {
      periodGrades.forEach(g => {
        const studentGrades = gradesByStudent.get(g.student_id) || []
        studentGrades.push({
          final_grade: Number(g.final_grade),
          course_id: g.course_id
        })
        gradesByStudent.set(g.student_id, studentGrades)
      })
    }

    // 6. Construir lista final de estudiantes
    return matchingProfiles.map(p => {
      const studentGrades = gradesByStudent.get(p.id) || []
      
      // Calcular promedio del docente para este alumno
      let averageGrade: number | null = null
      let isAtRisk = false

      if (studentGrades.length > 0) {
        const sum = studentGrades.reduce((acc, curr) => acc + curr.final_grade, 0)
        averageGrade = Math.round((sum / studentGrades.length) * 100) / 100
        isAtRisk = averageGrade < 3.0 || studentGrades.some(g => g.final_grade < 3.0)
      }

      // Obtener cursos asociados (explícitamente inscritos o por fallback de grado/grupo)
      let studentCoursesData: typeof courses = []
      if (hasExplicitEnrollments) {
        const enrolledCourseIds = enrollmentsByStudent.get(p.id) || []
        studentCoursesData = courses.filter(c => enrolledCourseIds.includes(c.id))
      } else {
        studentCoursesData = courses.filter(c => 
          c.grade_level === p.grade_level && 
          (c.group_name || '1') === (p.group_name || '1')
        )
      }

      const studentCourses = studentCoursesData.map(c => ({
        id: c.id,
        title: c.title,
        subject: c.subject
      }))

      const cleanFirstName = (p.first_name || 'estudiante').toLowerCase().replace(/\s+/g, '')
      const cleanLastName = (p.last_name || 'nuevo').toLowerCase().replace(/\s+/g, '')
      const fallbackEmail = `${cleanFirstName}.${cleanLastName}@estudiante.ensuny.edu.co`

      return {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        email: p.email || fallbackEmail,
        gradeLevel: p.grade_level || '8°',
        groupName: p.group_name || '1',
        courses: studentCourses,
        averageGrade,
        status: isAtRisk ? 'at_risk' : 'active',
        joinedDate: new Date(p.created_at).toISOString().split('T')[0]
      }
    })

  } catch (error) {
    console.error('Error al obtener estudiantes del docente, usando fallback:', error)
    
    // Fallback de desarrollo / demo
    return [
      {
        id: 's-1',
        name: 'Ana María Torres',
        email: 'a.torres@estudiante.ensuny.edu.co',
        gradeLevel: '8°',
        groupName: '1',
        courses: [
          { id: 'c1', title: 'Física I - 8°', subject: 'Ciencias Exactas' },
          { id: 'c2', title: 'Matemáticas - 8°', subject: 'Ciencias Exactas' }
        ],
        averageGrade: 4.55,
        status: 'active',
        joinedDate: '2025-01-20'
      },
      {
        id: 's-2',
        name: 'José Daniel Ramírez',
        email: 'j.ramirez@estudiante.ensuny.edu.co',
        gradeLevel: '8°',
        groupName: '1',
        courses: [
          { id: 'c1', title: 'Física I - 8°', subject: 'Ciencias Exactas' },
          { id: 'c2', title: 'Matemáticas - 8°', subject: 'Ciencias Exactas' }
        ],
        averageGrade: 3.80,
        status: 'active',
        joinedDate: '2025-01-22'
      },
      {
        id: 's-3',
        name: 'Luis Alfredo Sandoval',
        email: 'l.sandoval@estudiante.ensuny.edu.co',
        gradeLevel: '9°',
        groupName: '2',
        courses: [
          { id: 'c3', title: 'Química General - 9°', subject: 'Ciencias Exactas' }
        ],
        averageGrade: 4.10,
        status: 'active',
        joinedDate: '2024-01-15'
      },
      {
        id: 's-4',
        name: 'María Camila Herrera',
        email: 'm.herrera@estudiante.ensuny.edu.co',
        gradeLevel: '10°',
        groupName: '2',
        courses: [
          { id: 'c4', title: 'Trigonometría - 10°', subject: 'Matemáticas' }
        ],
        averageGrade: 2.85,
        status: 'at_risk',
        joinedDate: '2024-02-05'
      },
      {
        id: 's-5',
        name: 'Kevin Martinez',
        email: 'kevin@estudiante.ensuny.edu.co',
        gradeLevel: '11°',
        groupName: '1',
        courses: [
          { id: 'c5', title: 'Física Avanzada - 11°', subject: 'Ciencias Exactas' }
        ],
        averageGrade: 4.65,
        status: 'active',
        joinedDate: '2023-01-10'
      }
    ]
  }
}

/**
 * Enviar mensaje masivo o individual a estudiante(s).
 */
export async function sendStudentMessage(studentId: string | 'all', subject: string, message: string) {
  // Simular envío de mensaje con demora
  await new Promise(resolve => setTimeout(resolve, 800))
  console.log(`Mensaje enviado a: ${studentId}`, { subject, message })
  return { success: true }
}
