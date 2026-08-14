import React from 'react'
import { TeacherCourseSettingsScreen } from '@/modules/courses/presentation/screens/TeacherCourseSettingsScreen'

export default async function CourseSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseSettingsScreen courseId={id} />
}
