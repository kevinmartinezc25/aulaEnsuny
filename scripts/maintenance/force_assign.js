const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: usersData, error } = await supabase.auth.admin.listUsers()
  if (error) return console.log(error)
  
  const sorted = usersData.users.sort((a,b) => new Date(b.last_sign_in_at || 0) - new Date(a.last_sign_in_at || 0))
  
  const veryRecent = sorted.slice(0, 5)
  console.log("Very recent users:")
  for (const u of veryRecent) {
    console.log(`- ${u.email} | Signed in: ${u.last_sign_in_at} | ID: ${u.id}`)
  }
  
  const mostRecent = veryRecent[0]
  if (mostRecent) {
    console.log(`Assigning 3 courses to the VERY most recent user: ${mostRecent.email}`)
    const { data: courses } = await supabase.from('courses').select('id').limit(3)
    for (const c of courses) {
      await supabase.from('courses').update({ teacher_id: mostRecent.id }).eq('id', c.id)
      console.log(`Assigned course ${c.id} to ${mostRecent.email}`)
    }
  }
}
run()
