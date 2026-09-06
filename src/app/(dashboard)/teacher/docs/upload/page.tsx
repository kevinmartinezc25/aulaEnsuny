import { UploadDocScreen } from '@/modules/docs/presentation/screens/UploadDocScreen'

export const metadata = {
  title: 'Subir Nuevo Documento | aulaEnsuny',
  description: 'Publica planes de aula, mallas curriculares y guías de aprendizaje en la ENSUNY.',
}

export default function TeacherUploadDocPage() {
  return <UploadDocScreen userRole="teacher" backUrl="/teacher/docs" />
}
