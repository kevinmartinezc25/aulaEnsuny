'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Election {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'closed'
  type: 'official' | 'simulation' | 'survey'
  show_realtime_results: boolean
  created_at: string
}

export interface Candidate {
  id: string
  election_id: string
  student_id: string
  number: string
  proposal: string
  photo_url?: string
  presentation?: string
  objectives?: string
  proposals?: string
  goals?: string
  video_url?: string
  student_name?: string
  student_grade?: string
  student_group?: string
}

export interface ElectionTable {
  id: string
  name: string
  election_id: string
  enabled_grades: string[]
  created_at: string
}

export interface Juror {
  id: string
  user_id: string
  table_id: string
  juror_name?: string
  juror_email?: string
  table_name?: string
}

export interface Voter {
  id: string
  student_id: string
  election_id: string
  has_voted: boolean
  voted_at?: string
  student_name?: string
  student_email?: string
  student_grade?: string
  student_group?: string
}

export interface Debate {
  id: string
  election_id: string
  date: string
  time: string
  location: string
  transmission_url?: string
}

/**
 * -------------------------------------------------------------
 * ELECTIONS ACTIONS
 * -------------------------------------------------------------
 */

export async function getElections(): Promise<Election[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  } catch (err: any) {
    console.error('Error fetching elections:', err)
    return []
  }
}

export async function getElectionById(id: string): Promise<Election | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return data
  } catch (err: any) {
    console.error('Error fetching election:', err)
    return null
  }
}

export async function createOrUpdateElection(election: Partial<Election>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient()
    
    const isNew = !election.id
    const payload = {
      name: election.name,
      description: election.description,
      start_date: election.start_date,
      end_date: election.end_date,
      status: election.status || 'draft',
      type: election.type || 'official',
      show_realtime_results: election.show_realtime_results !== false
    }

    let result
    if (isNew) {
      result = await supabase.from('elections').insert(payload).select().single()
    } else {
      result = await supabase.from('elections').update(payload).eq('id', election.id!).select().single()
    }

    if (result.error) throw new Error(result.error.message)
    
    revalidatePath('/admin/elections')
    return { success: true, data: result.data }
  } catch (err: any) {
    console.error('Error saving election:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteElection(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('elections').delete().eq('id', id)
    if (error) throw new Error(error.message)
    
    revalidatePath('/admin/elections')
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting election:', err)
    return { success: false, error: err.message }
  }
}

/**
 * -------------------------------------------------------------
 * CANDIDATE ACTIONS
 * -------------------------------------------------------------
 */

export async function getCandidates(electionId: string): Promise<Candidate[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('candidates')
      .select('*, profiles:student_id(first_name, last_name, grade_level)')
      .eq('election_id', electionId)

    if (error) throw new Error(error.message)

    return (data || []).map((c: any) => ({
      ...c,
      student_name: `${c.profiles?.first_name || ''} ${c.profiles?.last_name || ''}`.trim(),
      student_grade: c.profiles?.grade_level || ''
    }))
  } catch (err: any) {
    console.error('Error fetching candidates:', err)
    return []
  }
}

export async function createOrUpdateCandidate(candidate: Partial<Candidate>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient()
    const isNew = !candidate.id
    
    const payload = {
      election_id: candidate.election_id,
      student_id: candidate.student_id,
      number: candidate.number,
      proposal: candidate.proposal,
      photo_url: candidate.photo_url || null,
      presentation: candidate.presentation || '',
      objectives: candidate.objectives || '',
      proposals: candidate.proposals || '',
      goals: candidate.goals || '',
      video_url: candidate.video_url || ''
    }

    let result
    if (isNew) {
      result = await supabase.from('candidates').insert(payload).select().single()
    } else {
      result = await supabase.from('candidates').update(payload).eq('id', candidate.id!).select().single()
    }

    if (result.error) throw new Error(result.error.message)

    revalidatePath('/admin/elections')
    return { success: true, data: result.data }
  } catch (err: any) {
    console.error('Error saving candidate:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteCandidate(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('candidates').delete().eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/admin/elections')
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting candidate:', err)
    return { success: false, error: err.message }
  }
}

