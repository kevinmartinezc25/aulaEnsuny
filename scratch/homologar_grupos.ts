import { createAdminClient } from '@/core/config/supabase/server'
import { resolveOfficialGroup } from '@/modules/planilla-asistida/application/groupResolver'

/**
 * Este script verifica cuántos estudiantes en el Directorio tienen 
 * un grado y grupo que no puede ser resuelto al catálogo oficial de grupos en sch_groups.
 */
export async function testHomologacion() {
  const supabase = createAdminClient()

  console.log('--- OBTENIENDO DATOS ---')
  const { data: students, error: stdErr } = await supabase
    .from('student_directory')
    .select('id, profile_id, first_name, last_name, grade_level, group_name')
  
  if (stdErr) {
    console.error('Error al obtener estudiantes:', stdErr)
    return
  }

  const { data: groups, error: grpErr } = await supabase
    .from('sch_groups')
    .select('id, name')
  
  if (grpErr) {
    console.error('Error al obtener sch_groups:', grpErr)
    return
  }

  console.log(`Total Estudiantes Evaluados: ${students.length}`)
  console.log(`Total Grupos en Horarios: ${groups.length}`)
  console.log('------------------------\n')

  let matchCount = 0
  let noMatchCount = 0
  const noMatches: any[] = []

  for (const s of students) {
    if (!s.grade_level && !s.group_name) {
      // Ignorar estudiantes completamente en blanco
      continue
    }

    const resolved = resolveOfficialGroup(groups, s.grade_level, s.group_name)
    
    if (resolved) {
      matchCount++
    } else {
      noMatchCount++
      noMatches.push({
        id: s.id,
        nombre: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        grade_level: s.grade_level,
        group_name: s.group_name
      })
    }
  }

  console.log(`✅ Estudiantes con grupo homologado exitosamente: ${matchCount}`)
  console.log(`❌ Estudiantes con grupo NO encontrado: ${noMatchCount}`)

  if (noMatches.length > 0) {
    console.log('\n--- LISTA DE ESTUDIANTES SIN HOMOLOGAR ---')
    console.log('Estos estudiantes tienen información en Gestión de Estudiantes que no hace match con sch_groups.')
    console.log('Por favor, corrige su Grado/Grupo o asegúrate de que el grupo exista en el módulo de Horarios.\n')
    
    noMatches.slice(0, 50).forEach(nm => {
      console.log(`- ${nm.nombre} | Registrado como: Grado [${nm.grade_level}] Grupo [${nm.group_name}]`)
    })

    if (noMatches.length > 50) {
      console.log(`\n... y ${noMatches.length - 50} más.`)
    }
  }
}
