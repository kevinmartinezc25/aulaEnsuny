import React from 'react'
import { createAdminClient } from '@/core/config/supabase/server'
import GroupsClientView from './GroupsClientView'
import { isOfficialGradeGroup } from '../utils/groupFilters'

export const metadata = {
  title: 'Grupos Escolares - aulaEnsuny',
}

function sortGroupsNaturally<T extends { name: string }>(a: T, b: T): number {
  const matchA = a.name.match(/^(\d+)[°º\-]?\s*(\d+)?/)
  const matchB = b.name.match(/^(\d+)[°º\-]?\s*(\d+)?/)

  if (matchA && matchB) {
    const gradeA = parseInt(matchA[1], 10)
    const gradeB = parseInt(matchB[1], 10)
    if (gradeA !== gradeB) return gradeA - gradeB
    const subA = matchA[2] ? parseInt(matchA[2], 10) : 0
    const subB = matchB[2] ? parseInt(matchB[2], 10) : 0
    if (subA !== subB) return subA - subB
  }

  if (matchA && !matchB) return -1
  if (!matchA && matchB) return 1

  const isNivelA = a.name.toLowerCase().includes('nivel')
  const isNivelB = b.name.toLowerCase().includes('nivel')
  if (isNivelA && !isNivelB) return -1
  if (!isNivelA && isNivelB) return 1

  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

export default async function GroupsPage() {
  const supabase = createAdminClient()

  // Fetch groups
  const { data: rawGroups, error: groupsError } = await supabase
    .from('sch_groups')
    .select('id, name, level, director_id, profiles!sch_groups_director_id_fkey(first_name, last_name)')
    .order('name')

  if (groupsError) console.error('Error fetching groups:', groupsError)

  // Filtrar únicamente los grupos escolares oficiales
  const groups = (rawGroups || []).filter((g: any) => isOfficialGradeGroup(g.name))

  // Fetch available directors (Profiles with role teacher)
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, roles!inner(name)')
    .eq('roles.name', 'teacher')
    .eq('status', 'active')
    .order('first_name')

  if (profError) console.error('Error fetching profiles:', profError)

  // Count groups by level
  const levelsCount = groups.reduce((acc: Record<string, number>, group: any) => {
    const lvl = group.level || 'Sin nivel'
    acc[lvl] = (acc[lvl] || 0) + 1
    return acc
  }, {}) || {}

  let mappedGroups = groups.map((g: any) => ({
    id: g.id,
    name: g.name,
    level: g.level,
    director_id: g.director_id,
    profiles: Array.isArray(g.profiles) ? g.profiles[0] : g.profiles
  }))

  // Ordenamiento natural (6°-1 < 6°-2 < ... < 11°-2 < Nivelatorio < PFC)
  mappedGroups.sort(sortGroupsNaturally)

  return (
    <GroupsClientView 
      initialGroups={mappedGroups} 
      levelsCount={levelsCount} 
      availableDirectors={(profiles as any) || []} 
    />
  )
}
