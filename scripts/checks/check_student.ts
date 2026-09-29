import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debug() {
  console.log('--- BUSCANDO ESTUDIANTES EN PLANILLA ---')
  const { data: students } = await supabase
    .from('assisted_students')
    .select('id, full_name, directory_id, subject_id')
    .limit(5)
  console.log('Algunos estudiantes en assisted_students:', students)

  if (students && students.length > 0) {
    const s = students.find(s => s.directory_id) || students[0]
    console.log('--- BUSCANDO PERFIL ---')
    if (s.directory_id) {
      const id = s.directory_id.replace('dir-', '').replace('prof-', '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, grade_level, group_name')
        .eq('id', id)
        .single()
      console.log('Perfil asociado:', profile)
    }
  }

  console.log('--- BUSCANDO MATERIAS ---')
  const { data: subjects } = await supabase
    .from('assisted_subjects')
    .select('id, name, grade, group_number')
    .limit(5)
  console.log('Algunas materias:', subjects)
}

debug()
