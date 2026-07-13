import React from 'react'
import { TeacherCourseDashboardScreen } from '@/modules/courses/presentation/screens/TeacherCourseDashboardScreen'

export default async function CourseDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseDashboardScreen courseId={id} />
}
