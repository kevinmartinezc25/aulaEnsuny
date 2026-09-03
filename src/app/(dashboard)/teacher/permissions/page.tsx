import { Metadata } from 'next'
import { TeacherPermissionsScreen } from '@/modules/permissions/presentation/screens/TeacherPermissionsScreen'

export const metadata: Metadata = {
  title: 'Permisos Docentes | aulaEnsuny',
  description: 'Gestión y seguimiento institucional de permisos y licencias para docentes.',
}

export default function TeacherPermissionsPage() {
  return <TeacherPermissionsScreen />
}
