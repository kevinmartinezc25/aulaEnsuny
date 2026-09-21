import React from 'react'
import { createAdminClient } from '@/core/config/supabase/server'
import TeachersClientView from './TeachersClientView'

export const metadata = {
  title: 'Docentes (Horarios) - aulaEnsuny',
}

export default async function TeachersPage() {
  const supabase = createAdminClient()

  // Fetch all platform profiles that are teachers
  const { data: platformProfilesRaw, error: profError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, roles!inner(name)')
    .eq('roles.name', 'teacher')
    .eq('status', 'active')
    .order('first_name')

  if (profError) console.error('Error fetching platform profiles:', profError)

  // Fetch all auth users to map emails (SuperAdmin / Admin Client only)
  let authUsersMap: Record<string, string> = {}
  try {
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
      perPage: 1000
    })
    if (!usersError && users) {
      authUsersMap = users.reduce((acc: any, u) => {
        acc[u.id] = u.email || ''
        return acc
      }, {})
    }
  } catch (err) {
    console.error('Error fetching auth users:', err)
  }

  const platformProfiles = (platformProfilesRaw || []).map((p: any) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    email: authUsersMap[p.id] || 'Sin correo'
  }))

  const { data: teachersRaw, error } = await supabase
    .from('academic_teachers')
    .select('id, full_name, profile_id, profiles(id, first_name, last_name)')
    .eq('is_active', true)
    .order('full_name')

  if (error) console.error('Error fetching teachers:', error)

  // Fix possible array mappings for profiles relationship and map email
  // Normalizar profile_id siempre a string | null (nunca undefined)
  const teachers = (teachersRaw || []).map((t: any) => {
    const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
    return {
      ...t,
      profile_id: t.profile_id ?? null,
      profiles: profile ? {
        ...profile,
        email: authUsersMap[profile.id] || 'Sin correo'
      } : null
    }
  })

  // Fetch academic load from the Master Data view
  const { data: assignments, error: assignError } = await supabase
    .from('v_teacher_academic_load')
    .select('*')
    .order('teacher_name')

  if (assignError) {
    console.error('Error fetching academic load:', assignError)
  }

  const totalTeachers = teachers.length
  const linkedTeachers = teachers.filter((t: any) => t.profile_id).length
  const pendingTeachers = totalTeachers - linkedTeachers

  return (
    <TeachersClientView 
      initialTeachers={teachers} 
      platformProfiles={platformProfiles}
      allAssignments={assignments || []}
      totalTeachers={totalTeachers}
      linkedTeachers={linkedTeachers}
      pendingTeachers={pendingTeachers}
    />
  )
}
