const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function findRecentAuthUsers() {
  const { data: users, error } = await supabase.auth.admin.listUsers()
  if (error) return console.log(error)
  
  const sorted = users.users.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  console.log("Most recently created users in auth.users:")
  
  for (let i = 0; i < 5; i++) {
     const u = sorted[i]
     if(!u) continue
     console.log(`- Email: ${u.email} | Created: ${u.created_at} | ID: ${u.id}`)
     
     // Look up their document in student_directory
     const { data: dir } = await supabase.from('student_directory').select('document_id').eq('profile_id', u.id).single()
     if (dir?.document_id) {
         console.log(`  Found document in directory: ${dir.document_id}`)
         await supabase.auth.admin.updateUserById(u.id, { password: dir.document_id })
         console.log(`  -> PASSWORD UPDATED TO DOCUMENT!`)
         
         const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
         const { error: loginErr } = await supabaseAnon.auth.signInWithPassword({ email: u.email, password: dir.document_id })
         console.log(`  -> TEST LOGIN: ${loginErr ? 'FAILED (' + loginErr.message + ')' : 'SUCCESS'}`)
     } else {
         console.log(`  No document found in directory for this profile.`)
     }
  }
}

findRecentAuthUsers()
