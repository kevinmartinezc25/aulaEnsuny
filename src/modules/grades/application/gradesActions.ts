'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export type LessonGradeType = 'quiz' | 'task' | 'workshop' | 'activity' | 'forum'

export interface AcademicPeriod {
  id: string
  name: string
  year: number
  startDate: string
  endDate: string
  status: 'active' | 'inactive'
}

export interface StudentLessonGrade {
  id: string
  studentId: string
  courseId: string
  lessonId: string
  lessonTitle: string
  gradeType: LessonGradeType
  grade: number
  maxGrade: number
  feedback: string | null
  gradedAt: string
  gradedBy: string | null
}

export interface GradeMatrixColumn {
  lessonId: string
  lessonTitle: string
  gradeType: LessonGradeType
  orderIndex: number
}

export interface GradeMatrixRow {
  studentId: string
  studentName: string
  grades: Record<string, { gradeId: string; grade: number; maxGrade: number } | null> // lessonId → grade
  finalGrade: number | null
}

export interface StudentGradeMatrixRow {
  studentId: string
  studentName: string
  grades: Record<string, { id: string; grade: number }>
  finalGrade: number | null
  performanceLevel: string | null
}

export interface ConsolidatedGradeRow {
  studentId: string
  studentName: string
  courseGrades: Record<string, { finalGrade: number; performanceLevel: string }>
  average: number
  performanceLevel: string
}

export interface GradeAuditRow {
  id: string
  studentName: string
  courseTitle: string
  periodName: string
  teacherName: string
  oldGrade: number | null
  newGrade: number
  changeReason: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function calcPerformanceLevel(avg: number): string {
  if (avg >= 4.6) return 'Superior'
  if (avg >= 4.0) return 'Alto'
  if (avg >= 3.0) return 'Básico'
  if (avg > 0) return 'Bajo'
  return '-'
}

// ---------------------------------------------------------------------------
// 0. ACADEMIC PERIODS
// ---------------------------------------------------------------------------

/**
 * Obtiene todos los períodos académicos disponibles ordenados por año y fecha
 */
export async function getAcademicPeriods(): Promise<AcademicPeriod[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('academic_periods')
    .select('id, name, year, start_date, end_date, status')
    .order('year', { ascending: false })
    .order('start_date', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    year: p.year,
    startDate: p.start_date,
    endDate: p.end_date,
    status: p.status
  }))
}

// ---------------------------------------------------------------------------
// 1. TEACHER — MATRIX VIEW
// ---------------------------------------------------------------------------

/**
 * Devuelve la matriz dinámica de calificaciones para un curso.
 * Columnas = lecciones con tipo evaluable (quiz/task/workshop/activity)
 * Filas = estudiantes inscritos en el curso
 * @param courseId ID del curso
 * @param periodId ID del período académico (opcional)
 */
