import { TeacherCourseSubmissionsScreen } from '@/modules/courses/presentation/screens/TeacherCourseSubmissionsScreen'

export default async function CourseSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseSubmissionsScreen courseId={id} />
}
