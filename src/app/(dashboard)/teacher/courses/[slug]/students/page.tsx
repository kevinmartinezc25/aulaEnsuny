import React from 'react'
import { TeacherCourseStudentsScreen } from '@/modules/courses/presentation/screens/TeacherCourseStudentsScreen'

export default async function CourseStudentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseStudentsScreen courseId={id} />
}
