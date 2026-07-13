import { Metadata } from 'next'
import { AdminRolesScreen } from '@/modules/admin/presentation/screens/AdminRolesScreen'

export const metadata: Metadata = {
  title: 'Roles y Permisos | aulaEnsuny Admin',
  description: 'Auditoría e indicador de privilegios de acceso y políticas de seguridad por rol.',
}

export default function AdminRolesPage() {
  return <AdminRolesScreen />
}
