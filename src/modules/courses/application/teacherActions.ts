'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'

export interface TeacherCourseStats {
  id: string
  title: string
  subject: string
  studentsCount: number
  modulesCount: number
  quizzesCount: number
  averageGrade: number
  activeStudents: number
  atRiskStudents: number
  chartData: { name: string; promedio: number }[]
}

export async function getTeacherCourseStats(courseId: string): Promise<TeacherCourseStats> {
  const supabase = createAdminClient()
  
  // 1. Fetch course details
  const { data: course, error } = await supabase
    .from('courses')
    .select('id, title, subject, grade_level, group_name')
    .eq('id', courseId)
    .single()

  if (error || !course) {
    console.error("Error fetching course stats details:", error)
    return {
      id: courseId,
      title: 'Desconocido',
      subject: 'Desconocido',
      studentsCount: 0,
      modulesCount: 0,
      quizzesCount: 0,
      averageGrade: 0,
      activeStudents: 0,
      atRiskStudents: 0,
      chartData: []
    }
  }

  // 2. Fetch modules count
  const { count: modulesCount } = await supabase
    .from('course_modules')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)

  // 3. Fetch quizzes count
  let quizzesCount = 0
  const { data: modules } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)
  
  if (modules && modules.length > 0) {
    const moduleIds = modules.map(m => m.id)
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds)
      
    if (lessons && lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id)
      const { count } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .in('lesson_id', lessonIds)
      
      quizzesCount = count || 0
    }
  }

  // 4. Fetch students count (matching student_courses with fallback to grade_level & group_name)
  let studentsCount = 0
  const { data: enrolledData, error: enrollErr } = await supabase
    .from('student_courses')
    .select('student_id')
    .eq('course_id', courseId)

  if (!enrollErr && enrolledData) {
    studentsCount = enrolledData.length
  }


  // 5. Fetch gradebook/performance metrics
  let activeStudents = studentsCount
  let atRiskStudents = 0
  let averageGrade = 0.0

  const { data: periodGrades } = await supabase
    .from('student_period_grades')
    .select('final_grade')
    .eq('course_id', courseId)

  if (periodGrades && periodGrades.length > 0) {
    const sum = periodGrades.reduce((acc, curr) => acc + Number(curr.final_grade), 0)
    averageGrade = sum / periodGrades.length
    
    activeStudents = periodGrades.filter(g => Number(g.final_grade) >= 3.0).length
    atRiskStudents = periodGrades.filter(g => Number(g.final_grade) < 3.0).length
  } else {
    // Try grades table
    const { data: stdGrades } = await supabase
      .from('grades')
      .select('score')
      .eq('course_id', courseId)
    
    if (stdGrades && stdGrades.length > 0) {
      const sum = stdGrades.reduce((acc, curr) => acc + Number(curr.score), 0)
      averageGrade = sum / stdGrades.length
    }
  }

  // 6. Fetch chart data from student_period_grades
  const chartData: { name: string; promedio: number }[] = []
  const { data: periodGradesWithPeriods } = await supabase
    .from('student_period_grades')
    .select('final_grade, academic_periods(name)')
    .eq('course_id', courseId)
    
  if (periodGradesWithPeriods && periodGradesWithPeriods.length > 0) {
    const periodMap: Record<string, { sum: number; count: number }> = {}
    periodGradesWithPeriods.forEach((pg: any) => {
      const pName = pg.academic_periods?.name || 'General'
      if (!periodMap[pName]) {
        periodMap[pName] = { sum: 0, count: 0 }
      }
      periodMap[pName].sum += Number(pg.final_grade)
      periodMap[pName].count++
    })
    
    Object.entries(periodMap).forEach(([name, val]) => {
      chartData.push({
        name,
        promedio: parseFloat((val.sum / val.count).toFixed(2))
      })
    })
  } else {
    // Fallback: Fetch real grades directly and group them dynamically by date/week
    const { data: stdGrades } = await supabase
      .from('grades')
      .select('score, created_at')
      .eq('course_id', courseId)
    
    if (stdGrades && stdGrades.length > 0) {
      const sorted = [...stdGrades].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      const dates = sorted.map(g => new Date(g.created_at).getTime())
      const minDate = Math.min(...dates)
      const maxDate = Math.max(...dates)
      const diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24)

      const grouped: Record<string, { sum: number; count: number }> = {}
      sorted.forEach(g => {
        const d = new Date(g.created_at)
        const key = diffDays > 60
          ? d.toLocaleDateString('es-ES', { month: 'short' })
          : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

        if (!grouped[key]) {
          grouped[key] = { sum: 0, count: 0 }
        }
        grouped[key].sum += Number(g.score)
        grouped[key].count++
      })

      Object.entries(grouped).forEach(([name, val]) => {
        chartData.push({
          name,
          promedio: parseFloat((val.sum / val.count).toFixed(2))
        })
      })
    }
  }

  return {
    id: courseId,
    title: course.title,
    subject: course.subject,
    studentsCount,
    modulesCount: modulesCount || 0,
    quizzesCount,
    averageGrade,
    activeStudents,
    atRiskStudents,
    chartData
  }
}

