import { Metadata } from 'next'
import { GradesScreen } from '@/modules/grades/presentation/screens/GradesScreen'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Calificaciones e Historial Académico | aulaEnsuny',
  description: 'Consulta tus notas obtenidas en escala 1.0 a 5.0, visualiza gráficos de progreso trimestral y revisa el feedback de tus docentes.',
}

export default async function StudentGradesPage() {
  const session = await getPlanillaStudentSession()

  if (!session) {
    redirect('/login')
  }

  return <GradesScreen />
}
