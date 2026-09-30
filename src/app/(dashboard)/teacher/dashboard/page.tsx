import { Metadata } from 'next'
import { TeacherDashboardScreen } from '@/modules/courses/presentation/screens/TeacherDashboardScreen'
import { getTeacherDashboardOverview, getTeacherTodaySchedule } from '@/modules/courses/application/teacherActions'
import { createClient } from '@/core/config/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Portal del Docente | aulaEnsuny',
  description: 'Gestiona tus cursos, añade módulos y lecciones, diseña evaluaciones (quizzes) y califica a tus estudiantes.',
}

export default async function TeacherDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialTeacherName = 'Prof. Docente'
  let initialOverview = undefined
  let initialScheduleData = undefined

  if (user) {
    // 1. Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      initialTeacherName = `${profile.first_name || 'Prof.'} ${profile.last_name || 'Docente'}`
    } else if (user.user_metadata) {
      initialTeacherName = `${user.user_metadata.first_name || 'Prof.'} ${user.user_metadata.last_name || 'Docente'}`
    }

    // 2. Fetch overview data and schedule in parallel
    const [overview, scheduleData] = await Promise.all([
      getTeacherDashboardOverview(),
      getTeacherTodaySchedule(user.id)
    ])
    initialOverview = overview
    initialScheduleData = scheduleData
  }

  return (
    <TeacherDashboardScreen 
      initialTeacherName={initialTeacherName}
      initialCourses={initialOverview?.courses}
      initialStats={initialOverview?.stats}
      initialTodaySchedule={initialScheduleData?.schedule}
      initialCurrentClass={initialScheduleData?.currentClass}
      initialNextClass={initialScheduleData?.nextClass}
      initialIsWeekend={initialScheduleData?.isWeekend}
    />
  )
}
