import { Metadata } from 'next'
import { StudentAttendanceDetailScreen } from '@/modules/students/presentation/screens/StudentAttendanceDetailScreen'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detalle de Asistencia | aulaEnsuny',
  description: 'Trazabilidad de asistencia por materia',
}

interface PageProps {
  params: Promise<{
    subjectId: string
  }>
}

export default async function StudentAttendanceSubjectPage({ params }: PageProps) {
  const resolvedParams = await params
  return <StudentAttendanceDetailScreen subjectId={resolvedParams.subjectId} />
}
