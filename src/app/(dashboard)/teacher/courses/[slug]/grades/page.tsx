import React from 'react'
import { TeacherCourseGradesScreen } from '@/modules/courses/presentation/screens/TeacherCourseGradesScreen'

export default async function CourseGradesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseGradesScreen courseId={id} />
}
