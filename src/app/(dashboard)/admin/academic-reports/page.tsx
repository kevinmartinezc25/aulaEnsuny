import { Metadata } from 'next'
import { AdminAcademicReportsScreen } from '@/modules/grades/presentation/screens/AdminAcademicReportsScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Reportes e Impresión Académica | aulaEnsuny',
  description: 'Genera e imprime boletines individuales y consolidados académicos en formato PDF.',
}

export default function AdminAcademicReportsPage() {
  return <AdminAcademicReportsScreen />
}
