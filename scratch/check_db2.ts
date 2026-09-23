import { createAdminClient } from '@/core/config/supabase/server'
import { resolveOfficialGroup } from '@/modules/planilla-asistida/application/groupResolver'

async function check() {
  const supabase = createAdminClient()
  
  // get user profile_id
  const { data: profiles } = await supabase.from('profiles').select('*').limit(5)
  console.log('Profiles:', profiles?.map(p => ({ id: p.id, first: p.first_name, last: p.last_name })))
  
  const { data: dirs } = await supabase.from('student_directory').select('*')
  console.log('Dirs:', dirs?.map(d => ({ profile_id: d.profile_id, grade: d.grade_level, group: d.group_name })))
  
  const { data: allGroups } = await supabase.from('sch_groups').select('id, name')
  console.log('Groups:', allGroups)
  
  for (const dir of dirs || []) {
      const resolved = resolveOfficialGroup(allGroups || [], dir.grade_level, dir.group_name)
      console.log(`Resolved for ${dir.grade_level} ${dir.group_name}:`, resolved)
      if (resolved) {
          const { data: slots } = await supabase.from('sch_schedule_slots').select('id').eq('group_id', resolved.groupId)
          console.log(`Slots for ${resolved.groupName}:`, slots?.length)
      }
  }
}
check()
