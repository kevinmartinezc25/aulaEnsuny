import { Metadata } from 'next'
import { AdminAcademicRegistryScreen } from '@/modules/grades/presentation/screens/AdminAcademicRegistryScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Registro Académico y Auditoría | aulaEnsuny',
  description: 'Consulta consolidados de notas por período, grado y grupo, y audita el historial de cambios.',
}

export default function AdminAcademicRegistryPage() {
  return <AdminAcademicRegistryScreen />
}
