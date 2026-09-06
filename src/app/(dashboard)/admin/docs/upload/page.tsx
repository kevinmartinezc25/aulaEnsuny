import { UploadDocScreen } from '@/modules/docs/presentation/screens/UploadDocScreen'

export const metadata = {
  title: 'Subir Nuevo Documento | aulaEnsuny',
  description: 'Publica documentos institucionales o académicos en la ENSUNY.',
}

export default function AdminUploadDocPage() {
  return <UploadDocScreen userRole="admin" backUrl="/admin/docs" />
}
