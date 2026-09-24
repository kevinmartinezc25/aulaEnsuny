'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'
import { normalizeGradeLevel } from '@/lib/gradeUtils'

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface DirectoryStudent {
  id: string
  firstName: string
  lastName: string
  fullName: string
  documentId: string | null
  gradeLevel: string
  groupName: string
  status: 'active' | 'inactive'
  profileId: string | null
  hasAccount: boolean
  importedAt: string
}

export interface StudentImportRow {
  lastName: string
  firstName: string
  documentId?: string
  gradeLevel: string
  groupName: string
  email?: string
}

export interface ImportRowValidated extends StudentImportRow {
  rowIndex: number
  errors: string[]
  isDuplicate: boolean
  duplicateId?: string // ID del registro existente si es duplicado
  duplicateReason?: 'directory' | 'campus_account' // Motivo del duplicado
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: number
  details: { row: number; status: 'ok' | 'skipped' | 'error'; message?: string }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza un texto a Title Case y elimina espacios extra.
 */
function toTitleCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtener el directorio de estudiantes con filtros opcionales.
 * Accesible por admin y docente (lectura).
 */
export async function getStudentDirectory(filters?: {
  grade?: string
  group?: string
  search?: string
  status?: 'active' | 'inactive' | 'all'
}): Promise<DirectoryStudent[]> {
  try {
    const adminClient = createAdminClient()

    let query = adminClient
      .from('student_directory')
      .select('*')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    } else {
      query = query.eq('status', 'active')
    }

    if (filters?.grade && filters.grade !== 'all') {
      query = query.eq('grade_level', filters.grade)
    }

    if (filters?.group && filters.group !== 'all') {
      query = query.eq('group_name', filters.group)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.last_name} ${row.first_name}`,
      documentId: row.document_id || null,
      gradeLevel: row.grade_level,
      groupName: row.group_name,
      email: null,
      status: row.status as 'active' | 'inactive',
      profileId: row.profile_id || null,
      hasAccount: !!row.profile_id,
      importedAt: row.imported_at,
    }))
  } catch (error) {
    console.error('Error al obtener directorio:', error)
    return []
  }
}

/**
 * Contar estudiantes en el directorio vs. con cuenta activa.
 */
export async function getDirectoryStats(): Promise<{
  totalDirectory: number
  withAccount: number
  withoutAccount: number
}> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('student_directory')
      .select('profile_id')
      .eq('status', 'active')

    if (error) throw error

    const total = data?.length ?? 0
    const withAccount = data?.filter(r => r.profile_id).length ?? 0

    return {
      totalDirectory: total,
      withAccount,
      withoutAccount: total - withAccount,
    }
  } catch {
    return { totalDirectory: 0, withAccount: 0, withoutAccount: 0 }
  }
}

/**
 * Validar y preparar filas para importar.
 * Detecta duplicados consultando tanto el directorio estudiantil como las cuentas virtuales (student_details / profiles).
 */
export async function validateImportRows(
  rows: StudentImportRow[]
): Promise<ImportRowValidated[]> {
  try {
    const adminClient = createAdminClient()

    // 1. Cargar registros existentes del directorio
    const { data: existingDir } = await adminClient
      .from('student_directory')
      .select('id, document_id, first_name, last_name, grade_level, profile_id')

    // 2. Cargar detalles de estudiantes con cuenta de campus (student_details)
    const { data: existingDetails } = await adminClient
      .from('student_details')
      .select('student_id, document_number, first_name, first_surname')

    // 3. Cargar perfiles de estudiantes
    const { data: existingProfiles } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, roles!inner(name)')
      .eq('roles.name', 'student')

    const dirByDoc = new Map<string, { id: string; profileId: string | null }>()
    const dirByName = new Map<string, string>()

    for (const rec of existingDir || []) {
      if (rec.document_id) {
        dirByDoc.set(rec.document_id.trim().toLowerCase(), { id: rec.id, profileId: rec.profile_id })
      }
      const nameKey = `${(rec.last_name || '').toLowerCase().trim()}|${(rec.first_name || '').toLowerCase().trim()}|${(rec.grade_level || '').toLowerCase().trim()}`
      dirByName.set(nameKey, rec.id)
    }

    const detailsByDoc = new Map<string, string>()
    for (const det of existingDetails || []) {
      if (det.document_number) {
        detailsByDoc.set(det.document_number.trim().toLowerCase(), det.student_id)
      }
    }

    const profileByName = new Map<string, string>()
    for (const p of existingProfiles || []) {
      const nameKey = `${(p.last_name || '').toLowerCase().trim()}|${(p.first_name || '').toLowerCase().trim()}`
      profileByName.set(nameKey, p.id)
    }

    return rows.map((row, i) => {
      const errors: string[] = []
      let isDuplicate = false
      let duplicateId: string | undefined
      let duplicateReason: 'directory' | 'campus_account' | undefined

      // Validaciones básicas
      if (!row.lastName || row.lastName.trim().length < 2) {
        errors.push('Apellidos requerido (mín. 2 caracteres)')
      }
      if (!row.firstName || row.firstName.trim().length < 2) {
        errors.push('Nombres requerido (mín. 2 caracteres)')
      }
      if (!row.gradeLevel || row.gradeLevel.trim().length === 0) {
        errors.push('Grado requerido')
      }
      if (!row.groupName || row.groupName.trim().length === 0) {
        errors.push('Grupo requerido')
      }

      // Detección de duplicados (solo si los campos clave son válidos)
      if (errors.length === 0) {
        const cleanDoc = row.documentId?.trim().toLowerCase()
        const nameKey = `${row.lastName.trim().toLowerCase()}|${row.firstName.trim().toLowerCase()}|${row.gradeLevel.trim().toLowerCase()}`
        const profNameKey = `${row.lastName.trim().toLowerCase()}|${row.firstName.trim().toLowerCase()}`

        if (cleanDoc) {
          // A. ¿Existe ya en el directorio estudiantil?
          if (dirByDoc.has(cleanDoc)) {
            isDuplicate = true
            const dirRecord = dirByDoc.get(cleanDoc)
            duplicateId = dirRecord?.id
            duplicateReason = dirRecord?.profileId ? 'campus_account' : 'directory'
          }
          // B. ¿Tiene ya una cuenta virtual creada en el campus (student_details)?
          else if (detailsByDoc.has(cleanDoc)) {
            isDuplicate = true
            duplicateId = detailsByDoc.get(cleanDoc)
            duplicateReason = 'campus_account'
          }
        } else {
          // Si no tiene documento, validar por nombre y grado
          if (dirByName.has(nameKey)) {
            isDuplicate = true
            duplicateId = dirByName.get(nameKey)
            duplicateReason = 'directory'
          } else if (profileByName.has(profNameKey)) {
            isDuplicate = true
            duplicateId = profileByName.get(profNameKey)
            duplicateReason = 'campus_account'
          }
        }
      }

      const originalRowIndex = (row as any).rowIndex
      return {
        ...row,
        rowIndex: originalRowIndex !== undefined ? originalRowIndex : i + 2,
        errors,
        isDuplicate,
        duplicateId,
        duplicateReason,
      }
    })
  } catch (error) {
    console.error('Error al validar filas:', error)
    return rows.map((row, i) => ({
      ...row,
      rowIndex: i + 2,
      errors: ['Error de validación del servidor'],
      isDuplicate: false,
    }))
  }
}

/**
 * Importar estudiantes en lotes.
 * Auto-vincula profile_id si el estudiante ya cuenta con usuario virtual, y previene
 * duplicidad en student_directory actualizando registros preexistentes.
 */
export async function importStudentsBatch(
  rows: StudentImportRow[],
  options?: { updateDuplicates?: boolean }
): Promise<ImportResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const adminClient = createAdminClient()
    const BATCH_SIZE = 50
    const result: ImportResult = { imported: 0, skipped: 0, errors: 0, details: [] }

    // Consultar student_details para vincular inmediatamente con cuentas virtuales existentes
    const { data: allDetails } = await adminClient
      .from('student_details')
      .select('student_id, document_number')

    const detailsMap = new Map<string, string>()
    for (const d of allDetails || []) {
      if (d.document_number) {
        detailsMap.set(d.document_number.trim().toLowerCase(), d.student_id)
      }
    }

    // Consultar registros existentes en student_directory para actualizar en vez de duplicar
    const { data: existingDirs } = await adminClient
      .from('student_directory')
      .select('id, document_id')

    const existingDirDocMap = new Map<string, string>()
    for (const d of existingDirs || []) {
      if (d.document_id) {
        existingDirDocMap.set(d.document_id.trim().toLowerCase(), d.id)
      }
    }

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)

      const toInsert: { payload: any; rowIdx: number }[] = []
      const toUpdate: { id: string; payload: any; rowIdx: number }[] = []

      batch.forEach((row, idx) => {
        const cleanDoc = row.documentId?.trim().toLowerCase()
        const existingProfileId = cleanDoc ? detailsMap.get(cleanDoc) || null : null
        const existingDirId = cleanDoc ? existingDirDocMap.get(cleanDoc) : undefined

        const payload = {
          first_name: toTitleCase(row.firstName),
          last_name: toTitleCase(row.lastName),
          document_id: row.documentId?.trim() || null,
          grade_level: normalizeGradeLevel(row.gradeLevel),
          group_name: row.groupName.trim(),
          profile_id: existingProfileId,
          status: 'active' as const
        }

        if (existingDirId) {
          toUpdate.push({ id: existingDirId, payload, rowIdx: i + idx + 2 })
        } else {
          toInsert.push({ payload, rowIdx: i + idx + 2 })
        }
      })

      // Inserciones de nuevos estudiantes
      if (toInsert.length > 0) {
        const { error } = await adminClient
          .from('student_directory')
          .insert(toInsert.map(item => item.payload))

        if (error) {
          toInsert.forEach(item => {
            result.errors++
            result.details.push({ row: item.rowIdx, status: 'error', message: error.message })
          })
        } else {
          toInsert.forEach(item => {
            result.imported++
            result.details.push({ row: item.rowIdx, status: 'ok' })
          })
        }
      }

      // Actualizaciones para registros ya existentes en el directorio
      for (const item of toUpdate) {
        const { error } = await adminClient
          .from('student_directory')
          .update(item.payload)
          .eq('id', item.id)

        if (error) {
          result.errors++
          result.details.push({ row: item.rowIdx, status: 'error', message: error.message })
        } else {
          result.imported++
          result.details.push({ row: item.rowIdx, status: 'ok' })
        }
      }
    }

    revalidatePath('/admin/students')
    revalidatePath('/admin/students/import')

    return result
  } catch (error) {
    console.error('Error al importar estudiantes:', error)
    return { imported: 0, skipped: 0, errors: 1, details: [] }
  }
}

/**
 * Actualizar un registro individual del directorio.
 */
export async function updateDirectoryStudent(
  id: string,
  data: Partial<StudentImportRow>
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()

    const updatePayload: Record<string, unknown> = {}
    if (data.firstName !== undefined) updatePayload.first_name = toTitleCase(data.firstName)
    if (data.lastName !== undefined) updatePayload.last_name = toTitleCase(data.lastName)
    if (data.documentId !== undefined) updatePayload.document_id = data.documentId || null
    if (data.gradeLevel !== undefined) updatePayload.grade_level = normalizeGradeLevel(data.gradeLevel)
    if (data.groupName !== undefined) updatePayload.group_name = data.groupName.trim()

    const { error } = await adminClient
      .from('student_directory')
      .update(updatePayload)
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/students')
    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: msg }
  }
}

/**
 * Desactivar un registro del directorio (eliminación lógica).
 */
export async function deactivateDirectoryStudent(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('student_directory')
      .update({ status: 'inactive' })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/students')
    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: msg }
  }
}

/**
 * Generar plantilla Excel para descarga.
 * Retorna el buffer del archivo como base64 para descarga en el cliente.
 */
export async function generateImportTemplate(): Promise<string> {
  try {
    const wb = XLSX.utils.book_new()

    // Hoja de datos
    const templateData = [
      ['APELLIDOS Y NOMBRES', 'Documento', 'Grado', 'Grupo'],
      ['MARTÍNEZ LÓPEZ JUAN CARLOS', '1001234567', '10°', '2'],
      ['TORRES GARCÍA ANA MARÍA', '', '11°', '1'],
      ['PÉREZ RIVERA CARLOS ANDRÉS', '', 'PFC-12', '1'],
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)

    // Anchos de columna
    ws['!cols'] = [
      { wch: 50 }, // APELLIDOS Y NOMBRES
      { wch: 15 }, // Documento
      { wch: 10 }, // Grado
      { wch: 10 }, // Grupo
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes')

    // Hoja de instrucciones
    const instrData = [
      ['INSTRUCCIONES DE IMPORTACIÓN'],
      [''],
      ['Columnas requeridas: APELLIDOS Y NOMBRES, Grado, Grupo'],
      ['Columnas opcionales: Documento, Email'],
      [''],
      ['APELLIDOS Y NOMBRES: Requerido. Ej: MARTÍNEZ LÓPEZ JUAN CARLOS'],
      ['(El sistema asignará las dos primeras palabras como apellidos y el resto como nombres)'],
      ['Documento: Opcional. Número de cédula o TI. Debe ser único.'],
      ['Grado: Requerido. Ej: 10°, 11°, PFC-12, PFC-13, Nivelatorio'],
      ['Grupo: Requerido. Ej: 1, 2, A, B'],
      [''],
      ['Límite: 500 estudiantes por importación.'],
      ['Los nombres se guardan en Title Case automáticamente.'],
    ]
    const wsInstr = XLSX.utils.aoa_to_sheet(instrData)
    wsInstr['!cols'] = [{ wch: 55 }]
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

    const buf = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
    return buf as string
  } catch (error) {
    console.error('Error generando plantilla:', error)
    throw error
  }
}

/**
 * Sincronizar registros del directorio con perfiles de Auth existentes.
 * Vincula `profile_id` automáticamente si coincide el número de documento o nombre completo.
 */
export async function syncDirectoryWithProfiles(): Promise<{
  synced: number
  error?: string
}> {
  try {
    const adminClient = createAdminClient()

    // 1. Obtener directorio sin vínculo (profile_id IS NULL)
    const { data: dirStudents, error: dirError } = await adminClient
      .from('student_directory')
      .select('id, document_id, first_name, last_name')
      .is('profile_id', null)

    if (dirError) throw dirError

    // 2. Obtener detalles de estudiantes con cuenta virtual (student_details)
    const { data: details, error: detError } = await adminClient
      .from('student_details')
      .select('student_id, document_number, first_name, first_surname')

    if (detError) throw detError

    // 3. Obtener perfiles de estudiantes
    const { data: profiles, error: profError } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, roles!inner(name)')
      .eq('roles.name', 'student')

    if (profError) throw profError

    let synced = 0

    const norm = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()

    for (const dir of dirStudents || []) {
      let matchedStudentId: string | null = null

      // Buscar primero por documento en student_details
      if (dir.document_id && dir.document_id.trim()) {
        const cleanDoc = dir.document_id.trim().toLowerCase()
        const detMatch = details?.find(
          d => d.document_number && d.document_number.trim().toLowerCase() === cleanDoc
        )
        if (detMatch) {
          matchedStudentId = detMatch.student_id
        }
      }

      // Si no se encontró por documento, buscar por nombres normalizados en profiles
      if (!matchedStudentId && dir.first_name && dir.last_name) {
        const dirName = norm(`${dir.first_name} ${dir.last_name}`)
        const dirLastFirst = norm(`${dir.last_name} ${dir.first_name}`)

        const profMatch = profiles?.find(p => {
          const pName = norm(`${p.first_name} ${p.last_name}`)
          const pLastFirst = norm(`${p.last_name} ${p.first_name}`)
          return pName === dirName || pName === dirLastFirst || pLastFirst === dirName
        })
        if (profMatch) {
          matchedStudentId = profMatch.id
        }
      }

      if (matchedStudentId) {
        const { error: updErr } = await adminClient
          .from('student_directory')
          .update({ profile_id: matchedStudentId })
          .eq('id', dir.id)

        if (!updErr) {
          synced++
        }
      }
    }

    revalidatePath('/admin/students')
    revalidatePath('/admin/students/import')
    return { synced }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return { synced: 0, error: msg }
  }
}
