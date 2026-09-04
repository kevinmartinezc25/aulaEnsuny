import { Metadata } from 'next'
import { OfflineScreen } from '@/components/pwa/OfflineScreen'

export const metadata: Metadata = {
  title: 'Sin Conexión | aulaEnsuny',
  description: 'Parece que no tienes conexión a internet en este momento.',
}

export default function OfflinePage() {
  return <OfflineScreen />
}