export interface CourseModule {
  id: string
  title: string
  order: number
  lessonsCount: number
  lessons: {
    id: string
    title: string
    type: 'video' | 'pdf' | 'quiz' | 'text' | 'link' | 'task' | 'forum'
    status?: 'active' | 'draft'
    duration?: string
    sort_order?: number
  }[]
}

export async function getCourseModules(courseId: string): Promise<CourseModule[]> {
  const supabase = createAdminClient()
  
  // 1. Fetch modules
  const { data: dbModules, error: mErr } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true })

  if (mErr || !dbModules) {
    console.error("Error fetching modules:", mErr)
    return []
  }

  const modulesWithLessons: CourseModule[] = []

  for (const m of dbModules) {
    // 2. Fetch lessons for this module
    const { data: dbLessons, error: lErr } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', m.id)
      .order('sort_order', { ascending: true })

    const lessonsList = []
    if (dbLessons) {
      for (const l of dbLessons) {
        // Determine type of lesson
        let type: 'video' | 'pdf' | 'quiz' | 'text' | 'task' = 'text'
        if (l.type) {
          type = l.type === 'reading' ? 'text' : (l.type as any)
        } else if (l.video_url) {
          type = 'video'
        } else {
          // Check if there is a quiz
          const { data: quiz } = await supabase
            .from('quizzes')
            .select('id')
            .eq('lesson_id', l.id)
            .maybeSingle()
          
          if (quiz) {
            type = 'quiz'
          }
        }
        
        lessonsList.push({
          id: l.id,
          title: l.title,
          type,
          status: 'active' as const,
          duration: l.video_url ? '10 min' : undefined,
          sort_order: l.sort_order || 0
        })
      }
    }

    // Fetch resources linked to this module
    const { data: dbModuleResources } = await supabase
      .from('resources')
      .select('*')
      .eq('module_id', m.id)

    if (dbModuleResources) {
      for (const r of dbModuleResources) {
        let resourceType: 'pdf' | 'link' | 'text' = 'pdf'
        const mime = r.mime_type?.toLowerCase() || ''
        if (mime.includes('pdf')) {
          resourceType = 'pdf'
        } else if (mime === 'url' || r.drive_url) {
          resourceType = 'link'
        } else {
          resourceType = 'text'
        }

        lessonsList.push({
          id: r.id,
          title: r.title,
          type: resourceType,
          status: 'active' as const,
          duration: r.file_size ? `${(r.file_size / 1024 / 1024).toFixed(1)} MB` : undefined,
          sort_order: (r as any).sort_order || 0
        })
      }
    }

    // Sort combined lessonsList by sort_order
    lessonsList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    modulesWithLessons.push({
      id: m.id,
      title: m.title,
      order: m.sort_order,
      lessonsCount: lessonsList.length,
      lessons: lessonsList
    })
  }

  return modulesWithLessons;
}

