import React from 'react'
import { TeacherCourseResourcesScreen } from '@/modules/courses/presentation/screens/TeacherCourseResourcesScreen'

export default async function CourseResourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseResourcesScreen courseId={id} />
}
