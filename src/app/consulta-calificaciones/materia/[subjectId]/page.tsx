import React from 'react'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { getStudentGradesView } from '@/modules/planilla-asistida/application/studentQueries'
import { redirect } from 'next/navigation'
import { StudentSubjectClientView } from './StudentSubjectClientView'

interface SubjectPageProps {
  params: Promise<{ subjectId: string }>
}

export default async function StudentSubjectPage({ params }: SubjectPageProps) {
  const session = await getPlanillaStudentSession()
  if (!session) {
    redirect('/consulta-calificaciones/login')
  }

  const resolvedParams = await params
  const subjectId = resolvedParams?.subjectId

  if (!subjectId) {
    redirect('/consulta-calificaciones')
  }

  let data;
  try {
    data = await getStudentGradesView(subjectId)
  } catch (error) {
    console.error('Error fetching student grades view for subjectId:', subjectId, error)
    data = null
  }

  if (!data) {
    redirect('/consulta-calificaciones')
  }

  return (
    <StudentSubjectClientView
      subject={data.subject}
      achievements={data.achievements || []}
      activities={data.activities || []}
      grades={data.grades || []}
      studentName={session.fullName}
    />
  )
}