/**
 * -------------------------------------------------------------
 * ELECTION TABLES (MESAS) ACTIONS
 * -------------------------------------------------------------
 */

export async function getElectionTables(electionId: string): Promise<ElectionTable[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('election_tables')
      .select('*')
      .eq('election_id', electionId)

    if (error) throw new Error(error.message)
    return data || []
  } catch (err: any) {
    console.error('Error fetching tables:', err)
    return []
  }
}

export async function createOrUpdateElectionTable(table: Partial<ElectionTable>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient()
    const isNew = !table.id

    const payload = {
      name: table.name,
      election_id: table.election_id,
      enabled_grades: table.enabled_grades || []
    }

    let result
    if (isNew) {
      result = await supabase.from('election_tables').insert(payload).select().single()
    } else {
      result = await supabase.from('election_tables').update(payload).eq('id', table.id!).select().single()
    }

    if (result.error) throw new Error(result.error.message)

    revalidatePath('/admin/elections')
    return { success: true, data: result.data }
  } catch (err: any) {
    console.error('Error saving table:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteElectionTable(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('election_tables').delete().eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/admin/elections')
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting table:', err)
    return { success: false, error: err.message }
  }
}

/**
 * -------------------------------------------------------------
 * JUROR ACTIONS
 * -------------------------------------------------------------
 */

export async function getJurors(electionId: string): Promise<Juror[]> {
  try {
    const supabase = await createClient()
    // 1. Obtener mesas de esta elección
    const { data: tables } = await supabase
      .from('election_tables')
      .select('id, name')
      .eq('election_id', electionId)

    if (!tables || tables.length === 0) return []
    const tableIds = tables.map(t => t.id)

    // 2. Obtener jurados de estas mesas
    const { data: jurors, error } = await supabase
      .from('jurors')
      .select('*, profiles:user_id(first_name, last_name), election_tables:table_id(name)')
      .in('table_id', tableIds)

    if (error) throw new Error(error.message)

    const { data: { users: authUsers } } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 })

    return (jurors || []).map((j: any) => {
      const authUser = authUsers?.find(u => u.id === j.user_id)
      return {
        id: j.id,
        user_id: j.user_id,
        table_id: j.table_id,
        juror_name: `${j.profiles?.first_name || ''} ${j.profiles?.last_name || ''}`.trim(),
        juror_email: authUser?.email || '',
        table_name: j.election_tables?.name || ''
      }
    })
  } catch (err: any) {
    console.error('Error fetching jurors:', err)
    return []
  }
}

export async function assignJuror(userId: string, tableId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('jurors').insert({ user_id: userId, table_id: tableId })
    if (error) throw new Error(error.message)

    revalidatePath('/admin/elections')
    return { success: true }
  } catch (err: any) {
    console.error('Error assigning juror:', err)
    return { success: false, error: err.message }
  }
}

export async function removeJuror(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('jurors').delete().eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/admin/elections')
    return { success: true }
  } catch (err: any) {
    console.error('Error removing juror:', err)
    return { success: false, error: err.message }
  }
}

/**
 * -------------------------------------------------------------
 * VOTER ACTIONS (excel import & list)
 * -------------------------------------------------------------
 */

export async function getElectionVoters(electionId: string): Promise<Voter[]> {
  try {
    const supabase = await createClient()
    const { data: voters, error } = await supabase
      .from('election_voters')
      .select('*, profiles:student_id(first_name, last_name, grade_level)')
      .eq('election_id', electionId)

    if (error) throw new Error(error.message)

    const { data: { users: authUsers } } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 })

    return (voters || []).map((v: any) => {
      const authUser = authUsers?.find(u => u.id === v.student_id)
      return {
        id: v.id,
        student_id: v.student_id,
        election_id: v.election_id,
        has_voted: v.has_voted,
        voted_at: v.voted_at || undefined,
        student_name: `${v.profiles?.first_name || ''} ${v.profiles?.last_name || ''}`.trim(),
        student_email: authUser?.email || '',
        student_grade: v.profiles?.grade_level || ''
      }
    })
  } catch (err: any) {
    console.error('Error fetching voters:', err)
    return []
  }
}

