import { Metadata } from 'next'
import { StudentCalendarScreen } from '@/modules/students/presentation/screens/StudentCalendarScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mi Agenda y Calendario Escolar | aulaEnsuny',
  description: 'Gestiona tu calendario académico, consulta entregas pendientes, fechas de exámenes y visualiza tus logros escolares de forma interactiva.',
}

export default function StudentCalendarPage() {
  return <StudentCalendarScreen />
}
