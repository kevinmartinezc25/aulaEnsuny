import React from 'react'
import { TeacherCourseForumsScreen } from '@/modules/courses/presentation/screens/TeacherCourseForumsScreen'

export default async function ForumsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseForumsScreen courseId={id} />
}
