import { TeacherStudentsScreen } from '@/modules/students/presentation/screens/TeacherStudentsScreen'
import { getTeacherStudents } from '@/modules/students/application/actions'
import { getTeacherCourses } from '@/modules/grades/application/achievementsActions'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mis Estudiantes | aulaEnsuny',
  description: 'Nómina global de estudiantes a cargo del docente en el LMS aulaEnsuny.'
}

export default async function TeacherStudentsPage() {
  const [initialStudents, initialCourses] = await Promise.all([
    getTeacherStudents().catch(() => []),
    getTeacherCourses().catch(() => [])
  ])

  return (
    <TeacherStudentsScreen 
      initialStudents={initialStudents} 
      initialCourses={initialCourses} 
    />
  )
}
