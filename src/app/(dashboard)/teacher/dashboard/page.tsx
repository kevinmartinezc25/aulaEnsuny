import { Metadata } from 'next'
import { TeacherDashboardScreen } from '@/modules/courses/presentation/screens/TeacherDashboardScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Portal del Docente | aulaEnsuny',
  description: 'Gestiona tus cursos, añade módulos y lecciones, diseña evaluaciones (quizzes) y califica a tus estudiantes.',
}

export default function TeacherDashboardPage() {
  return <TeacherDashboardScreen />
}
