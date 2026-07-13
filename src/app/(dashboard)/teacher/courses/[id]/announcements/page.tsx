import React from 'react'
import { TeacherCourseAnnouncementsScreen } from '@/modules/courses/presentation/screens/TeacherCourseAnnouncementsScreen'

export default async function TeacherAnnouncementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCourseAnnouncementsScreen courseId={id} />
}
