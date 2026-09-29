const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const ids = [
    'ba1ed6cb-a462-447f-8994-6aa1940f1b8d',
    'd3aa9e2f-bd89-4b90-b47a-f8d6273347e3',
    '1d233c8c-2b8f-4add-a12c-edd1e1bac01d'
  ]
  
  const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, document_number, role_id').in('id', ids)
  console.log("Profiles matching course teacher_ids:", profiles)
  
  const { data: teachers } = await supabase.from('teacher_directory').select('*').in('id', ids)
  console.log("Teacher Directory matching course teacher_ids:", teachers)
  
  const { data: userMapping } = await supabase.from('teacher_directory').select('id, profile_id').not('profile_id', 'is', null)
  console.log("Teacher Directory with profile_ids:", userMapping)
}

run()
