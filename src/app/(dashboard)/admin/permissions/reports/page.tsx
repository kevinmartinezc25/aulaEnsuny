import { Metadata } from 'next'
import { AdminPermissionReportsScreen } from '@/modules/permissions/presentation/screens/AdminPermissionReportsScreen'

export const metadata: Metadata = {
  title: 'Reportes de Permisos Docentes | aulaEnsuny',
  description: 'Métricas, análisis de horas afectadas y exportación de datos de permisos docentes.',
}

export default function AdminPermissionReportsPage() {
  return <AdminPermissionReportsScreen />
}
