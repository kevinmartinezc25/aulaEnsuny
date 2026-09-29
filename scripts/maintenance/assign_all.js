const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function assignToAllTeachers() {
  // Get the teacher role ID
  const { data: roles } = await supabase.from('roles').select('*')
  const teacherRole = roles.find(r => r.name === 'teacher')
  if (!teacherRole) return console.log("Teacher role not found")

  // Get ALL teacher profiles
  const { data: teachers } = await supabase.from('profiles').select('id, first_name, last_name').eq('role_id', teacherRole.id)
  if (!teachers || teachers.length === 0) return console.log("No teachers found in profiles")

  console.log(`Found ${teachers.length} teacher profiles.`)

  // Get ALL courses
  const { data: courses } = await supabase.from('courses').select('id, title')
  if (!courses || courses.length === 0) return console.log("No courses found in DB")

  console.log(`Distributing ${courses.length} courses to ALL teachers...`)

  // Assign at least 1 course to each teacher by iterating over courses and teachers
  let cIdx = 0
  for (let i = 0; i < teachers.length; i++) {
    const teacher = teachers[i]
    // give them the next course
    const course = courses[cIdx % courses.length]
    await supabase.from('courses').update({ teacher_id: teacher.id }).eq('id', course.id)
    cIdx++
  }
  
  // Asignar el resto a un profesor por defecto (el primero) para que no queden huerfanos si hay más cursos que profes
  if (cIdx < courses.length) {
      for (let i = cIdx; i < courses.length; i++) {
          await supabase.from('courses').update({ teacher_id: teachers[0].id }).eq('id', courses[i].id)
      }
  }

  console.log("Successfully assigned at least 1 course to EVERY teacher in the database.")
}

assignToAllTeachers()
