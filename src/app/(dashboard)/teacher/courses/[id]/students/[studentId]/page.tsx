import { TeacherStudentProfileScreen } from '@/modules/courses/presentation/screens/TeacherStudentProfileScreen'

export default async function CourseStudentProfilePage({ params }: { params: Promise<{ id: string, studentId: string }> }) {
  const { id, studentId } = await params
  return <TeacherStudentProfileScreen courseId={id} studentId={studentId} />
}
