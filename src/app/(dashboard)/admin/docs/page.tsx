import { DocCenterScreen } from '@/modules/docs/presentation/screens/DocCenterScreen'

export const metadata = {
  title: 'Centro de Documentación | aulaEnsuny',
  description: 'Repositorio oficial del conocimiento institucional. Gestiona, organiza y comparte documentación académica.',
}

export default function AdminDocsPage() {
  return <DocCenterScreen userRole="admin" />
}
