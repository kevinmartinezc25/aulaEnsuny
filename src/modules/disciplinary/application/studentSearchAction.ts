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
 * Parsea el nombre de un grupo (ej: '8°-1', 'PFC-12', '10°-2', 'Transición-1') y extrae
 * su grado normalizado, su código de grupo y el nombre para mostrar.
 * Descarta grupos administrativos o institucionales que no sean de estudiantes (ej: 'Jornada Institucional', 'Nucleo Ciencias').
 */
function parseGroup(name: string): { gradeLevel: string; groupCode: string; displayName: string } | null {
  const clean = (name || '').trim()
  if (!clean) return null

  // Descartar grupos claramente administrativos o de reuniones de profesores
  if (/^(jornada|nucleo|núcleo|comite|comité|area|área|consejo|directivo|reunión|reunion)/i.test(clean)) {
    return null
  }

  // 1. Patrón clásico "8°-1" o "8-1" o "10°-2"
  const parts = clean.split('-')
  if (parts.length === 2 && /^\d+°?$/.test(parts[0])) {
    const grade = parts[0].includes('°') ? parts[0] : `${parts[0]}°`
    return {
      gradeLevel: grade,
      groupCode: parts[1],
      displayName: `Grupo ${parts[1]} (${clean})`
    }
  }

  // 2. PFC (Programa de Formación Complementaria)
  if (/^PFC[\s\-_]?12$/i.test(clean)) {
    return { gradeLevel: 'PFC-12', groupCode: '1', displayName: 'Grupo 1 (PFC-12)' }
  }
  if (/^PFC[\s\-_]?13$/i.test(clean)) {
    return { gradeLevel: 'PFC-13', groupCode: '1', displayName: 'Grupo 1 (PFC-13)' }
  }
  if (/^PFC[\s\-_]?12[\-_](\d+)$/i.test(clean)) {
    const num = clean.match(/\d+$/)?.[0] || '1'
    return { gradeLevel: 'PFC-12', groupCode: num, displayName: `Grupo ${num} (PFC-12)` }
  }
  if (/^PFC[\s\-_]?13[\-_](\d+)$/i.test(clean)) {
    const num = clean.match(/\d+$/)?.[0] || '1'
    return { gradeLevel: 'PFC-13', groupCode: num, displayName: `Grupo ${num} (PFC-13)` }
  }

  // 3. Nivelatorio
  if (/^Nivelatorio/i.test(clean)) {
    return { gradeLevel: 'Nivelatorio', groupCode: '1', displayName: 'Nivelatorio (Grupo 1)' }
  }

  // 4. Patrón numérico con guión bajo (ej: "8_1")
  const matchNum = clean.match(/^(\d+)[\-_](\d+)$/)
  if (matchNum) {
    return {
      gradeLevel: `${matchNum[1]}°`,
      groupCode: matchNum[2],
      displayName: `Grupo ${matchNum[2]} (${matchNum[1]}°-${matchNum[2]})`
    }
  }

  // 5. Patrón con nombre y sufijo (ej: "Transición-1", "Jardín-A", "Preescolar-1")
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return {
      gradeLevel: parts[0].trim(),
      groupCode: parts[1].trim(),
      displayName: `Grupo ${parts[1].trim()} (${clean})`
    }
  }

  // 6. Preescolar / Transición sin sufijo
  if (/^(Transición|Jardín|Preescolar|Párvulos)/i.test(clean)) {
    return {
      gradeLevel: clean,
      groupCode: '1',
      displayName: clean
    }
  }

  return null
}

