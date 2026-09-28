import { Metadata } from 'next'
import { getStudentPortalDisciplinaryData } from '@/modules/disciplinary/application/studentDisciplinaryActions'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { StudentDisciplinaryClientView } from '@/modules/students/presentation/screens/StudentDisciplinaryClientView'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Convivencia Escolar | aulaEnsuny',
  description: 'Historial de convivencia y comportamiento.',
}

export const dynamic = 'force-dynamic'

export default async function StudentDisciplinaryPage() {
  const session = await getPlanillaStudentSession()
  
  if (!session) {
    redirect('/login')
  }

  const { summary, reports } = await getStudentPortalDisciplinaryData()

  return (
    <StudentDisciplinaryClientView
      summary={summary}
      reports={reports}
      studentName={session.fullName}
      groupName={session.groupName}
    />
  )
}
