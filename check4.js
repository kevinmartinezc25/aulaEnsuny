const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://aibdfspoxzyokvpnicla.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmRmc3BveHp5b2t2cG5pY2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk3NTkyOCwiZXhwIjoyMDk1NTUxOTI4fQ.qodaEzP1w8JtykupmF32-bfKp2gz4g_TtOY2232jyQk'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: roles } = await supabase.from('roles').select('*')
  console.log("Roles:", roles)
}

run()