export interface CourseGradeCategory {
  id: string
  name: string
  weight: number
}

export interface CourseSettings {
  id: string
  title: string
  description: string
  status: 'active' | 'draft' | 'archived'
  categories: CourseGradeCategory[]
  joinCode: string
  joinEnabled: boolean
  requireTeacherApproval: boolean
}

export async function getCourseSettings(courseId: string): Promise<CourseSettings> {
  const supabase = createAdminClient()

  // Fetch course details
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, status, join_code, join_enabled, require_teacher_approval')
    .eq('id', courseId)
    .single()

  // Fetch grade categories
  const { data: categories } = await supabase
    .from('course_grade_categories')
    .select('id, name, weight')
    .eq('course_id', courseId)

  return {
    id: courseId,
    title: course?.title || 'Curso',
    description: course?.description || '',
    status: (course?.status as any) || 'active',
    joinCode: course?.join_code || '',
    joinEnabled: Boolean(course?.join_enabled),
    requireTeacherApproval: Boolean(course?.require_teacher_approval),
    categories: (categories || []).map(c => ({
      id: c.id,
      name: c.name,
      weight: Math.round(Number(c.weight) * 100)
    }))
  }
}

export async function saveCourseSettings(courseId: string, settings: Partial<CourseSettings>): Promise<void> {
  const supabase = createAdminClient()

  // 1. Update course details
  const courseUpdates: any = {}
  if (settings.title !== undefined) courseUpdates.title = settings.title
  if (settings.description !== undefined) courseUpdates.description = settings.description
  if (settings.status !== undefined) courseUpdates.status = settings.status
  if (settings.joinCode !== undefined) courseUpdates.join_code = settings.joinCode
  if (settings.joinEnabled !== undefined) courseUpdates.join_enabled = settings.joinEnabled
  if (settings.requireTeacherApproval !== undefined) courseUpdates.require_teacher_approval = settings.requireTeacherApproval

  if (Object.keys(courseUpdates).length > 0) {
    const { error } = await supabase
      .from('courses')
      .update(courseUpdates)
      .eq('id', courseId)
    if (error) console.error("Error updating course settings:", error)
  }

  // 2. Update grade categories if provided
  if (settings.categories) {
    // Delete existing categories
    const { error: delErr } = await supabase
      .from('course_grade_categories')
      .delete()
      .eq('course_id', courseId)
    
    if (delErr) {
      console.error("Error deleting grade categories:", delErr)
    }

    // Insert new categories
    const categoriesToInsert = settings.categories.map(c => ({
      course_id: courseId,
      name: c.name,
      weight: Number(c.weight) / 100
    }))

    if (categoriesToInsert.length > 0) {
      const { error: insErr } = await supabase
        .from('course_grade_categories')
        .insert(categoriesToInsert)
      if (insErr) console.error("Error inserting grade categories:", insErr)
    }
  }
}

export interface GradebookEntry {
  studentId: string
  studentName: string
  studentAvatar: string
  grades: Record<string, number>
  finalGrade: number
  progress?: number
}

