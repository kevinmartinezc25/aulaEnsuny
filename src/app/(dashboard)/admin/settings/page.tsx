import { Metadata } from 'next'
import { AdminSettingsScreen } from '@/modules/admin/presentation/screens/AdminSettingsScreen'

export const metadata: Metadata = {
  title: 'Configuración General | aulaEnsuny Admin',
  description: 'Ajustes institucionales, gestión de registros externos, políticas del sistema y de seguridad.',
}

export default function AdminSettingsPage() {
  return <AdminSettingsScreen />
}
