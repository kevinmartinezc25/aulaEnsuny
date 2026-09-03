import { Metadata } from 'next'
import { AdminPermissionsScreen } from '@/modules/permissions/presentation/screens/AdminPermissionsScreen'

export const metadata: Metadata = {
  title: 'Permisos Docentes - Administración | aulaEnsuny',
  description: 'Bandeja directiva de revisión, cobertura y aprobación de permisos docentes.',
}

export default function AdminPermissionsPage() {
  return <AdminPermissionsScreen />
}
