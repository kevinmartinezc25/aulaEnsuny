import React from 'react'
import { TeacherCreateEventScreen } from '@/modules/courses/presentation/screens/TeacherCreateEventScreen'

export default async function EditEventPage({ params }: { params: Promise<{ id: string, eventId: string }> }) {
  const { id, eventId } = await params
  return <TeacherCreateEventScreen courseId={id} eventId={eventId} />
}
