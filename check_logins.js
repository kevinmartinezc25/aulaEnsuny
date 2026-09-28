const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10 })
  if (error) return console.log(error)
  
  const sorted = users.users.sort((a,b) => new Date(b.last_sign_in_at || 0) - new Date(a.last_sign_in_at || 0))
  console.log("Recent log ins:")
  for(let i = 0; i < 5; i++) {
    const u = sorted[i]
    if(!u) break;
    const { data: prof, error: err } = await supabase.from('profiles').select('id, first_name, last_name, role').eq('id', u.id).single()
    if (err) console.log(`Error for ${u.email}:`, err.message)
    console.log(`Email: ${u.email} | ID: ${u.id} | Profile: ${prof ? prof.first_name + ' ' + prof.last_name + ' (Role: '+prof.role+')' : 'None'}`)
  }
}

run()
