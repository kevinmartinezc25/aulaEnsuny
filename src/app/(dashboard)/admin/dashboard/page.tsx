import { Metadata } from 'next'
import { AdminDashboardScreen } from '@/modules/admin/presentation/screens/AdminDashboardScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard Administrativo | aulaEnsuny',
  description: 'Panel de control para administradores. Gestiona usuarios, asigna cursos y visualiza analíticas globales.',
}

export default function AdminDashboardPage() {
  return <AdminDashboardScreen />
}
