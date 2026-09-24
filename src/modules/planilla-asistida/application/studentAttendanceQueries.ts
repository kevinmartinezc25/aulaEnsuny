'use server'

import { createAdminClient } from '@/core/config/supabase/server'
import { getPlanillaStudentSession } from './studentAuthActions'

export interface StudentAttendanceSubjectSummary {
  id: string
  name: string
  grade: number
  group_number: number
  period: string
  teacherName?: string
  totalSessions: number
  attendedCount: number
  tardyCount: number
  unjustifiedAbsences: number
  excusedAbsences: number
  unrecordedCount: number
  attendancePercentage: number
  studentIdInSubject?: string
  lastSessionDate?: string | null
}

export interface StudentSessionAttendanceTrace {
  sessionId: string
  date: string
  topic?: string | null
  status: 'A' | 'I' | 'E' | 'T' | 'NONE'
  statusLabel: string
  isLocked?: boolean
}

export interface StudentAttendanceOverview {
  summary: {
    totalSubjects: number
    totalSessions: number
    totalAttended: number
    totalTardy: number
    totalUnjustified: number
    totalExcused: number
    overallPercentage: number
  }
  subjects: StudentAttendanceSubjectSummary[]
  resolvedGrade?: string
  resolvedGroup?: string
}

function getCandidateDirectoryIds(session: { directoryId?: string; profileId?: string | null }): string[] {
  const ids = new Set<string>()
  if (session.directoryId) {
    ids.add(session.directoryId)
    ids.add(`prof-${session.directoryId}`)
    ids.add(`dir-${session.directoryId}`)
  }
  if (session.profileId) {
    ids.add(session.profileId)
    ids.add(`prof-${session.profileId}`)
    ids.add(`dir-${session.profileId}`)
  }
  return Array.from(ids)
}

function parseGradeAndGroup(gradeLevel?: string, groupName?: string): { gradeNum?: number; groupNum?: number } {
  let gradeNum: number | undefined = undefined
  let groupNum: number | undefined = undefined

  const cleanGrade = (gradeLevel || '').trim()
  const cleanGroup = (groupName || '').trim()

  // 1. Cohortes especiales: PFC-12, PFC-13, Nivelatorio
  if (/pfc[\s\-_]?12/i.test(cleanGrade) || /pfc[\s\-_]?12/i.test(cleanGroup)) {
    gradeNum = 12
    groupNum = 1
    return { gradeNum, groupNum }
  }

  if (/pfc[\s\-_]?13/i.test(cleanGrade) || /pfc[\s\-_]?13/i.test(cleanGroup)) {
    gradeNum = 13
    const explicitGrp = cleanGroup.replace(/\D/g, '')
    groupNum = explicitGrp && explicitGrp !== '13' ? parseInt(explicitGrp, 10) : 1
    return { gradeNum, groupNum }
  }

  if (/nivelat/i.test(cleanGrade) || /nivelat/i.test(cleanGroup)) {
    gradeNum = 0
    groupNum = 1
    return { gradeNum, groupNum }
  }

  // 2. Grados regulares (6° a 11°)
  if (cleanGrade) {
    const clean = cleanGrade.replace(/\D/g, '')
    if (clean) gradeNum = parseInt(clean, 10)
  }

  if (cleanGroup) {
    if (cleanGroup.includes('-')) {
      const parts = cleanGroup.split('-')
      if (!gradeNum) {
        const cleanG = parts[0].replace(/\D/g, '')
        if (cleanG) gradeNum = parseInt(cleanG, 10)
      }
      const cleanGrp = parts[1].replace(/\D/g, '')
      if (cleanGrp) groupNum = parseInt(cleanGrp, 10)
    } else {
      const cleanGrp = cleanGroup.replace(/\D/g, '')
      if (cleanGrp) groupNum = parseInt(cleanGrp, 10)
    }
  }

  return { gradeNum, groupNum }
}

/**
 * Consulta el reporte y resumen de asistencia para el estudiante autenticado,
 * filtrando por su Grado y Grupo en el módulo de Planilla Asistida.
 */
