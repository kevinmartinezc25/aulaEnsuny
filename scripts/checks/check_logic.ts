import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testStudentMatching() {
  // 1. Buscamos un perfil que esté en assisted_students
  const { data: students } = await admin
    .from('assisted_students')
    .select('id, full_name, directory_id, subject_id')
    .not('directory_id', 'is', null)
    .limit(10)

  if (!students || students.length === 0) {
    console.log('No hay estudiantes con directory_id en planilla')
    return
  }

  for (const s of students) {
    let uid = s.directory_id!
    if (uid.startsWith('prof-')) uid = uid.replace('prof-', '')
    if (uid.startsWith('dir-')) uid = uid.replace('dir-', '')

    const { data: profile } = await admin
      .from('profiles')
      .select('id, first_name, last_name, grade_level, group_name')
      .eq('id', uid)
      .single()

    if (!profile) continue

    console.log(`\n========================================`)
    console.log(`Probando con estudiante: ${profile.first_name} ${profile.last_name} (${uid})`)

    const candidateIds = [uid, `prof-${uid}`, `dir-${uid}`]
    const { data: byDir } = await admin
      .from('assisted_students')
      .select('id, subject_id, full_name')
      .in('directory_id', candidateIds)

    console.log(`- Encontrados por ID:`, byDir?.length || 0)

    const cleanGrade = (profile.grade_level || '').trim()
    const cleanGroup = (profile.group_name || '').trim()
    let gradeNum: number | undefined = undefined
    let groupNum: number | undefined = undefined

    if (/pfc[\s\-_]?12/i.test(cleanGrade)) { gradeNum = 12; groupNum = 1 }
    else if (cleanGrade) { const d = cleanGrade.replace(/\D/g, ''); if (d) gradeNum = parseInt(d, 10) }
    
    console.log(`- Grado deducido: ${gradeNum}, Grupo deducido: ${groupNum}`)

    let subjectQuery = admin.from('assisted_subjects').select('id, name')
    if (gradeNum !== undefined) {
      subjectQuery = subjectQuery.eq('grade', gradeNum)
    } else if (byDir && byDir.length > 0) {
      subjectQuery = subjectQuery.in('id', byDir.map(b => b.subject_id))
    }

    const { data: subs } = await subjectQuery
    console.log(`- Materias encontradas en query:`, subs?.length || 0)
    console.log(subs)
  }
}

testStudentMatching()
