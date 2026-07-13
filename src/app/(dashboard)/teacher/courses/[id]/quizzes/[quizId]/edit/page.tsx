import React from 'react'
import { TeacherCreateQuizScreen } from '@/modules/courses/presentation/screens/TeacherCreateQuizScreen'

export default async function EditQuizPage({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const { id, quizId } = await params
  return <TeacherCreateQuizScreen courseId={id} quizId={quizId} />
}
