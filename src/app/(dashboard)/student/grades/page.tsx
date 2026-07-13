import { Metadata } from 'next'
import { GradesScreen } from '@/modules/grades/presentation/screens/GradesScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Calificaciones e Historial Académico | aulaEnsuny',
  description: 'Consulta tus notas obtenidas en escala 1.0 a 5.0, visualiza gráficos de progreso trimestral y revisa el feedback de tus docentes.',
}

export default function StudentGradesPage() {
  return <GradesScreen />
}
