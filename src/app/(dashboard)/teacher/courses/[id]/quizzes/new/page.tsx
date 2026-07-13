import React from 'react'
import { TeacherCreateQuizScreen } from '@/modules/courses/presentation/screens/TeacherCreateQuizScreen'

export default async function CreateQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCreateQuizScreen courseId={id} />
}