/**
 * Obtiene todos los grados y grupos institucionales registrados en la base de datos (sch_groups).
 * Permite a cualquier docente o directivo reportar faltas disciplinarias de cualquier estudiante
 * de la institución educativa.
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

    // Siempre permitir ver todos los grupos válidos de estudiantes a todos los roles
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

    const allGroups = Array.from(groupsMap.values())

    // Agrupar por gradeLevel
    const gradeOrder = [
      'Párvulos', 'Preescolar', 'Jardín', 'Transición',
      '0°', '1°', '2°', '3°', '4°', '5°',
      '6°', '7°', '8°', '9°', '10°', '11°',
      'PFC-12', 'PFC-13', 'Nivelatorio'
    ]
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

    // Construir lista de grados ordenada institucionalmente
    const sortedGrades: TeacherGradeWorkload[] = Array.from(gradeMap.entries())
      .map(([gradeLevel, groups]) => ({ gradeLevel, groups }))
      .sort((a, b) => {
        const idxA = gradeOrder.indexOf(a.gradeLevel)
        const idxB = gradeOrder.indexOf(b.gradeLevel)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        const numA = parseInt(a.gradeLevel, 10)
        const numB = parseInt(b.gradeLevel, 10)
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB
        return a.gradeLevel.localeCompare(b.gradeLevel)
      })

    return {
      grades: sortedGrades,
      allGroups,
      isTeacher: !isAdmin
    }
  } catch (error) {
    console.error('Error al obtener grados y grupos institucionales:', error)
    return { grades: [], allGroups: [], isTeacher: true }
  }
}

// ── UTILIDADES DE COMPARACIÓN ESTRICTA DE GRADOS Y GRUPOS ─────────────────────

function buildGradeVariants(grade?: string | null): string[] {
  const gradeStr = String(grade || '').trim()
  if (!gradeStr) return []
  const gradeDigits = gradeStr.replace(/\D/g, '')
  const variants = new Set<string>([
    gradeStr,
    `${gradeStr}°`,
    gradeDigits,
    `${gradeDigits}°`,
    `${gradeDigits} °`
  ])
  if (gradeDigits === '12' || /pfc[\s\-_]?12/i.test(gradeStr)) {
    variants.add('PFC-12')
    variants.add('PFC 12')
    variants.add('PFC-12°')
    variants.add('PFC')
    variants.add('12')
    variants.add('12°')
  }
  if (gradeDigits === '13' || /pfc[\s\-_]?13/i.test(gradeStr)) {
    variants.add('PFC-13')
    variants.add('PFC 13')
    variants.add('PFC-13°')
    variants.add('PFC')
    variants.add('13')
    variants.add('13°')
  }
  if (/nivelat/i.test(gradeStr)) {
    variants.add('Nivelatorio')
    variants.add('NIVELATORIO')
    variants.add('nivelatorio')
  }
  if (/transici[oó]n/i.test(gradeStr)) {
    variants.add('Transición')
    variants.add('Transicion')
    variants.add('TRANSICIÓN')
    variants.add('TRANSICION')
  }
  return Array.from(variants).filter(Boolean)
}

function buildGroupVariants(groupInput: string, groupCode: string, gradeLevel: string): string[] {
  const cleanInput = (groupInput || '').trim()
  const cleanCode = (groupCode || '').trim()
  const gradeDigits = gradeLevel.replace(/\D/g, '')

  const variants = new Set<string>([
    cleanInput,
    cleanCode,
    cleanCode ? `0${cleanCode}` : '',
    `Grupo ${cleanCode}`,
    `Grupo ${cleanInput}`,
    gradeDigits && cleanCode ? `${gradeDigits}-${cleanCode}` : '',
    gradeDigits && cleanCode ? `${gradeDigits}°-${cleanCode}` : '',
    gradeDigits && cleanCode ? `${gradeDigits}° ${cleanCode}` : '',
    gradeDigits && cleanCode ? `${gradeDigits}_${cleanCode}` : '',
    gradeDigits && cleanCode ? `${gradeDigits}${cleanCode}` : ''
  ])
  return Array.from(variants).filter(Boolean)
}

function isStrictGradeMatch(studentGrade?: string | null, targetGrade?: string | null): boolean {
  if (!studentGrade || !targetGrade) return false
  const s = studentGrade.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  const t = targetGrade.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (s === t) return true

  const numS = parseInt(s, 10)
  const numT = parseInt(t, 10)
  if (!isNaN(numS) && !isNaN(numT)) {
    return numS === numT
  }

  if (/pfc/i.test(s) && /pfc/i.test(t)) {
    return s.replace(/\D/g, '') === t.replace(/\D/g, '')
  }

  return false
}

function isStrictGroupMatch(studentGroup?: string | null, groupInput?: string | null, groupCode?: string | null): boolean {
  if (!studentGroup) return false
  const s = studentGroup.trim().toLowerCase()
  const cleanS = s.replace(/[^a-z0-9]/g, '')
  const cleanInput = (groupInput || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  const cleanCode = (groupCode || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

  if (cleanInput && cleanS === cleanInput) return true

  if (cleanCode) {
    if (cleanS === cleanCode) return true
    if (s === `grupo ${cleanCode}` || s === `g${cleanCode}`) return true
    const suffix = s.split('-').pop()?.replace(/[^a-z0-9]/g, '')
    if (suffix === cleanCode) return true
  }

  return false
}

/**
 * Obtiene todos los estudiantes de un grupo específico seleccionado por el docente,
 * consultando la fuente unificada (profiles, student_enrollments y student_directory)
 * con validación estricta de que el grado y el grupo coincidan simultáneamente.
 */
