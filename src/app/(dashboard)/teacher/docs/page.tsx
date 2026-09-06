import { DocCenterScreen } from '@/modules/docs/presentation/screens/DocCenterScreen'

export const metadata = {
  title: 'Portal de Conocimiento Escolar | aulaEnsuny',
  description: 'Portal de Conocimiento Escolar para docentes. Crea y gestiona documentos académicos e institucionales.',
}

export default function TeacherDocsPage() {
  return <DocCenterScreen userRole="teacher" />
}
