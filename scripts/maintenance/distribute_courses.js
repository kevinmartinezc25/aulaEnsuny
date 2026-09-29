const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function distribute() {
  const { data: users, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 20 })
  if (error) return console.log("ListUsers Error:", error)
  
  const sorted = users.users.sort((a,b) => new Date(b.last_sign_in_at || 0) - new Date(a.last_sign_in_at || 0))
  
  // Find all teachers
  const teachers = sorted.filter(u => u.user_metadata?.role_name === 'teacher' || u.email === 'elizabethorea13@gmail.com' || u.email === 'garcesdiego904@gmail.com' || u.email === 'manuel.naspiran@ensuny.edu.co')
  
  if (teachers.length === 0) {
    console.log("No teachers found.")
    return
  }
  
  // Get all courses
  const { data: courses } = await supabase.from('courses').select('id')
  if (!courses || courses.length === 0) {
    console.log("No courses found in DB.")
    return
  }
  
  console.log(`Distributing ${courses.length} courses among ${teachers.length} teachers...`)
  
  // Distribute
  for (let i = 0; i < courses.length; i++) {
    const teacherIndex = i % teachers.length
    const teacher = teachers[teacherIndex]
    const course = courses[i]
    await supabase.from('courses').update({ teacher_id: teacher.id }).eq('id', course.id)
    console.log(`Assigned course ${course.id} to ${teacher.email}`)
  }
  
  console.log("Done distributing courses!")
}

distribute()
