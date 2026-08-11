import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

async function findSpecialGroups() {
  // Find groups that are not official grade groups (6°-1, 7°-2, etc.)
  const { data: groups } = await supabase.from('sch_groups').select('id, name')
  
  const specialGroups = groups?.filter(g => {
    const name = g.name?.trim()
    // Official grade groups follow pattern like "6°-1", "PFC-12", "Nivelatorio"
    const isOfficialGrade = /^\d+°-\d+$/.test(name) 
    const isPFC = /^PFC-/.test(name)
    const isNivelatorio = name === 'Nivelatorio'
    return !isOfficialGrade && !isPFC && !isNivelatorio
  })
  
  console.log('Special groups (not regular grade groups):')
  specialGroups?.forEach(g => console.log(`  - [${g.id}] "${g.name}"`))
  
  if (specialGroups && specialGroups.length > 0) {
    const specialGroupIds = specialGroups.map(g => g.id)
    const { data: curr } = await supabase
      .from('sch_curriculum')
      .select('subject_id, group_id, subject:sch_subjects(name)')
      .in('group_id', specialGroupIds)
    
    const uniqueSubjects = new Map<string, string>()
    curr?.forEach((c: any) => {
      if (!uniqueSubjects.has(c.subject_id)) {
        uniqueSubjects.set(c.subject_id, c.subject?.name || c.subject_id)
      }
    })
    
    console.log('\nSubjects assigned to special groups (should be normalWorkloadSubjectIds):')
    for (const [id, name] of uniqueSubjects.entries()) {
      console.log(`  - "${name}" : "${id}"`)
    }
    
    console.log(`\nAll ${uniqueSubjects.size} subject IDs:`)
    console.log(JSON.stringify([...uniqueSubjects.keys()]))
  }
}

findSpecialGroups().catch(console.error)
