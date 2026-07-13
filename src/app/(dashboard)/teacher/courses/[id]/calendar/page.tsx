import React from 'react'
import { TeacherCourseCalendarScreen } from '@/modules/courses/presentation/screens/TeacherCourseCalendarScreen'

export default async function CourseCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseCalendarScreen courseId={id} />
}
