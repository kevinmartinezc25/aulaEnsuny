import React from 'react'
import { TeacherCourseDashboardScreen } from '@/modules/courses/presentation/screens/TeacherCourseDashboardScreen'

export default async function CourseDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseDashboardScreen courseId={id} />
}
