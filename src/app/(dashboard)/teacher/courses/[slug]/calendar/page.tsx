import React from 'react'
import { TeacherCourseCalendarScreen } from '@/modules/courses/presentation/screens/TeacherCourseCalendarScreen'

export default async function CourseCalendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCourseCalendarScreen courseId={id} />
}
