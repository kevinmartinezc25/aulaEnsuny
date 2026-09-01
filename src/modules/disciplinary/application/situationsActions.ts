'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'
import { DisciplinarySituation } from './actions'

// ─────────────────────────────────────────────────────────────────────────────
// ACCIONES DE CATÁLOGO DE SITUACIONES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtener catálogo de situaciones.
 * Los docentes solo pueden ver las activas (activeOnly=true por defecto).
 * El admin puede ver todas y filtrar por estado.
 */
export async function getSituations(filters?: {
  search?: string
  type?: 'Tipo I' | 'Tipo II' | 'Tipo III' | 'all'
  activeOnly?: boolean
}): Promise<DisciplinarySituation[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const adminClient = createAdminClient()
    
    // Por defecto, solo activas (seguro para docentes)
    const activeOnly = filters?.activeOnly ?? true

    let query = adminClient
      .from('disciplinary_situations')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true })

    if (activeOnly) {
      query = query.eq('active', true)
    }

    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }

    const { data, error } = await query

    if (error) throw error

    let situations = (data || []).map(row => ({
      id: row.id,
      code: row.code,
      type: row.type as 'Tipo I' | 'Tipo II' | 'Tipo III',
      title: row.title,
      description: row.description,
      category: row.category,
      manualReference: row.manual_reference,
      active: row.active,
      sortOrder: row.sort_order,
    }))

    // Filtro de búsqueda textual con Fuse.js idealmente, pero acá hacemos un filter simple fallback
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      situations = situations.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      )
    }

    return situations
  } catch (error) {
    console.error('Error al obtener situaciones:', error)
    return []
  }
}

/**
 * Crear nueva situación en el catálogo (Solo Admin)
 */
export async function createSituation(
  data: Omit<DisciplinarySituation, 'id' | 'active'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()

    const insertData = {
      code: data.code.trim().toUpperCase(),
      type: data.type,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category?.trim() || null,
      manual_reference: data.manualReference?.trim() || null,
      sort_order: data.sortOrder || 0,
      active: true,
    }

    const { error } = await adminClient
      .from('disciplinary_situations')
      .insert(insertData)

    if (error) throw error

    revalidatePath('/admin/disciplinary/situations')
    revalidatePath('/teacher/disciplinary/new')
    
    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: msg }
  }
}

/**
 * Actualizar una situación existente (Solo Admin)
 */
export async function updateSituation(
  id: string,
  data: Partial<Omit<DisciplinarySituation, 'id'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()

    const updatePayload: Record<string, unknown> = {}
    if (data.code !== undefined) updatePayload.code = data.code.trim().toUpperCase()
    if (data.type !== undefined) updatePayload.type = data.type
    if (data.title !== undefined) updatePayload.title = data.title.trim()
    if (data.description !== undefined) updatePayload.description = data.description.trim()
    if (data.category !== undefined) updatePayload.category = data.category?.trim() || null
    if (data.manualReference !== undefined) updatePayload.manual_reference = data.manualReference?.trim() || null
    if (data.sortOrder !== undefined) updatePayload.sort_order = data.sortOrder

    const { error } = await adminClient
      .from('disciplinary_situations')
      .update(updatePayload)
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/disciplinary/situations')
    revalidatePath('/teacher/disciplinary/new')

    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: msg }
  }
}

/**
 * Activar o desactivar una situación (Solo Admin)
 */
export async function toggleSituationActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('disciplinary_situations')
      .update({ active })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/disciplinary/situations')
    revalidatePath('/teacher/disciplinary/new')

    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: msg }
  }
}
