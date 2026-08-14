import React from 'react'
import { TeacherCourseModulesScreen } from '@/modules/courses/presentation/screens/TeacherCourseModulesScreen'

export default async function CourseModulesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseModulesScreen courseId={id} />
}
