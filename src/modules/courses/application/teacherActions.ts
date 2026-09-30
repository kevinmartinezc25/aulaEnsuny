'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'

export async function getCourseIdBySlug(slugOrId: string): Promise<string | null> {
  if (!slugOrId || slugOrId === 'undefined' || slugOrId === 'null') return null

  const supabase = createAdminClient()
  const raw = String(slugOrId).trim()
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  
  // First, check if the string itself is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(raw)) {
    return raw
  }
  if (uuidRegex.test(decoded)) {
    return decoded
  }

  // Check by slug with exact match
  const { data: exactSlug } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', raw)
    .maybeSingle()

  if (exactSlug?.id) return exactSlug.id

  if (decoded !== raw) {
    const { data: decodedSlug } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', decoded)
      .maybeSingle()

    if (decodedSlug?.id) return decodedSlug.id
  }

  // Case-insensitive match on slug
  const { data: ilikeSlug } = await supabase
    .from('courses')
    .select('id')
    .ilike('slug', decoded)
    .maybeSingle()

  if (ilikeSlug?.id) return ilikeSlug.id

  // Also check if id directly matches
  const { data: byId } = await supabase
    .from('courses')
    .select('id')
    .eq('id', raw)
    .maybeSingle()

  return byId?.id || null
}

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
    // Try student_lesson_grades table
    const { data: stdGrades } = await supabase
      .from('student_lesson_grades')
      .select('grade, student_id')
      .eq('course_id', courseId)
    
    if (stdGrades && stdGrades.length > 0) {
      const sum = stdGrades.reduce((acc, curr) => acc + Number(curr.grade), 0)
      averageGrade = sum / stdGrades.length

      // Group by student to find pass/fail count
      const studentAverages: Record<string, { sum: number, count: number }> = {}
      stdGrades.forEach(g => {
        if (!studentAverages[g.student_id]) {
          studentAverages[g.student_id] = { sum: 0, count: 0 }
        }
        studentAverages[g.student_id].sum += Number(g.grade)
        studentAverages[g.student_id].count++
      })

      let approved = 0
      let atRisk = 0
      
      Object.values(studentAverages).forEach(student => {
        const avg = student.sum / student.count
        if (avg >= 3.0) approved++
        else atRisk++
      })
      
      // If some students have no grades, they are not counted in approved or atRisk yet, or we can count them as atRisk/unassessed.
      // We will only count students with grades for the risk metric, or consider unassessed as active.
      // Usually, it's better to show only assessed students, but to keep the bar full we can scale.
      activeStudents = approved
      atRiskStudents = atRisk
    } else {
      activeStudents = 0
      atRiskStudents = 0
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
      .from('student_lesson_grades')
      .select('grade, updated_at')
      .eq('course_id', courseId)
    
    if (stdGrades && stdGrades.length > 0) {
      const sorted = [...stdGrades].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
      
      const dates = sorted.map(g => new Date(g.updated_at).getTime())
      const minDate = Math.min(...dates)
      const maxDate = Math.max(...dates)
      const diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24)

      const grouped: Record<string, { sum: number; count: number }> = {}
      sorted.forEach(g => {
        const d = new Date(g.updated_at)
        const key = diffDays > 60
          ? d.toLocaleDateString('es-ES', { month: 'short' })
          : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

        if (!grouped[key]) {
          grouped[key] = { sum: 0, count: 0 }
        }
        grouped[key].sum += Number(g.grade)
        grouped[key].count++
      })

      Object.entries(grouped).forEach(([name, val]) => {
        chartData.push({
          name,
          promedio: parseFloat((val.sum / val.count).toFixed(2))
        })
      })
      
      // If there's only 1 point, Recharts area chart won't draw a line/area properly
      if (chartData.length === 1) {
        chartData.unshift({
          name: 'Inicio',
          promedio: chartData[0].promedio
        })
      }
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
    created_at?: string
    due_date?: string
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
          sort_order: l.sort_order || 0,
          created_at: l.created_at || undefined,
          due_date: l.due_date || undefined
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
          sort_order: (r as any).sort_order || 0,
          created_at: r.created_at || undefined
        })
      }
    }

    // Deduplicate lessons by ID to prevent duplicate React keys or duplicate records
    const seenLessonIds = new Set<string>()
    const uniqueLessonsList: any[] = []
    for (const item of lessonsList) {
      if (!seenLessonIds.has(item.id)) {
        seenLessonIds.add(item.id)
        uniqueLessonsList.push(item)
      }
    }

    // Sort combined lessonsList by sort_order
    uniqueLessonsList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    modulesWithLessons.push({
      id: m.id,
      title: m.title,
      order: m.sort_order,
      lessonsCount: uniqueLessonsList.length,
      lessons: uniqueLessonsList
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
  subject?: string
  weeklyHours?: number
  academicPeriod?: string
  academicYear?: string
  teacherName?: string
}

export async function getCourseSettings(courseId: string): Promise<CourseSettings> {
  const supabase = createAdminClient()

  // Fetch course details with teacher info
  const { data: course, error: selectErr } = await supabase
    .from('courses')
    .select(`
      id, title, description, join_code, join_enabled, require_teacher_approval,
      subject, weekly_hours, academic_period, academic_year,
      profiles!courses_teacher_id_fkey (first_name, last_name)
    `)
    .eq('id', courseId)
    .single()

  if (selectErr) {
    console.error("Error fetching course settings:", selectErr)
  }

  // Extract teacher name if available
  const profiles = course?.profiles as any
  const teacherName = profiles ? `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim() : ''

  // Fetch grade categories
  const { data: categories } = await supabase
    .from('course_grade_categories')
    .select('id, name, weight')
    .eq('course_id', courseId)

  return {
    id: courseId,
    title: course?.title || 'Curso',
    description: course?.description || '',
    status: ((course as any)?.status as any) || 'active',
    joinCode: course?.join_code || '',
    joinEnabled: Boolean(course?.join_enabled),
    requireTeacherApproval: Boolean(course?.require_teacher_approval),
    subject: course?.subject,
    weeklyHours: course?.weekly_hours,
    academicPeriod: course?.academic_period,
    academicYear: course?.academic_year,
    teacherName: teacherName || 'Docente',
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
  if (settings.joinCode !== undefined) {
    // If joinCode is empty, set it to null to avoid unique constraint violation on empty strings
    courseUpdates.join_code = settings.joinCode.trim() === '' ? null : settings.joinCode.trim()
  }
  if (settings.joinEnabled !== undefined) courseUpdates.join_enabled = settings.joinEnabled
  if (settings.requireTeacherApproval !== undefined) courseUpdates.require_teacher_approval = settings.requireTeacherApproval
  if (settings.subject !== undefined) courseUpdates.subject = settings.subject
  if (settings.weeklyHours !== undefined) courseUpdates.weekly_hours = settings.weeklyHours
  if (settings.academicPeriod !== undefined) courseUpdates.academic_period = settings.academicPeriod
  if (settings.academicYear !== undefined) courseUpdates.academic_year = settings.academicYear

  if (Object.keys(courseUpdates).length > 0) {
    const { error } = await supabase
      .from('courses')
      .update(courseUpdates)
      .eq('id', courseId)
    if (error) {
      console.error("Error updating course settings:", error)
      throw new Error(`Error updating course settings: ${error.message}`)
    }
  }

  // 2. Update grade categories if provided
  if (settings.categories) {
    const incomingCategories = settings.categories;

    // Filter categories that have a valid UUID (existing ones) vs new ones (e.g. starts with 'cat_new_')
    const existingIds = incomingCategories
      .filter(c => !c.id.startsWith('cat_new_'))
      .map(c => c.id);

    // Fetch current categories in the database
    const { data: currentCategories } = await supabase
      .from('course_grade_categories')
      .select('id')
      .eq('course_id', courseId);

    // Identify which IDs are in the database but NO LONGER in the incoming list
    const currentIds = (currentCategories || []).map(c => c.id);
    const idsToDelete = currentIds.filter(id => !existingIds.includes(id));

    // Delete categories that are no longer in the list
    if (idsToDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('course_grade_categories')
        .delete()
        .in('id', idsToDelete);
        
      if (delErr) {
        console.error("Error deleting grade categories:", delErr);
        throw new Error(`Error deleting grade categories: ${delErr.message}`);
      }
    }

    // Upsert categories
    const categoriesToUpsert = incomingCategories.map(c => {
      const isNew = c.id.startsWith('cat_new_');
      return {
        ...(isNew ? {} : { id: c.id }), // Include id only for existing ones
        course_id: courseId,
        name: c.name,
        weight: Number(c.weight) / 100
      };
    });

    if (categoriesToUpsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from('course_grade_categories')
        .upsert(categoriesToUpsert, { onConflict: 'id' });
      if (upsertErr) {
        console.error("Error upserting grade categories:", upsertErr);
        throw new Error(`Error inserting/updating grade categories: ${upsertErr.message}`);
      }
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
  firstName?: string
  lastName?: string
  email: string
  status: 'completed' | 'in_progress' | 'pending' | 'at_risk'
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

  // Fetch user emails from auth
  const { data: authData } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  })
  const authUsers = authData?.users || []

  return dbStudents.map(student => {
    const finalGrade = gradesMap[student.id]
    const isAtRisk = finalGrade !== undefined && finalGrade < 3.0
    
    const totalItems = lessonsCount + resourcesCount
    const progress = totalItems > 0 ? Math.min(100, Math.round(((completedCountMap[student.id] || 0) / totalItems) * 100)) : 0

    let status: 'completed' | 'in_progress' | 'pending' | 'at_risk' = 'pending'
    if (progress === 100) {
      status = 'completed'
    } else if (progress > 0) {
      status = 'in_progress'
    }

    if (isAtRisk) {
      status = 'at_risk'
    }
    
    const authUser = authUsers.find(u => u.id === student.id)
    const email = authUser?.email || (student as any).email || 'sin-correo@ensuny.edu.co'

    return {
      id: student.id,
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      firstName: student.first_name || '',
      lastName: student.last_name || '',
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

export async function updateModulesOrder(courseId: string, modulesData: { id: string }[]): Promise<void> {
  const adminClient = createAdminClient()

  for (let i = 0; i < modulesData.length; i++) {
    const mod = modulesData[i]
    if (mod.id.startsWith('mod_')) continue // mock
    const sortOrder = i + 1

    await adminClient
      .from('course_modules')
      .update({ sort_order: sortOrder })
      .eq('id', mod.id)
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

export async function createCourseModule(
  courseId: string,
  title: string,
  sortOrder: number
): Promise<{ id: string; title: string; sort_order: number }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('course_modules')
    .insert({ course_id: courseId, title, sort_order: sortOrder })
    .select('id, title, sort_order')
    .single()

  if (error || !data) {
    console.error('Error creating module in server action:', error)
    throw new Error(error?.message || 'Error al crear el módulo')
  }

  return data
}

export async function deleteCourseModule(moduleId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('course_modules')
    .delete()
    .eq('id', moduleId)

  if (error) {
    console.error('Error deleting module in server action:', error)
    throw new Error(error.message)
  }
}

export async function updateCourseModuleTitle(moduleId: string, title: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('course_modules')
    .update({ title })
    .eq('id', moduleId)

  if (error) {
    console.error('Error updating module title in server action:', error)
    throw new Error(error.message)
  }
}

export async function deleteModuleItem(itemId: string): Promise<{ type: 'lesson' | 'resource' }> {
  const supabase = createAdminClient()

  // 1. Verificar si es una lección
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', itemId)
    .maybeSingle()

  if (lesson) {
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('Error deleting lesson in server action:', error)
      throw new Error(error.message)
    }
    return { type: 'lesson' }
  }

  // 2. Si no es lección, es un recurso: desvincular del módulo (module_id = null)
  const { error: resErr } = await supabase
    .from('resources')
    .update({ module_id: null })
    .eq('id', itemId)

  if (resErr) {
    console.error('Error unlinking resource in server action:', resErr)
    throw new Error(resErr.message)
  }

  return { type: 'resource' }
}

export async function linkQuizToModule(
  moduleId: string,
  quizId: string,
  sortOrder: number
): Promise<{ lessonId: string; title: string; duration?: string }> {
  const supabase = createAdminClient()

  const { data: dbQuiz, error: qErr } = await supabase
    .from('quizzes')
    .select('id, title, duration_minutes, lesson_id')
    .eq('id', quizId)
    .single()

  if (qErr || !dbQuiz) {
    throw new Error(qErr?.message || 'Quiz no encontrado')
  }

  let lessonId = dbQuiz.lesson_id

  if (lessonId) {
    const { error } = await supabase
      .from('lessons')
      .update({
        module_id: moduleId,
        sort_order: sortOrder,
      })
      .eq('id', lessonId)

    if (error) throw new Error(error.message)
  } else {
    const { data: newLesson, error: lErr } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: dbQuiz.title,
        type: 'quiz',
        sort_order: sortOrder,
      })
      .select('id')
      .single()

    if (lErr || !newLesson) throw new Error(lErr?.message || 'Error creando lección para quiz')
    lessonId = newLesson.id

    const { error: updErr } = await supabase
      .from('quizzes')
      .update({ lesson_id: lessonId })
      .eq('id', quizId)

    if (updErr) throw new Error(updErr.message)
  }

  return {
    lessonId,
    title: dbQuiz.title,
    duration: dbQuiz.duration_minutes ? `${dbQuiz.duration_minutes} min` : undefined,
  }
}

export async function linkResourceToModule(
  moduleId: string,
  resourceId: string,
  sortOrder: number
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('resources')
    .update({
      module_id: moduleId,
      sort_order: sortOrder,
    })
    .eq('id', resourceId)

  if (error) {
    console.error('Error linking resource in server action:', error)
    throw new Error(error.message)
  }
}

export async function linkForumToModule(
  moduleId: string,
  forumId: string,
  sortOrder: number
): Promise<{ lessonId: string; title: string }> {
  const supabase = createAdminClient()

  // Note: forums table does not have 'title', it references 'lessons' table
  const { data: dbForum, error: fErr } = await supabase
    .from('forums')
    .select('id, lesson_id, lessons(id, title)')
    .eq('id', forumId)
    .maybeSingle()

  if (fErr || !dbForum) {
    console.error('Error fetching forum in linkForumToModule:', fErr)
    throw new Error(fErr?.message || 'Foro no encontrado')
  }

  const lessonObj = Array.isArray(dbForum.lessons) ? dbForum.lessons[0] : dbForum.lessons
  const forumTitle = lessonObj?.title || 'Foro de debate'

  let lessonId = dbForum.lesson_id

  if (lessonId) {
    const { error } = await supabase
      .from('lessons')
      .update({
        module_id: moduleId,
        sort_order: sortOrder,
      })
      .eq('id', lessonId)

    if (error) {
      console.error('Error updating lesson module_id in linkForumToModule:', error)
      throw new Error(error.message)
    }
  } else {
    const { data: newLesson, error: lErr } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: forumTitle,
        type: 'forum',
        sort_order: sortOrder,
      })
      .select('id, title')
      .single()

    if (lErr || !newLesson) {
      console.error('Error creating lesson for forum in linkForumToModule:', lErr)
      throw new Error(lErr?.message || 'Error creando lección para foro')
    }
    lessonId = newLesson.id

    const { error: updErr } = await supabase
      .from('forums')
      .update({ lesson_id: lessonId })
      .eq('id', forumId)

    if (updErr) {
      console.error('Error updating forum lesson_id in linkForumToModule:', updErr)
      throw new Error(updErr.message)
    }
  }

  return {
    lessonId,
    title: forumTitle,
  }
}

export async function getCourseLinkableItems(courseId: string) {
  const supabase = createAdminClient()

  // 1. Quizzes y foros a través de las lecciones de los módulos del curso
  const { data: dbModules } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)

  let quizzes: { id: string; title: string; duration: string; status: string }[] = []
  let forums: { id: string; name: string; type: string }[] = []

  if (dbModules && dbModules.length > 0) {
    const mIds = dbModules.map(m => m.id)
    const { data: dbLessons } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', mIds)

    if (dbLessons && dbLessons.length > 0) {
      const lIds = dbLessons.map(l => l.id)
      const { data: dbQuizzes } = await supabase
        .from('quizzes')
        .select('id, title, duration_minutes')
        .in('lesson_id', lIds)

      if (dbQuizzes) {
        quizzes = dbQuizzes.map(q => ({
          id: q.id,
          title: q.title,
          duration: q.duration_minutes ? `${q.duration_minutes} min` : 'Sin límite',
          status: 'active'
        }))
      }

      const { data: dbForums } = await supabase
        .from('forums')
        .select('id, lessons(title)')
        .in('lesson_id', lIds)

      if (dbForums) {
        forums = dbForums.map((f: any) => {
          const lObj = Array.isArray(f.lessons) ? f.lessons[0] : f.lessons
          return {
            id: f.id,
            name: lObj?.title || 'Foro de Discusión',
            type: 'forum'
          }
        })
      }
    }
  }

  // 2. Resources del curso
  const { data: dbResources } = await supabase
    .from('resources')
    .select('id, title, file_size, mime_type')
    .eq('course_id', courseId)

  let resources: { id: string; name: string; type: 'pdf' | 'doc' | 'link'; size: string }[] = []
  if (dbResources) {
    resources = dbResources.map(r => {
      let resourceType: 'pdf' | 'doc' | 'link' = 'doc'
      const mime = r.mime_type?.toLowerCase() || ''
      if (mime.includes('pdf')) {
        resourceType = 'pdf'
      } else if (mime === 'url' || mime === 'link') {
        resourceType = 'link'
      }

      return {
        id: r.id,
        name: r.title,
        type: resourceType,
        size: r.file_size ? `${(r.file_size / 1024 / 1024).toFixed(1)} MB` : 'Enlace Web'
      }
    })
  }

  return { quizzes, forums, resources }
}

export async function getLessonQuizOrForumRedirect(lessonId: string): Promise<{ quizId?: string; forumId?: string }> {
  const supabase = createAdminClient()

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (quiz) {
    return { quizId: quiz.id }
  }

  const { data: forum } = await supabase
    .from('forums')
    .select('id')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (forum) {
    return { forumId: forum.id }
  }

  return {}
}

export interface TeacherDashboardCourse {
  id: string
  slug: string
  title: string
  subject: string
  gradeLevel: string | null
  description: string | null
  studentsCount: number
  modulesCount: number
  joinCode: string
}

export interface TeacherDashboardOverviewResult {
  courses: TeacherDashboardCourse[]
  stats: {
    coursesCount: number
    studentsCount: number
    quizzesCount: number
    avgGrade: string
  }
}

export async function getTeacherDashboardOverview(): Promise<TeacherDashboardOverviewResult> {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return {
        courses: [],
        stats: { coursesCount: 0, studentsCount: 0, quizzesCount: 0, avgGrade: '—' }
      }
    }

    const adminClient = createAdminClient()

    // 1. Obtener identificadores posibles del docente (profile_id y academic_teachers.id)
    const { data: acTeacher } = await adminClient
      .from('academic_teachers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    const teacherIds = Array.from(new Set([user.id, acTeacher?.id])).filter(Boolean) as string[]

    // 2. Consultar asignaturas reales asignadas/creadas por el docente
    const { data: dbCourses, error: coursesErr } = await adminClient
      .from('courses')
      .select('id, title, slug, description, subject, grade_level, group_name, join_code, status, created_at')
      .in('teacher_id', teacherIds)
      .order('created_at', { ascending: false })

    if (coursesErr) {
      console.error('Error fetching teacher courses:', coursesErr)
    }

    if (!dbCourses || dbCourses.length === 0) {
      return {
        courses: [],
        stats: { coursesCount: 0, studentsCount: 0, quizzesCount: 0, avgGrade: '—' }
      }
    }

    const courseIds = dbCourses.map(c => c.id)

    // Parallelize independent queries
    const [
      { data: modules },
      { data: enrollments },
      { data: periodGrades },
      { data: regularGrades }
    ] = await Promise.all([
      adminClient.from('course_modules').select('id, course_id').in('course_id', courseIds),
      adminClient.from('student_courses').select('student_id, course_id').in('course_id', courseIds),
      adminClient.from('student_period_grades').select('final_grade').in('course_id', courseIds),
      adminClient.from('grades').select('score').in('course_id', courseIds)
    ])

    const distinctStudents = new Set((enrollments || []).map(e => e.student_id)).size

    // Quizzes creados o evaluados (dependen de los módulos)
    let quizzesCount = 0
    const moduleIds = (modules || []).map(m => m.id)
    if (moduleIds.length > 0) {
      const { data: lessons } = await adminClient
        .from('lessons')
        .select('id')
        .in('module_id', moduleIds)

      const lessonIds = (lessons || []).map(l => l.id)
      if (lessonIds.length > 0) {
        const { data: quizzesList } = await adminClient
          .from('quizzes')
          .select('id')
          .in('lesson_id', lessonIds)

        const quizIds = (quizzesList || []).map(q => q.id)
        if (quizIds.length > 0) {
          const { count: attemptsCount } = await adminClient
            .from('quiz_attempts')
            .select('*', { count: 'exact', head: true })
            .in('quiz_id', quizIds)

          quizzesCount = (attemptsCount && attemptsCount > 0) ? attemptsCount : quizIds.length
        }
      }
    }

    // Rendimiento promedio real
    let totalGradeSum = 0
    let totalGradeCount = 0

    if (periodGrades && periodGrades.length > 0) {
      for (const g of periodGrades) {
        const num = Number(g.final_grade)
        if (!isNaN(num) && num > 0) {
          totalGradeSum += num
          totalGradeCount++
        }
      }
    }

    if (totalGradeCount === 0 && regularGrades && regularGrades.length > 0) {
      for (const g of regularGrades) {
        const num = Number(g.score)
        if (!isNaN(num) && num > 0) {
          totalGradeSum += num
          totalGradeCount++
        }
      }
    }

    const avgGrade = totalGradeCount > 0
      ? `${(totalGradeSum / totalGradeCount).toFixed(1)} / 5.0`
      : '—'

    // 7. Mapear cursos para la interfaz
    const mappedCourses: TeacherDashboardCourse[] = dbCourses.map(c => {
      const courseStudents = (enrollments || []).filter(e => e.course_id === c.id).length
      const courseModules = (modules || []).filter(m => m.course_id === c.id).length

      return {
        id: c.id,
        slug: c.slug || c.id,
        title: c.title,
        subject: c.subject || 'General',
        gradeLevel: c.grade_level || null,
        description: c.description || null,
        studentsCount: courseStudents,
        modulesCount: courseModules,
        joinCode: c.join_code || ''
      }
    })

    return {
      courses: mappedCourses,
      stats: {
        coursesCount: mappedCourses.length,
        studentsCount: distinctStudents || (enrollments?.length ?? 0),
        quizzesCount,
        avgGrade
      }
    }
  } catch (error) {
    console.error('Error in getTeacherDashboardOverview:', error)
    return {
      courses: [],
      stats: { coursesCount: 0, studentsCount: 0, quizzesCount: 0, avgGrade: '—' }
    }
  }
}

export async function getTeacherTodaySchedule(userId: string): Promise<{ schedule: any[], nextClass: any | null, isWeekend: boolean }> {
  try {
    const adminClient = createAdminClient()
    const now = new Date()
    const bogotaDateStr = now.toLocaleString('en-US', { timeZone: 'America/Bogota' })
    const bogotaDate = new Date(bogotaDateStr)
    const dayOfWeek = bogotaDate.getDay()
    
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    if (isWeekend) {
      return { schedule: [], nextClass: null, isWeekend: true }
    }

    const { data: academicTeacher } = await adminClient
      .from('academic_teachers')
      .select('id')
      .eq('profile_id', userId)
      .single()

    if (!academicTeacher) {
      return { schedule: [], nextClass: null, isWeekend: false }
    }

    // Usar la fecha local de Bogotá en formato YYYY-MM-DD
    const tzOffset = bogotaDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(bogotaDate.getTime() - tzOffset)).toISOString().slice(0, -1);
    const todayDateStr = localISOTime.split('T')[0]

    const { data: overrides } = await adminClient
      .from('sch_daily_overrides')
      .select('id, period_id, day_of_week, subject:academic_subjects(name), group:academic_groups(name)')
      .eq('teacher_id', academicTeacher.id)
      .eq('target_date', todayDateStr)

    let daySlots: any[] = []
    let hasNovedades = false
    
    if (overrides && overrides.length > 0) {
      daySlots = overrides
      hasNovedades = true
    } else {
      const { getScheduleSlotsAction } = await import('@/modules/admin/application/actions')
      const allSlots = await getScheduleSlotsAction('teacher', academicTeacher.id)
      if (allSlots) {
        daySlots = allSlots.filter((s: any) => parseInt(s.day_of_week) === dayOfWeek)
      }
    }
    
    if (!daySlots) {
      return { schedule: [], nextClass: null, isWeekend: false }
    }

    daySlots.sort((a: any, b: any) => parseInt(a.period_id) - parseInt(b.period_id))
    let periodsArray: any[] = []
    let periodsMap: any = {}
    try {
      const { getGeneralSchedulePeriodsAction } = await import('@/app/admin/schedules/actions')
      const configRes = await getGeneralSchedulePeriodsAction()
      if (configRes.success && configRes.config?.periods) {
        periodsArray = configRes.config.periods
        periodsMap = periodsArray.reduce((acc: any, p: any) => {
          acc[p.period] = p
          return acc
        }, {})
      }
    } catch (e) {}

    let maxPeriodId = 6
    if (periodsArray.length > 0) {
       const maxVal = Math.max(...periodsArray.map(p => parseInt(p.period || '0')))
       if (!isNaN(maxVal) && maxVal > 0) maxPeriodId = maxVal
    } else if (daySlots.length > 0) {
       const maxVal = Math.max(...daySlots.map((s:any) => parseInt(s.period_id || '0')))
       if (!isNaN(maxVal) && maxVal > 0) maxPeriodId = Math.max(maxVal, 6)
    }
    
    const fullDaySlots = []
    for (let i = 1; i <= maxPeriodId; i++) {
       const slotForPeriod = daySlots.find((s:any) => parseInt(s.period_id) === i)
       const pInfo = periodsMap[i]
       
       if (slotForPeriod) {
         fullDaySlots.push({
            id: slotForPeriod.id,
            period: i,
            subject: slotForPeriod.subject?.name || 'Clase',
            group: slotForPeriod.group?.name || 'Grupo',
            startTime: pInfo?.startTime || `${i}ª Hora`,
            endTime: pInfo?.endTime || '',
            isCurrent: false,
            isFree: false,
            isNovedad: hasNovedades
         })
       } else {
         fullDaySlots.push({
            id: `free-${i}`,
            period: i,
            subject: 'Libre',
            group: '',
            startTime: pInfo?.startTime || `${i}ª Hora`,
            endTime: pInfo?.endTime || '',
            isCurrent: false,
            isFree: true,
            isNovedad: hasNovedades
         })
       }
    }

    const nowTimeStr = bogotaDate.toTimeString().substring(0,5)
    let foundCurrent = false
    let nextClass = null

    for (let i = 0; i < fullDaySlots.length; i++) {
      const slot = fullDaySlots[i]
      if (slot.startTime && slot.endTime) {
        if (nowTimeStr >= slot.startTime && nowTimeStr <= slot.endTime) {
          slot.isCurrent = true
          foundCurrent = true
          for (let j = i + 1; j < fullDaySlots.length; j++) {
            if (!fullDaySlots[j].isFree) {
              nextClass = fullDaySlots[j]
              break
            }
          }
          break
        }
      }
    }

    if (!foundCurrent) {
      for (let i = 0; i < fullDaySlots.length; i++) {
        if (fullDaySlots[i].startTime && nowTimeStr < fullDaySlots[i].startTime && !fullDaySlots[i].isFree) {
          nextClass = fullDaySlots[i]
          break
        }
      }
    }

    return { schedule: fullDaySlots, nextClass, isWeekend: false }
  } catch (error) {
    console.error('Error fetching today schedule:', error)
    return { schedule: [], nextClass: null, isWeekend: false }
  }
}



