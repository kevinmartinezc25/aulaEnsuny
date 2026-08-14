import React from 'react'
import { TeacherLessonEditorScreen } from '@/modules/courses/presentation/screens/TeacherLessonEditorScreen'

export default async function LessonEditorPage({ params, searchParams }: { params: Promise<{ slug: string, lessonId: string }>, searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug: id, lessonId } = await params
  const resolvedSearchParams = await searchParams
  const type = resolvedSearchParams?.type as string | undefined
  const moduleId = resolvedSearchParams?.moduleId as string | undefined
  return <TeacherLessonEditorScreen courseId={id} lessonId={lessonId} initialType={type} moduleId={moduleId} />
}
