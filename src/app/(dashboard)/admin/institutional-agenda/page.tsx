import { InstitutionalAgendaScreen } from '@/modules/institutional-agenda/presentation/screens/InstitutionalAgendaScreen'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agenda Institucional | aulaEnsuny',
  description: 'Módulo de planeación y organización de actividades del colegio.'
}

export default function AdminInstitutionalAgendaPage() {
  return <InstitutionalAgendaScreen isAdmin={true} />
}
