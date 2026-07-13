import React from 'react'
import { TeacherCourseSettingsScreen } from '@/modules/courses/presentation/screens/TeacherCourseSettingsScreen'

export default async function CourseSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseSettingsScreen courseId={id} />
}