export async function getCourseGradebook(courseId: string, categories: CourseGradeCategory[]): Promise<GradebookEntry[]> {
  const supabase = createAdminClient()

  // 1. Fetch course details to get grade_level & group_name
  const { data: course } = await supabase
    .from('courses')
    .select('grade_level, group_name')
    .eq('id', courseId)
    .single()

  if (!course) return []

  // 2. Fetch enrolled students (matching student_courses with fallback to grade_level & group_name)
  let students: any[] = []
  const { data: enrolledData, error: enrollErr } = await supabase
    .from('student_courses')
    .select('student_id')
    .eq('course_id', courseId)

  if (!enrollErr && enrolledData && enrolledData.length > 0) {
    const studentIds = enrolledData.map(e => e.student_id)
    const { data, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, roles!inner(name)')
      .eq('roles.name', 'student')
      .in('id', studentIds)
    if (!profilesErr && data) {
      students = data
    }
  }

  // (Se ha eliminado la lógica de fallback por grade_level)

  // Fetch grades
  const { data: dbGrades } = await supabase
    .from('grades')
    .select('student_id, category_id, score')
    .eq('course_id', courseId)

  // Map database grades to a lookup map: studentId -> categoryId -> score
  const gradesMap: Record<string, Record<string, number>> = {}
  dbGrades?.forEach(g => {
    if (!gradesMap[g.student_id]) {
      gradesMap[g.student_id] = {}
    }
    gradesMap[g.student_id][g.category_id] = Number(g.score)
  })

  // Fetch progress to compute progress percentage
  // a. Get modules
  const { data: dbModules } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)
  const moduleIds = dbModules?.map(m => m.id) || []

  // b. Get lessons & resources
  let lessonsCount = 0
  let dbLessons: any[] = []
  let resourcesCount = 0
  let dbResources: any[] = []

  if (moduleIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds)
    dbLessons = lessonsData || []
    lessonsCount = dbLessons.length

    const { data: resourcesData } = await supabase
      .from('resources')
      .select('id')
      .in('module_id', moduleIds)
    dbResources = resourcesData || []
    resourcesCount = dbResources.length
  }

  // c. Fetch progress for all enrolled students in this course (lessons + resources)
  let progressData: any[] = []
  if (dbLessons.length > 0 && students.length > 0) {
    const lessonIds = dbLessons.map(l => l.id)
    const studentIds = students.map(s => s.id)
    const { data } = await supabase
      .from('student_progress')
      .select('student_id, lesson_id')
      .eq('completed', true)
      .in('student_id', studentIds)
      .in('lesson_id', lessonIds)
    progressData = data || []
  }

  let progressResourcesData: any[] = []
  if (dbResources.length > 0 && students.length > 0) {
    const resourceIds = dbResources.map(r => r.id)
    const studentIds = students.map(s => s.id)
    const { data } = await supabase
      .from('student_resource_progress')
      .select('student_id, resource_id')
      .eq('completed', true)
      .in('student_id', studentIds)
      .in('resource_id', resourceIds)
    progressResourcesData = data || []
  }

  const completedCountMap: Record<string, number> = {}
  progressData.forEach(p => {
    completedCountMap[p.student_id] = (completedCountMap[p.student_id] || 0) + 1
  })
  progressResourcesData.forEach(p => {
    completedCountMap[p.student_id] = (completedCountMap[p.student_id] || 0) + 1
  })

  // 3. Build gradebook entries
  return students.map(student => {
    const studentGrades = gradesMap[student.id] || {}
    
    // Calculate final grade based on categories weight
    let weightedSum = 0
    let totalWeight = 0
    
    categories.forEach(cat => {
      const score = studentGrades[cat.id]
      if (score !== undefined) {
        weightedSum += score * (cat.weight / 100)
        totalWeight += (cat.weight / 100)
      }
    })
    
    const finalGrade = totalWeight > 0 ? (weightedSum / totalWeight) : 0.0
    const totalItems = lessonsCount + resourcesCount
    const progress = totalItems > 0 ? Math.min(100, Math.round(((completedCountMap[student.id] || 0) / totalItems) * 100)) : 0

    return {
      studentId: student.id,
      studentName: `${student.first_name} ${student.last_name}`,
      studentAvatar: student.avatar_url || '',
      grades: studentGrades,
      finalGrade: parseFloat(finalGrade.toFixed(2)),
      progress
    }
  })
}

export interface CourseStudent {
  id: string
  name: string
  email: string
  status: 'active' | 'at_risk'
  attendance: string
  avatar: string
  progress?: number
}

