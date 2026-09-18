import React from 'react'
import { redirect } from 'next/navigation'
import { getPlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import StudentLoginClient from './StudentLoginClient'

export const metadata = {
  title: 'Ingreso Estudiantes - aulaEnsuny',
}

export default async function StudentLoginPage() {
  const session = await getPlanillaStudentSession()
  
  if (session) {
    redirect('/consulta-calificaciones')
  }

  return <StudentLoginClient />
}
