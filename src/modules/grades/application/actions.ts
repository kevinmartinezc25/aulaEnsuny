'use server'

import { createClient } from '@/core/config/supabase/server'
import { z } from 'zod'

// 1. Clasificar nivel de desempeño
function classifyPerformanceLevel(average: number): string {
  if (average >= 4.6 && average <= 5.0) return 'Superior'
  if (average >= 4.0 && average <= 4.59) return 'Alto'
  if (average >= 3.0 && average <= 3.99) return 'Básico'
  return 'Bajo'
}

export type StudentGradeRecord = {
  id: string
  score: number
  feedback: string | null
  date: string
  categoryName: string
  categoryWeight: number
}

export type StudentCourseGrades = {
  courseId: string
  courseTitle: string
  courseSubject: string
  average: number
  performanceLevel: string
  grades: StudentGradeRecord[]
}

// 2. Obtener promedios y notas de todos los cursos de un estudiante
export async function getStudentCourseGrades(): Promise<StudentCourseGrades[]> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('No autorizado')
  }

  // 2.1 Obtener notas del estudiante (incluyendo la info del curso y categoría)
  const { data: gradesData, error: gradesError } = await supabase
    .from('grades')
    .select(`
      id, score, feedback, created_at,
      courses ( id, title, subject ),
      course_grade_categories ( id, name, weight )
    `)
    .eq('student_id', user.id)

  if (gradesError) {
    console.error('Error fetching grades:', gradesError)
    throw new Error('Error al obtener calificaciones')
  }

  if (!gradesData || gradesData.length === 0) {
    return []
  }

  // 2.2 Agrupar por curso
  const courseMap = new Map<string, StudentCourseGrades>()

  for (const row of gradesData as any[]) {
    const course = row.courses
    const category = row.course_grade_categories
    if (!course || !category) continue

    if (!courseMap.has(course.id)) {
      courseMap.set(course.id, {
        courseId: course.id,
        courseTitle: course.title,
        courseSubject: course.subject,
        average: 0, // se calculará luego
        performanceLevel: '',
        grades: []
      })
    }

    const courseData = courseMap.get(course.id)!
    
    courseData.grades.push({
      id: row.id,
      score: Number(row.score),
      feedback: row.feedback,
      date: new Date(row.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      categoryName: category.name,
      categoryWeight: Number(category.weight)
    })
  }

  // 2.3 Calcular promedios
  const result: StudentCourseGrades[] = []

  for (const [courseId, courseData] of courseMap.entries()) {
    const categoryMap = new Map<string, { sum: number; count: number; weight: number }>()
    
    for (const g of courseData.grades) {
      if (!categoryMap.has(g.categoryName)) {
        categoryMap.set(g.categoryName, { sum: 0, count: 0, weight: g.categoryWeight })
      }
      const cat = categoryMap.get(g.categoryName)!
      cat.sum += g.score
      cat.count += 1
    }

    let finalAverage = 0
    for (const [_, cat] of categoryMap.entries()) {
      const catAverage = cat.sum / cat.count // Promedio dentro de la categoría
      finalAverage += catAverage * cat.weight // Se aplica el peso de la categoría
    }

    courseData.average = Math.round(finalAverage * 100) / 100
    courseData.performanceLevel = classifyPerformanceLevel(courseData.average)

    // Ordenar notas por fecha (descendente)
    courseData.grades.sort((a, b) => b.id.localeCompare(a.id))
    
    result.push(courseData)
  }

  // Ordenar los cursos alfabéticamente
  return result.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle))
}

// 3. (Para docentes) Definir las categorías de un curso
const categoriesSchema = z.array(z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  weight: z.number().min(0.01).max(1)
}))

export async function saveCourseCategories(courseId: string, categories: { name: string, weight: number }[]) {
  // 3.1 Validar schema
  const parsed = categoriesSchema.parse(categories)
  
  // 3.2 Validar que sumen 1.00 (100%)
  const totalWeight = parsed.reduce((acc, curr) => acc + curr.weight, 0)
  // Tolerancia flotante
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    throw new Error('La suma de las ponderaciones debe ser exactamente 100% (1.00)')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  // Limpiar anteriores e insertar nuevas
  await supabase.from('course_grade_categories').delete().eq('course_id', courseId)
  
  const inserts = parsed.map(c => ({
    course_id: courseId,
    name: c.name,
    weight: c.weight
  }))

  const { error } = await supabase.from('course_grade_categories').insert(inserts)
  if (error) {
    throw new Error('Error al guardar las categorías: ' + error.message)
  }

  return { success: true }
}
