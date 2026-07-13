import { Metadata } from 'next'
import { AdminEnrollStudentScreen } from '@/modules/admin/presentation/screens/AdminEnrollStudentScreen'

export const metadata: Metadata = {
  title: 'Matricular Alumno | aulaEnsuny Admin',
  description: 'Proceso de formalización de matrícula escolar estándar colombiano y vinculación LMS.',
}

export default function NewStudentPage() {
  return <AdminEnrollStudentScreen />
}
