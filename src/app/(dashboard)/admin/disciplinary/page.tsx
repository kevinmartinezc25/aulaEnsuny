import { Metadata } from 'next'
import { AdminDisciplinaryDashboard } from '@/modules/admin/presentation/screens/AdminDisciplinaryDashboard'

export const metadata: Metadata = {
  title: 'Coordinación Disciplinaria | aulaEnsuny',
  description: 'Panel de gestión y trazabilidad de convivencia escolar.',
}

export default function AdminDisciplinaryPage() {
  return <AdminDisciplinaryDashboard />
}
