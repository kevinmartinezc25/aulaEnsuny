import { Metadata } from 'next'
import { AdminNotificationsScreen } from '@/modules/admin/presentation/screens/AdminNotificationsScreen'

export const metadata: Metadata = {
  title: 'Notificaciones Institucionales | aulaEnsuny Admin',
  description: 'Envío de comunicados y alertas masivas o dirigidas a roles específicos en la institución.',
}

export default function AdminNotificationsPage() {
  return <AdminNotificationsScreen />
}