export async function getStudentsForTeacherGroup(
  gradeLevel: string,
  groupInput: string
): Promise<StudentRef[]> {
  if (!gradeLevel || !groupInput) return []

  try {
    const adminClient = createAdminClient()

    const parsed = parseGroup(groupInput)
    const groupCode = parsed ? parsed.groupCode : (groupInput.split('-').pop() || groupInput).trim()

    const gradeVariants = buildGradeVariants(gradeLevel)
    const groupVariants = buildGroupVariants(groupInput, groupCode, gradeLevel)

    // 1. Obtener matrículas en student_enrollments filtradas ESTRICTAMENTE por grado Y grupo
    const { data: enrollments, error: eError } = await adminClient
      .from('student_enrollments')
      .select('student_id, grade_level, group_name, academic_year, enrollment_status')
      .in('grade_level', gradeVariants)
      .in('group_name', groupVariants)
      .order('academic_year', { ascending: false })

    if (eError) console.error('Error buscando student_enrollments para grupo:', eError)

    const enrolledMatchingStudentIds = new Set<string>()
    const enrolledDataMap = new Map<string, { gradeLevel: string; groupName: string }>()

    for (const e of enrollments || []) {
      if (e.enrollment_status === 'cancelled' || e.enrollment_status === 'withdrawn') continue
      if (isStrictGradeMatch(e.grade_level, gradeLevel) && isStrictGroupMatch(e.group_name, groupInput, groupCode)) {
        enrolledMatchingStudentIds.add(e.student_id)
        if (!enrolledDataMap.has(e.student_id)) {
          enrolledDataMap.set(e.student_id, {
            gradeLevel: e.grade_level,
            groupName: e.group_name
          })
        }
      }
    }

    // 2. Obtener perfiles de estudiantes restringidos por grade_level o matrícula confirmada
    let profilesQuery = adminClient
      .from('profiles')
      .select('id, first_name, last_name, grade_level, group_name, roles!inner(name), status')
      .eq('roles.name', 'student')

    const { data: profiles, error: pError } = await profilesQuery
    if (pError) console.error('Error buscando profiles para grupo:', pError)

    // Filtrar perfiles: DEBE coincidir obligatoriamente el grado Y el grupo
    const matchingProfiles = (profiles || []).filter(p => {
      if (p.status === 'inactive') return false

      // Si tiene matrícula activa en este grado y grupo, es válido
      if (enrolledMatchingStudentIds.has(p.id)) return true

      // Si no está en enrollment, sus campos en profiles DEBEN coincidir en grado Y grupo
      const gradeMatches = isStrictGradeMatch(p.grade_level, gradeLevel)
      const groupMatches = isStrictGroupMatch(p.group_name, groupInput, groupCode)
      return gradeMatches && groupMatches
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

    // 3. Obtener estudiantes del directorio (student_directory)
    const { data: directory, error: dError } = await adminClient
      .from('student_directory')
      .select('id, first_name, last_name, document_id, grade_level, group_name, profile_id, status')
      .eq('status', 'active')

    if (dError) console.error('Error buscando student_directory para grupo:', dError)

    const matchingDir = (directory || []).filter(d => {
      if (d.status !== 'active') return false
      return isStrictGradeMatch(d.grade_level, gradeLevel) && isStrictGroupMatch(d.group_name, groupInput, groupCode)
    })

    // 4. Fusionar y desduplicar
    const seenProfileIds = new Set<string>()
    const seenDocs = new Set<string>()
    const seenNames = new Set<string>()
    const results: StudentRef[] = []

    const cleanDoc = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const normName = (first?: string | null, last?: string | null) =>
      `${last || ''} ${first || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

    for (const p of matchingProfiles) {
      const docId = docMap[p.id] || null
      const formattedFirst = formatCapitalizedWords(p.first_name)
      const formattedLast = formatCapitalizedWords(p.last_name)
      const enrollData = enrolledDataMap.get(p.id)

      results.push({
        source: 'profile',
        id: p.id,
        firstName: formattedFirst,
        lastName: formattedLast,
        fullName: `${formattedLast} ${formattedFirst}`.trim(),
        documentId: docId,
        gradeLevel: enrollData?.gradeLevel || p.grade_level || gradeLevel,
        groupName: enrollData?.groupName || p.group_name || groupCode
      })
      seenProfileIds.add(p.id)
      if (docId) seenDocs.add(cleanDoc(docId))
      seenNames.add(normName(p.first_name, p.last_name))
    }

    for (const d of matchingDir) {
      if (d.profile_id && seenProfileIds.has(d.profile_id)) continue
      if (d.document_id && seenDocs.has(cleanDoc(d.document_id))) continue
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

    // Verificación final estricta de grado: ningún estudiante de otro grado puede estar presente
    const verifiedResults = results.filter(r => isStrictGradeMatch(r.gradeLevel, gradeLevel))

    return verifiedResults.sort((a, b) => a.lastName.localeCompare(b.lastName))
  } catch (error) {
    console.error('Error al obtener estudiantes del grupo:', error)
    return []
  }
}
