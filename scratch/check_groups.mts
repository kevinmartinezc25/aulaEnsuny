import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function check() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase.from('sch_groups').select('id, name, level, is_active, external_id').order('name')
  console.log('Total groups:', data?.length)
  if (data) {
    const duplicates = data.filter((g, index, self) => 
      self.findIndex(t => t.name === g.name) !== index
    )
    console.log('Duplicated names count:', duplicates.length)
    
    // Print a few duplicates to see their structure
    if (duplicates.length > 0) {
      const dupName = duplicates[0].name
      const instances = data.filter(d => d.name === dupName)
      console.log('Instances for', dupName, instances)
    }
  }
}
check()
