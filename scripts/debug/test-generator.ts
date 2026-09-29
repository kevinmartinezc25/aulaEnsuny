import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function run() {
  const { data: currData } = await supabase.from('sch_curriculum').select('*')
  console.log(`Curriculum blocks: ${currData?.length}`)

  const groupSubjectTeachers = new Map<string, Set<string>>()
  const multiTeacherSubjSet = new Set<string>()

  if (currData) {
    currData.forEach((row: any) => {
      if (!row.group_id || !row.subject_id || !row.teacher_id) return
      const key = `${row.group_id}-${row.subject_id}`
      if (!groupSubjectTeachers.has(key)) groupSubjectTeachers.set(key, new Set())
      groupSubjectTeachers.get(key)!.add(row.teacher_id)
    })
    for (const [key, tSet] of groupSubjectTeachers.entries()) {
      if (tSet.size > 1) {
        const subjectId = key.split('-')[1]
        if (subjectId) multiTeacherSubjSet.add(subjectId)
      }
    }
  }

  const multiTeacherSubjectIds = Array.from(multiTeacherSubjSet)
  console.log(`Multi teacher subjects: ${multiTeacherSubjectIds.length}`)

  const blocksToAssign: any[] = []
  currData?.forEach(c => {
    let hoursLeft = c.hours_per_week
    let slotIdx = 0
    while (hoursLeft > 0) {
      blocksToAssign.push({ ...c, duration: 1, slotIndex: slotIdx++ })
      hoursLeft -= 1
    }
  })

  // Let's find a coGroup
  const coGroupMap = new Map<string, any>()
  for (const b of blocksToAssign) {
    let sIdx = b.slotIndex
    const key = `${b.group_id}-${b.subject_id}-slot${sIdx}`
    if (!coGroupMap.has(key)) {
      coGroupMap.set(key, { key, groupId: b.group_id, subjectId: b.subject_id, blocks: [] })
    }
    coGroupMap.get(key)!.blocks.push(b)
  }

  const coGroups = Array.from(coGroupMap.values())
  const multiCoGroups = coGroups.filter(cg => cg.blocks.length > 1)
  console.log(`Multi teacher coGroups: ${multiCoGroups.length}`)
  
  if (multiCoGroups.length > 0) {
    console.log(`Example CoGroup has ${multiCoGroups[0].blocks.length} blocks.`)
  }
}

run().catch(console.error)
