const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: profiles, error } = await supabase.from('profiles').select('*')
  console.log("Profiles:", profiles)
  
  const { data: dir } = await supabase.from('teacher_directory').select('id, document_id, first_name, last_name, profile_id')
  console.log("Teacher Directory:", dir)
}

run()
