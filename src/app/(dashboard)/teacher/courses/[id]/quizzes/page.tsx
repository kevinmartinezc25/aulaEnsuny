import React from 'react'
import { TeacherCourseQuizzesScreen } from '@/modules/courses/presentation/screens/TeacherCourseQuizzesScreen'

export default async function CourseQuizzesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseQuizzesScreen courseId={id} />
}
