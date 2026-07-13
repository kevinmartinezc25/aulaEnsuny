import { Metadata } from 'next'
import { StudentDashboardScreen } from '@/modules/courses/presentation/screens/StudentDashboardScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard de Estudiante | aulaEnsuny',
  description: 'Visualiza tus asignaturas, consulta las tareas pendientes, monitorea tus logros y haz un seguimiento de tu rendimiento académico.',
}

export default function StudentDashboardPage() {
  return <StudentDashboardScreen />
}
