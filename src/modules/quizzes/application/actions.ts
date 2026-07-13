'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

interface QuizAnswerSubmit {
  questionId: string
  selectedOptionId: string
}

export interface QuizSubmissionResult {
  score: number
  isPassed: boolean
  correctCount: number
  totalQuestions: number
  unlockedAchievement?: {
    title: string
    description: string
    badgeIcon: string
  } | null
}

/**
 * Enviar y calificar un quiz de manera automática.
 * Escala de notas obligatoria: 1.0 a 5.0
 */
export async function submitQuiz(
  quizId: string,
  answers: QuizAnswerSubmit[]
): Promise<{ data?: QuizSubmissionResult; error?: string }> {
  // Simular latencia de red
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

  if (isDemoMode) {
    // Lógica de calificación demo
    const totalQuestions = answers.length
    if (totalQuestions === 0) {
      return { error: 'No se enviaron respuestas para calificar.' }
    }

    // Simulamos que la primera y tercera respuesta son siempre correctas para el testeo
    let correctCount = 0
    answers.forEach((ans, idx) => {
      // Simular aciertos aleatorios o fijos
      if (idx % 2 === 0 || ans.selectedOptionId.endsWith('-correct')) {
        correctCount++
      }
    })

    // Calcular nota en escala de 1.0 a 5.0
    // Fórmula: Nota = 1.0 + (Correctas / Total) * 4.0
    const rawScore = 1.0 + (correctCount / totalQuestions) * 4.0
    const score = Math.round(rawScore * 100) / 100 // Redondear a 2 decimales
    const isPassed = score >= 3.0

    // Gamificación: Desbloquear un logro si saca nota perfecta o aprueba el quiz
    let unlockedAchievement = null
    if (score === 5.0) {
      unlockedAchievement = {
        title: 'Mente Brillante',
        description: 'Obtuviste una calificación perfecta de 5.0 en una evaluación.',
        badgeIcon: 'sparkles',
      }
    } else if (isPassed) {
      unlockedAchievement = {
        title: 'Explorador STEM',
        description: 'Aprobaste la evaluación del módulo de ciencias.',
        badgeIcon: 'rocket',
      }
    }

    // Guardar el intento simulado en una cookie de historial para que persista en el frontend
    const cookieStore = await cookies()
    const historyCookie = cookieStore.get('aulaensuny-grades-history')
    let history = historyCookie ? JSON.parse(historyCookie.value) : []
    
    const newGrade = {
      id: `grade-${Date.now()}`,
      quizId,
      subject: quizId.includes('fisica') ? 'Física I' : 'Matemáticas I',
      activity: 'Evaluación de Módulo',
      score,
      weight: 0.3, // 30%
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    }

    history.push(newGrade)
    cookieStore.set('aulaensuny-grades-history', JSON.stringify(history), { path: '/', maxAge: 60 * 60 * 24 * 7 })

    revalidatePath('/student/dashboard')
    revalidatePath('/student/grades')

    return {
      data: {
        score,
        isPassed,
        correctCount,
        totalQuestions,
        unlockedAchievement,
      },
    }
  }

  // Flujo real de Supabase
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // 1. Obtener opciones correctas para las preguntas del quiz
    const { data: correctOptions, error: optError } = await supabase
      .from('quiz_options')
      .select('id, question_id, is_correct')
      .in('question_id', answers.map(a => a.questionId))
      .eq('is_correct', true)

    if (optError || !correctOptions) {
      return { error: 'Error al consultar las respuestas correctas de la evaluación.' }
    }

    const totalQuestions = answers.length
    let correctCount = 0

    answers.forEach((userAns) => {
      const correctOpt = correctOptions.find(o => o.question_id === userAns.questionId)
      if (correctOpt && correctOpt.id === userAns.selectedOptionId) {
        correctCount++
      }
    })

    const rawScore = 1.0 + (correctCount / totalQuestions) * 4.0
    const score = Math.round(rawScore * 100) / 100
    const isPassed = score >= 3.0

    // 2. Registrar el intento en quiz_attempts
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Usuario no autenticado.' }

    const { error: attemptError } = await adminSupabase
      .from('quiz_attempts')
      .insert({
        student_id: user.id,
        quiz_id: quizId,
        score,
        is_passed: isPassed,
      })

    if (attemptError) {
      return { error: 'Error al guardar el intento de evaluación.' }
    }

    // 3. Registrar la nota en grades
    // Se asume que el quiz pertenece a una lección -> módulo -> curso
    const { data: quizData } = await supabase.from('quizzes').select('lesson_id').eq('id', quizId).single()
    let dbCourseId = null
    
    if (quizData?.lesson_id) {
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('module_id')
        .eq('id', quizData.lesson_id)
        .single()
        
      if (lessonData?.module_id) {
        const { data: moduleData } = await supabase
          .from('course_modules')
          .select('course_id')
          .eq('id', lessonData.module_id)
          .single()
        dbCourseId = moduleData?.course_id
      }
    }

    if (dbCourseId) {
      // Buscar o crear la categoría de calificación para 'Quizzes'
      let categoryId = null
      const { data: categories } = await supabase
        .from('course_grade_categories')
        .select('id')
        .eq('course_id', dbCourseId)
        .eq('name', 'Quizzes')
        
      if (categories && categories.length > 0) {
        categoryId = categories[0].id
      } else {
        const { data: newCat, error: catErr } = await adminSupabase
          .from('course_grade_categories')
          .insert({
            course_id: dbCourseId,
            name: 'Quizzes',
            weight: 0.30
          })
          .select()
          .single()
        if (!catErr && newCat) {
          categoryId = newCat.id
        }
      }

      if (categoryId) {
        const { error: gradeError } = await adminSupabase
          .from('grades')
          .insert({
            student_id: user.id,
            course_id: dbCourseId,
            category_id: categoryId,
            score,
            feedback: isPassed ? 'Excelente desempeño en la evaluación.' : 'Sigue estudiando y repasa los contenidos para el reintento.',
          })

        if (gradeError) {
          console.error('Error al registrar nota:', gradeError.message)
        }
      }
    }

    // 4. Marcar la lección/progreso como completada
    if (quizData?.lesson_id) {
      await adminSupabase
        .from('student_progress')
        .upsert({
          student_id: user.id,
          lesson_id: quizData.lesson_id,
          completed: true,
          completed_at: new Date().toISOString(),
          submission_text: JSON.stringify(answers),
        }, { onConflict: 'student_id,lesson_id' })
    }

    // 5. Desbloqueo de logros (Gamificación)
    let unlockedAchievement = null
    if (score === 5.0) {
      // Verificar si ya tiene el logro de nota perfecta
      const { data: ach } = await supabase
        .from('achievements')
        .select('id, title, description, badge_icon')
        .eq('achievement_type', 'perfect_score')
        .single()

      if (ach) {
        const { error: linkError } = await adminSupabase
          .from('student_achievements')
          .insert({
            student_id: user.id,
            achievement_id: ach.id,
          })

        if (!linkError) {
          unlockedAchievement = {
            title: ach.title,
            description: ach.description,
            badgeIcon: ach.badge_icon,
          }
        }
      }
    }

    revalidatePath('/student/dashboard')
    revalidatePath('/student/grades')

    return {
      data: {
        score,
        isPassed,
        correctCount,
        totalQuestions,
        unlockedAchievement,
      },
    }
  } catch (err: any) {
    return { error: err.message || 'Error en el servidor al calificar el quiz.' }
  }
}
