import { Metadata } from 'next'
import { StudentAchievementsScreen } from '@/modules/students/presentation/screens/StudentAchievementsScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mis Logros y Medallas | aulaEnsuny',
  description: 'Consulta tus insignias académicas desbloqueadas, puntos acumulados y tu nivel de aprendizaje actual en aulaEnsuny.',
}

export default function StudentAchievementsPage() {
  return <StudentAchievementsScreen />
}
