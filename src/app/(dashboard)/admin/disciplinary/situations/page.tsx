import { Metadata } from 'next'
import { AdminSituationsCatalogScreen } from '@/modules/admin/presentation/screens/AdminSituationsCatalogScreen'

export const metadata: Metadata = {
  title: 'Catálogo de Situaciones | aulaEnsuny',
  description: 'Gestión del catálogo de situaciones del manual de convivencia.',
}

export default function AdminSituationsCatalogPage() {
  return <AdminSituationsCatalogScreen />
}
