import React from 'react'
import { TeacherCreateQuizScreen } from '@/modules/courses/presentation/screens/TeacherCreateQuizScreen'

export default async function EditQuizPage({ params }: { params: Promise<{ slug: string; quizId: string }> }) {
  const { slug: id, quizId } = await params
  return <TeacherCreateQuizScreen courseId={id} quizId={quizId} />
}
