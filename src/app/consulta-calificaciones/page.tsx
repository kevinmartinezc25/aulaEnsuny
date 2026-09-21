import React from 'react'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { getStudentSubjects, getStudentGroupSchedule } from '@/modules/planilla-asistida/application/studentQueries'
import { redirect } from 'next/navigation'
import { AcademicPortalClientView } from './AcademicPortalClientView'

export default async function ConsultaDashboardPage() {
  const session = await getPlanillaStudentSession()
  if (!session) {
    redirect('/consulta-calificaciones/login')
  }

  const [subjects, scheduleData] = await Promise.all([
    getStudentSubjects().catch(() => []),
    getStudentGroupSchedule().catch(() => ({
      success: false,
      hasGroup: false,
      isPublished: false,
      groupName: session.groupName || '',
      groupId: null,
      schedule: { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [] }
    }))
  ])

  // Resolver grado y grupo oficial en el servidor
  const rawGrade = session.gradeLevel || ''
  const resolvedGroupName = scheduleData.groupName || session.groupName || ''
  const gradeFromSubjects = subjects && subjects.length > 0 && subjects[0]?.grade ? `${subjects[0].grade}°` : ''

  let resolvedGrade = rawGrade || gradeFromSubjects
  if (!resolvedGrade && resolvedGroupName.includes('-')) {
    resolvedGrade = resolvedGroupName.split('-')[0].trim()
  }
  if (resolvedGrade && !resolvedGrade.includes('°') && !isNaN(Number(resolvedGrade))) {
    resolvedGrade = `${resolvedGrade}°`
  }
  if (!resolvedGrade) resolvedGrade = 'Registrado'

  let resolvedGroup = resolvedGroupName || 'Sin grupo asignado'
  if (resolvedGroupName && !resolvedGroupName.includes('-') && resolvedGrade && resolvedGrade !== 'Registrado') {
    resolvedGroup = `${resolvedGrade}-${resolvedGroupName}`
  }

  return (
    <AcademicPortalClientView
      session={session}
      subjects={subjects}
      scheduleData={scheduleData}
      resolvedGrade={resolvedGrade}
      resolvedGroup={resolvedGroup}
    />
  )
}
