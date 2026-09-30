'use server'

import { createAdminClient, createClient } from '@/core/config/supabase/server'
import { StudentRef } from './actions'
import { formatCapitalizedWords } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// BÚSQUEDA UNIFICADA DE ESTUDIANTES
// Schema real:
//   profiles       → id, first_name, last_name, grade_level, status, role_id
//   student_details → student_id, document_number
//   student_enrollments → student_id, grade_level, group_name, academic_year
// ─────────────────────────────────────────────────────────────────────────────

export async function searchStudentsUnified(
  queryText: string,
  filterGroupName?: string
): Promise<StudentRef[]> {
  console.log(`[DEBUG] searchStudentsUnified: queryText="${queryText}", filterGroupName="${filterGroupName}"`)
  if (!queryText || queryText.trim().length < 2) return []

  try {
    const adminClient = createAdminClient()
    const parts = queryText.trim().split(/\s+/).filter(p => p.length > 0)
    const isNumericSearch = parts.some(p => /^\d+/.test(p))
    
    let allowedStudentIds: string[] | null = null
    if (filterGroupName) {
      // Intentar coincidir con "11°-1" o solo con "1" (si la base de datos guarda solo el sufijo)
      const splitGroup = filterGroupName.split('-').pop()?.trim() || filterGroupName
      const possibleGroups = Array.from(new Set([filterGroupName, splitGroup]))

      const { data: enrollments } = await adminClient
        .from('student_enrollments')
        .select('student_id')
        .in('group_name', possibleGroups)
      
      const { data: profileGroups } = await adminClient
        .from('profiles')
        .select('id')
        .in('group_name', possibleGroups)

      const ids = new Set<string>()
      if (enrollments) enrollments.forEach(e => ids.add(e.student_id))
      if (profileGroups) profileGroups.forEach(p => ids.add(p.id))

      allowedStudentIds = Array.from(ids)
    }

    // ── 1. Buscar perfiles de estudiantes por nombre ──────────────────────────
    const orParts = parts.flatMap(p => [
      `first_name.ilike.%${p}%`,
      `last_name.ilike.%${p}%`
    ])

    let profilesQuery = adminClient
      .from('profiles')
      .select('id, first_name, last_name, grade_level, group_name, status, roles!inner(name)')
      .eq('roles.name', 'student')
      .or(orParts.join(','))
      .limit(15)

    if (allowedStudentIds) {
      if (allowedStudentIds.length === 0) {
        profilesQuery = profilesQuery.in('id', ['empty-id-no-match']) // Forzar 0 resultados
      } else {
        profilesQuery = profilesQuery.in('id', allowedStudentIds)
      }
    }

    const { data: profiles, error: pError } = await profilesQuery

    if (pError) {
      console.error('Error buscando profiles:', pError.message)
    }

    let allProfiles = [...(profiles || [])]

    // ── 2. Si la búsqueda es numérica, buscar también por document_number ─────
    if (isNumericSearch) {
      const numParts = parts.filter(p => /^\d+/.test(p))
      let detailsQuery = adminClient
        .from('student_details')
        .select('student_id, document_number')
        .or(numParts.map(p => `document_number.ilike.%${p}%`).join(','))
        .limit(10)
        
      if (allowedStudentIds && allowedStudentIds.length > 0) {
        detailsQuery = detailsQuery.in('student_id', allowedStudentIds)
      } else if (allowedStudentIds && allowedStudentIds.length === 0) {
        detailsQuery = detailsQuery.in('student_id', ['empty-id-no-match'])
      }

      const { data: detailsByDoc } = await detailsQuery

      if (detailsByDoc && detailsByDoc.length > 0) {
        const existingIds = new Set(allProfiles.map(p => p.id))
        const extraIds = detailsByDoc.map(d => d.student_id).filter(id => !existingIds.has(id))

        if (extraIds.length > 0) {
          const { data: extraProfiles } = await adminClient
            .from('profiles')
            .select('id, first_name, last_name, grade_level, group_name, status, roles!inner(name)')
            .in('id', extraIds)

          if (extraProfiles) {
            allProfiles.push(...extraProfiles)
          }
        }
      }
    }

    // ── 3. Para los perfiles encontrados, obtener documento y grupo ───────────
    const profileIds = allProfiles.map(p => p.id)
    const detailsMap: Record<string, string> = {}   // student_id → document_number
    const enrollmentMap: Record<string, { grade: string; group: string }> = {} // student_id → matrícula

    if (profileIds.length > 0) {
      // Documentos desde student_details
      const { data: details } = await adminClient
        .from('student_details')
        .select('student_id, document_number')
        .in('student_id', profileIds)

      for (const d of details || []) {
        if (d.document_number) detailsMap[d.student_id] = d.document_number
      }

      // Grupo desde student_enrollments (el más reciente por academic_year)
      const { data: enrollments } = await adminClient
        .from('student_enrollments')
        .select('student_id, grade_level, group_name, academic_year')
        .in('student_id', profileIds)
        .order('academic_year', { ascending: false })

      // Tomar solo la matrícula más reciente de cada estudiante
      for (const e of enrollments || []) {
        if (!enrollmentMap[e.student_id]) {
          enrollmentMap[e.student_id] = {
            grade: e.grade_level || '',
            group: e.group_name || ''
          }
        }
      }
    }

    // ── 4. Buscar en student_directory (sin cuenta) ───────────────────────────
    const orDirParts = parts.flatMap(p => [
      `first_name.ilike.%${p}%`,
      `last_name.ilike.%${p}%`
    ])
    if (isNumericSearch) {
      parts.filter(p => /^\d+/.test(p)).forEach(p =>
        orDirParts.push(`document_id.ilike.%${p}%`)
      )
    }

    let directoryQuery = adminClient
      .from('student_directory')
      .select('id, first_name, last_name, document_id, grade_level, group_name, profile_id, status')
      .eq('status', 'active')
      .or(orDirParts.join(','))
      .limit(15)
      
    if (filterGroupName) {
      const splitGroup = filterGroupName.split('-').pop()?.trim() || filterGroupName
      const possibleGroups = Array.from(new Set([filterGroupName, splitGroup]))
      directoryQuery = directoryQuery.in('group_name', possibleGroups)
    }

    const { data: directory, error: dError } = await directoryQuery

    if (dError) {
      console.warn('student_directory no disponible:', dError.message)
    }

    // ── 5. Fusionar y desduplicar ─────────────────────────────────────────────
    let results: StudentRef[] = []
    const seenIds = new Set<string>()
    const seenDocs = new Set<string>()

    for (const p of allProfiles) {
      if (p.status === 'inactive') continue

      const docId = detailsMap[p.id] || null
      const enrollment = enrollmentMap[p.id]

      // Grado: preferir el de la matrícula más reciente, si no el de profiles
      const gradeLevel = enrollment?.grade || p.grade_level || 'Sin grado'
      // Grupo: preferir matrícula, luego profiles
      const groupName = enrollment?.group || p.group_name || 'Sin grupo'

      const formattedFirst = formatCapitalizedWords(p.first_name)
      const formattedLast = formatCapitalizedWords(p.last_name)

      results.push({
        source: 'profile',
        id: p.id,
        firstName: formattedFirst,
        lastName: formattedLast,
        fullName: `${formattedLast} ${formattedFirst}`.trim(),
        documentId: docId,
        gradeLevel,
        groupName,
      })
      seenIds.add(p.id)
      if (docId) seenDocs.add(docId)
    }

    for (const d of directory || []) {
      if (d.profile_id && seenIds.has(d.profile_id)) continue
      if (d.document_id && seenDocs.has(d.document_id)) continue

      const formattedFirst = formatCapitalizedWords(d.first_name)
      const formattedLast = formatCapitalizedWords(d.last_name)

      results.push({
        source: 'directory',
        id: d.id,
        firstName: formattedFirst,
        lastName: formattedLast,
        fullName: `${formattedLast} ${formattedFirst}`.trim(),
        documentId: d.document_id || null,
        gradeLevel: d.grade_level,
        groupName: d.group_name || 'Sin grupo',
      })
    }
    
    // Si filtramos por grupo, asegurarnos de que la lista final lo cumpla
    if (filterGroupName) {
      const cleanStr = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      const filterClean = cleanStr(filterGroupName)
      const suffix = filterGroupName.split('-').pop()?.trim()
      const prefix = filterGroupName.split('-')[0]?.trim()

      results = results.filter(r => {
        const rGroupClean = cleanStr(r.groupName)
        
        if (r.groupName === filterGroupName) return true
        if (rGroupClean === filterClean) return true
        if (cleanStr(`${r.gradeLevel}${r.groupName}`) === filterClean) return true
        if (cleanStr(`${r.gradeLevel}-${r.groupName}`) === filterClean) return true

        if (r.groupName === suffix || rGroupClean === cleanStr(suffix || '')) {
          if (r.gradeLevel === prefix || cleanStr(r.gradeLevel) === cleanStr(prefix || '')) {
            return true
          }
        }
        return false
      })
    }

    return results.sort((a, b) => a.lastName.localeCompare(b.lastName))
  } catch (error) {
    console.error('Error en búsqueda unificada:', error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS PARA CARGA ACADÉMICA DEL DOCENTE (HORARIOS)
// ─────────────────────────────────────────────────────────────────────────────

export interface TeacherGroupItem {
  id: string
  name: string          // ej: "8°-1"
  groupCode: string     // ej: "1"
  gradeLevel: string    // ej: "8°"
  displayName: string   // ej: "8°-1 (Grupo 1)"
  level?: string        // ej: "Secundaria"
  isDirector?: boolean  // Si es director de grupo
}

export interface TeacherGradeWorkload {
  gradeLevel: string    // ej: "8°"
  groups: TeacherGroupItem[]
}

export interface TeacherWorkloadResponse {
  grades: TeacherGradeWorkload[]
  allGroups: TeacherGroupItem[]
  isTeacher: boolean
}

/**
 * Parsea el nombre de un grupo (ej: '8°-1', 'PFC-12', '10°-2') y extrae
 * su grado normalizado, su código de grupo y el nombre para mostrar.
 * Descarta grupos que no sean de estudiantes (ej: 'Jornada Institucional', 'Nucleo Ciencias').
 */
function parseGroup(name: string): { gradeLevel: string; groupCode: string; displayName: string } | null {
  const clean = (name || '').trim()
  const parts = clean.split('-')
  if (parts.length === 2 && /^\d+°?$/.test(parts[0])) {
    const grade = parts[0].includes('°') ? parts[0] : `${parts[0]}°`
    return {
      gradeLevel: grade,
      groupCode: parts[1],
      displayName: `${clean} (Grupo ${parts[1]})`
    }
  }
  if (/^PFC[\s\-_]?12$/i.test(clean)) {
    return { gradeLevel: 'PFC-12', groupCode: '1', displayName: 'PFC-12 (Grupo 1)' }
  }
  if (/^PFC[\s\-_]?13$/i.test(clean)) {
    return { gradeLevel: 'PFC-13', groupCode: '1', displayName: 'PFC-13 (Grupo 1)' }
  }
  if (/^PFC[\s\-_]?12[\-_](\d+)$/i.test(clean)) {
    const num = clean.match(/\d+$/)?.[0] || '1'
    return { gradeLevel: 'PFC-12', groupCode: num, displayName: `PFC-12 (Grupo ${num})` }
  }
  if (/^PFC[\s\-_]?13[\-_](\d+)$/i.test(clean)) {
    const num = clean.match(/\d+$/)?.[0] || '1'
    return { gradeLevel: 'PFC-13', groupCode: num, displayName: `PFC-13 (Grupo ${num})` }
  }
  if (/^Nivelatorio/i.test(clean)) {
    return { gradeLevel: 'Nivelatorio', groupCode: '1', displayName: 'Nivelatorio' }
  }
  const matchNum = clean.match(/^(\d+)[\-_](\d+)$/)
  if (matchNum) {
    return {
      gradeLevel: `${matchNum[1]}°`,
      groupCode: matchNum[2],
      displayName: `${matchNum[1]}°-${matchNum[2]} (Grupo ${matchNum[2]})`
    }
  }
  return null
}

/**
 * Obtiene los grados y grupos asignados al docente autenticado
 * estrictamente de acuerdo con su CARGA ACADÉMICA (módulo horarios: academic_assignments
 * y sch_groups donde es director).
 * Si el usuario es admin o superadmin, tiene acceso a todos los grupos de estudiantes.
 */
export async function getTeacherWorkloadGradesAndGroups(): Promise<TeacherWorkloadResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { grades: [], allGroups: [], isTeacher: false }

    const adminClient = createAdminClient()

    // 1. Obtener perfil y rol del usuario
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, role_id, roles(name)')
      .eq('id', user.id)
      .single()

    const roleName = (profile?.roles as any)?.name || 'teacher'
    const isAdmin = roleName === 'admin' || roleName === 'superadmin'

    const groupsMap = new Map<string, TeacherGroupItem>()

    if (isAdmin) {
      // SuperAdmin / Admin: ver todos los grupos válidos de estudiantes
      const { data: allSchGroups } = await adminClient
        .from('sch_groups')
        .select('id, name, level')
        .order('name', { ascending: true })

      for (const g of allSchGroups || []) {
        const parsed = parseGroup(g.name)
        if (parsed) {
          groupsMap.set(g.id, {
            id: g.id,
            name: g.name,
            groupCode: parsed.groupCode,
            gradeLevel: parsed.gradeLevel,
            displayName: parsed.displayName,
            level: g.level || '',
            isDirector: false
          })
        }
      }
    } else {
      // DOCENTE: Cargar ÚNICAMENTE los grupos de su carga académica en el módulo horarios
      const { data: assignments, error: asgError } = await adminClient
        .from('academic_assignments')
        .select('group:sch_groups!inner(id, name, level), teacher:academic_teachers!inner(profile_id)')
        .eq('teacher.profile_id', user.id)

      if (asgError) {
        console.error('Error al consultar academic_assignments del docente:', asgError)
      }

      for (const row of assignments || []) {
        const g = row.group as any
        if (g && g.id && g.name) {
          const parsed = parseGroup(g.name)
          if (parsed) {
            groupsMap.set(g.id, {
              id: g.id,
              name: g.name,
              groupCode: parsed.groupCode,
              gradeLevel: parsed.gradeLevel,
              displayName: parsed.displayName,
              level: g.level || '',
              isDirector: false
            })
          }
        }
      }

      // Adicionalmente, incluir grupos donde el docente es director de grupo
      const { data: directorGroups } = await adminClient
        .from('sch_groups')
        .select('id, name, level')
        .eq('director_id', user.id)

      for (const dg of directorGroups || []) {
        const parsed = parseGroup(dg.name)
        if (parsed) {
          groupsMap.set(dg.id, {
            id: dg.id,
            name: dg.name,
            groupCode: parsed.groupCode,
            gradeLevel: parsed.gradeLevel,
            displayName: parsed.displayName,
            level: dg.level || '',
            isDirector: true
          })
        }
      }
    }

    const allGroups = Array.from(groupsMap.values())

    // Agrupar por gradeLevel
    const gradeOrder = ['6°', '7°', '8°', '9°', '10°', '11°', 'PFC-12', 'PFC-13', 'Nivelatorio']
    const gradeMap = new Map<string, TeacherGroupItem[]>()

    for (const g of allGroups) {
      if (!gradeMap.has(g.gradeLevel)) {
        gradeMap.set(g.gradeLevel, [])
      }
      gradeMap.get(g.gradeLevel)!.push(g)
    }

    // Ordenar grupos dentro de cada grado por código o nombre
    gradeMap.forEach((list) => {
      list.sort((a, b) => a.groupCode.localeCompare(b.groupCode, undefined, { numeric: true }) || a.name.localeCompare(b.name))
    })

    // Construir lista de grados ordenada
    const sortedGrades: TeacherGradeWorkload[] = Array.from(gradeMap.entries())
      .map(([gradeLevel, groups]) => ({ gradeLevel, groups }))
      .sort((a, b) => {
        const idxA = gradeOrder.indexOf(a.gradeLevel)
        const idxB = gradeOrder.indexOf(b.gradeLevel)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return a.gradeLevel.localeCompare(b.gradeLevel)
      })

    return {
      grades: sortedGrades,
      allGroups,
      isTeacher: !isAdmin
    }
  } catch (error) {
    console.error('Error al obtener grados y grupos de carga académica:', error)
    return { grades: [], allGroups: [], isTeacher: true }
  }
}

/**
 * Obtiene todos los estudiantes de un grupo específico seleccionado por el docente,
 * consultando la fuente unificada de SuperAdmin (profiles con rol estudiante + student_directory)
 * con desduplicación por documento de identidad, profile_id y nombre.
 */
export async function getStudentsForTeacherGroup(
  gradeLevel: string,
  groupInput: string
): Promise<StudentRef[]> {
  if (!gradeLevel || !groupInput) return []

  try {
    const adminClient = createAdminClient()
    const cleanStr = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

    const parsed = parseGroup(groupInput)
    const groupCode = parsed ? parsed.groupCode : (groupInput.split('-').pop() || groupInput).trim()
    const possibleGroups = Array.from(new Set([groupInput, groupCode]))

    // 1. Obtener perfiles de estudiantes
    const { data: profiles, error: pError } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, grade_level, group_name, roles!inner(name), status')
      .eq('roles.name', 'student')

    if (pError) console.error('Error buscando profiles para grupo:', pError)

    const matchingProfiles = (profiles || []).filter(p => {
      if (p.status === 'inactive') return false
      const gMatch = cleanStr(p.grade_level) === cleanStr(gradeLevel)
      const grpMatch = possibleGroups.some(g => cleanStr(p.group_name) === cleanStr(g))
      return gMatch && grpMatch
    })

    // Consultar documentos en student_details
    const profileIds = matchingProfiles.map(p => p.id)
    const docMap: Record<string, string> = {}
    if (profileIds.length > 0) {
      const { data: details } = await adminClient
        .from('student_details')
        .select('student_id, document_number')
        .in('student_id', profileIds)

      for (const d of details || []) {
        if (d.document_number) docMap[d.student_id] = d.document_number
      }
    }

    // 2. Obtener estudiantes del directorio (student_directory)
    const { data: directory, error: dError } = await adminClient
      .from('student_directory')
      .select('id, first_name, last_name, document_id, grade_level, group_name, profile_id, status')
      .eq('status', 'active')

    if (dError) console.error('Error buscando student_directory para grupo:', dError)

    const matchingDir = (directory || []).filter(d => {
      const gMatch = cleanStr(d.grade_level) === cleanStr(gradeLevel)
      const grpMatch = possibleGroups.some(g => cleanStr(d.group_name) === cleanStr(g))
      return gMatch && grpMatch
    })

    // 3. Fusionar y desduplicar (exacto a la gestión del SuperAdmin)
    const seenProfileIds = new Set<string>()
    const seenDocs = new Set<string>()
    const seenNames = new Set<string>()
    const results: StudentRef[] = []

    const normName = (first?: string | null, last?: string | null) =>
      `${last || ''} ${first || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

    for (const p of matchingProfiles) {
      const docId = docMap[p.id] || null
      const formattedFirst = formatCapitalizedWords(p.first_name)
      const formattedLast = formatCapitalizedWords(p.last_name)
      results.push({
        source: 'profile',
        id: p.id,
        firstName: formattedFirst,
        lastName: formattedLast,
        fullName: `${formattedLast} ${formattedFirst}`.trim(),
        documentId: docId,
        gradeLevel: p.grade_level || gradeLevel,
        groupName: p.group_name || groupCode
      })
      seenProfileIds.add(p.id)
      if (docId) seenDocs.add(cleanStr(docId))
      seenNames.add(normName(p.first_name, p.last_name))
    }

    for (const d of matchingDir) {
      if (d.profile_id && seenProfileIds.has(d.profile_id)) continue
      if (d.document_id && seenDocs.has(cleanStr(d.document_id))) continue
      const dName = normName(d.first_name, d.last_name)
      if (dName && seenNames.has(dName)) continue

      const formattedFirst = formatCapitalizedWords(d.first_name)
      const formattedLast = formatCapitalizedWords(d.last_name)
      results.push({
        source: 'directory',
        id: d.id,
        firstName: formattedFirst,
        lastName: formattedLast,
        fullName: `${formattedLast} ${formattedFirst}`.trim(),
        documentId: d.document_id || null,
        gradeLevel: d.grade_level || gradeLevel,
        groupName: d.group_name || groupCode
      })
    }

    return results.sort((a, b) => a.lastName.localeCompare(b.lastName))
  } catch (error) {
    console.error('Error al obtener estudiantes del grupo:', error)
    return []
  }
}
