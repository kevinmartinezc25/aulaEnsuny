import { DocCenterScreen } from '@/modules/docs/presentation/screens/DocCenterScreen'

export const metadata = {
  title: 'Documentación | aulaEnsuny',
  description: 'Centro de documentación para docentes. Crea y gestiona documentos académicos e institucionales.',
}

export default function TeacherDocsPage() {
  return <DocCenterScreen userRole="teacher" />
}
