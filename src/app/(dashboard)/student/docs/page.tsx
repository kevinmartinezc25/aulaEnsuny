import { DocCenterScreen } from '@/modules/docs/presentation/screens/DocCenterScreen'

export const metadata = {
  title: 'Documentos | aulaEnsuny',
  description: 'Accede a la documentación académica publicada por tu institución.',
}

export default function StudentDocsPage() {
  return <DocCenterScreen userRole="student" />
}
