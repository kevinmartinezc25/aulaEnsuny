import React from 'react'
import { TeacherCourseGradesScreen } from '@/modules/courses/presentation/screens/TeacherCourseGradesScreen'

export default async function CourseGradesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseGradesScreen courseId={id} />
}
