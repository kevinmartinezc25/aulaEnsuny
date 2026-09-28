const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'courses' })
  if (error) {
    // If RPC doesn't exist, try querying pg_policies
    const { data: polData, error: polErr } = await supabase.from('pg_policies').select('*').eq('tablename', 'courses')
    if (polErr) {
      console.log("Could not fetch pg_policies (likely permission denied via API)")
    } else {
      console.log("Policies via API:", polData)
    }
  } else {
    console.log("Policies:", data)
  }
}

run()
