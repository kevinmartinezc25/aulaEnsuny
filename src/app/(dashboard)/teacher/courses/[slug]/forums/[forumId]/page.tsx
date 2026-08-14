import React from 'react'
import { TeacherForumBoardScreen } from '@/modules/courses/presentation/screens/TeacherForumBoardScreen'

export default async function ForumBoardPage({ 
  params 
}: { 
  params: Promise<{ slug: string; forumId: string }> 
}) {
  const { slug: id, forumId } = await params
  return <TeacherForumBoardScreen courseId={id} forumId={forumId} />
}
