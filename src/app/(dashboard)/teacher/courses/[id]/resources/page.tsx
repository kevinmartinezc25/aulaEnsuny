import React from 'react'
import { TeacherCourseResourcesScreen } from '@/modules/courses/presentation/screens/TeacherCourseResourcesScreen'

export default async function CourseResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseResourcesScreen courseId={id} />
}
