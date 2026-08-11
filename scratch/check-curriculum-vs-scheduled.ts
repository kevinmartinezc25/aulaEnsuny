import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

async function checkCurriculumVsScheduled() {
  console.log('=== CARGA ACADÉMICA vs HORAS ASIGNADAS EN HORARIO ===\n')

  const { data: curr } = await supabase
    .from('sch_curriculum')
    .select('subject_id, teacher_id, group_id, hours_per_week, subject:sch_subjects(name), group:sch_groups(name), teacher:profiles(first_name, last_name)')

  const { data: slots } = await supabase
    .from('sch_schedule_slots')
    .select('subject_id, teacher_id, group_id, duration')

  const scheduledHours = new Map<string, number>()
  slots?.forEach((s: any) => {
    const key = `${s.group_id}-${s.subject_id}-${s.teacher_id}`
    scheduledHours.set(key, (scheduledHours.get(key) || 0) + (s.duration || 1))
  })

  let totalMissing = 0
  let totalRequired = 0

  console.log(`Total filas en Malla Curricular: ${curr?.length}`)
  console.log(`Total slots en sch_schedule_slots: ${slots?.length}`)
  console.log(`\nDetalle de diferencias (solo donde hay horas faltantes):`)

  curr?.forEach((c: any) => {
    if (!c.group_id || !c.teacher_id || !c.hours_per_week) return
    const key = `${c.group_id}-${c.subject_id}-${c.teacher_id}`
    const assigned = scheduledHours.get(key) || 0
    const missing = c.hours_per_week - assigned
    totalRequired += c.hours_per_week

    if (missing !== 0) {
      const gName = c.group?.name || c.group_id
      const sName = c.subject?.name || c.subject_id
      const tName = c.teacher ? `${c.teacher.first_name} ${c.teacher.last_name}` : c.teacher_id
      totalMissing += Math.max(0, missing)
      const status = missing > 0 ? `⚠️ FALTAN ${missing}h` : `✅ OK (${assigned}h)`
      console.log(`  ${status} | Grupo: "${gName}" | Materia: "${sName}" | Docente: "${tName}" | Requeridas: ${c.hours_per_week}h | Asignadas: ${assigned}h`)
    }
  })

  console.log(`\n=== RESUMEN ===`)
  console.log(`Total horas requeridas en carga académica: ${totalRequired}h`)
  console.log(`Total horas faltantes en horario: ${totalMissing}h`)
  console.log(`Cobertura: ${Math.round(((totalRequired - totalMissing) / totalRequired) * 100)}%`)
}

checkCurriculumVsScheduled().catch(console.error)
