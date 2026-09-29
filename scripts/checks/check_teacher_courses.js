const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, document_number, role_id').eq('role_id', '1c7c0f79-8cb1-4fb1-82f5-d2e540ece965')
  const { data: courses } = await supabase.from('courses').select('id, teacher_id')
  
  if (!profiles) return console.log("No teacher profiles found")
  
  for (const p of profiles) {
    const courseCount = courses?.filter(c => c.teacher_id === p.id).length || 0
    console.log(`Prof. ${p.first_name} ${p.last_name} | Doc: ${p.document_number} | ID: ${p.id} | Courses: ${courseCount}`)
  }
}

run()
