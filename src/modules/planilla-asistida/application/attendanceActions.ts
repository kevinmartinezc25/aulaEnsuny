'use server'

import { createClient } from '@/core/config/supabase/server'

export interface AssistedSession {
  id: string
  subject_id: string
  date: string
  topic?: string
  created_at: string
  is_locked?: boolean
}

export interface AssistedAttendance {
  id: string
  session_id: string
  student_id: string
  status: 'A' | 'I' | 'E'
  created_at: string
}

export async function getAssistedSessions(subjectId: string): Promise<AssistedSession[]> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  const { data, error } = await supabase
    .from('assisted_sessions')
    .select('*')
    .eq('subject_id', subjectId)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching assisted sessions:', error)
    throw new Error('Error al obtener las sesiones de asistencia')
  }

  return data as AssistedSession[]
}

export async function createAssistedSession(subjectId: string, date: string, topic?: string): Promise<AssistedSession> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  const { data, error } = await supabase
    .from('assisted_sessions')
    .insert({
      subject_id: subjectId,
      date,
      topic: topic || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating assisted session:', error)
    throw new Error('Error al crear la sesión de asistencia')
  }

  return data as AssistedSession
}

export async function updateAssistedSession(sessionId: string, date: string, topic?: string): Promise<AssistedSession> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  const { data, error } = await supabase
    .from('assisted_sessions')
    .update({
      date,
      topic: topic || null
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating assisted session:', error)
    throw new Error('Error al actualizar la clase')
  }

  return data as AssistedSession
}

export async function deleteAssistedSession(sessionId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('assisted_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('Error deleting assisted session:', error)
    throw new Error('Error al eliminar la sesión')
  }
}

export async function toggleAssistedSessionLock(sessionId: string, isLocked: boolean): Promise<boolean> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  const { error } = await supabase
    .from('assisted_sessions')
    .update({ is_locked: isLocked })
    .eq('id', sessionId)

  if (error) {
    console.error('Error toggling session lock:', error)
    throw new Error('Error al cambiar el estado de bloqueo de la clase')
  }

  return true
}

export async function getAssistedAttendance(subjectId: string): Promise<AssistedAttendance[]> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  // First we need the sessions to get the attendance for the subject
  const { data: sessions, error: sessionError } = await supabase
    .from('assisted_sessions')
    .select('id')
    .eq('subject_id', subjectId)

  if (sessionError) {
    console.error('Error fetching sessions for attendance:', sessionError)
    throw new Error('Error al cargar asistencia')
  }

  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map(s => s.id)

  const { data: attendance, error: attError } = await supabase
    .from('assisted_attendance')
    .select('*')
    .in('session_id', sessionIds)

  if (attError) {
    console.error('Error fetching assisted attendance:', attError)
    throw new Error('Error al cargar la asistencia')
  }

  return attendance as AssistedAttendance[]
}

export async function saveAssistedAttendance(records: { session_id: string, student_id: string, status: 'A' | 'I' | 'E' }[]): Promise<boolean> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) throw new Error('No autorizado')

  if (records.length === 0) return true

  const { error } = await supabase
    .from('assisted_attendance')
    .upsert(records, { onConflict: 'session_id, student_id' })

  if (error) {
    console.error('Error saving attendance:', error)
    throw new Error('Error al guardar la asistencia')
  }

  return true
}
