'use server'

import { createAdminClient } from '@/core/config/supabase/server'
import { StudentRef } from './actions'

// ─────────────────────────────────────────────────────────────────────────────
// BÚSQUEDA UNIFICADA DE ESTUDIANTES
// Schema real:
//   profiles       → id, first_name, last_name, grade_level, status, role_id
//   student_details → student_id, document_number
//   student_enrollments → student_id, grade_level, group_name, academic_year
// ─────────────────────────────────────────────────────────────────────────────

export async function searchStudentsUnified(
  queryText: string
): Promise<StudentRef[]> {
  if (!queryText || queryText.trim().length < 2) return []

  try {
    const adminClient = createAdminClient()
    const parts = queryText.trim().split(/\s+/).filter(p => p.length > 0)
    const isNumericSearch = parts.some(p => /^\d+/.test(p))

    // ── 1. Buscar perfiles de estudiantes por nombre ──────────────────────────
    const orParts = parts.flatMap(p => [
      `first_name.ilike.%${p}%`,
      `last_name.ilike.%${p}%`
    ])

    const { data: profiles, error: pError } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, grade_level, status, roles!inner(name)')
      .eq('roles.name', 'student')
      .or(orParts.join(','))
      .limit(15)

    if (pError) {
      console.error('Error buscando profiles:', pError.message)
    }

    let allProfiles = [...(profiles || [])]

    // ── 2. Si la búsqueda es numérica, buscar también por document_number ─────
    if (isNumericSearch) {
      const numParts = parts.filter(p => /^\d+/.test(p))
      const { data: detailsByDoc } = await adminClient
        .from('student_details')
        .select('student_id, document_number')
        .or(numParts.map(p => `document_number.ilike.%${p}%`).join(','))
        .limit(10)

      if (detailsByDoc && detailsByDoc.length > 0) {
        const existingIds = new Set(allProfiles.map(p => p.id))
        const extraIds = detailsByDoc.map(d => d.student_id).filter(id => !existingIds.has(id))

        if (extraIds.length > 0) {
          const { data: extraProfiles } = await adminClient
            .from('profiles')
            .select('id, first_name, last_name, grade_level, status, roles!inner(name)')
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

    const { data: directory, error: dError } = await adminClient
      .from('student_directory')
      .select('id, first_name, last_name, document_id, grade_level, group_name, profile_id, status')
      .eq('status', 'active')
      .or(orDirParts.join(','))
      .limit(15)

    if (dError) {
      console.warn('student_directory no disponible:', dError.message)
    }

    // ── 5. Fusionar y desduplicar ─────────────────────────────────────────────
    const results: StudentRef[] = []
    const seenIds = new Set<string>()
    const seenDocs = new Set<string>()

    for (const p of allProfiles) {
      if (p.status === 'inactive') continue

      const docId = detailsMap[p.id] || null
      const enrollment = enrollmentMap[p.id]

      // Grado: preferir el de la matrícula más reciente, si no el de profiles
      const gradeLevel = enrollment?.grade || p.grade_level || 'Sin grado'
      // Grupo: viene de student_enrollments
      const groupName = enrollment?.group || 'Sin grupo'

      results.push({
        source: 'profile',
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        fullName: `${p.last_name} ${p.first_name}`,
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

      results.push({
        source: 'directory',
        id: d.id,
        firstName: d.first_name,
        lastName: d.last_name,
        fullName: `${d.last_name} ${d.first_name}`,
        documentId: d.document_id || null,
        gradeLevel: d.grade_level,
        groupName: d.group_name || 'Sin grupo',
      })
    }

    return results.sort((a, b) => a.lastName.localeCompare(b.lastName))
  } catch (error) {
    console.error('Error en búsqueda unificada:', error)
    return []
  }
}
