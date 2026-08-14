import { TeacherCourseJoinRequestsScreen } from '@/modules/courses/presentation/screens/TeacherCourseJoinRequestsScreen'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function TeacherCourseRequestsPage({ params }: Props) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseJoinRequestsScreen courseId={id} />
}