export async function getGradesMatrix(
  courseId: string,
  periodId?: string
): Promise<{
  students: GradeMatrixRow[]
  columns: GradeMatrixColumn[]
  courseInfo: { title: string; gradeLevel: string; groupName: string }
}> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('No autorizado')

  const admin = createAdminClient()

  // 1a. Course info
  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('title, grade_level, group_name')
    .eq('id', courseId)
    .single()
  if (courseErr || !course) throw new Error('Curso no encontrado')

  // 1b. Evaluable lessons ordered by position
  // Seleccionamos tanto `content_type` (nuevo) como `type` (antiguo), y además forums(is_graded) para filtrar por calificable.
  const { data: lessons } = await admin
    .from('lessons')
    .select('id, title, content_type, type, order_index, course_modules!inner(course_id), quizzes(id), forums(id, is_graded)')
    .eq('course_modules.course_id', courseId)
    .order('order_index', { ascending: true })

  const columns: GradeMatrixColumn[] = (lessons || [])
    .filter((l: any) => {
      const ct = (l.content_type ?? l.type) as string | undefined
      const hasQuiz = l.quizzes && l.quizzes.id
      if (ct === 'forum') {
        const forums = l.forums
        const forumObj = Array.isArray(forums) ? forums[0] : forums
        return forumObj && forumObj.is_graded === true
      }
      return hasQuiz || (ct && ['quiz', 'task', 'workshop', 'activity'].includes(ct))
    })
    .map((l: any) => {
      const hasQuiz = l.quizzes && l.quizzes.id
      const gradeType = hasQuiz ? 'quiz' : ((l.content_type ?? l.type) as LessonGradeType)
      return {
        lessonId: l.id,
        lessonTitle: l.title,
        gradeType,
        orderIndex: l.order_index ?? 0
      }
    })

  const lessonIds = columns.map(c => c.lessonId)

  // 1c. Enrolled students
  const { data: enrollments } = await admin
    .from('student_courses')
    .select('student_id, profiles!student_id(id, first_name, last_name)')
    .eq('course_id', courseId)

  const students = (enrollments || []).map((e: any) => {
    const p = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
    return { id: p?.id ?? e.student_id, firstName: p?.first_name ?? '', lastName: p?.last_name ?? '' }
  }).sort((a, b) => a.lastName.localeCompare(b.lastName))

  const studentIds = students.map(s => s.id)

  // 1d. Existing grades (filtrado por período si se especifica)
  let existingGrades: any[] = []
  if (studentIds.length > 0 && lessonIds.length > 0) {
    let query = admin
      .from('student_lesson_grades')
      .select('id, student_id, lesson_id, grade, score, max_grade')
      .in('student_id', studentIds)
      .in('lesson_id', lessonIds)

    // Filtrar por período si se proporciona o si es null (tareas generales)
    if (periodId) {
      query = query.or(`academic_period_id.eq.${periodId},academic_period_id.is.null`)
    }

    const { data } = await query
    existingGrades = data || []
  }

  // 1d.1 Obtener quizzes e intentos de evaluación (quiz_attempts)
  let dbQuizzes: any[] = []
  let quizAttempts: any[] = []
  if (lessonIds.length > 0) {
    const { data: qData } = await admin
      .from('quizzes')
      .select('id, lesson_id')
      .in('lesson_id', lessonIds)
    dbQuizzes = qData || []
    
    if (dbQuizzes.length > 0 && studentIds.length > 0) {
      const quizIds = dbQuizzes.map(q => q.id)
      const { data: aData } = await admin
        .from('quiz_attempts')
        .select('id, student_id, quiz_id, score, completed_at')
        .in('student_id', studentIds)
        .in('quiz_id', quizIds)
        .order('completed_at', { ascending: true })
      quizAttempts = aData || []
    }
  }

  // Build grade lookup: "studentId_lessonId" → grade row
  const gradeMap = new Map<string, { gradeId: string; grade: number; maxGrade: number }>()
  
  // Popular con student_lesson_grades (manuales)
  existingGrades.forEach(g => {
    const gradeVal = Number(g.grade ?? g.score ?? 0)
    gradeMap.set(`${g.student_id}_${g.lesson_id}`, {
      gradeId: g.id,
      grade: gradeVal,
      maxGrade: Number(g.max_grade ?? 5)
    })
  })

  // Unificar con quiz_attempts (autocalificados)
  if (dbQuizzes.length > 0 && quizAttempts.length > 0) {
    const quizToLesson = new Map<string, string>()
    dbQuizzes.forEach(q => quizToLesson.set(q.id, q.lesson_id))

    quizAttempts.forEach(attempt => {
      const lessonId = quizToLesson.get(attempt.quiz_id)
      if (lessonId) {
        const key = `${attempt.student_id}_${lessonId}`
        gradeMap.set(key, {
          gradeId: attempt.id,
          grade: Number(attempt.score ?? 0),
          maxGrade: 5
        })
      }
    })
  }

  // 1e. Build matrix rows
  const rows: GradeMatrixRow[] = students.map(s => {
    const gradesRow: Record<string, { gradeId: string; grade: number; maxGrade: number } | null> = {}
    let sum = 0; let count = 0

    columns.forEach(col => {
      const entry = gradeMap.get(`${s.id}_${col.lessonId}`) ?? null
      gradesRow[col.lessonId] = entry
      if (entry) { sum += entry.grade; count++ }
    })

    const finalGrade = count > 0 ? Number((sum / count).toFixed(2)) : null

    return {
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`.trim(),
      grades: gradesRow,
      finalGrade
    }
  })

  return {
    students: rows,
    columns,
    courseInfo: {
      title: course.title,
      gradeLevel: course.grade_level,
      groupName: course.group_name || '1'
    }
  }
}

// ---------------------------------------------------------------------------
// 2. TEACHER — SAVE / UPDATE A GRADE
// ---------------------------------------------------------------------------

export async function saveLessonGrade(data: {
  studentId: string
  lessonId: string
  courseId: string
  periodId?: string
  grade: number
  maxGrade?: number
  feedback?: string
  gradeType: LessonGradeType
}): Promise<{ success?: true; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const admin = createAdminClient()

    const { error: upsertErr } = await admin
      .from('student_lesson_grades')
      .upsert({
        student_id: data.studentId,
        lesson_id: data.lessonId,
        course_id: data.courseId,
        academic_period_id: data.periodId ?? null,
        grade_type: data.gradeType,
        grade: data.grade,
        score: data.grade,          // backward-compat with original schema
        max_grade: data.maxGrade ?? 5,
        feedback: data.feedback ?? null,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id,lesson_id' })

    if (upsertErr) return { error: upsertErr.message }

    revalidatePath('/teacher/grades')
    revalidatePath(`/teacher/courses/${data.courseId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message ?? 'Error al guardar la nota.' }
  }
}

// ---------------------------------------------------------------------------
// 3. TEACHER — BATCH SAVE (cell editing in matrix)
// ---------------------------------------------------------------------------

export async function saveLessonGradesBatch(rows: {
  studentId: string
  lessonId: string
  courseId: string
  periodId?: string
  gradeType: LessonGradeType
  grade: number | null
  maxGrade?: number
}[]): Promise<{ success?: true; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const admin = createAdminClient()

    const toDelete = rows.filter(r => r.grade === null)
    const toUpsert = rows.filter(r => r.grade !== null) as typeof rows

    for (const r of toDelete) {
      await admin
        .from('student_lesson_grades')
        .delete()
        .eq('student_id', r.studentId)
        .eq('lesson_id', r.lessonId)
    }

    if (toUpsert.length > 0) {
      const upsertRows = toUpsert.map(r => ({
        student_id: r.studentId,
        lesson_id: r.lessonId,
        course_id: r.courseId,
        academic_period_id: r.periodId ?? null,
        grade_type: r.gradeType,
        grade: r.grade!,
        score: r.grade!,            // backward-compat with original schema
        max_grade: r.maxGrade ?? 5,
        graded_by: user!.id,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: upsertErr } = await admin
        .from('student_lesson_grades')
        .upsert(upsertRows, { onConflict: 'student_id,lesson_id' })

      if (upsertErr) return { error: upsertErr.message }
    }

    revalidatePath('/teacher/grades')
    return { success: true }
  } catch (err: any) {
    return { error: err.message ?? 'Error al guardar notas en lote.' }
  }
}

// ---------------------------------------------------------------------------
// 4. STUDENT — course grade detail (for CourseDetailScreen)
// ---------------------------------------------------------------------------

export interface StudentCourseGradesResult {
  lessonGrades: StudentLessonGrade[]
  quizResults: {
    lessonId: string
    lessonTitle: string
    score: number
    maxScore: number
    completedAt: string
  }[]
  finalGrade: number | null
  performanceLevel: string | null
}

export async function getStudentCourseGrades(courseId: string): Promise<StudentCourseGradesResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('No autorizado')

  const admin = createAdminClient()

  // 4a. Graded lessons (task/workshop/activity)
  const { data: lessonGradesRaw } = await admin
    .from('student_lesson_grades')
    .select(`
      id, grade, score, max_grade, feedback, graded_at, graded_by, grade_type,
      lessons!lesson_id(id, title, forums(is_graded))
    `)
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .order('graded_at', { ascending: false })

  const lessonGrades: StudentLessonGrade[] = (lessonGradesRaw || [])
    .filter((r: any) => {
      if (r.grade_type === 'forum') {
        const forums = r.lessons?.forums
        const forumObj = Array.isArray(forums) ? forums[0] : forums
        return forumObj && forumObj.is_graded === true
      }
      return true
    })
    .map((r: any) => ({
      id: r.id,
      studentId: user.id,
      courseId,
      lessonId: r.lessons?.id ?? '',
      lessonTitle: r.lessons?.title ?? 'Lección',
      gradeType: r.grade_type as LessonGradeType,
      grade: Number(r.grade ?? r.score ?? 0),
      maxGrade: Number(r.max_grade ?? 5),
      feedback: r.feedback ?? null,
      gradedAt: r.graded_at,
      gradedBy: r.graded_by ?? null
    }))

  // 4b. Quiz attempts
  let courseModules: any[] = []
  let lessonsInModules: any[] = []
  let dbQuizzes: any[] = []
  let quizAttemptsData: any[] = []
  const quizToLessonMap = new Map<string, { id: string; title: string }>()

  const { data: modulesData } = await admin
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)
  courseModules = modulesData || []
  
  const moduleIds = courseModules.map(m => m.id)
  if (moduleIds.length > 0) {
    const { data: lessonsData } = await admin
      .from('lessons')
      .select('id, title')
      .in('module_id', moduleIds)
    lessonsInModules = lessonsData || []
    
    const lessonIds = lessonsInModules.map(l => l.id)
    if (lessonIds.length > 0) {
      const { data: quizzesData } = await admin
        .from('quizzes')
        .select('id, lesson_id')
        .in('lesson_id', lessonIds)
      dbQuizzes = quizzesData || []
      
      dbQuizzes.forEach((q: any) => {
        const lesson = lessonsInModules.find(l => l.id === q.lesson_id)
        if (lesson) {
          quizToLessonMap.set(q.id, { id: q.lesson_id, title: lesson.title })
        }
      })

      const quizIds = dbQuizzes.map(q => q.id)
      if (quizIds.length > 0) {
        const { data: attemptsData } = await admin
          .from('quiz_attempts')
          .select('id, score, completed_at, quiz_id')
          .eq('student_id', user.id)
          .in('quiz_id', quizIds)
          .order('completed_at', { ascending: false })
        quizAttemptsData = attemptsData || []
      }
    }
  }

  const quizResults = quizAttemptsData.map((a: any) => {
    const lessonInfo = quizToLessonMap.get(a.quiz_id)
    return {
      lessonId: lessonInfo?.id ?? '',
      lessonTitle: lessonInfo?.title ?? 'Quiz',
      score: Number(a.score ?? 0),
      maxScore: 5,
      completedAt: a.completed_at
    }
  })

  // 4c. Calculate final grade (average of all scored items)
  const allScores = [
    ...lessonGrades.map(g => (g.grade / g.maxGrade) * 5),
    ...quizResults.map(q => (q.score / (q.maxScore || 5)) * 5)
  ]

  const finalGrade = allScores.length > 0
    ? Number((allScores.reduce((acc, v) => acc + v, 0) / allScores.length).toFixed(2))
    : null

  const performanceLevel = finalGrade !== null ? calcPerformanceLevel(finalGrade) : null

  return { lessonGrades, quizResults, finalGrade, performanceLevel }
}

