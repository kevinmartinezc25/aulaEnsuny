import React from 'react'
import { TeacherCourseAnnouncementsScreen } from '@/modules/courses/presentation/screens/TeacherCourseAnnouncementsScreen'

export default async function TeacherAnnouncementsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseAnnouncementsScreen courseId={id} />
}