export async function getCourseStudents(courseId: string): Promise<CourseStudent[]> {
  const supabase = createAdminClient()
  
  // 1. Fetch course details to get grade_level & group_name
  const { data: course } = await supabase
    .from('courses')
    .select('grade_level, group_name')
    .eq('id', courseId)
    .single()

  if (!course) return []

  // 2. Fetch enrolled students (matching student_courses with fallback to grade_level & group_name)
  let dbStudents: any[] = []
  const { data: enrolledData, error: enrollErr } = await supabase
    .from('student_courses')
    .select('student_id')
    .eq('course_id', courseId)

  if (!enrollErr && enrolledData && enrolledData.length > 0) {
    const studentIds = enrolledData.map(e => e.student_id)
    const { data, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, roles!inner(name)')
      .eq('roles.name', 'student')
      .in('id', studentIds)
    if (!profilesErr && data) {
      dbStudents = data
    }
  }

  if (dbStudents.length === 0 && course.grade_level) {
    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, roles!inner(name)')
      .eq('roles.name', 'student')
      .eq('grade_level', course.grade_level)

    if (course.group_name) {
      query = query.eq('group_name', course.group_name)
    }

    const { data: fallbackData } = await query
    if (fallbackData) {
      dbStudents = fallbackData
    }
  }

  // Fetch grades to determine if at risk
  const { data: periodGrades } = await supabase
    .from('student_period_grades')
    .select('student_id, final_grade')
    .eq('course_id', courseId)

  const gradesMap: Record<string, number> = {}
  periodGrades?.forEach(g => {
    gradesMap[g.student_id] = Number(g.final_grade)
  })

  // Fetch progress to compute progress percentage
  // a. Get modules
  const { data: dbModules } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)
  const moduleIds = dbModules?.map(m => m.id) || []

  // b. Get lessons & resources
  let lessonsCount = 0
  let dbLessons: any[] = []
  let resourcesCount = 0
  let dbResources: any[] = []

  if (moduleIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds)
    dbLessons = lessonsData || []
    lessonsCount = dbLessons.length

    const { data: resourcesData } = await supabase
      .from('resources')
      .select('id')
      .in('module_id', moduleIds)
    dbResources = resourcesData || []
    resourcesCount = dbResources.length
  }

  // c. Fetch progress for all enrolled students (lessons + resources)
  let progressData: any[] = []
  if (dbLessons.length > 0 && dbStudents.length > 0) {
    const lessonIds = dbLessons.map(l => l.id)
    const studentIds = dbStudents.map(s => s.id)
    const { data } = await supabase
      .from('student_progress')
      .select('student_id, lesson_id')
      .eq('completed', true)
      .in('student_id', studentIds)
      .in('lesson_id', lessonIds)
    progressData = data || []
  }

  let progressResourcesData: any[] = []
  if (dbResources.length > 0 && dbStudents.length > 0) {
    const resourceIds = dbResources.map(r => r.id)
    const studentIds = dbStudents.map(s => s.id)
    const { data } = await supabase
      .from('student_resource_progress')
      .select('student_id, resource_id')
      .eq('completed', true)
      .in('student_id', studentIds)
      .in('resource_id', resourceIds)
    progressResourcesData = data || []
  }

  const completedCountMap: Record<string, number> = {}
  progressData.forEach(p => {
    completedCountMap[p.student_id] = (completedCountMap[p.student_id] || 0) + 1
  })
  progressResourcesData.forEach(p => {
    completedCountMap[p.student_id] = (completedCountMap[p.student_id] || 0) + 1
  })

  return dbStudents.map(student => {
    const finalGrade = gradesMap[student.id]
    const status = finalGrade !== undefined && finalGrade < 3.0 ? 'at_risk' : 'active'
    
    const cleanFirstName = (student.first_name || 'estudiante').toLowerCase().replace(/\s+/g, '')
    const cleanLastName = (student.last_name || 'nuevo').toLowerCase().replace(/\s+/g, '')
    const email = `${cleanFirstName}.${cleanLastName}@estudiante.ensuny.edu.co`
    const totalItems = lessonsCount + resourcesCount
    const progress = totalItems > 0 ? Math.min(100, Math.round(((completedCountMap[student.id] || 0) / totalItems) * 100)) : 0

    return {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      email,
      status,
      attendance: '95%',
      avatar: student.avatar_url || '',
      progress
    }
  })
}

