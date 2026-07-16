import { TeacherCourseJoinRequestsScreen } from '@/modules/courses/presentation/screens/TeacherCourseJoinRequestsScreen'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TeacherCourseRequestsPage({ params }: Props) {
  const { id } = await params
  return <TeacherCourseJoinRequestsScreen courseId={id} />
}
