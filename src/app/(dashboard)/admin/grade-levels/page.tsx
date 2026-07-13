import { Metadata } from 'next'
import { AdminGradeLevelsScreen } from '@/modules/admin/presentation/screens/AdminGradeLevelsScreen'

export const metadata: Metadata = {
  title: 'Gestión de Grados Escolares | aulaEnsuny Admin',
  description: 'Control de niveles académicos y grados para asignación de asignaturas y alumnos.',
}

export default function AdminGradeLevelsPage() {
  return <AdminGradeLevelsScreen />
}
