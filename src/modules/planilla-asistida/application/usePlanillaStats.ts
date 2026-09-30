import { useMemo } from 'react'
import { usePlanillaStore } from '@/store/usePlanillaStore'
import { AssistedAchievement } from '@/modules/planilla-asistida/application/actions'

export interface StudentAchievementRecord {
  achievementId: string
  achievementName: string
  grade: number | null
  desempeno: 'Bajo' | 'Básico' | 'Alto' | 'Superior' | 'Pendiente'
  badgeColor: string
  isFailing: boolean
}

export interface StudentRecordByAchievements {
  id: string
  number: number
  fullName: string
  achievementsData: Record<string, StudentAchievementRecord>
  failingCount: number
  passedCount: number
  pendingCount: number
  status: 'aprobado' | 'riesgo' | 'sin_calificar'
}

export interface PlanillaChartItem {
  name: string
  range: string
  label: string
  count: number
  percentage: number
  color: string
  desempeno: string
}

export interface AchievementGroupStats {
  achievementId: string
  achievementName: string
  totalStudents: number
  evaluatedStudents: number
  unassessedStudents: number
  activeStudents: number // Aprobados en este logro (>= 3.0)
  atRiskStudents: number // En Riesgo en este logro (< 3.0)
  approvedPct: number
  atRiskPct: number
  unassessedPct: number
  achievementAverage: number | null
  chartData: PlanillaChartItem[]
}

export interface PlanillaGroupStats {
  totalStudents: number
  achievementsList: AssistedAchievement[]
  achievementStats: Record<string, AchievementGroupStats>
  studentRecords: StudentRecordByAchievements[]
  // Estadísticas globales consolidadas (para cuando no se selecciona un logro específico)
  globalStats: {
    totalStudents: number
    evaluatedStudents: number
    unassessedStudents: number
    activeStudents: number
    atRiskStudents: number
    approvedPct: number
    atRiskPct: number
    unassessedPct: number
    chartData: PlanillaChartItem[]
  }
}

