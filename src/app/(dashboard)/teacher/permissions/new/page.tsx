import { Metadata } from 'next'
import { TeacherNewPermissionScreen } from '@/modules/permissions/presentation/screens/TeacherNewPermissionScreen'

export const metadata: Metadata = {
  title: 'Nueva Solicitud de Permiso | aulaEnsuny',
  description: 'Formulario por pasos para la solicitud digital de permisos institucionales.',
}

export default function TeacherNewPermissionPage() {
  return <TeacherNewPermissionScreen />
}
