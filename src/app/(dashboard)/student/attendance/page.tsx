import { Metadata } from 'next'
import { StudentAttendanceScreen } from '@/modules/students/presentation/screens/StudentAttendanceScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Asistencia Escolar | aulaEnsuny',
  description: 'Revisa tu asistencia y faltas por periodo y materia',
}

export default function StudentAttendancePage() {
  return <StudentAttendanceScreen />
}
 