export function usePlanillaStats(): PlanillaGroupStats {
  const { students, achievements, activities, grades } = usePlanillaStore()

  return useMemo(() => {
    const totalStudents = students.length

    // 1. Helpers de cálculo institucional por componente
    const calcComponentAverage = (studentId: string, achievementId: string, component: 'hacer' | 'saber' | 'ser') => {
      const compActivities = activities.filter(a => a.achievement_id === achievementId && a.component_type === component)
      if (compActivities.length === 0) return null

      let sum = 0
      let count = 0
      compActivities.forEach(act => {
        const grade = grades[studentId]?.[act.id]
        if (grade !== undefined && grade !== null) {
          sum += grade
          count++
        }
      })

      if (count === 0) return null
      return sum / count
    }

    // 2. Cálculo de la Definitiva de un Logro específico
    const calcAchievementGrade = (studentId: string, achievementId: string): number | null => {
      const hacer = calcComponentAverage(studentId, achievementId, 'hacer')
      const saber = calcComponentAverage(studentId, achievementId, 'saber')
      const ser = calcComponentAverage(studentId, achievementId, 'ser')

      let total = 0
      let weight = 0

      if (hacer !== null) { total += hacer * 0.35; weight += 0.35 }
      if (saber !== null) { total += saber * 0.35; weight += 0.35 }
      if (ser !== null) { total += ser * 0.30; weight += 0.30 }

      if (weight === 0) return null
      return Number((total / weight).toFixed(2))
    }

    // 3. Asignación de Desempeño Cualitativo Institucional por cada Logro
    const getAchievementDesempeno = (grade: number | null): {
      desempeno: 'Bajo' | 'Básico' | 'Alto' | 'Superior' | 'Pendiente'
      badgeColor: string
      isFailing: boolean
    } => {
      if (grade === null) {
        return {
          desempeno: 'Pendiente',
          badgeColor: 'text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60',
          isFailing: false
        }
      }
      if (grade < 3.0) {
        return {
          desempeno: 'Bajo',
          badgeColor: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50',
          isFailing: true
        }
      }
      if (grade <= 3.9) {
        return {
          desempeno: 'Básico',
          badgeColor: 'text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
          isFailing: false
        }
      }
      if (grade <= 4.5) {
        return {
          desempeno: 'Alto',
          badgeColor: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
          isFailing: false
        }
      }
      return {
        desempeno: 'Superior',
        badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
        isFailing: false
      }
    }

    // 4. Mapear cada estudiante y sus notas independientes por logro
    const studentRecords: StudentRecordByAchievements[] = students.map(student => {
      const achievementsData: Record<string, StudentAchievementRecord> = {}
      let failingCount = 0
      let passedCount = 0
      let pendingCount = 0

      achievements.forEach(ach => {
        const grade = calcAchievementGrade(student.id, ach.id)
        const { desempeno, badgeColor, isFailing } = getAchievementDesempeno(grade)

        if (grade === null) {
          pendingCount++
        } else if (isFailing) {
          failingCount++
        } else {
          passedCount++
        }

        achievementsData[ach.id] = {
          achievementId: ach.id,
          achievementName: ach.name,
          grade,
          desempeno,
          badgeColor,
          isFailing
        }
      })

      let status: 'aprobado' | 'riesgo' | 'sin_calificar' = 'sin_calificar'
      if (failingCount > 0) {
        status = 'riesgo'
      } else if (passedCount > 0) {
        status = 'aprobado'
      }

      return {
        id: student.id,
        number: student.number,
        fullName: student.full_name,
        achievementsData,
        failingCount,
        passedCount,
        pendingCount,
        status
      }
    })

    // 5. Estadísticas de Grupo calculadas Logro por Logro
    const achievementStats: Record<string, AchievementGroupStats> = {}

    achievements.forEach(ach => {
      let activeStudents = 0
      let atRiskStudents = 0
      let unassessedStudents = 0
      let sumGrades = 0
      let countEvaluated = 0

      let countLow = 0
      let countBasic = 0
      let countHigh = 0
      let countSuperior = 0

      studentRecords.forEach(st => {
        const rec = st.achievementsData[ach.id]
        if (!rec || rec.grade === null) {
          unassessedStudents++
        } else {
          countEvaluated++
          sumGrades += rec.grade
          if (rec.grade < 3.0) {
            atRiskStudents++
            countLow++
          } else {
            activeStudents++
            if (rec.grade <= 3.9) countBasic++
            else if (rec.grade <= 4.5) countHigh++
            else countSuperior++
          }
        }
      })

      const baseTotal = totalStudents > 0 ? totalStudents : 1
      const approvedPct = Math.round((activeStudents / baseTotal) * 100)
      const atRiskPct = Math.round((atRiskStudents / baseTotal) * 100)
      const unassessedPct = Math.max(0, 100 - approvedPct - atRiskPct)

      const chartBase = countEvaluated > 0 ? countEvaluated : 1
      const chartData: PlanillaChartItem[] = [
        {
          name: '< 3.0',
          range: '< 3.0',
          label: '< 3.0',
          count: countLow,
          percentage: Math.round((countLow / chartBase) * 100),
          color: '#ef4444',
          desempeno: 'Bajo'
        },
        {
          name: '3.0 - 3.9',
          range: '3.0 - 3.9',
          label: '3.0 - 3.9',
          count: countBasic,
          percentage: Math.round((countBasic / chartBase) * 100),
          color: '#f59e0b',
          desempeno: 'Básico'
        },
        {
          name: '4.0 - 4.5',
          range: '4.0 - 4.5',
          label: '4.0 - 4.5',
          count: countHigh,
          percentage: Math.round((countHigh / chartBase) * 100),
          color: '#3b82f6',
          desempeno: 'Alto'
        },
        {
          name: '4.6 - 5.0',
          range: '4.6 - 5.0',
          label: '4.6 - 5.0',
          count: countSuperior,
          percentage: Math.round((countSuperior / chartBase) * 100),
          color: '#10b981',
          desempeno: 'Superior'
        }
      ]

      achievementStats[ach.id] = {
        achievementId: ach.id,
        achievementName: ach.name,
        totalStudents,
        evaluatedStudents: countEvaluated,
        unassessedStudents,
        activeStudents,
        atRiskStudents,
        approvedPct,
        atRiskPct,
        unassessedPct,
        achievementAverage: countEvaluated > 0 ? Number((sumGrades / countEvaluated).toFixed(2)) : null,
        chartData
      }
    })

    // 6. Estadísticas consolidadas de estudiantes con al menos un logro en riesgo
    const totalStudentsAtRisk = studentRecords.filter(s => s.failingCount > 0).length
    const totalStudentsApproved = studentRecords.filter(s => s.failingCount === 0 && s.passedCount > 0).length
    const totalStudentsUnassessed = studentRecords.filter(s => s.passedCount === 0 && s.failingCount === 0).length

    const baseStudents = totalStudents > 0 ? totalStudents : 1
    const globalApprovedPct = Math.round((totalStudentsApproved / baseStudents) * 100)
    const globalAtRiskPct = Math.round((totalStudentsAtRisk / baseStudents) * 100)
    const globalUnassessedPct = Math.max(0, 100 - globalApprovedPct - globalAtRiskPct)

    // Agrupación global sumando todas las evaluaciones de logros
    let globalLow = 0, globalBasic = 0, globalHigh = 0, globalSuperior = 0
    let totalEvaluations = 0

    Object.values(achievementStats).forEach(st => {
      st.chartData.forEach(item => {
        if (item.range === '< 3.0') globalLow += item.count
        else if (item.range === '3.0 - 3.9') globalBasic += item.count
        else if (item.range === '4.0 - 4.5') globalHigh += item.count
        else if (item.range === '4.6 - 5.0') globalSuperior += item.count
        totalEvaluations += item.count
      })
    })

    const chartEvalBase = totalEvaluations > 0 ? totalEvaluations : 1
    const globalChartData: PlanillaChartItem[] = [
      {
        name: '< 3.0',
        range: '< 3.0',
        label: '< 3.0',
        count: globalLow,
        percentage: Math.round((globalLow / chartEvalBase) * 100),
        color: '#ef4444',
        desempeno: 'Bajo'
      },
      {
        name: '3.0 - 3.9',
        range: '3.0 - 3.9',
        label: '3.0 - 3.9',
        count: globalBasic,
        percentage: Math.round((globalBasic / chartEvalBase) * 100),
        color: '#f59e0b',
        desempeno: 'Básico'
      },
      {
        name: '4.0 - 4.5',
        range: '4.0 - 4.5',
        label: '4.0 - 4.5',
        count: globalHigh,
        percentage: Math.round((globalHigh / chartEvalBase) * 100),
        color: '#3b82f6',
        desempeno: 'Alto'
      },
      {
        name: '4.6 - 5.0',
        range: '4.6 - 5.0',
        label: '4.6 - 5.0',
        count: globalSuperior,
        percentage: Math.round((globalSuperior / chartEvalBase) * 100),
        color: '#10b981',
        desempeno: 'Superior'
      }
    ]

    return {
      totalStudents,
      achievementsList: achievements,
      achievementStats,
      studentRecords,
      globalStats: {
        totalStudents,
        evaluatedStudents: totalStudents - totalStudentsUnassessed,
        unassessedStudents: totalStudentsUnassessed,
        activeStudents: totalStudentsApproved,
        atRiskStudents: totalStudentsAtRisk,
        approvedPct: globalApprovedPct,
        atRiskPct: globalAtRiskPct,
        unassessedPct: globalUnassessedPct,
        chartData: globalChartData
      }
    }
  }, [students, achievements, activities, grades])
}
