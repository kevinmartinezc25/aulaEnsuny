import { Metadata } from 'next'
import { TeacherLogrosScreen } from '@/modules/grades/presentation/screens/TeacherLogrosScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gestión de Logros Académicos | aulaEnsuny',
  description: 'Crea, edita, elimina y clona logros académicos y competencias para tus asignaturas por período.',
}

export default function TeacherAchievementsPage() {
  return <TeacherLogrosScreen />
}
