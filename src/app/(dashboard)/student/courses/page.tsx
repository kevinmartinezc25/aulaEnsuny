import { Metadata } from 'next'
import { StudentDashboardScreen } from '@/modules/courses/presentation/screens/StudentDashboardScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Campus Virtual | aulaEnsuny',
  description: 'Accede a tus cursos virtuales, contenidos, actividades y recursos académicos.',
}

export default function StudentCoursesPage() {
  return <StudentDashboardScreen />
}
