'use server'

import { createAdminClient } from '@/core/config/supabase/server'
import { LessonGradeType } from '@/modules/grades/application/gradesActions'
import { getPlanillaStudentSession } from './studentAuthActions'
import fs from 'fs'

export interface PlanillaActivityGrade {
  activityId: string
  name: string
  componentType: 'hacer' | 'saber' | 'ser'
  grade: number | null
}

export interface PlanillaAchievement {
  achievementId: string
  name: string
  description: string | null
  activities: PlanillaActivityGrade[]
  achievementAverage: number | null
}

export interface PlanillaSubjectReport {
  subjectId: string
  subjectName: string
  teacherName: string
  grade: number | null
  groupNumber: number | null
  period: string | null
  achievements: PlanillaAchievement[]
  finalAverage: number | null
  performanceLevel: string | null
}

function calcPerformanceLevel(avg: number): string {
  if (avg >= 4.6) return 'Superior'
  if (avg >= 4.0) return 'Alto'
  if (avg >= 3.0) return 'Básico'
  if (avg > 0) return 'Bajo'
  return '-'
}

export async function getStudentAssistedReport(): Promise<{ subjects: PlanillaSubjectReport[], generalAverage: number, generalPerformanceLevel: string }> {
  const session = await getPlanillaStudentSession()
  if (!session) {
    return { subjects: [], generalAverage: 0, generalPerformanceLevel: '-' }
  }

  const admin = createAdminClient()

  // 1. Obtener el perfil y datos del estudiante autenticado
  let fullName = session.fullName ? session.fullName.trim() : ''
  let cleanGrade = (session.gradeLevel || '').trim()
  let cleanGroup = (session.groupName || '').trim()

  if (session.profileId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('first_name, last_name, grade_level, group_name')
      .eq('id', session.profileId)
      .maybeSingle()

    if (profile) {
      if (!fullName) {
        fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      }
      if (!cleanGrade && profile.grade_level) cleanGrade = profile.grade_level.trim()
      if (!cleanGroup && profile.group_name) cleanGroup = profile.group_name.trim()
    }
  }

  const candidateIdsSet = new Set<string>()
  if (session.directoryId) {
    candidateIdsSet.add(session.directoryId)
    candidateIdsSet.add(`prof-${session.directoryId}`)
    candidateIdsSet.add(`dir-${session.directoryId}`)
  }
  if (session.profileId) {
    candidateIdsSet.add(session.profileId)
    candidateIdsSet.add(`prof-${session.profileId}`)
    candidateIdsSet.add(`dir-${session.profileId}`)
  }
  if (session.documentId) {
    candidateIdsSet.add(session.documentId)
    const cleanDoc = session.documentId.replace(/[^0-9a-zA-Z]/g, '')
    if (cleanDoc) candidateIdsSet.add(cleanDoc)
  }

  const candidateIds = Array.from(candidateIdsSet)

  let enrollments: Array<{ id: string; subject_id: string; full_name: string }> = []

  if (candidateIds.length > 0) {
    const { data: byDir } = await admin
      .from('assisted_students')
      .select('id, subject_id, full_name')
      .in('directory_id', candidateIds)
    if (byDir) enrollments.push(...byDir)
  }
  
  if (fullName) {
    const { data: byName } = await admin
      .from('assisted_students')
      .select('id, subject_id, full_name')
      .ilike('full_name', fullName)
    if (byName) {
      for (const item of byName) {
        if (!enrollments.some(e => e.id === item.id)) enrollments.push(item)
      }
    }
  }

  let gradeNum: number | undefined = undefined
  let groupNum: number | undefined = undefined

  if (/pfc[\s\-_]?12/i.test(cleanGrade) || /pfc[\s\-_]?12/i.test(cleanGroup)) {
    gradeNum = 12; groupNum = 1
  } else if (/pfc[\s\-_]?13/i.test(cleanGrade) || /pfc[\s\-_]?13/i.test(cleanGroup)) {
    gradeNum = 13; 
    const explicitGrp = cleanGroup.replace(/\D/g, '')
    groupNum = explicitGrp && explicitGrp !== '13' ? parseInt(explicitGrp, 10) : 1
  } else if (/nivelat/i.test(cleanGrade) || /nivelat/i.test(cleanGroup)) {
    gradeNum = 0; groupNum = 1
  } else {
    if (cleanGrade) { const d = cleanGrade.replace(/\D/g, ''); if (d) gradeNum = parseInt(d, 10) }
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
        const d = cleanGroup.replace(/\D/g, ''); if (d) groupNum = parseInt(d, 10) 
      }
    }
  }

  // Fallback si no hay grado en profile pero sí en inscripciones
  if ((gradeNum === undefined || groupNum === undefined) && enrollments.length > 0) {
    const enrolledSubjectIds = Array.from(new Set(enrollments.map(e => e.subject_id)))
    const { data: enrolledSubs } = await admin
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
  const allSubjectIds = new Set<string>(enrollments.map(e => e.subject_id))

  let subjectQuery = admin.from('assisted_subjects').select('id, name, teacher_id, profiles:teacher_id(first_name, last_name)')
  if (gradeNum !== undefined) {
    if (groupNum !== undefined) {
      subjectQuery = subjectQuery.eq('grade', gradeNum).or(`group_number.eq.${groupNum},group_number.is.null`)
    } else {
      subjectQuery = subjectQuery.eq('grade', gradeNum)
    }
    const { data: cohortSubs } = await subjectQuery
    if (cohortSubs) cohortSubs.forEach(s => allSubjectIds.add(s.id))
  }
  
  if (allSubjectIds.size === 0) {
    return { subjects: [], generalAverage: 0, generalPerformanceLevel: '-' }
  }

  const subjectIds = Array.from(allSubjectIds)
  const studentIds = Array.from(new Set(enrollments.map(e => e.id))) // IDs internos de assisted_students

  // 2, 3, 5. Disparar consultas independientes en paralelo para optimizar la carga
  const [subjectsRes, achievementsRes, gradesRes] = await Promise.all([
    admin.from('assisted_subjects').select('id, name, teacher_id, grade, group_number, period').in('id', subjectIds),
    admin.from('assisted_achievements').select('id, subject_id, name, description, position_order').in('subject_id', subjectIds).order('position_order', { ascending: true }),
    studentIds.length > 0 ? admin.from('assisted_grades').select('activity_id, grade_value, student_id').in('student_id', studentIds) : Promise.resolve({ data: [] })
  ])

  const subjectsData = subjectsRes.data || []
  const subjectsError = subjectsRes.error
  const achievementsData = achievementsRes.data || []
  const gradesData = gradesRes.data || []

  const debugInfo = {
    userId: session.profileId || session.directoryId,
    fullName,
    candidateIds,
    enrollmentsCount: enrollments.length,
    gradeNum,
    groupNum,
    allSubjectIdsSize: allSubjectIds.size,
    subjectsDataLength: subjectsData.length,
    subjectsError: subjectsError,
    studentIdsCount: studentIds.length
  }
  try {
    fs.writeFileSync('debug.json', JSON.stringify(debugInfo, null, 2))
  } catch(e) {}

  if (subjectsError || subjectsData.length === 0) {
    return { subjects: [], generalAverage: 0, generalPerformanceLevel: '-' }
  }

  // 4. Obtener Actividades publicadas y Perfiles de docentes en paralelo
  const teacherIds = Array.from(new Set(subjectsData.map(s => s.teacher_id).filter(Boolean)))
  const achievementIds = achievementsData.map(a => a.id)

  const [teachersRes, activitiesRes] = await Promise.all([
    teacherIds.length > 0 ? admin.from('profiles').select('id, first_name, last_name').in('id', teacherIds) : Promise.resolve({ data: [] }),
    achievementIds.length > 0 ? admin.from('assisted_activities').select('id, achievement_id, name, component_type, position_order').in('achievement_id', achievementIds).eq('is_published', true).order('position_order', { ascending: true }) : Promise.resolve({ data: [] })
  ])

  const teacherMap = new Map<string, string>()
  if (teachersRes.data) {
    teachersRes.data.forEach(t => teacherMap.set(t.id, `${t.first_name || ''} ${t.last_name || ''}`.trim()))
  }
  
  const activitiesData = activitiesRes.data || []

  const subjectMap = new Map(subjectsData.map((s: any) => {
    return [s.id, { 
      name: s.name, 
      teacherName: teacherMap.get(s.teacher_id) || 'Docente',
      grade: s.grade,
      groupNumber: s.group_number,
      period: s.period
    }]
  }))

  // Mapear grades por activity_id
  const gradeMap = new Map<string, number>()
  gradesData.forEach((g: any) => {
    gradeMap.set(g.activity_id, g.grade_value)
  })

  // Estructurar la respuesta
  const reportSubjects: PlanillaSubjectReport[] = []
  let totalSubjectAverages = 0
  let subjectsWithAverage = 0

  for (const subjectId of subjectIds) {
    const sInfo = subjectMap.get(subjectId)
    if (!sInfo) continue

    const subjAchievements = (achievementsData || []).filter((a: any) => a.subject_id === subjectId)
    const reportAchievements: PlanillaAchievement[] = []
    let subjTotalAvg = 0
    let subjAvgCount = 0

    for (const ach of subjAchievements) {
      const achActivities = activitiesData.filter((act: any) => act.achievement_id === ach.id)
      const activityGrades: PlanillaActivityGrade[] = []

      let achTotal = 0
      let achCount = 0

      for (const act of achActivities) {
        const grade = gradeMap.get(act.id) ?? null
        activityGrades.push({
          activityId: act.id,
          name: act.name,
          componentType: act.component_type as 'hacer' | 'saber' | 'ser',
          grade: grade
        })
        if (grade !== null) {
          achTotal += grade
          achCount++
        }
      }

      // Solo promediar las actividades que sí tienen nota registrada
      const achAvg = achCount > 0 ? Number((achTotal / achCount).toFixed(2)) : null
      if (achAvg !== null) {
        subjTotalAvg += achAvg
        subjAvgCount++
      }

      reportAchievements.push({
        achievementId: ach.id,
        name: ach.name,
        description: ach.description,
        activities: activityGrades,
        achievementAverage: achAvg
      })
    }

    const finalAvg = subjAvgCount > 0 ? Number((subjTotalAvg / subjAvgCount).toFixed(2)) : null
    
    if (finalAvg !== null) {
      totalSubjectAverages += finalAvg
      subjectsWithAverage++
    }

    reportSubjects.push({
      subjectId,
      subjectName: sInfo.name,
      teacherName: sInfo.teacherName,
      grade: sInfo.grade ?? null,
      groupNumber: sInfo.groupNumber ?? null,
      period: sInfo.period ?? null,
      achievements: reportAchievements,
      finalAverage: finalAvg,
      performanceLevel: finalAvg !== null ? calcPerformanceLevel(finalAvg) : null
    })
  }

  // Promedio General
  const generalAvg = subjectsWithAverage > 0 ? Number((totalSubjectAverages / subjectsWithAverage).toFixed(2)) : 0
  const generalPerformance = generalAvg > 0 ? calcPerformanceLevel(generalAvg) : '-'

  return {
    subjects: reportSubjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    generalAverage: generalAvg,
    generalPerformanceLevel: generalPerformance
  }
}
