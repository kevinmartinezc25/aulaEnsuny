import { Metadata } from 'next'
import { RecoveryResetScreen } from '@/modules/auth/presentation/screens/RecoveryResetScreen'

export const metadata: Metadata = {
  title: 'Restablecer Contraseña | aulaEnsuny',
  description: 'Restablece tu contraseña de acceso a la plataforma aulaEnsuny.',
}

export default function RecoveryResetPage() {
  return <RecoveryResetScreen />
}