// ---------------------------------------------------------------------------
// 5. STUDENT — boletín (all courses, current period)
// ---------------------------------------------------------------------------

export interface StudentReportSubject {
  courseId: string
  courseTitle: string
  subject: string
  teacherName: string
  finalGrade: number | null
  performanceLevel: string | null
  lessonGrades: {
    lessonTitle: string
    gradeType: LessonGradeType
    grade: number
    maxGrade: number
  }[]
}

export interface StudentReportResult {
  subjects: StudentReportSubject[]
  generalAverage: number
  generalPerformanceLevel: string
}

export async function getCurrentStudentReport(
  _periodId?: string
): Promise<StudentReportResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('No autorizado')

  return getStudentPeriodReport(user.id, _periodId)
}

export async function getStudentPeriodReport(
  studentId: string,
  _periodId?: string
): Promise<StudentReportResult> {
  const admin = createAdminClient()

  // 5a. Get student profile for grade/group
  const { data: profile } = await admin
    .from('profiles')
    .select('grade_level, group_name')
    .eq('id', studentId)
    .single()

  if (!profile) throw new Error('Estudiante no encontrado')

  // 5b. Get enrolled courses
  const { data: enrollments } = await admin
    .from('student_courses')
    .select('course_id, courses!course_id(id, title, subject, teacher:profiles!teacher_id(first_name, last_name))')
    .eq('student_id', studentId)

  let courses = (enrollments || []).map((e: any) => {
    const c = Array.isArray(e.courses) ? e.courses[0] : e.courses
    const t = Array.isArray(c?.teacher) ? c.teacher[0] : c?.teacher
    return {
      id: c?.id ?? e.course_id,
      title: c?.title ?? '',
      subject: c?.subject ?? '',
      teacherName: t ? `${t.first_name} ${t.last_name}` : 'Sin docente'
    }
  })

  // Sin fallback por grado: solo se muestran cursos explícitamente matriculados

  if (courses.length === 0) {
    return { subjects: [], generalAverage: 0, generalPerformanceLevel: 'Bajo' }
  }

  const courseIds = courses.map(c => c.id)

  // 5c. All lesson grades for student across enrolled courses
  const { data: allGrades } = await admin
    .from('student_lesson_grades')
    .select('course_id, lesson_id, grade, score, max_grade, grade_type, lessons!lesson_id(title, forums(is_graded))')
    .eq('student_id', studentId)
    .in('course_id', courseIds)

  // 5d. Fetch quiz attempts by first resolving the quizzes for these courses
  let dbModules: any[] = []
  let lessonsInModules: any[] = []
  let dbQuizzes: any[] = []
  let quizAttempts: any[] = []

  if (courseIds.length > 0) {
    const { data: modulesData } = await admin
      .from('course_modules')
      .select('id, course_id')
      .in('course_id', courseIds)
    dbModules = modulesData || []
    
    const moduleIds = dbModules.map(m => m.id)
    if (moduleIds.length > 0) {
      const { data: lessonsData } = await admin
        .from('lessons')
        .select('id, title, module_id')
        .in('module_id', moduleIds)
      lessonsInModules = lessonsData || []
      
      const lessonIds = lessonsInModules.map(l => l.id)
      if (lessonIds.length > 0) {
        const { data: quizzesData } = await admin
          .from('quizzes')
          .select('id, lesson_id')
          .in('lesson_id', lessonIds)
        dbQuizzes = quizzesData || []
        
        const quizIds = dbQuizzes.map(q => q.id)
        if (quizIds.length > 0) {
          const { data: attemptsData } = await admin
            .from('quiz_attempts')
            .select('quiz_id, score, completed_at')
            .eq('student_id', studentId)
            .in('quiz_id', quizIds)
          quizAttempts = attemptsData || []
        }
      }
    }
  }

  let totalSum = 0; let totalCount = 0

  const subjects: StudentReportSubject[] = courses.map(course => {
    const courseGrades = (allGrades || []).filter((g: any) => g.course_id === course.id)
    
    // Find quizzes and attempts for this specific course
    const courseModules = dbModules.filter(m => m.course_id === course.id)
    const courseModuleIds = new Set(courseModules.map(m => m.id))
    const courseLessons = lessonsInModules.filter(l => courseModuleIds.has(l.module_id))
    const courseLessonIds = new Set(courseLessons.map(l => l.id))
    const courseQuizzesList = dbQuizzes.filter(q => courseLessonIds.has(q.lesson_id))
    const courseQuizIds = new Set(courseQuizzesList.map(q => q.id))
    const courseQuizAttempts = quizAttempts.filter(qa => courseQuizIds.has(qa.quiz_id))

    const lessonGrades = [
      ...courseGrades
        .filter((g: any) => {
          if (g.grade_type === 'forum') {
            const lessonObj = Array.isArray(g.lessons) ? g.lessons[0] : g.lessons
            const forums = lessonObj?.forums
            const forumObj = Array.isArray(forums) ? forums[0] : forums
            return forumObj && forumObj.is_graded === true
          }
          return true
        })
        .map((g: any) => ({
          lessonTitle: (Array.isArray(g.lessons) ? g.lessons[0] : g.lessons)?.title ?? 'Lección',
          gradeType: g.grade_type as LessonGradeType,
          grade: Number(g.grade ?? g.score ?? 0),
          maxGrade: Number(g.max_grade ?? 5)
        })),
      ...courseQuizAttempts.map((q: any) => {
        const quizObj = courseQuizzesList.find(cql => cql.id === q.quiz_id)
        const lessonObj = courseLessons.find(cl => cl.id === quizObj?.lesson_id)
        return {
          lessonTitle: lessonObj?.title ?? 'Quiz',
          gradeType: 'quiz' as LessonGradeType,
          grade: Number(q.score ?? 0),
          maxGrade: 5
        }
      })
    ]

    const allScores = lessonGrades.map(g => (g.grade / g.maxGrade) * 5)
    const finalGrade = allScores.length > 0
      ? Number((allScores.reduce((a, v) => a + v, 0) / allScores.length).toFixed(2))
      : null

    if (finalGrade !== null) { totalSum += finalGrade; totalCount++ }

    return {
      courseId: course.id,
      courseTitle: course.title,
      subject: course.subject,
      teacherName: course.teacherName,
      finalGrade,
      performanceLevel: finalGrade !== null ? calcPerformanceLevel(finalGrade) : null,
      lessonGrades
    }
  })

  const generalAverage = totalCount > 0 ? Number((totalSum / totalCount).toFixed(2)) : 0

  return {
    subjects,
    generalAverage,
    generalPerformanceLevel: calcPerformanceLevel(generalAverage)
  }
}

