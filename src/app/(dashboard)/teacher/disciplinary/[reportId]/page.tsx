import { Metadata } from 'next'
import { DisciplinaryReportDetailScreen } from '@/modules/disciplinary/presentation/screens/DisciplinaryReportDetailScreen'

export const metadata: Metadata = {
  title: 'Detalle de Reporte | aulaEnsuny',
  description: 'Detalle del reporte de convivencia escolar.',
}

export default async function DisciplinaryReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params
  return <DisciplinaryReportDetailScreen reportId={reportId} />
}
