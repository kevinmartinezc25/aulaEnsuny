import { TeacherCourseSubmissionsScreen } from '@/modules/courses/presentation/screens/TeacherCourseSubmissionsScreen'

export default async function CourseSubmissionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseSubmissionsScreen courseId={id} />
}
