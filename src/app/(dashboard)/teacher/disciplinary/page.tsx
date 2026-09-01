import { Metadata } from 'next'
import { DisciplinaryReportsListScreen } from '@/modules/disciplinary/presentation/screens/DisciplinaryReportsListScreen'

export const metadata: Metadata = {
  title: 'Convivencia Escolar | aulaEnsuny',
  description: 'Gestión de reportes de novedad disciplinaria.',
}

export default function DisciplinaryPage() {
  return <DisciplinaryReportsListScreen />
}
