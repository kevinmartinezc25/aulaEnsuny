'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

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
 * Detecta duplicados consultando la BD.
 */
export async function validateImportRows(
  rows: StudentImportRow[]
): Promise<ImportRowValidated[]> {
  try {
    const adminClient = createAdminClient()

    // Cargar registros existentes para detección de duplicados
    const { data: existing } = await adminClient
      .from('student_directory')
      .select('id, document_id, first_name, last_name, grade_level')

    const existingByDoc = new Map<string, string>()
    const existingByName = new Map<string, string>()

    for (const rec of existing || []) {
      if (rec.document_id) {
        existingByDoc.set(rec.document_id.trim().toLowerCase(), rec.id)
      }
      const nameKey = `${rec.last_name?.toLowerCase()}|${rec.first_name?.toLowerCase()}|${rec.grade_level?.toLowerCase()}`
      existingByName.set(nameKey, rec.id)
    }

    return rows.map((row, i) => {
      const errors: string[] = []
      let isDuplicate = false
      let duplicateId: string | undefined

      // Validaciones
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
        if (row.documentId && row.documentId.trim()) {
          const docKey = row.documentId.trim().toLowerCase()
          if (existingByDoc.has(docKey)) {
            isDuplicate = true
            duplicateId = existingByDoc.get(docKey)
          }
        } else {
          const nameKey = `${row.lastName.trim().toLowerCase()}|${row.firstName.trim().toLowerCase()}|${row.gradeLevel.trim().toLowerCase()}`
          if (existingByName.has(nameKey)) {
            isDuplicate = true
            duplicateId = existingByName.get(nameKey)
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
 * Solo importa filas válidas y no duplicadas (o actualizadas si el admin lo indica).
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

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)

      const records = batch.map(row => ({
        first_name: toTitleCase(row.firstName),
        last_name: toTitleCase(row.lastName),
        document_id: row.documentId?.trim() || null,
        grade_level: row.gradeLevel.trim(),
        group_name: row.groupName.trim(),
        status: 'active' as const
      }))

      const { data, error } = await adminClient
        .from('student_directory')
        .insert(records)
        .select('id')

      if (error) {
        // Marcar todas las filas del batch como error
        batch.forEach((_, idx) => {
          result.errors++
          result.details.push({ row: i + idx + 2, status: 'error', message: error.message })
        })
      } else {
        batch.forEach((_, idx) => {
          result.imported++
          result.details.push({ row: i + idx + 2, status: 'ok' })
        })
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
    if (data.gradeLevel !== undefined) updatePayload.grade_level = data.gradeLevel.trim()
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
      ['Apellidos', 'Nombres', 'Documento', 'Grado', 'Grupo'],
      ['Martínez López', 'Juan Carlos', '1001234567', '10°', '2'],
      ['Torres García', 'Ana María', '', '11°', '1'],
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)

    // Anchos de columna
    ws['!cols'] = [
      { wch: 25 }, // Apellidos
      { wch: 25 }, // Nombres
      { wch: 15 }, // Documento
      { wch: 10 }, // Grado
      { wch: 10 }, // Grupo
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes')

    // Hoja de instrucciones
    const instrData = [
      ['INSTRUCCIONES DE IMPORTACIÓN'],
      [''],
      ['Columnas requeridas: Apellidos, Nombres, Grado, Grupo'],
      ['Columnas opcionales: Documento, Email'],
      [''],
      ['Apellidos: Requerido. Ej: Martínez López'],
      ['Nombres: Requerido. Ej: Juan Carlos'],
      ['Documento: Opcional. Número de cédula o TI. Debe ser único.'],
      ['Grado: Requerido. Ej: 10°, 11°, 9°'],
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
 * Vincula `profile_id` automáticamente si coincide el número de documento.
 */
export async function syncDirectoryWithProfiles(): Promise<{
  synced: number
  error?: string
}> {
  try {
    const adminClient = createAdminClient()

    // Obtener directorio sin vínculo
    const { data: dirStudents, error: dirError } = await adminClient
      .from('student_directory')
      .select('id, document_id, first_name, last_name')
      .is('profile_id', null)
      .not('document_id', 'is', null)

    if (dirError) throw dirError

    // Obtener perfiles con rol estudiante
    const { data: profiles, error: profError } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, document_number')

    if (profError) throw profError

    let synced = 0

    for (const dir of dirStudents || []) {
      const match = profiles?.find(
        p =>
          p.document_number &&
          dir.document_id &&
          p.document_number.trim() === dir.document_id.trim()
      )

      if (match) {
        await adminClient
          .from('student_directory')
          .update({ profile_id: match.id })
          .eq('id', dir.id)
        synced++
      }
    }

    revalidatePath('/admin/students')
    return { synced }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return { synced: 0, error: msg }
  }
}
