import { Metadata } from 'next'
import { AdminAnalyticsScreen } from '@/modules/admin/presentation/screens/AdminAnalyticsScreen'

export const metadata: Metadata = {
  title: 'Analíticas Institucionales | aulaEnsuny Admin',
  description: 'Estadísticas de rendimiento académico, tasas de aprobación y frecuencia de accesos a la plataforma.',
}

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsScreen />
}
