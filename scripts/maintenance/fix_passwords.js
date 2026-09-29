const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixRecentStudentPasswords() {
  // Buscar a los usuarios más recientes en auth.users
  const { data: users, error } = await supabase.auth.admin.listUsers()
  if (error) return console.log(error)
  
  const sorted = users.users.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  const recentStudents = sorted.filter(u => u.user_metadata?.role_name === 'student').slice(0, 5)

  for (const student of recentStudents) {
    // Buscar su documento en student_directory
    const { data: dir } = await supabase.from('student_directory').select('document_id').eq('profile_id', student.id).single()
    const documentId = dir?.document_id || student.user_metadata?.document_number
    
    if (documentId) {
      await supabase.auth.admin.updateUserById(student.id, { password: documentId })
      console.log(`Updated password for student ${student.email} to their document: ${documentId}`)
    } else {
      // Buscar en profiles
      const { data: prof } = await supabase.from('profiles').select('document_number').eq('id', student.id).single()
      if (prof?.document_number) {
        await supabase.auth.admin.updateUserById(student.id, { password: prof.document_number })
        console.log(`Updated password for student ${student.email} to their profile document: ${prof.document_number}`)
      } else {
        console.log(`Could not find document for ${student.email}`)
      }
    }
  }
}

fixRecentStudentPasswords()
