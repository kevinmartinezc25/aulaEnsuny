import { Metadata } from 'next'
import { CourseDetailScreen } from '@/modules/courses/presentation/screens/CourseDetailScreen'

export const dynamic = 'force-dynamic'

interface CoursePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const resolvedParams = await params
  const courseId = resolvedParams?.id

  if (!courseId) {
    return {
      title: 'Curso | aulaEnsuny',
    }
  }

  // Capitalizar y formatear el título del curso
  const title = courseId.charAt(0).toUpperCase() + courseId.slice(1).replace(/-/g, ' ')

  return {
    title: `${title} | aulaEnsuny`,
    description: `Navega por las lecciones, visualiza los videos explicativos, descarga materiales adicionales y presenta tus quizzes del curso.`,
  }
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const resolvedParams = await params
  const courseId = resolvedParams?.id

  if (!courseId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm font-semibold text-slate-500">Cargando curso...</p>
      </div>
    )
  }

  return <CourseDetailScreen courseId={courseId} />
}
