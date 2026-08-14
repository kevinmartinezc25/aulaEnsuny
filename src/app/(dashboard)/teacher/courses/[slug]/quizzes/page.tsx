import React from 'react'
import { TeacherCourseQuizzesScreen } from '@/modules/courses/presentation/screens/TeacherCourseQuizzesScreen'

export default async function CourseQuizzesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseQuizzesScreen courseId={id} />
}
