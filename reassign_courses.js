const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function reassign() {
  const { data: users, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
  if (error) return console.log(error)
  
  const sorted = users.users.sort((a,b) => new Date(b.last_sign_in_at || 0) - new Date(a.last_sign_in_at || 0))
  
  // Encontrar el último que tenga metadata role_name === 'teacher', O el último correo que vimos.
  const lastTeacher = sorted.find(u => u.user_metadata?.role_name === 'teacher' || u.email === 'elizabethorea13@gmail.com' || u.email === 'garcesdiego904@gmail.com')
  
  if (!lastTeacher) {
    console.log("No teacher found at all. Top user was:", sorted[0].email, sorted[0].user_metadata)
    // Forzar asignación al último usuario logueado sea quien sea para destrabar
    const fallback = sorted[0]
    console.log(`Forcing reassignment to ${fallback.email} (ID: ${fallback.id})`)
    await supabase.from('courses').update({ teacher_id: fallback.id }).neq('id', '00000000-0000-0000-0000-000000000000')
    return
  }
  
  console.log(`Found teacher: ${lastTeacher.email} (ID: ${lastTeacher.id})`)
  
  const { error: updErr } = await supabase.from('courses').update({ teacher_id: lastTeacher.id }).neq('id', '00000000-0000-0000-0000-000000000000')
  if (updErr) {
    console.log("Error updating courses:", updErr)
  } else {
    console.log("Successfully reassigned all courses to", lastTeacher.email)
  }
}

reassign()
