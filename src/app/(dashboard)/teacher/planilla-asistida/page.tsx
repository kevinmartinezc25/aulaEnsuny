import { Metadata } from 'next'
import { PlanillaAsistidaListScreen } from '@/modules/planilla-asistida/presentation/screens/PlanillaAsistidaListScreen'
import { getAssistedSubjects } from '@/modules/planilla-asistida/application/actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Planilla Asistida | aulaEnsuny',
  description: 'Herramienta de apoyo para docentes para gestionar calificaciones de forma independiente.',
}

export default async function PlanillaAsistidaPage() {
  const initialSubjects = await getAssistedSubjects().catch(() => [])

  return <PlanillaAsistidaListScreen initialSubjects={initialSubjects} />
}
