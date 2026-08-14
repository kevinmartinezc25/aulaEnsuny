import React from 'react'
import { TeacherCreateResourceScreen } from '@/modules/courses/presentation/screens/TeacherCreateResourceScreen'

export default async function EditResourcePage({ params }: { params: Promise<{ slug: string, resourceId: string }> }) {
  const { slug: id, resourceId } = await params
  return <TeacherCreateResourceScreen courseId={id} resourceId={resourceId} />
}
