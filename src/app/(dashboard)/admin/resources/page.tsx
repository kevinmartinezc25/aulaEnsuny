import { Metadata } from 'next'
import { AdminResourcesScreen } from '@/modules/admin/presentation/screens/AdminResourcesScreen'

export const metadata: Metadata = {
  title: 'Recursos Documentales | aulaEnsuny Admin',
  description: 'Auditoría de materiales de estudio, guías y recursos pedagógicos subidos al sistema.',
}

export default function AdminResourcesPage() {
  return <AdminResourcesScreen />
}
