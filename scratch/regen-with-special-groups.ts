import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { ScheduleGenerator, GeneratorConfig } from '../src/app/admin/schedules/engine/Generator'
import { RuleContext } from '../src/app/admin/schedules/engine/types'

dotenv.config({ path: '.env.local' })

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

// IDs de grupos especiales (materias que no bloquean el horario del docente)
const SPECIAL_GROUP_SUBJECT_IDS = [
  'f0e1f474-9fed-4786-af03-d93b4cb58151', // Nucleo Ciencias
  '4aa1b8e6-5392-42a5-9d53-c283ddf03b62', // Núcleo Humanidades
  '5772b40c-5143-47d1-99d1-09c845526636', // Comité De Investigación
]

const SPECIAL_GROUP_IDS = [
  'be803c4e-f105-4b99-aaa4-d5e0cd30d0aa', // Nucleo Ciencias
  'eef9b384-396a-4b72-b08a-7839303f1e16', // Núcleo Humanidades
  'c455a76f-3cea-46c5-b273-2882da3ece22', // Comité de Investigación
]

async function run() {
  console.log('=== REGENERACIÓN CON GRUPOS ESPECIALES CORRECTAMENTE CONFIGURADOS ===\n')
  
  const { data: currData } = await supabase.from('sch_curriculum').select('*')
  const { data: constraintsData } = await supabase.from('sch_constraints').select('*')
  const { data: timeOffData } = await supabase.from('sch_time_off').select('*')

  const dbBlockConstraint = (constraintsData || []).find((c: any) => c.rule_type === 'BLOCK_SUBJECTS_CONFIG' && c.is_active !== false)
  const blockSubjects: string[] = dbBlockConstraint?.parameters?.subject_ids ?? []
  // No incluir materias de grupos especiales como materias en bloque
  const filteredBlockSubjects = blockSubjects.filter(id => !SPECIAL_GROUP_SUBJECT_IDS.includes(id))
  console.log(`Block subjects: ${filteredBlockSubjects.length} (excluidos ${blockSubjects.length - filteredBlockSubjects.length} de grupos especiales)`)

  // Identificar multi-docente: grupos regulares con más de 1 docente para la misma materia
  const groupSubjectTeachers = new Map<string, Set<string>>()
  currData?.forEach((row: any) => {
    if (!row.group_id || !row.subject_id || !row.teacher_id) return
    if (SPECIAL_GROUP_IDS.includes(row.group_id)) return // ignorar grupos especiales en este análisis
    const key = `${row.group_id}-${row.subject_id}`
    if (!groupSubjectTeachers.has(key)) groupSubjectTeachers.set(key, new Set())
    groupSubjectTeachers.get(key)!.add(row.teacher_id)
  })
  const multiTeacherSubjSet = new Set<string>()
  for (const [key, tSet] of groupSubjectTeachers.entries()) {
    if (tSet.size > 1) {
      const subjectId = key.split('-')[1]
      if (subjectId) multiTeacherSubjSet.add(subjectId)
    }
  }

  const context: RuleContext = {
    multiTeacherSubjectIds: Array.from(multiTeacherSubjSet),
    normalWorkloadSubjectIds: SPECIAL_GROUP_SUBJECT_IDS, // ← CLAVE: permite solapamiento en estos subjects
    constraints: (constraintsData || []).map((c: any) => ({
      ruleType: c.rule_type, targetEntityType: c.target_entity_type, targetEntityId: c.target_entity_id,
      parameters: c.parameters, weight: c.weight, isActive: c.is_active
    })),
    timeOff: (timeOffData || []).map((t: any) => ({
      id: t.id, entityType: t.entity_type, entityId: t.entity_id,
      teacherId: t.entity_type === 'TEACHER' ? t.entity_id : undefined,
      groupId: t.entity_type === 'GROUP' ? t.entity_id : undefined,
      dayOfWeek: t.day_of_week, periodId: t.period_id, status: t.status
    })),
    maxPeriodsPerDay: 7,
    breakPeriods: []
  }

  const validCurr = currData?.filter((c: any) => c.teacher_id && c.group_id) || []
  const blocksToAssign: any[] = []
  const slotCounters = new Map<string, number>()
  
  validCurr.forEach((c: any) => {
    let hoursLeft = c.hours_per_week
    const isBlockSubject = filteredBlockSubjects.includes(c.subject_id)
    const counterKey = `${c.group_id}-${c.subject_id}-${c.teacher_id}`
    let slotIdx = slotCounters.get(counterKey) || 0
    if (isBlockSubject) {
      while (hoursLeft >= 2) {
        blocksToAssign.push({ subject_id: c.subject_id, teacher_id: c.teacher_id, group_id: c.group_id, duration: 2, slotIndex: slotIdx++ })
        hoursLeft -= 2
      }
    }
    while (hoursLeft > 0) {
      blocksToAssign.push({ subject_id: c.subject_id, teacher_id: c.teacher_id, group_id: c.group_id, duration: 1, slotIndex: slotIdx++ })
      hoursLeft -= 1
    }
    slotCounters.set(counterKey, slotIdx)
  })

  console.log(`Total bloques a asignar: ${blocksToAssign.length}`)

  const config: GeneratorConfig = {
    curriculum: blocksToAssign,
    context,
    days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    periodsPerDay: 7,
    breakPeriods: []
  }

  const generator = new ScheduleGenerator()
  const result = await generator.generate(config)
  console.log(`\n✅ RESULTADO: ${result.schedule.length}/${blocksToAssign.length} sesiones asignadas`)
  console.log(`❌ Sin asignar: ${result.unassigned.length}`)

  if (result.unassigned.length > 0) {
    const { data: subjects } = await supabase.from('sch_subjects').select('id, name')
    const { data: groups } = await supabase.from('sch_groups').select('id, name')
    const subMap = new Map((subjects || []).map((s: any) => [s.id, s.name]))
    const grpMap = new Map((groups || []).map((g: any) => [g.id, g.name]))
    console.log('\nDetalle de no asignados:')
    result.unassigned.forEach(u => {
      console.log(`  - [${grpMap.get(u.group_id) || u.group_id}] ${subMap.get(u.subject_id) || u.subject_id}: ${u.duration}h`)
    })
  }

  // Guardar en BD
  console.log('\nGuardando en BD...')
  await supabase.from('sch_schedule_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  const BATCH = 200
  for (let i = 0; i < result.schedule.length; i += BATCH) {
    const batch = result.schedule.slice(i, i + BATCH).map(s => ({
      day_of_week: s.dayOfWeek,
      period_id: s.periodId,
      group_id: s.groupId,
      subject_id: s.subjectId,
      teacher_id: s.teacherId || null,
      duration: s.duration || 1
    }))
    const { error } = await supabase.from('sch_schedule_slots').insert(batch)
    if (error) { console.error('Insert error:', error); break }
  }

  const { count } = await supabase.from('sch_schedule_slots').select('*', { count: 'exact', head: true })
  console.log(`\n✅ Total slots en BD: ${count}`)
}

run().catch(console.error)
