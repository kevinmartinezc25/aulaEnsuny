const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('get_tables')
  // or query pg_tables
  const { data: tables } = await supabase.from('courses').select('*').limit(1)
  console.log("courses keys:", Object.keys(tables[0] || {}))
  
  // Find the profile of the user who is complaining.
  const { data: recentProfiles } = await supabase.from('profiles').select('id, first_name, last_name, document_number, role_id').order('updated_at', { ascending: false }).limit(5)
  console.log("Recent profiles:", recentProfiles)
}

run()