export async function getCourseStudentsCount(courseId: string): Promise<number> {
  const students = await getCourseStudents(courseId)
  return students.length
}

export async function getTeacherSubmissionsData(courseId: string) {
  const supabase = createAdminClient()

  // 1. Fetch modules
  const { data: dbModules } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)

  if (!dbModules || dbModules.length === 0) {
    return { quizzes: [], taskLessons: [], quizAttempts: [], progressData: [], gradesData: [] }
  }

  const moduleIds = dbModules.map(m => m.id)

  // 2. Fetch lessons
  const { data: dbLessons } = await supabase
    .from('lessons')
    .select('id, title, type')
    .in('module_id', moduleIds)

  if (!dbLessons || dbLessons.length === 0) {
    return { quizzes: [], taskLessons: [], quizAttempts: [], progressData: [], gradesData: [] }
  }

  const lessonIds = dbLessons.map(l => l.id)

  // 3. Fetch quizzes
  const { data: dbQuizzes } = await supabase
    .from('quizzes')
    .select('id, title, lesson_id')
    .in('lesson_id', lessonIds)

  const quizzes = dbQuizzes || []

  // 4. Filter task lessons
  const taskLessons = (dbLessons || []).filter(l => {
    if (l.type === 'task') return true
    const titleLower = (l.title || '').toLowerCase()
    return titleLower.includes('tarea') || titleLower.includes('taller') || titleLower.includes('proyecto') || titleLower.includes('ensayo') || titleLower.includes('entrega')
  })

  // 5. Fetch quiz attempts (bypassing RLS)
  let quizAttempts: any[] = []
  if (quizzes.length > 0) {
    const quizIds = quizzes.map(q => q.id)
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .in('quiz_id', quizIds)
    quizAttempts = attempts || []
  }

  // 6. Fetch student progress for task lessons (bypassing RLS)
  let progressData: any[] = []
  if (taskLessons.length > 0) {
    const taskLessonIds = taskLessons.map(t => t.id)
    try {
      const { data: progress, error: progErr } = await supabase
        .from('student_progress')
        .select('id, student_id, lesson_id, completed, completed_at, created_at, submission_text')
        .in('lesson_id', taskLessonIds)
        .eq('completed', true)
      
      if (progErr) {
        console.warn('Could not select submission_text in server action, falling back:', progErr.message)
        const { data: progressFallback } = await supabase
          .from('student_progress')
          .select('id, student_id, lesson_id, completed, completed_at, created_at')
          .in('lesson_id', taskLessonIds)
          .eq('completed', true)
        progressData = progressFallback || []
      } else {
        progressData = progress || []
      }
    } catch (e) {
      console.error('Error fetching student progress in server action:', e)
    }
  }

  // 7. Fetch grades (bypassing RLS)
  const { data: gradesData } = await supabase
    .from('grades')
    .select('*')
    .eq('course_id', courseId)

  return {
    quizzes,
    taskLessons,
    quizAttempts,
    progressData,
    gradesData: gradesData || []
  }
}

export async function updateModuleItemsOrder(moduleId: string, items: { id: string }[]): Promise<void> {
  const supabase = createAdminClient()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const sortOrder = i + 1

    // 1. Try updating lessons table
    const { data: lessonData, error: lessonErr } = await supabase
      .from('lessons')
      .update({ sort_order: sortOrder })
      .eq('id', item.id)
      .select('id')

    if (lessonErr) {
      console.error(`Error updating lesson ${item.id} order:`, lessonErr)
    }

    // 2. If no lesson rows were updated, try updating resources table
    if (!lessonData || lessonData.length === 0) {
      const { error: resourceErr } = await supabase
        .from('resources')
        .update({ sort_order: sortOrder })
        .eq('id', item.id)

      if (resourceErr) {
        console.error(`Error updating resource ${item.id} order:`, resourceErr)
      }
    }
  }
}


