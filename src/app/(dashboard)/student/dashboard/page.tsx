import { Metadata } from 'next'
import { StudentPortalScreen } from '@/modules/students/presentation/screens/StudentPortalScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mi Portal | aulaEnsuny',
  description: 'Tu portal educativo personal. Accede a calificaciones, horario, convivencia, asistencia y campus virtual.',
}

export default function StudentDashboardPage() {
  return <StudentPortalScreen />
}

