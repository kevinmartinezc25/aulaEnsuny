import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log("Testing with profiles:")
  const { data, error } = await supabase
    .from('sch_schedule_slots')
    .select(`
      teacher:profiles(id, first_name)
    `)
    .limit(1)
  
  if (error) {
    console.log("Error profiles:", error.message)
  } else {
    console.log("Success profiles:", data)
  }

  console.log("Testing with academic_teachers:")
  const { data: d2, error: e2 } = await supabase
    .from('sch_schedule_slots')
    .select(`
      teacher:academic_teachers(id, full_name)
    `)
    .limit(1)

  if (e2) {
    console.log("Error academic:", e2.message)
  } else {
    console.log("Success academic:", d2)
  }
}

test()
