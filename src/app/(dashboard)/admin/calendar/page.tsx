import { Metadata } from 'next'
import { AdminCalendarScreen } from '@/modules/admin/presentation/screens/AdminCalendarScreen'

export const metadata: Metadata = {
  title: 'Calendario Institucional | aulaEnsuny Admin',
  description: 'Gestión de eventos globales, fechas de entrega de tareas y evaluaciones de la institución.',
}

export default function AdminCalendarPage() {
  return <AdminCalendarScreen />
}
