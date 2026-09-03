import { Metadata } from 'next'
import { AdminPermissionDetailScreen } from '@/modules/permissions/presentation/screens/AdminPermissionDetailScreen'

export const metadata: Metadata = {
  title: 'Expediente Institucional de Permiso | aulaEnsuny',
  description: 'Revisión, asignación de cobertura académica y resolución del permiso docente.',
}

export default async function AdminPermissionDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AdminPermissionDetailScreen permissionId={id} />
}
