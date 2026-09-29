const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://aibdfspoxzyokvpnicla.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmRmc3BveHp5b2t2cG5pY2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk3NTkyOCwiZXhwIjoyMDk1NTUxOTI4fQ.qodaEzP1w8JtykupmF32-bfKp2gz4g_TtOY2232jyQk'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAuth() {
  const { data: usersData, error } = await supabase.auth.admin.listUsers()
  if (error) { console.error("Error fetching users:", error); return }
  
  // Sort by last_sign_in_at
  const users = usersData.users.sort((a,b) => new Date(b.last_sign_in_at || 0) - new Date(a.last_sign_in_at || 0))
  const lastUser = users[0]
  
  if (!lastUser) { console.log("No users."); return; }
  
  console.log("Last logged in user:", lastUser.email, "| ID:", lastUser.id, "| Signed in:", lastUser.last_sign_in_at)
  
  // Check profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', lastUser.id).single()
  console.log("Profile for user:", profile)
  
  // Check courses
  const { data: courses } = await supabase.from('courses').select('id, title').eq('teacher_id', lastUser.id)
  console.log("Courses for user:", courses)
}

debugAuth()
