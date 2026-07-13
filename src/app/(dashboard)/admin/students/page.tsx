import { Metadata } from 'next'
import { AdminStudentsScreen } from '@/modules/admin/presentation/screens/AdminStudentsScreen'

export const metadata: Metadata = {
  title: 'Gestión de Estudiantes | aulaEnsuny Admin',
  description: 'Control de matrículas, asignación de grados escolares y estados académicos.',
}

export default function AdminStudentsPage() {
  return <AdminStudentsScreen />
}
