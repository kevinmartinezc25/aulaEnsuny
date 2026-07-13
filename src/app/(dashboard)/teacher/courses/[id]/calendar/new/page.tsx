import React from 'react'
import { TeacherCreateEventScreen } from '@/modules/courses/presentation/screens/TeacherCreateEventScreen'

export default async function CreateEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherCreateEventScreen courseId={id} />
}
