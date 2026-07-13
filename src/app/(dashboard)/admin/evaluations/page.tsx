import { Metadata } from 'next'
import { AdminEvaluationsScreen } from '@/modules/admin/presentation/screens/AdminEvaluationsScreen'

export const metadata: Metadata = {
  title: 'Historial de Evaluaciones | aulaEnsuny Admin',
  description: 'Monitoreo de intentos de exámenes, libro de calificaciones general y tasas de aprobación.',
}

export default function AdminEvaluationsPage() {
  return <AdminEvaluationsScreen />
}
