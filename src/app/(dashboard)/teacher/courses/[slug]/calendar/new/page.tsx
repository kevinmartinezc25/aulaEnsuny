import React from 'react'
import { TeacherCreateEventScreen } from '@/modules/courses/presentation/screens/TeacherCreateEventScreen'

export default async function CreateEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCreateEventScreen courseId={id} />
}