export async function importVoters(electionId: string, rows: Array<{
  Documento: string | number
  Nombres: string
  Apellidos: string
  Correo?: string
  Grado: string
  Grupo?: string
}>): Promise<{ success: boolean; processed: number; newCount: number; updatedCount: number; errors: string[] }> {
  try {
    const adminClient = createAdminClient()
    let newCount = 0
    let updatedCount = 0
    const errors: string[] = []

    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    const { data: roles } = await adminClient.from('roles').select('id').eq('name', 'student').single()
    const studentRoleId = roles?.id

    for (const row of rows) {
      try {
        const document = row.Documento ? String(row.Documento).trim() : ''
        const email = (row.Correo || `${document}@ensuny.edu.co`).toLowerCase().trim()
        const firstName = row.Nombres ? String(row.Nombres).trim() : ''
        const lastName = row.Apellidos ? String(row.Apellidos).trim() : ''
        const grade = row.Grado ? String(row.Grado).trim() : ''

        let authUser = authUsers?.find(u => u.email === email)
        let userId = authUser?.id

        if (!authUser) {
          // Crear usuario
          const { data: created, error: createError } = await adminClient.auth.admin.createUser({
            email: email,
            password: `Estudiante${document}!`,
            email_confirm: true,
            user_metadata: { role_name: 'student', first_name: firstName, last_name: lastName, grade_level: grade }
          })
          if (createError) throw new Error(`Error auth user ${email}: ${createError.message}`)
          userId = created.user.id
          newCount++
        } else {
          updatedCount++
        }

        // Asegurar perfil público
        const { data: profile } = await adminClient.from('profiles').select('id').eq('id', userId!).single()
        if (!profile) {
          await adminClient.from('profiles').insert({
            id: userId!,
            first_name: firstName,
            last_name: lastName,
            role_id: studentRoleId!,
            grade_level: grade
          })
        } else {
          await adminClient.from('profiles').update({
            first_name: firstName,
            last_name: lastName,
            grade_level: grade
          }).eq('id', userId!)
        }

        // Habilitar en la elección (voters)
        const { data: voter } = await adminClient
          .from('election_voters')
          .select('id')
          .eq('student_id', userId!)
          .eq('election_id', electionId)
          .single()

        if (!voter) {
          await adminClient.from('election_voters').insert({
            student_id: userId!,
            election_id: electionId,
            has_voted: false
          })
        }
      } catch (e: any) {
        errors.push(`Fila (${row.Correo || 'sin correo'}): ${e.message}`)
      }
    }

    revalidatePath('/admin/elections')
    return {
      success: true,
      processed: rows.length,
      newCount,
      updatedCount,
      errors
    }
  } catch (err: any) {
    console.error('Error importing voters:', err)
    return { success: false, processed: 0, newCount: 0, updatedCount: 0, errors: [err.message] }
  }
}

/**
 * -------------------------------------------------------------
 * DEBATES ACTIONS
 * -------------------------------------------------------------
 */

export async function getDebates(electionId: string): Promise<Debate[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('election_debates')
      .select('*')
      .eq('election_id', electionId)
      .order('date', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  } catch (err: any) {
    console.error('Error fetching debates:', err)
    return []
  }
}

export async function createOrUpdateDebate(debate: Partial<Debate>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient()
    const isNew = !debate.id

    const payload = {
      election_id: debate.election_id,
      date: debate.date,
      time: debate.time,
      location: debate.location,
      transmission_url: debate.transmission_url || ''
    }

    let result
    if (isNew) {
      result = await supabase.from('election_debates').insert(payload).select().single()
    } else {
      result = await supabase.from('election_debates').update(payload).eq('id', debate.id!).select().single()
    }

    if (result.error) throw new Error(result.error.message)

    revalidatePath('/admin/elections')
    return { success: true, data: result.data }
  } catch (err: any) {
    console.error('Error saving debate:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteDebate(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('election_debates').delete().eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/admin/elections')
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting debate:', err)
    return { success: false, error: err.message }
  }
}

/**
 * -------------------------------------------------------------
 * VOTING OPERATIONS
 * -------------------------------------------------------------
 */