export async function getStudentAttendanceOverview(): Promise<StudentAttendanceOverview> {
  const session = await getPlanillaStudentSession()
  if (!session) {
    return {
      summary: {
        totalSubjects: 0,
        totalSessions: 0,
        totalAttended: 0,
        totalTardy: 0,
        totalUnjustified: 0,
        totalExcused: 0,
        overallPercentage: 100
      },
      subjects: []
    }
  }

  const supabase = createAdminClient()
  const trimmedFullName = session.fullName ? session.fullName.trim() : ''
  const candidateIds = getCandidateDirectoryIds(session)
  let { gradeNum, groupNum } = parseGradeAndGroup(session.gradeLevel, session.groupName)

  // 1. Obtener todas las materias donde el alumno está explícitamente inscrito en assisted_students
  let enrollments: Array<{ id: string; subject_id: string }> = []

  if (candidateIds.length > 0) {
    const { data: byDir } = await supabase
      .from('assisted_students')
      .select('id, subject_id')
      .in('directory_id', candidateIds)

    if (byDir) enrollments.push(...byDir)
  }

  if (trimmedFullName) {
    const { data: byName } = await supabase
      .from('assisted_students')
      .select('id, subject_id')
      .ilike('full_name', trimmedFullName)

    if (byName) {
      for (const item of byName) {
        if (!enrollments.some(e => e.id === item.id)) {
          enrollments.push(item)
        }
      }
    }
  }

  // Si no teníamos gradeNum o groupNum, intentar deducirlo de las materias inscritas
  if ((gradeNum === undefined || groupNum === undefined) && enrollments.length > 0) {
    const enrolledSubjectIds = Array.from(new Set(enrollments.map(e => e.subject_id)))
    const { data: enrolledSubs } = await supabase
      .from('assisted_subjects')
      .select('grade, group_number')
      .in('id', enrolledSubjectIds)
      .limit(1)
      .maybeSingle()

    if (enrolledSubs) {
      if (gradeNum === undefined && enrolledSubs.grade !== undefined && enrolledSubs.grade !== null) gradeNum = enrolledSubs.grade
      if (groupNum === undefined && enrolledSubs.group_number !== undefined && enrolledSubs.group_number !== null) groupNum = enrolledSubs.group_number
    }
  }

  const gradeDisplay = gradeNum === 12 ? 'PFC-12' : gradeNum === 13 ? 'PFC-13' : gradeNum === 0 ? 'Nivelatorio' : (gradeNum !== undefined ? `${gradeNum}°` : session.gradeLevel)
  const groupDisplay = (gradeNum === 12 || gradeNum === 13 || gradeNum === 0) ? (session.groupName && !session.groupName.includes('PFC') ? session.groupName : '1') : (groupNum !== undefined ? `${groupNum}` : session.groupName)

  // 2. Consultar materias de Planilla Asistida por Grado y Grupo
  let subjectQuery = supabase
    .from('assisted_subjects')
    .select('id, name, grade, group_number, period, teacher_id, created_at')

  if (gradeNum !== undefined) {
    if (groupNum !== undefined) {
      subjectQuery = subjectQuery
        .eq('grade', gradeNum)
        .or(`group_number.eq.${groupNum},group_number.is.null`)
    } else {
      subjectQuery = subjectQuery.eq('grade', gradeNum)
    }
  } else if (enrollments.length > 0) {
    // Si no se puede deducir grupo exacto, usar las materias donde está inscrito
    const enrolledSubjectIds = Array.from(new Set(enrollments.map(e => e.subject_id)))
    subjectQuery = subjectQuery.in('id', enrolledSubjectIds)
  } else {
    // Sin materias ni grupo
    return {
      summary: {
        totalSubjects: 0,
        totalSessions: 0,
        totalAttended: 0,
        totalTardy: 0,
        totalUnjustified: 0,
        totalExcused: 0,
        overallPercentage: 100
      },
      subjects: [],
      resolvedGrade: gradeDisplay,
      resolvedGroup: groupDisplay
    }
  }

  const { data: subjectsData, error: subjError } = await subjectQuery.order('name', { ascending: true })

  if (subjError || !subjectsData || subjectsData.length === 0) {
    return {
      summary: {
        totalSubjects: 0,
        totalSessions: 0,
        totalAttended: 0,
        totalTardy: 0,
        totalUnjustified: 0,
        totalExcused: 0,
        overallPercentage: 100
      },
      subjects: [],
      resolvedGrade: gradeDisplay,
      resolvedGroup: groupDisplay
    }
  }

  const subjectIds = subjectsData.map(s => s.id)

  // 3. Obtener nombres de docentes de los perfiles asociados
  const teacherIds = Array.from(new Set(subjectsData.map(s => s.teacher_id).filter(Boolean)))
  const teacherMap = new Map<string, string>()

  if (teacherIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', teacherIds)

    if (profiles) {
      profiles.forEach(p => {
        const full = [p.first_name, p.last_name].filter(Boolean).join(' ')
        if (full) teacherMap.set(p.id, full)
      })
    }
  }

  // 4. Si el estudiante no tenía enrollment para alguna materia del grado/grupo, buscarlo en assisted_students
  const missingSubjectIds = subjectIds.filter(sid => !enrollments.some(e => e.subject_id === sid))
  if (missingSubjectIds.length > 0) {
    if (candidateIds.length > 0) {
      const { data: extraByDir } = await supabase
        .from('assisted_students')
        .select('id, subject_id')
        .in('subject_id', missingSubjectIds)
        .in('directory_id', candidateIds)

      if (extraByDir) enrollments.push(...extraByDir)
    }

    if (trimmedFullName) {
      const { data: extraByName } = await supabase
        .from('assisted_students')
        .select('id, subject_id')
        .in('subject_id', missingSubjectIds)
        .ilike('full_name', trimmedFullName)

      if (extraByName) {
        for (const item of extraByName) {
          if (!enrollments.some(e => e.id === item.id)) {
            enrollments.push(item)
          }
        }
      }
    }
  }

  const studentIdMap = new Map<string, string>()
  enrollments.forEach(e => studentIdMap.set(e.subject_id, e.id))

  // 5. Obtener todas las sesiones de estas materias
  const { data: allSessions } = await supabase
    .from('assisted_sessions')
    .select('id, subject_id, date, topic, is_locked')
    .in('subject_id', subjectIds)
    .order('date', { ascending: false })

  const sessionsBySubject = new Map<string, typeof allSessions>()
  const allSessionIds: string[] = []

  if (allSessions) {
    allSessions.forEach(sess => {
      allSessionIds.push(sess.id)
      const list = sessionsBySubject.get(sess.subject_id) || []
      list.push(sess)
      sessionsBySubject.set(sess.subject_id, list)
    })
  }

  // 6. Obtener los registros de asistencia para el estudiante
  const myStudentIds = Array.from(new Set(Array.from(studentIdMap.values())))
  let attendanceRecords: Array<{ session_id: string; student_id: string; status: 'A' | 'I' | 'E' | 'T' }> = []

  if (myStudentIds.length > 0 && allSessionIds.length > 0) {
    const { data: attData } = await supabase
      .from('assisted_attendance')
      .select('session_id, student_id, status')
      .in('session_id', allSessionIds)
      .in('student_id', myStudentIds)

    if (attData) {
      attendanceRecords = attData as typeof attendanceRecords
    }
  }

  // Mapeo session_id -> status
  const attendanceMap = new Map<string, 'A' | 'I' | 'E' | 'T'>()
  attendanceRecords.forEach(att => {
    attendanceMap.set(att.session_id, att.status)
  })

  // 7. Compilar resúmenes por materia
  let totalAllSessions = 0
  let totalAllAttended = 0
  let totalAllTardy = 0
  let totalAllUnjustified = 0
  let totalAllExcused = 0

  const subjectSummaries: StudentAttendanceSubjectSummary[] = subjectsData.map(subject => {
    const sessions = sessionsBySubject.get(subject.id) || []
    const totalSessions = sessions.length
    totalAllSessions += totalSessions

    let attended = 0
    let tardy = 0
    let unjustified = 0
    let excused = 0
    let unrecorded = 0

    sessions.forEach(sess => {
      const status = attendanceMap.get(sess.id)
      if (status === 'A') attended++
      else if (status === 'T') tardy++
      else if (status === 'I') unjustified++
      else if (status === 'E') excused++
      else unrecorded++
    })

    totalAllAttended += attended
    totalAllTardy += tardy
    totalAllUnjustified += unjustified
    totalAllExcused += excused

    // Porcentaje: (asistencias + tardanzas) / sesiones evaluadas con registro
    const evaluatedSessions = attended + tardy + unjustified + excused
    let percentage = 100
    if (evaluatedSessions > 0) {
      percentage = Math.round(((attended + tardy) / evaluatedSessions) * 100)
    }

    const lastSession = sessions.length > 0 ? sessions[0].date : null

    return {
      id: subject.id,
      name: subject.name,
      grade: subject.grade || (gradeNum || 0),
      group_number: subject.group_number || (groupNum || 0),
      period: subject.period || 'General',
      teacherName: subject.teacher_id ? teacherMap.get(subject.teacher_id) : undefined,
      totalSessions,
      attendedCount: attended,
      tardyCount: tardy,
      unjustifiedAbsences: unjustified,
      excusedAbsences: excused,
      unrecordedCount: unrecorded,
      attendancePercentage: percentage,
      studentIdInSubject: studentIdMap.get(subject.id),
      lastSessionDate: lastSession
    }
  })

  const totalEvaluated = totalAllAttended + totalAllTardy + totalAllUnjustified + totalAllExcused
  const overallPercentage = totalEvaluated > 0
    ? Math.round(((totalAllAttended + totalAllTardy) / totalEvaluated) * 100)
    : 100

  return {
    summary: {
      totalSubjects: subjectsData.length,
      totalSessions: totalAllSessions,
      totalAttended: totalAllAttended,
      totalTardy: totalAllTardy,
      totalUnjustified: totalAllUnjustified,
      totalExcused: totalAllExcused,
      overallPercentage
    },
    subjects: subjectSummaries,
    resolvedGrade: gradeNum ? `${gradeNum}°` : session.gradeLevel,
    resolvedGroup: groupNum ? `${groupNum}` : session.groupName
  }
}

