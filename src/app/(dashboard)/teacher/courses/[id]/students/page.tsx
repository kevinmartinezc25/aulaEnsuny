import React from 'react'
import { TeacherCourseStudentsScreen } from '@/modules/courses/presentation/screens/TeacherCourseStudentsScreen'

export default async function CourseStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseStudentsScreen courseId={id} />
}
