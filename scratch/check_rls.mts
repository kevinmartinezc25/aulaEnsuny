import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypass RLS

const anonClient = createClient(supabaseUrl, supabaseKey)
const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  console.log("Testing with ANON client (RLS applies):")
  const { data: anonData, error: anonError } = await anonClient
    .from('sch_schedule_slots')
    .select('id, teacher_id')
    .limit(5)
  console.log("ANON Data count:", anonData?.length, "Error:", anonError?.message)

  console.log("\nTesting with ADMIN client (Bypasses RLS):")
  const { data: adminData, error: adminError } = await adminClient
    .from('sch_schedule_slots')
    .select('id, teacher_id')
    .limit(5)
  console.log("ADMIN Data count:", adminData?.length, "Error:", adminError?.message)

  // What is the RLS policy on sch_schedule_slots?
  // Let's also check if there's any data in academic_teachers
  const { data: tData } = await adminClient.from('academic_teachers').select('id, full_name, profile_id').limit(5)
  console.log("\nTeachers:", tData)
}

test()
