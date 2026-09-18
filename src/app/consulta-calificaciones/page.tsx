import React from 'react'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { getStudentSubjects } from '@/modules/planilla-asistida/application/studentQueries'
import { redirect } from 'next/navigation'
import { StudentSubjectsClientView } from './StudentSubjectsClientView'

export default async function ConsultaDashboardPage() {
  const session = await getPlanillaStudentSession()
  if (!session) {
    redirect('/consulta-calificaciones/login')
  }

  const subjects = await getStudentSubjects()

  return (
    <StudentSubjectsClientView subjects={subjects} studentName={session.fullName} />
  )
}
