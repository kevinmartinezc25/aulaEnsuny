import React from 'react'
import { TeacherForumBoardScreen } from '@/modules/courses/presentation/screens/TeacherForumBoardScreen'

export default async function ForumBoardPage({ 
  params 
}: { 
  params: Promise<{ id: string; forumId: string }> 
}) {
  const { id, forumId } = await params
  return <TeacherForumBoardScreen courseId={id} forumId={forumId} />
}
