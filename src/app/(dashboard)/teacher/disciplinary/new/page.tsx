import { Metadata } from 'next'
import { DisciplinaryReportFormScreen } from '@/modules/disciplinary/presentation/screens/DisciplinaryReportFormScreen'

export const metadata: Metadata = {
  title: 'Nuevo Reporte Disciplinario | aulaEnsuny',
  description: 'Registrar una novedad de convivencia escolar.',
}

export default function NewDisciplinaryReportPage() {
  return <DisciplinaryReportFormScreen />
}
