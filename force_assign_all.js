const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  let allUsers = []
  for (let page = 1; page <= 10; page++) {
    const { data: usersData, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) break;
    if (!usersData || usersData.users.length === 0) break;
    allUsers = allUsers.concat(usersData.users)
  }
  
  const sorted = allUsers.sort((a,b) => new Date(b.last_sign_in_at || 0) - new Date(a.last_sign_in_at || 0))
  
  const veryRecent = sorted.slice(0, 5)
  console.log("ABSOLUTE Very recent users:")
  for (const u of veryRecent) {
    console.log(`- ${u.email} | Signed in: ${u.last_sign_in_at} | ID: ${u.id}`)
  }
  
  const mostRecent = sorted.find(u => u.email !== 'superadmin_alt@ensuny.edu.co' && u.email !== 'coordinador.convivencia@ensuny.edu.co' && (u.user_metadata?.role_name === 'teacher' || u.user_metadata?.role === 'teacher' || !u.email.includes('admin')))
  
  if (mostRecent) {
    console.log(`\nAssigning ALL courses to the VERY most recent TEACHER: ${mostRecent.email}`)
    const { data: courses } = await supabase.from('courses').select('id')
    for (const c of courses) {
      await supabase.from('courses').update({ teacher_id: mostRecent.id }).eq('id', c.id)
    }
    console.log("Done assigning courses to", mostRecent.email)
  }
}
run()
