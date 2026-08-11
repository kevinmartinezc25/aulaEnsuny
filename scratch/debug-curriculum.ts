import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

async function debugGen() {
  const { data: curr } = await supabase.from('sch_curriculum').select('*, teacher:profiles(first_name, last_name), group:sch_groups(name), subject:sch_subjects(name)')
  
  // Group by teacher to see who has which subjects
  const byTeacher = new Map<string, any[]>()
  curr?.forEach((c: any) => {
    const tName = c.teacher ? `${c.teacher.first_name} ${c.teacher.last_name}` : 'No teacher'
    const gName = c.group?.name || 'NO GROUP (null)'
    if (!byTeacher.has(tName)) byTeacher.set(tName, [])
    byTeacher.get(tName)!.push({ g: gName, s: c.subject?.name || 'unknown', h: c.hours_per_week, group_id: c.group_id, teacher_id: c.teacher_id })
  })

  console.log('\n=== CURRICULUM BY TEACHER ===\n')
  for (const [teacher, rows] of byTeacher.entries()) {
    const totalH = rows.reduce((s, r) => s + (r.h || 0), 0)
    console.log(`\nDocente: ${teacher} (${totalH}h total)`)
    rows.forEach(r => {
      const gLabel = r.group_id ? r.g : '⚠️ NULL GROUP'
      console.log(`  - [${gLabel}] ${r.s}: ${r.h}h`)
    })
  }

  console.log('\n=== ENTRIES WITH NULL group_id ===')
  const nullGroup = curr?.filter((c: any) => !c.group_id)
  console.log(`Entries with null group_id: ${nullGroup?.length}`)
  nullGroup?.forEach((c: any) => {
    const tName = c.teacher ? `${c.teacher.first_name} ${c.teacher.last_name}` : 'No teacher'
    console.log(`  - ${tName}: ${c.subject?.name} (${c.hours_per_week}h) - teacher_id: ${c.teacher_id}`)
  })
}

debugGen().catch(console.error)
