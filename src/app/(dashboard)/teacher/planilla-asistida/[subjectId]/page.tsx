import { Metadata } from 'next'
import { PlanillaAsistidaDetailScreen } from '@/modules/planilla-asistida/presentation/screens/PlanillaAsistidaDetailScreen'
import { getAssistedSubjects } from '@/modules/planilla-asistida/application/actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Planilla Asistida | aulaEnsuny',
  description: 'Herramienta de apoyo para docentes',
}

interface PageProps {
  params: Promise<{
    subjectId: string
  }>
}

export default async function PlanillaAsistidaDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  
  // En un caso real, buscaríamos los detalles de esta materia específica.
  // Por ahora le pasamos el ID.
  return <PlanillaAsistidaDetailScreen subjectId={resolvedParams.subjectId} />
}