/**
 * Consulta la trazabilidad cronológica de asistencia por fechas para una materia específica.
 */
export async function getStudentSubjectAttendanceTraceability(
  subjectId: string
): Promise<{
  subject: {
    id: string
    name: string
    grade: number
    group_number: number
    period: string
    teacherName?: string
  }
  summary: {
    totalSessions: number
    attendedCount: number
    tardyCount: number
    unjustifiedAbsences: number
    excusedAbsences: number
    attendancePercentage: number
  }
  sessions: StudentSessionAttendanceTrace[]
} | null> {
  const session = await getPlanillaStudentSession()
  if (!session || !subjectId) return null

  const supabase = createAdminClient()
  const trimmedFullName = session.fullName ? session.fullName.trim() : ''
  const candidateIds = getCandidateDirectoryIds(session)

  // 1. Obtener la materia
  const { data: subject, error: subjErr } = await supabase
    .from('assisted_subjects')
    .select('id, name, grade, group_number, period, teacher_id')
    .eq('id', subjectId)
    .single()

  if (subjErr || !subject) return null

  // 2. Obtener nombre del docente
  let teacherName: string | undefined = undefined
  if (subject.teacher_id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', subject.teacher_id)
      .maybeSingle()

    if (prof) {
      teacherName = [prof.first_name, prof.last_name].filter(Boolean).join(' ')
    }
  }

  // 3. Obtener el estudiante en assisted_students
  let myStudentId: string | null = null

  if (candidateIds.length > 0) {
    const { data: byDir } = await supabase
      .from('assisted_students')
      .select('id')
      .eq('subject_id', subjectId)
      .in('directory_id', candidateIds)
      .limit(1)
      .maybeSingle()

    if (byDir) myStudentId = byDir.id
  }

  if (!myStudentId && trimmedFullName) {
    const { data: byName } = await supabase
      .from('assisted_students')
      .select('id')
      .eq('subject_id', subjectId)
      .ilike('full_name', trimmedFullName)
      .limit(1)
      .maybeSingle()

    if (byName) myStudentId = byName.id
  }

  // 4. Obtener las sesiones de la materia ordenadas por fecha (más reciente primero)
  const { data: rawSessions } = await supabase
    .from('assisted_sessions')
    .select('id, date, topic, is_locked')
    .eq('subject_id', subjectId)
    .order('date', { ascending: false })

  const sessions = rawSessions || []
  const sessionIds = sessions.map(s => s.id)

  // 5. Obtener asistencia del estudiante
  const attendanceMap = new Map<string, 'A' | 'I' | 'E' | 'T'>()

  if (myStudentId && sessionIds.length > 0) {
    const { data: attRows } = await supabase
      .from('assisted_attendance')
      .select('session_id, status')
      .eq('student_id', myStudentId)
      .in('session_id', sessionIds)

    if (attRows) {
      attRows.forEach(row => {
        if (row.status) attendanceMap.set(row.session_id, row.status as 'A' | 'I' | 'E' | 'T')
      })
    }
  }

  // 6. Formatear sesiones
  let attended = 0
  let tardy = 0
  let unjustified = 0
  let excused = 0

  const traceSessions: StudentSessionAttendanceTrace[] = sessions.map(sess => {
    const status = attendanceMap.get(sess.id)
    let finalStatus: 'A' | 'I' | 'E' | 'T' | 'NONE' = 'NONE'
    let statusLabel = 'Sin registrar'

    if (status === 'A') {
      finalStatus = 'A'
      statusLabel = 'Asistió'
      attended++
    } else if (status === 'T') {
      finalStatus = 'T'
      statusLabel = 'Llegó Tarde'
      tardy++
    } else if (status === 'I') {
      finalStatus = 'I'
      statusLabel = 'Inasistencia'
      unjustified++
    } else if (status === 'E') {
      finalStatus = 'E'
      statusLabel = 'Excusa / Justificada'
      excused++
    }

    return {
      sessionId: sess.id,
      date: sess.date,
      topic: sess.topic,
      status: finalStatus,
      statusLabel,
      isLocked: sess.is_locked
    }
  })

  const totalEvaluated = attended + tardy + unjustified + excused
  const attendancePercentage = totalEvaluated > 0
    ? Math.round(((attended + tardy) / totalEvaluated) * 100)
    : 100

  return {
    subject: {
      id: subject.id,
      name: subject.name,
      grade: subject.grade,
      group_number: subject.group_number,
      period: subject.period || 'General',
      teacherName
    },
    summary: {
      totalSessions: sessions.length,
      attendedCount: attended,
      tardyCount: tardy,
      unjustifiedAbsences: unjustified,
      excusedAbsences: excused,
      attendancePercentage
    },
    sessions: traceSessions
  }
}
