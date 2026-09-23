import { Metadata } from 'next'
import { getStudentDashboardSchedule } from '@/modules/students/application/scheduleActions'
import { StudentScheduleClient } from './components/StudentScheduleClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mi Horario | aulaEnsuny',
  description: 'Consulta tu horario de clases de acuerdo a tu grado y grupo matriculado.',
}

export default async function StudentSchedulePage() {
  const scheduleData = await getStudentDashboardSchedule()
  return <StudentScheduleClient initialData={scheduleData} />
}
