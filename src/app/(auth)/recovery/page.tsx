import { Metadata } from 'next'
import { RecoveryRequestScreen } from '@/modules/auth/presentation/screens/RecoveryRequestScreen'

export const metadata: Metadata = {
  title: 'Recuperar Contraseña | aulaEnsuny',
  description: 'Recupera tu contraseña de acceso a la plataforma aulaEnsuny.',
}

export default function RecoveryPage() {
  return <RecoveryRequestScreen />
}
