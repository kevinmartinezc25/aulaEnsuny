import { Metadata } from 'next'
import { AdminEnrollStudentScreen } from '@/modules/admin/presentation/screens/AdminEnrollStudentScreen'

export const metadata: Metadata = {
  title: 'Ficha Académica de Estudiante | aulaEnsuny Admin',
  description: 'Edición de la ficha académica integral y asignación de cursos.',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditStudentPage({ params }: PageProps) {
  const resolvedParams = await params
  const studentId = resolvedParams?.id

  return <AdminEnrollStudentScreen studentId={studentId} />
}