// ---------------------------------------------------------------------------
// 6. CONSOLIDATED GROUP GRADES (Admin view)
// ---------------------------------------------------------------------------

export async function getConsolidatedGroupGrades(
  gradeLevel: string,
  groupName: string,
  _periodId?: string
): Promise<ConsolidatedGradeRow[]> {
  const supabase = await createClient()
  const { data: { user }, error: authErrSession } = await supabase.auth.getUser()
  if (authErrSession || !user) throw new Error('No autorizado')

  const admin = createAdminClient()

  const { data: courses } = await admin
    .from('courses')
    .select('id, title, subject')
    .eq('grade_level', gradeLevel)
    .eq('group_name', groupName)

  if (!courses || courses.length === 0) return []

  const courseIds = courses.map(c => c.id)

  const { data: students } = await admin
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('grade_level', gradeLevel)
    .eq('group_name', groupName)
    .eq('status', 'active')
    .order('last_name', { ascending: true })

  if (!students || students.length === 0) return []

  const studentIds = students.map(s => s.id)

  const { data: allGrades } = await admin
    .from('student_lesson_grades')
    .select('student_id, course_id, grade, score, max_grade')
    .in('student_id', studentIds)
    .in('course_id', courseIds)

  // Find all modules of these courses
  const { data: modulesData } = await admin
    .from('course_modules')
    .select('id, course_id')
    .in('course_id', courseIds)

  const modules = modulesData || []
  const moduleIds = modules.map(m => m.id)
  
  let lessons: any[] = []
  let quizzesList: any[] = []
  let allQuizzesAttempts: any[] = []

  if (moduleIds.length > 0) {
    const { data: lessonsData } = await admin
      .from('lessons')
      .select('id, module_id')
      .in('module_id', moduleIds)
    lessons = lessonsData || []
    
    const lessonIds = lessons.map(l => l.id)
    if (lessonIds.length > 0) {
      const { data: quizzesData } = await admin
        .from('quizzes')
        .select('id, lesson_id')
        .in('lesson_id', lessonIds)
      quizzesList = quizzesData || []
      
      const quizIds = quizzesList.map(q => q.id)
      if (quizIds.length > 0) {
        const { data: attemptsData } = await admin
          .from('quiz_attempts')
          .select('student_id, quiz_id, score')
          .in('student_id', studentIds)
          .in('quiz_id', quizIds)
        allQuizzesAttempts = attemptsData || []
      }
    }
  }

  // Create mapping: quiz_id -> course_id
  const quizToCourseMap = new Map<string, string>()
  const moduleToCourse = new Map<string, string>(modules.map(m => [m.id, m.course_id]))
  const lessonToCourse = new Map<string, string>()
  lessons.forEach(l => {
    const cid = moduleToCourse.get(l.module_id)
    if (cid) lessonToCourse.set(l.id, cid)
  })
  quizzesList.forEach(q => {
    const cid = lessonToCourse.get(q.lesson_id)
    if (cid) quizToCourseMap.set(q.id, cid)
  })

  const allQuizzes = allQuizzesAttempts.map((q: any) => ({
    student_id: q.student_id,
    course_id: quizToCourseMap.get(q.quiz_id) || '',
    score: Number(q.score ?? 0),
    max_score: 5
  }))

  return students.map(s => {
    const courseGrades: Record<string, { finalGrade: number; performanceLevel: string }> = {}
    let sum = 0; let count = 0

    courses.forEach(c => {
      const grades = (allGrades || []).filter((g: any) => g.student_id === s.id && g.course_id === c.id)
      const quizzes = (allQuizzes || []).filter((q: any) => q.student_id === s.id && q.course_id === c.id)
      const scores = [
        ...grades.map((g: any) => (Number(g.grade ?? g.score ?? 0) / Number(g.max_grade ?? 5)) * 5),
        ...quizzes.map((q: any) => (Number(q.score ?? 0) / Number(q.max_score || 5)) * 5)
      ]
      const avg = scores.length > 0 ? Number((scores.reduce((a, v) => a + v, 0) / scores.length).toFixed(2)) : 0
      courseGrades[c.title] = { finalGrade: avg, performanceLevel: calcPerformanceLevel(avg) }
      if (scores.length > 0) { sum += avg; count++ }
    })

    const average = count > 0 ? Number((sum / count).toFixed(2)) : 0
    return {
      studentId: s.id,
      studentName: `${s.first_name} ${s.last_name}`,
      courseGrades,
      average,
      performanceLevel: calcPerformanceLevel(average)
    }
  })
}

