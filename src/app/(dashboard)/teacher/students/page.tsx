import { TeacherStudentsScreen } from '@/modules/students/presentation/screens/TeacherStudentsScreen'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mis Estudiantes | aulaEnsuny',
  description: 'Nómina global de estudiantes a cargo del docente en el LMS aulaEnsuny.'
}

export default function TeacherStudentsPage() {
  return <TeacherStudentsScreen />
}
