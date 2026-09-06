import { DocCenterScreen } from '@/modules/docs/presentation/screens/DocCenterScreen'

export const metadata = {
  title: 'Portal de Conocimiento Escolar | aulaEnsuny',
  description: 'Portal de Conocimiento Escolar. Gestiona, organiza y comparte documentación académica e institucional.',
}

export default function AdminDocsPage() {
  return <DocCenterScreen userRole="admin" />
}
