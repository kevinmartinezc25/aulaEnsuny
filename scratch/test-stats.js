const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getAdminDashboardStats() {
  try {
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

    // 3. Obtener calificaciones (para quizzes y promedio)
    const { data: dbGrades, error: gradesErr } = await adminClient
      .from('grades')
      .select('score, student_id, course_id, created_at')

    if (gradesErr) {
      console.error('gradesErr:', gradesErr);
      return;
    }

    const { count: quizAttemptsCount, error: attemptsErr } = await adminClient
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true });

    if (attemptsErr) {
      console.error('attemptsErr:', attemptsErr);
      return;
    }

    console.log('Total quiz attempts:', quizAttemptsCount);

    const quizzesCount = dbGrades?.length || 0
    const totalScore = dbGrades?.reduce((sum, g) => sum + Number(g.score), 0) || 0
    const avgGradeVal = quizzesCount > 0 ? (totalScore / quizzesCount).toFixed(1) : '0.0'

    // 4. Obtener total de recursos
    const { count: resourcesCount, error: resErr } = await adminClient
      .from('resources')
      .select('*', { count: 'exact', head: true })

    const resourcesTotal = resourcesCount || 0

    // 5. Historial de rendimiento mensual
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const gradesByMonth = {}
    dbGrades?.forEach(g => {
      const date = new Date(g.created_at)
      const monthName = months[date.getMonth()]
      if (!gradesByMonth[monthName]) {
        gradesByMonth[monthName] = { sum: 0, count: 0 }
      }
      gradesByMonth[monthName].sum += Number(g.score)
      gradesByMonth[monthName].count += 1
    })

    const defaultMonths = ['Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene']
    const generatedPerformanceData = defaultMonths.map(month => {
      const item = gradesByMonth[month]
      return {
        month,
        promedio: item && item.count > 0 ? Number((item.sum / item.count).toFixed(1)) : 0.0
      }
    })

    // 6. Calcular estudiantes en riesgo (< 3.0 promedio)
    const studentGrades = {}
    dbGrades?.forEach(g => {
      if (!studentGrades[g.student_id]) {
        studentGrades[g.student_id] = { sum: 0, count: 0 }
      }
      studentGrades[g.student_id].sum += Number(g.score)
      studentGrades[g.student_id].count += 1
    })

    const generatedAtRisk = []
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

    // 7. Calcular cursos más activos
    const gradeCounts = {}
    students.forEach(s => {
      if (s.grade_level) {
        gradeCounts[s.grade_level] = (gradeCounts[s.grade_level] || 0) + 1
      }
    })

    const generatedTopCourses = (dbCourses || []).map(c => {
      const courseGrades = dbGrades?.filter(g => g.course_id === c.id) || []
      const studentsInCourse = gradeCounts[c.grade_level] || 0
      const completionPct = courseGrades.length > 0
        ? Math.min(Math.round((courseGrades.filter(g => Number(g.score) >= 3.0).length / courseGrades.length) * 100), 100)
        : 0

      return {
        name: c.title,
        completionPct: completionPct || 70,
        students: studentsInCourse
      }
    }).sort((a, b) => b.completionPct - a.completionPct).slice(0, 4)

    return {
      studentCount: students.length,
      teacherCount: teachers.length,
      activeCoursesCount,
      quizzesCount,
      avgGradeVal,
      resourcesCount: resourcesTotal,
      performanceData: generatedPerformanceData,
      atRiskStudents: generatedAtRisk.sort((a, b) => a.avg - b.avg).slice(0, 5),
      topCourses: generatedTopCourses
    }
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error)
    return null
  }
}

getAdminDashboardStats().then(stats => console.log('STATS OUTPUT:', stats));
