import React from 'react'
import { TeacherCourseForumsScreen } from '@/modules/courses/presentation/screens/TeacherCourseForumsScreen'

export default async function ForumsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseForumsScreen courseId={id} />
}