export async function checkVoterStatus(electionId: string): Promise<{ enabled: boolean; hasVoted: boolean; tableId?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { enabled: false, hasVoted: false }

    // 1. Verificar si está habilitado y si ya votó
    const { data: voter } = await supabase
      .from('election_voters')
      .select('has_voted')
      .eq('student_id', user.id)
      .eq('election_id', electionId)
      .single()

    if (!voter) return { enabled: false, hasVoted: false }

    // 2. Obtener grado del estudiante
    const { data: profile } = await supabase
      .from('profiles')
      .select('grade_level')
      .eq('id', user.id)
      .single()

    const grade = profile?.grade_level || ''

    // 3. Buscar mesa asociada a este grado para esta elección
    const { data: tables } = await supabase
      .from('election_tables')
      .select('id, enabled_grades')
      .eq('election_id', electionId)

    const gradeClean = grade.trim().toLowerCase()
    const matchingTable = (tables || []).find(t => 
      (t.enabled_grades || []).some((tg: string) => {
        const tgClean = tg.trim().toLowerCase()
        return gradeClean.startsWith(tgClean) || tgClean.startsWith(gradeClean)
      })
    )

    return {
      enabled: true,
      hasVoted: voter.has_voted,
      tableId: matchingTable?.id
    }
  } catch (err) {
    console.error('Error checking voter status:', err)
    return { enabled: false, hasVoted: false }
  }
}

export async function submitVote(electionId: string, candidateId: string | null, tableId: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    // Usamos el cliente administrador para evitar conflictos de RLS al insertar/actualizar
    const adminSupabase = createAdminClient()

    // 1. Validar que no haya votado previamente
    const { data: voter, error: vError } = await adminSupabase
      .from('election_voters')
      .select('id, has_voted')
      .eq('student_id', user.id)
      .eq('election_id', electionId)
      .single()

    if (vError || !voter) throw new Error('No estás registrado en el censo de esta elección')
    if (voter.has_voted) throw new Error('Ya has registrado tu voto en esta elección')

    // 2. Registrar el voto anónimo
    const { error: voteError } = await adminSupabase
      .from('votes')
      .insert({
        election_id: electionId,
        candidate_id: candidateId, // NULL para voto en blanco
        table_id: tableId
      })

    if (voteError) throw new Error('Error al registrar tu voto anónimo')

    // 3. Actualizar registro de votante
    const { error: updateError } = await adminSupabase
      .from('election_voters')
      .update({ has_voted: true, voted_at: new Date().toISOString() })
      .eq('student_id', user.id)
      .eq('election_id', electionId)

    if (updateError) {
      throw new Error('Error al confirmar participación electoral')
    }

    revalidatePath('/student/elections')
    revalidatePath('/juror/elections')
    return { success: true }
  } catch (err: any) {
    console.error('Error submitting vote:', err)
    return { success: false, error: err.message }
  }
}

/**
 * -------------------------------------------------------------
 * ANALYTICS & RESULTS
 * -------------------------------------------------------------
 */

export interface CandidateVoteResult {
  id: string | null // null es voto en blanco
  name: string
  photo_url?: string
  grade?: string
  number?: string
  votes: number
  percentage: number
}

export interface ElectionResultsSummary {
  totalVotersHabilitados: number
  totalVotes: number
  participationPercentage: number
  abstencionPercentage: number
  votesValidos: number
  votesBlanco: number
  candidatesResults: CandidateVoteResult[]
}

