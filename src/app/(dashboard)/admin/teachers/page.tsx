import { Metadata } from 'next'
import { AdminTeachersScreen } from '@/modules/admin/presentation/screens/AdminTeachersScreen'

export const metadata: Metadata = {
  title: 'Gestión de Docentes | aulaEnsuny Admin',
  description: 'Control de contratación, asignación de materias y perfiles del cuerpo docente.',
}

export default function AdminTeachersPage() {
  return <AdminTeachersScreen />
}
