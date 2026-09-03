import { Metadata } from 'next'
import { TeacherPermissionDetailScreen } from '@/modules/permissions/presentation/screens/TeacherPermissionDetailScreen'

export const metadata: Metadata = {
  title: 'Expediente de Permiso | aulaEnsuny',
  description: 'Detalle, trazabilidad y resolución de la solicitud de permiso docente.',
}

export default async function TeacherPermissionDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TeacherPermissionDetailScreen permissionId={id} />
}
