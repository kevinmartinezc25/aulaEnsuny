import { TeacherStudentProfileScreen } from '@/modules/courses/presentation/screens/TeacherStudentProfileScreen'

export default async function CourseStudentProfilePage({ params }: { params: Promise<{ slug: string, studentId: string }> }) {
  const { slug: id, studentId } = await params
  return <TeacherStudentProfileScreen courseId={id} studentId={studentId} />
}
