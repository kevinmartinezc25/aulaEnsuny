import { Metadata } from 'next'
import { TeacherGradesMatrixScreen } from '@/modules/grades/presentation/screens/TeacherGradesMatrixScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Matriz de Calificaciones | aulaEnsuny',
  description: 'Digita notas inline en la matriz de calificaciones estilo Notion/Google Sheets para tus estudiantes.',
}

export default function TeacherGradesPage() {
  return <TeacherGradesMatrixScreen />
}
