import * as XLSX from 'xlsx'
import { AssistedAchievement, AssistedActivity } from './actions'
import { GradeMap } from '@/store/usePlanillaStore'

export function exportPlanillaToExcel(
  subjectName: string,
  students: { id: string, number: number, full_name: string }[],
  achievements: AssistedAchievement[],
  activities: AssistedActivity[],
  grades: GradeMap
) {
  // Helpers para cálculos iguales a los de SpreadsheetTable
  const calcComponentAverage = (studentId: string, achievementId: string, component: 'hacer' | 'saber' | 'ser') => {
    const compActivities = activities.filter(a => a.achievement_id === achievementId && a.component_type === component)
    if (compActivities.length === 0) return null
    let sum = 0; let count = 0
    compActivities.forEach(act => {
      const grade = grades[studentId]?.[act.id]
      if (grade !== undefined && grade !== null) { sum += grade; count++ }
    })
    return count === 0 ? null : sum / count
  }

  const calcAchievementAverage = (studentId: string, achievementId: string) => {
    const hacer = calcComponentAverage(studentId, achievementId, 'hacer')
    const saber = calcComponentAverage(studentId, achievementId, 'saber')
    const ser = calcComponentAverage(studentId, achievementId, 'ser')
    let total = 0; let weight = 0
    if (hacer !== null) { total += hacer * 0.35; weight += 0.35 }
    if (saber !== null) { total += saber * 0.35; weight += 0.35 }
    if (ser !== null) { total += ser * 0.30; weight += 0.30 }
    return weight === 0 ? null : total / weight 
  }

  const calcFinalAverage = (studentId: string) => {
    let sum = 0; let count = 0
    achievements.forEach(ach => {
      const avg = calcAchievementAverage(studentId, ach.id)
      if (avg !== null) { sum += avg; count++ }
    })
    return count === 0 ? null : sum / count
  }

  const formatGrade = (grade: number | null) => {
    return grade === null ? '' : Number(grade.toFixed(1))
  }

  // --- Construcción de la matriz para Excel ---
  const wsData: any[][] = []
  
  // Fila 1: Título de Logros
  const row1: any[] = ['', ''] // N° y Nombre
  const row2: any[] = ['N°', 'Estudiante'] // Componentes
  const row3: any[] = ['', ''] // Actividades
  
  const merges: XLSX.Range[] = []

  // Estructura de encabezados
  let currentCol = 2 // Arrancamos en la columna C (índice 2)
  
  achievements.forEach(ach => {
    // Merge para el título del Logro
    const startLogroCol = currentCol
    let actsInLogro = 0

    const components = ['hacer', 'saber', 'ser'] as const
    components.forEach(comp => {
      const compActivities = activities.filter(a => a.achievement_id === ach.id && a.component_type === comp)
      const colspan = Math.max(1, compActivities.length)
      const weight = comp === 'ser' ? '30%' : '35%'
      
      // Fila 2: Título del Componente
      row2[currentCol] = `${comp.toUpperCase()} (${weight})`
      if (colspan > 1) {
        merges.push({ s: { r: 1, c: currentCol }, e: { r: 1, c: currentCol + colspan - 1 } })
      }

      // Fila 3: Actividades
      if (compActivities.length === 0) {
        row3[currentCol] = ''
        currentCol++
        actsInLogro++
      } else {
        compActivities.forEach(act => {
          row3[currentCol] = act.name
          currentCol++
          actsInLogro++
        })
      }
    })

    // Columna de promedio del logro
    row2[currentCol] = 'Promedio'
    row3[currentCol] = ''
    merges.push({ s: { r: 1, c: currentCol }, e: { r: 2, c: currentCol } }) // Merge vertical para el Promedio
    
    // Merge Fila 1 (Logro)
    row1[startLogroCol] = ach.name
    merges.push({ s: { r: 0, c: startLogroCol }, e: { r: 0, c: currentCol } })
    
    currentCol++
  })

  // Promedio Final
  row1[currentCol] = 'PROMEDIO FINAL'
  merges.push({ s: { r: 0, c: currentCol }, e: { r: 2, c: currentCol } }) // Merge vertical de 3 filas

  wsData.push(row1, row2, row3)

  // Datos de los estudiantes
  students.forEach(student => {
    const sRow: any[] = [student.number, student.full_name]
    
    achievements.forEach(ach => {
      const components = ['hacer', 'saber', 'ser'] as const
      components.forEach(comp => {
        const compActivities = activities.filter(a => a.achievement_id === ach.id && a.component_type === comp)
        
        if (compActivities.length === 0) {
          sRow.push('')
        } else {
          compActivities.forEach(act => {
            const val = grades[student.id]?.[act.id]
            sRow.push(val !== undefined ? val : '')
          })
        }
      })
      // Promedio Logro
      sRow.push(formatGrade(calcAchievementAverage(student.id, ach.id)))
    })
    
    // Promedio Final Estudiante
    sRow.push(formatGrade(calcFinalAverage(student.id)))
    wsData.push(sRow)
  })

  // Crear Workbook y Worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!merges'] = merges

  // Configurar anchos de columna básicos
  const colWidths = [
    { wch: 5 }, // N°
    { wch: 35 }, // Nombre
  ]
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Planilla Asistida')

  // Generar nombre de archivo
  const safeName = subjectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const dateStr = new Date().toISOString().split('T')[0]
  
  XLSX.writeFile(wb, `planilla_${safeName}_${dateStr}.xlsx`)
}
