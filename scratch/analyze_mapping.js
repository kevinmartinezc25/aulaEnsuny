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

async function analyze() {
  console.log('--- 1. ESTUDIANTES ---')
  const { data: students } = await supabase.from('student_directory').select('id, profile_id, grade_level, group_name').limit(10)
  console.log('Muestra de estudiantes:', students)

  console.log('\n--- 2. GRUPOS EN EL HORARIO (sch_groups) ---')
  const { data: groups } = await supabase.from('sch_groups').select('id, name')
  console.log('Grupos escolares oficiales:', groups.map(g => ({ id: g.id, name: g.name })))

  console.log('\n--- 3. SLOTS DE HORARIO (sch_schedule_slots) ---')
  const { data: slots } = await supabase.from('sch_schedule_slots').select('group_id')
  
  const slotCountsByGroup = slots.reduce((acc, slot) => {
    acc[slot.group_id] = (acc[slot.group_id] || 0) + 1
    return acc
  }, {})
  
  const groupsWithSlots = groups.map(g => ({
    name: g.name,
    slotCount: slotCountsByGroup[g.id] || 0
  }))
  console.log('Slots por grupo:', groupsWithSlots)
  
  console.log('\n--- 4. PRUEBA DE RESOLUCIÓN ---')
  const { resolveOfficialGroup } = require('./src/modules/planilla-asistida/application/groupResolver')
  
  for (const s of students) {
    const resolved = resolveOfficialGroup(groups, s.grade_level, s.group_name)
    console.log(`Estudiante [Grado: ${s.grade_level}, Grupo: ${s.group_name}] -> Resuelve a:`, resolved ? resolved.groupName : 'NULL')
  }
}

analyze()
