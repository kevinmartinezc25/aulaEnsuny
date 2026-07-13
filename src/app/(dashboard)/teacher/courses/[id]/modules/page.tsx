import React from 'react'
import { TeacherCourseModulesScreen } from '@/modules/courses/presentation/screens/TeacherCourseModulesScreen'

export default async function CourseModulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseModulesScreen courseId={id} />
}
