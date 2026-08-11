import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

async function diagnoseMismatch() {
  console.log('=== DIAGNOSTICANDO DESALINEACIÓN ENTRE MALLA CURRICULAR Y HORARIO ===\n')

  const { data: slots } = await supabase
    .from('sch_schedule_slots')
    .select('id, subject_id, teacher_id, group_id, day_of_week, period_id, duration')
    .limit(10)

  console.log(`Total slots en BD: (muestra primeros 10)`)
  slots?.forEach(s => {
    console.log(`  - [${s.id}] teacher_id=${s.teacher_id} | group_id=${s.group_id} | subject_id=${s.subject_id} | ${s.day_of_week} P${s.period_id} (${s.duration}h)`)
  })

  // Check how many have null teacher_id
  const { data: allSlots } = await supabase.from('sch_schedule_slots').select('teacher_id')
  const withNull = allSlots?.filter(s => !s.teacher_id).length || 0
  const withTeacher = allSlots?.filter(s => s.teacher_id).length || 0
  console.log(`\nSlots con teacher_id: ${withTeacher}`)
  console.log(`Slots sin teacher_id (null): ${withNull}`)
  console.log(`Total slots: ${allSlots?.length}`)

  // Check curriculum entries
  const { data: curr } = await supabase.from('sch_curriculum').select('teacher_id, group_id, subject_id, hours_per_week').limit(5)
  console.log(`\nMuestra de malla curricular:`)
  curr?.forEach(c => {
    console.log(`  - teacher_id=${c.teacher_id} | group_id=${c.group_id} | subject_id=${c.subject_id} | ${c.hours_per_week}h/semana`)
  })
}

diagnoseMismatch().catch(console.error)
