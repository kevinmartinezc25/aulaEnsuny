const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function resetAllStudentPasswords() {
  const { data: directory, error: dirErr } = await supabase.from('student_directory').select('profile_id, document_id')
  if (dirErr) return console.log("Error fetching directory:", dirErr)
  
  console.log(`Found ${directory.length} students in directory.`)
  
  let count = 0
  for (const student of directory) {
    if (student.profile_id && student.document_id) {
      const { error } = await supabase.auth.admin.updateUserById(student.profile_id, { password: student.document_id })
      if (!error) count++
    }
  }
  
  console.log(`Successfully updated passwords for ${count} students to match their document ID.`)
}

resetAllStudentPasswords()
