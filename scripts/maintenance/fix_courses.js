const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://aibdfspoxzyokvpnicla.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmRmc3BveHp5b2t2cG5pY2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk3NTkyOCwiZXhwIjoyMDk1NTUxOTI4fQ.qodaEzP1w8JtykupmF32-bfKp2gz4g_TtOY2232jyQk'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fix() {
  const { data: teachers, error } = await supabase.from('profiles').select('*').eq('role_id', '1c7c0f79-8cb1-4fb1-82f5-d2e540ece965')
  if (error) {
    console.log("Error fetching teachers:", error)
    return
  }
  
  if (!teachers || teachers.length === 0) {
    console.log("No teachers found.")
    return
  }
  
  const teacherId = teachers[0].id
  console.log("Reassigning all orphaned courses to teacher:", teachers[0].first_name, teachers[0].last_name, `(ID: ${teacherId})`)

  const { data, error: err2 } = await supabase.from('courses').update({ teacher_id: teacherId }).neq('id', '00000000-0000-0000-0000-000000000000')
  
  if (err2) console.log("Error updating courses:", err2)
  else console.log("Courses reassigned successfully to", teachers[0].first_name)
}

fix()
