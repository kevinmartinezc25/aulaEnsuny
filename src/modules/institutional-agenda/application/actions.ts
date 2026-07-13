'use server'

import { createClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'

export interface EventCategory {
  id: string
  name: string
  color: string
  icon: string
}

export interface ProfileInfo {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

export interface EventResponsible {
  user_id: string
  profiles: ProfileInfo | null
}

export interface InstitutionalEvent {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  location: string | null
  category_id: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'confirmed' | 'cancelled'
  created_by: string | null
  created_at: string
  updated_at: string
  event_categories: EventCategory | null
  event_responsibles: EventResponsible[]
  custom_responsibles?: string[]
  resources?: string | null
  compliance?: string | null
  observations?: string | null
}

// 1. Obtener todas las categorías de eventos
export async function getEventCategories(): Promise<EventCategory[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('event_categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error al obtener categorías de eventos:', err)
    return []
  }
}

// 2. Obtener usuarios del sistema (para asignar responsabilidades)
export async function getSystemUsers(): Promise<ProfileInfo[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .order('first_name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error al obtener usuarios del sistema:', err)
    return []
  }
}

// 3. Obtener todos los eventos institucionales
export async function getEvents(): Promise<InstitutionalEvent[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_categories (*),
        event_responsibles (
          user_id,
          profiles (id, first_name, last_name, avatar_url)
        )
      `)
      .order('start_date', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  } catch (err) {
    console.error('Error al obtener eventos institucionales:', err)
    return []
  }
}

// 4. Guardar/Actualizar Evento (Solo Admins)
export async function saveEvent(eventData: {
  id?: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  location: string | null
  category_id: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'confirmed' | 'cancelled'
  responsibles: string[] // User IDs
  custom_responsibles?: string[]
  resources?: string | null
  compliance?: string | null
  observations?: string | null
}) {
  try {
    const supabase = await createClient()

    // Verificar si el usuario es administrador
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, roles!inner(name)')
      .eq('id', user.id)
      .single()

    if (!profile || (profile as any).roles?.name !== 'admin') {
      throw new Error('Solo los administradores pueden gestionar la agenda institucional.')
    }

    const payload = {
      title: eventData.title,
      description: eventData.description,
      start_date: eventData.start_date,
      end_date: eventData.end_date,
      location: eventData.location,
      category_id: eventData.category_id,
      priority: eventData.priority,
      status: eventData.status,
      created_by: user.id,
      custom_responsibles: eventData.custom_responsibles || [],
      resources: eventData.resources || null,
      compliance: eventData.compliance || 'Pendiente',
      observations: eventData.observations || null,
      updated_at: new Date().toISOString()
    }

    let eventId = eventData.id

    if (eventId) {
      // Modificar existente
      const { error: updateError } = await supabase
        .from('events')
        .update(payload)
        .eq('id', eventId)

      if (updateError) throw updateError

      // Sincronizar responsables: Eliminar anteriores
      const { error: deleteRespError } = await supabase
        .from('event_responsibles')
        .delete()
        .eq('event_id', eventId)

      if (deleteRespError) throw deleteRespError
    } else {
      // Crear nuevo
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert(payload)
        .select('id')
        .single()

      if (insertError) throw insertError
      eventId = newEvent.id
    }

    // Insertar nuevos responsables
    if (eventData.responsibles.length > 0 && eventId) {
      const respPayload = eventData.responsibles.map(uid => ({
        event_id: eventId!,
        user_id: uid
      }))

      const { error: respError } = await supabase
        .from('event_responsibles')
        .insert(respPayload)

      if (respError) throw respError
    }

    revalidatePath('/admin/institutional-agenda')
    revalidatePath('/teacher/institutional-agenda')
    return { success: true, id: eventId }
  } catch (err: any) {
    console.error('Error al guardar evento institucional:', err)
    return { error: err.message || 'Error al guardar el evento' }
  }
}

// 5. Eliminar Evento (Solo Admins)
export async function deleteEvent(eventId: string) {
  try {
    const supabase = await createClient()

    // Verificar rol de administrador
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, roles!inner(name)')
      .eq('id', user.id)
      .single()

    if (!profile || (profile as any).roles?.name !== 'admin') {
      throw new Error('Solo los administradores pueden eliminar eventos institucionales.')
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) throw error

    revalidatePath('/admin/institutional-agenda')
    revalidatePath('/teacher/institutional-agenda')
    return { success: true }
  } catch (err: any) {
    console.error('Error al eliminar evento institucional:', err)
    return { error: err.message || 'Error al eliminar el evento' }
  }
}

// 6. Guardar múltiples eventos en lote (para importación de Excel)
export async function saveEventsBatch(eventsList: {
  title: string
  description: string | null
  start_date: string
  end_date: string
  location: string | null
  category_id: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'confirmed' | 'cancelled'
  custom_responsibles?: string[]
  resources?: string | null
  compliance?: string | null
  observations?: string | null
}[]) {
  try {
    const supabase = await createClient()

    // Verificar rol de administrador
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, roles!inner(name)')
      .eq('id', user.id)
      .single()

    if (!profile || (profile as any).roles?.name !== 'admin') {
      throw new Error('Solo los administradores pueden realizar la importación masiva.')
    }

    if (eventsList.length === 0) return { success: true, count: 0 }

    const payloads = eventsList.map(ev => ({
      title: ev.title,
      description: ev.description,
      start_date: ev.start_date,
      end_date: ev.end_date,
      location: ev.location,
      category_id: ev.category_id,
      priority: ev.priority,
      status: ev.status,
      created_by: user.id,
      custom_responsibles: ev.custom_responsibles || [],
      resources: ev.resources || null,
      compliance: ev.compliance || 'Pendiente',
      observations: ev.observations || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('events')
      .insert(payloads)
      .select('id')

    if (error) throw error

    revalidatePath('/admin/institutional-agenda')
    revalidatePath('/teacher/institutional-agenda')
    return { success: true, count: data?.length || 0 }
  } catch (err: any) {
    console.error('Error al importar eventos en lote:', err)
    return { error: err.message || 'Error al importar eventos' }
  }
}


