import React from 'react'
import { TeacherCreateQuizScreen } from '@/modules/courses/presentation/screens/TeacherCreateQuizScreen'

export default async function CreateQuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  return <TeacherCreateQuizScreen courseId={id} />
}
