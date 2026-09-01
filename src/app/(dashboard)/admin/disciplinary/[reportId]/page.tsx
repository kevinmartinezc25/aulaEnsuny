import { Metadata } from 'next'
import { DisciplinaryReportDetailScreen } from '@/modules/disciplinary/presentation/screens/DisciplinaryReportDetailScreen'

export const metadata: Metadata = {
  title: 'Detalle de Reporte (Admin) | aulaEnsuny',
  description: 'Detalle del reporte de convivencia escolar para el administrador.',
}

export default async function AdminDisciplinaryReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params
  return <DisciplinaryReportDetailScreen reportId={reportId} basePath="/admin/disciplinary" />
}
