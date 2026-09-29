const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugProfiles() {
  const { data: directory, error } = await supabase.from('profiles')
    .select('id, document_number, first_name, last_name, created_at')
    .order('created_at', { ascending: false })
    .limit(3)
    
  if (error) return console.log("Error:", error)
    
  console.log("Most recently created students in PROFILES:")
  for (const st of directory) {
     console.log(`- ${st.first_name} ${st.last_name} | Doc: '${st.document_number}' | ID: ${st.id} | Created: ${st.created_at}`)
     const { data: user } = await supabase.auth.admin.getUserById(st.id)
     console.log(`  Auth Email: '${user?.user?.email}'`)
     
     // TEST LOGIN
     if (st.document_number) {
         const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
         const { error: loginErr } = await supabaseAnon.auth.signInWithPassword({ email: user?.user?.email, password: st.document_number })
         console.log(`  Test Login with document as password: ${loginErr ? 'FAILED (' + loginErr.message + ')' : 'SUCCESS'}`)
     }
  }
}

debugProfiles()
