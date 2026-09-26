import React from 'react'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { getStudentSubjects, getStudentGroupSchedule } from '@/modules/planilla-asistida/application/studentQueries'
import { getStudentPortalDisciplinaryData } from '@/modules/disciplinary/application/studentDisciplinaryActions'
import { getStudentAttendanceOverview } from '@/modules/planilla-asistida/application/studentAttendanceQueries'
import { redirect } from 'next/navigation'
import { AcademicPortalClientView } from './AcademicPortalClientView'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ConsultaDashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const viewParam = (resolvedParams?.view as string) || 'dashboard'

  const session = await getPlanillaStudentSession()
  if (!session) {
    redirect('/consulta-calificaciones/login')
  }

  const [subjects, scheduleData, disciplinaryData, attendanceData] = await Promise.all([
    getStudentSubjects().catch(() => []),
    getStudentGroupSchedule().catch(() => ({
      success: false,
      hasGroup: false,
      isPublished: false,
      groupName: session.groupName || '',
      groupId: null,
      schedule: { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [] }
    })),
    getStudentPortalDisciplinaryData().catch(() => ({
      summary: {
        totalReports: 0,
        tipoI: 0,
        tipoII: 0,
        tipoIII: 0,
        openCases: 0,
        closedCases: 0,
        recentReports: []
      },
      reports: []
    })),
    getStudentAttendanceOverview().catch(() => ({
      summary: {
        totalSubjects: 0,
        totalSessions: 0,
        totalAttended: 0,
        totalTardy: 0,
        totalUnjustified: 0,
        totalExcused: 0,
        overallPercentage: 100
      },
      subjects: []
    }))
  ])

  // Resolver grado y grupo oficial en el servidor
  const rawGrade = session.gradeLevel || ''
  const resolvedGroupName = scheduleData.groupName || session.groupName || ''
  const isPfc12 = /pfc[\s\-_]?12/i.test(rawGrade) || /pfc[\s\-_]?12/i.test(resolvedGroupName)
  const isPfc13 = /pfc[\s\-_]?13/i.test(rawGrade) || /pfc[\s\-_]?13/i.test(resolvedGroupName)
  const isNiv = /nivelat/i.test(rawGrade) || /nivelat/i.test(resolvedGroupName)

  let resolvedGrade = rawGrade
  if (isPfc12) resolvedGrade = 'PFC-12'
  else if (isPfc13) resolvedGrade = 'PFC-13'
  else if (isNiv) resolvedGrade = 'Nivelatorio'
  else if (!resolvedGrade && subjects && subjects.length > 0 && subjects[0]?.grade) {
    resolvedGrade = `${subjects[0].grade}°`
  }

  if (!resolvedGrade && resolvedGroupName.includes('-')) {
    resolvedGrade = resolvedGroupName.split('-')[0].trim()
  }
  if (resolvedGrade && !resolvedGrade.includes('°') && !isNaN(Number(resolvedGrade))) {
    resolvedGrade = `${resolvedGrade}°`
  }
  if (!resolvedGrade) resolvedGrade = 'Registrado'

  let resolvedGroup = resolvedGroupName || 'Sin grupo asignado'
  if (isPfc12) resolvedGroup = 'PFC-12'
  else if (isPfc13) resolvedGroup = session.groupName && !session.groupName.includes('PFC') ? `PFC-13-${session.groupName}` : 'PFC-13'
  else if (isNiv) resolvedGroup = 'Nivelatorio'
  else if (resolvedGroupName && !resolvedGroupName.includes('-') && resolvedGrade && resolvedGrade !== 'Registrado') {
    resolvedGroup = `${resolvedGrade}-${resolvedGroupName}`
  }

  return (
    <AcademicPortalClientView
      session={session}
      subjects={subjects}
      scheduleData={scheduleData}
      disciplinaryData={disciplinaryData}
      attendanceData={attendanceData}
      resolvedGrade={resolvedGrade}
      resolvedGroup={resolvedGroup}
      initialView={viewParam}
    />
  )
}

