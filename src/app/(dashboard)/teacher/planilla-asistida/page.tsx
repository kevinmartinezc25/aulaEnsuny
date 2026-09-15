import { Metadata } from 'next'
import { PlanillaAsistidaListScreen } from '@/modules/planilla-asistida/presentation/screens/PlanillaAsistidaListScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Planilla Asistida | aulaEnsuny',
  description: 'Herramienta de apoyo para docentes para gestionar calificaciones de forma independiente.',
}

export default function PlanillaAsistidaPage() {
  return <PlanillaAsistidaListScreen />
}