// ---------------------------------------------------------------------------
// 7. GRADE AUDITS (kept for backward-compat, reads grade_audits table)
// ---------------------------------------------------------------------------

export async function getGradeAudits(filters?: {
  periodId?: string
  courseId?: string
}): Promise<GradeAuditRow[]> {
  const supabase = await createClient()
  const { data: { user }, error: authErrSession } = await supabase.auth.getUser()
  if (authErrSession || !user) throw new Error('No autorizado')

  const admin = createAdminClient()

  let query = admin
    .from('grade_audits')
    .select(`
      id, old_grade, new_grade, change_reason, created_at,
      student:profiles!student_id(first_name, last_name),
      teacher:profiles!teacher_id(first_name, last_name),
      courses(title),
      academic_periods(name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.periodId && filters.periodId !== 'all') {
    query = query.eq('academic_period_id', filters.periodId)
  }
  if (filters?.courseId && filters.courseId !== 'all') {
    query = query.eq('course_id', filters.courseId)
  }

  const { data, error } = await query.limit(100)
  if (error) { console.error('Error fetching grade audits:', error); return [] }

  return (data || []).map((row: any) => ({
    id: row.id,
    studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : 'Estudiante eliminado',
    courseTitle: row.courses ? row.courses.title : 'Curso eliminado',
    periodName: row.academic_periods ? row.academic_periods.name : 'Período eliminado',
    teacherName: row.teacher ? `${row.teacher.first_name} ${row.teacher.last_name}` : 'Docente/Admin',
    oldGrade: row.old_grade ? Number(row.old_grade) : null,
    newGrade: Number(row.new_grade),
    changeReason: row.change_reason,
    createdAt: new Date(row.created_at).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }))
}

// ---------------------------------------------------------------------------
// LEGACY COMPAT — kept so existing screens don't break while we migrate them
// ---------------------------------------------------------------------------
/** @deprecated Use saveLessonGrade instead */
export async function saveAchievementGrade(_data: {
  studentId: string; achievementId: string; grade: number; changeReason?: string
}) {
  return { error: 'Los logros académicos fueron eliminados. Usa saveLessonGrade.' }
}
/** @deprecated Use saveLessonGradesBatch instead */
export async function saveGradesBatch(_data: any) {
  return { error: 'Los logros académicos fueron eliminados. Usa saveLessonGradesBatch.' }
}
