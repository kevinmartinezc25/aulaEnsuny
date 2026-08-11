import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// IMPORTANT: Use SERVICE_ROLE key to bypass RLS
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

async function fullRegen() {
  console.log('=== FULL REGEN WITH SERVICE KEY ===')
  console.log(`Using key type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON_KEY'}`)
  
  // Check current count
  const { count: beforeCount } = await supabase.from('sch_schedule_slots').select('*', { count: 'exact', head: true })
  console.log(`Slots before delete: ${beforeCount}`)

  // Try delete with service role
  const { error: delError, count: delCount } = await supabase
    .from('sch_schedule_slots')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (delError) {
    console.error('DELETE ERROR:', delError)
  } else {
    console.log(`Deleted ${delCount} rows`)
  }

  const { count: afterCount } = await supabase.from('sch_schedule_slots').select('*', { count: 'exact', head: true })
  console.log(`Slots after delete: ${afterCount}`)
}

fullRegen().catch(console.error)
