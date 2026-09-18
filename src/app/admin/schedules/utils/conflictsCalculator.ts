import { createClient } from '@/core/config/supabase/client'
import { CurriculumBlock } from '../engine/Generator'
import { isMeetingSubject } from './groupFilters'

export async function computeGlobalUnassignedBlocks(): Promise<CurriculumBlock[]> {
  const supabase = createClient()
  
  // 1. Fetch Curriculum (What needs to be scheduled)
  const { data: curriculumData, error: currErr } = await supabase
    .from('sch_curriculum')
    .select('*, group:sch_groups(name), subject:sch_subjects(name, is_academic_workload), teacher:profiles(id, first_name, last_name)')

  if (currErr) {
    console.error('Error fetching curriculum:', currErr)
    return []
  }

  // 2. Fetch Block Subjects Config
  const { data: blockConstraints } = await supabase
    .from('sch_constraints')
    .select('parameters')
    .eq('rule_type', 'BLOCK_SUBJECTS_CONFIG')
    .maybeSingle()
  
  const blockSubjects: string[] = blockConstraints?.parameters?.subject_ids && Array.isArray(blockConstraints.parameters.subject_ids)
    ? blockConstraints.parameters.subject_ids
    : []

  // 3. Fetch Assigned Slots (What is already scheduled)
  const { data: slotsData, error: slotsErr } = await supabase
    .from('sch_schedule_slots')
    .select('id, group_id, subject_id, teacher_id, duration')

  if (slotsErr) {
    console.error('Error fetching slots:', slotsErr)
    return []
  }

  // 4. Transform curriculum into required blocks
  const requiredBlocks: CurriculumBlock[] = []
  const slotCounters = new Map<string, number>()

  for (const c of curriculumData || []) {
    let hoursLeft = c.hours_per_week
    const isBlockSubject = blockSubjects.includes(c.subject_id)
    const counterKey = `${c.group_id}-${c.subject_id}-${c.teacher_id}`
    let slotIdx = slotCounters.get(counterKey) || 0
    const teacherName = c.teacher
      ? `${c.teacher.first_name || ''} ${c.teacher.last_name || ''}`.trim()
      : undefined

    if (isBlockSubject) {
      while (hoursLeft >= 2) {
        requiredBlocks.push({
          subject_id: c.subject_id,
          subject_name: c.subject?.name,
          teacher_id: c.teacher_id,
          teacher_name: teacherName,
          group_id: c.group_id,
          group_name: c.group?.name,
          duration: 2,
          slotIndex: slotIdx++,
          is_academic_workload: c.subject?.is_academic_workload
        })
        hoursLeft -= 2
      }
    }
    while (hoursLeft > 0) {
      requiredBlocks.push({
        subject_id: c.subject_id,
        subject_name: c.subject?.name,
        teacher_id: c.teacher_id,
        teacher_name: teacherName,
        group_id: c.group_id,
        group_name: c.group?.name,
        duration: 1,
        slotIndex: slotIdx++,
        is_academic_workload: c.subject?.is_academic_workload
      })
      hoursLeft -= 1
    }
    slotCounters.set(counterKey, slotIdx)
  }

  // 5. Subtract Assigned Slots
  const assignedSet = new Set<CurriculumBlock>()
  
  for (const slot of slotsData || []) {
    // Find a matching required block that hasn't been assigned yet
    const matchingBlock = requiredBlocks.find(b => 
      !assignedSet.has(b) &&
      b.group_id === slot.group_id &&
      b.subject_id === slot.subject_id &&
      (b.teacher_id === slot.teacher_id || (!b.teacher_id && !slot.teacher_id)) &&
      b.duration === slot.duration
    )
    
    if (matchingBlock) {
      assignedSet.add(matchingBlock)
    }
  }

  const unassigned = requiredBlocks.filter(b => !assignedSet.has(b))
  return unassigned
}
