import { Metadata } from 'next'
import { StudentRequestsScreen } from '@/modules/courses/presentation/screens/StudentRequestsScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mis Solicitudes de Cursos | aulaEnsuny',
  description: 'Revisa el estado de tus solicitudes de ingreso a cursos o asignaturas y gestiona tus inscripciones.',
}

export default function StudentRequestsPage() {
  return <StudentRequestsScreen />
}
