import React from 'react'
import { TeacherCreateResourceScreen } from '@/modules/courses/presentation/screens/TeacherCreateResourceScreen'
import { createClient } from '@/core/config/supabase/server'

export default async function CreateResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) return <div>Curso no encontrado</div>
  const supabase = await createClient()
  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', id)
    .single()
  const courseName = course?.title || 'Curso'
  return <TeacherCreateResourceScreen courseId={id} courseName={courseName} />
}
