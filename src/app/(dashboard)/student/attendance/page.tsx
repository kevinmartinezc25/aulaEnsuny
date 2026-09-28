import { Metadata } from 'next'
import { getStudentAttendanceOverview } from '@/modules/planilla-asistida/application/studentAttendanceQueries'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { StudentAttendanceClientView } from '@/modules/students/presentation/screens/StudentAttendanceClientView'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Asistencia Escolar | aulaEnsuny',
  description: 'Revisa tu asistencia, inasistencias y retardo a clases.',
}

export const dynamic = 'force-dynamic'

export default async function StudentAttendancePage() {
  const session = await getPlanillaStudentSession()
  
  if (!session) {
    redirect('/login')
  }

  const attendanceData = await getStudentAttendanceOverview()

  return (
    <StudentAttendanceClientView
      attendanceData={attendanceData}
      studentName={session.fullName}
      groupName={session.groupName}
      resolvedGrade={session.gradeLevel}
    />
  )
}
