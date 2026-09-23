const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Load env vars
const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) envs[match[1]] = match[2].trim()
})

const supabase = createClient(envs['NEXT_PUBLIC_SUPABASE_URL'], envs['SUPABASE_SERVICE_ROLE_KEY'])

async function check() {
  const { data: dirs } = await supabase.from('student_directory').select('profile_id, grade_level, group_name').limit(5)
  console.log('Dirs:', dirs)

  const { data: groups } = await supabase.from('sch_groups').select('id, name')
  console.log('Groups:', groups.map(g => g.name))

  const { data: slots } = await supabase.from('sch_schedule_slots').select('group_id').limit(10)
  console.log('Slots group_ids:', [...new Set(slots.map(s => s.group_id))])
}
check()