export async function getElectionResults(electionId: string): Promise<ElectionResultsSummary | null> {
  try {
    const supabase = createAdminClient()

    // 1. Obtener la elección para verificar permisos de visualización
    const election = await getElectionById(electionId)
    if (!election) return null

    // 2. Contar votantes habilitados en el tarjetón
    const { count: totalVotersHabilitados } = await supabase
      .from('election_voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId)

    // 3. Contar todos los votos registrados
    const { data: votesData, error: votesError } = await supabase
      .from('votes')
      .select('candidate_id')
      .eq('election_id', electionId)

    if (votesError) throw new Error(votesError.message)
    const votesList = votesData || []
    const totalVotes = votesList.length

    // 4. Obtener todos los candidatos de la elección
    const candidates = await getCandidates(electionId)

    // 5. Mapear resultados por candidato
    const candidatesResults: CandidateVoteResult[] = candidates.map(c => {
      const cVotes = votesList.filter(v => v.candidate_id === c.id).length
      return {
        id: c.id,
        name: c.student_name || `Candidato ${c.number}`,
        photo_url: c.photo_url || undefined,
        grade: c.student_grade || undefined,
        number: c.number,
        votes: cVotes,
        percentage: totalVotes > 0 ? parseFloat(((cVotes / totalVotes) * 100).toFixed(1)) : 0
      }
    })

    // Añadir voto en blanco
    const blancoVotes = votesList.filter(v => v.candidate_id === null).length
    candidatesResults.push({
      id: null,
      name: 'Voto en Blanco',
      votes: blancoVotes,
      percentage: totalVotes > 0 ? parseFloat(((blancoVotes / totalVotes) * 100).toFixed(1)) : 0
    })

    // Ordenar resultados por votos descendente
    candidatesResults.sort((a, b) => b.votes - a.votes)

    const habs = totalVotersHabilitados || 0
    const partPct = habs > 0 ? parseFloat(((totalVotes / habs) * 100).toFixed(1)) : 0
    const abstPct = parseFloat((100 - partPct).toFixed(1))

    return {
      totalVotersHabilitados: habs,
      totalVotes,
      participationPercentage: partPct,
      abstencionPercentage: abstPct,
      votesValidos: totalVotes - blancoVotes,
      votesBlanco: blancoVotes,
      candidatesResults
    }
  } catch (err) {
    console.error('Error calculating election results:', err)
    return null
  }
}

export async function resetElectionResults(electionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()

    // 1. Borrar todos los votos de la tabla votes
    const { error: deleteVotesError } = await adminClient
      .from('votes')
      .delete()
      .eq('election_id', electionId)

    if (deleteVotesError) throw new Error(deleteVotesError.message)

    // 2. Restablecer el estado has_voted = false para todos los habilitados
    const { error: resetVotersError } = await adminClient
      .from('election_voters')
      .update({ has_voted: false, voted_at: null })
      .eq('election_id', electionId)

    if (resetVotersError) throw new Error(resetVotersError.message)

    revalidatePath('/admin/elections')
    return { success: true }
  } catch (err: any) {
    console.error('Error resetting election:', err)
    return { success: false, error: err.message }
  }
}

export async function getEligibleUsers(): Promise<{ students: any[]; staff: any[] }> {
  try {
    const adminClient = createAdminClient()
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('*, roles(name)')

    if (error) throw new Error(error.message)

    const students = (profiles || []).filter((p: any) => p.roles?.name === 'student')
    const staff = (profiles || []).filter((p: any) => p.roles?.name === 'teacher' || p.roles?.name === 'admin' || p.roles?.name === 'superadmin')

    return {
      students: students.map((p: any) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`.trim(), grade: p.grade_level })),
      staff: staff.map((p: any) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`.trim(), role: p.roles?.name }))
    }
  } catch (err) {
    console.error('Error fetching eligible users:', err)
    return { students: [], staff: [] }
  }
}

export async function submitAssistedVote(
  electionId: string, 
  candidateId: string | null, 
  tableId: string | null,
  studentId: string | null = null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // Registrar el voto anónimo directamente sin validar censo personal
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        election_id: electionId,
        candidate_id: candidateId,
        table_id: tableId
      })

    if (voteError) throw new Error(voteError.message)

    // Si se especificó un estudiante del censo, marcarlo como que ya votó
    if (studentId) {
      const { error: updateError } = await supabase
        .from('election_voters')
        .update({ has_voted: true, voted_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('election_id', electionId)

      if (updateError) {
        console.error('Error marking voter as voted:', updateError)
      }
    }

    revalidatePath('/juror/elections')
    return { success: true }
  } catch (err: any) {
    console.error('Error submitting assisted vote:', err)
    return { success: false, error: err.message }
  }
}

export async function getTableVotesCount(tableId: string): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('table_id', tableId)

    if (error) throw new Error(error.message)
    return count || 0
  } catch (err) {
    console.error('Error fetching table votes count:', err)
    return 0
  }
}
