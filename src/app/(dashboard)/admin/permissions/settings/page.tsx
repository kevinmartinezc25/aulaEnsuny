import { Metadata } from 'next'
import { AdminPermissionSettingsScreen } from '@/modules/permissions/presentation/screens/AdminPermissionSettingsScreen'

export const metadata: Metadata = {
  title: 'Configuración de Permisos Docentes | aulaEnsuny',
  description: 'Configuración de catálogo y parámetros de permisos docentes.',
}

export default function AdminPermissionSettingsPage() {
  return <AdminPermissionSettingsScreen />
}
