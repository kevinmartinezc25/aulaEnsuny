/**
 * Formatea fechas para el expediente de permisos docentes mostrando el nombre de los días (o rango de días).
 * Ejemplos:
 * - "Viernes, 4 de septiembre de 2026"
 * - "Viernes 4 al Martes 8 de septiembre de 2026 (5 días)"
 * - "Lunes 28 de septiembre al Viernes 2 de octubre de 2026 (5 días)"
 */
export function formatPermissionDateRange(startDateStr?: string, endDateStr?: string): string {
  if (!startDateStr) return ''
  const cleanStart = startDateStr.split('T')[0]
  const cleanEnd = (endDateStr || startDateStr).split('T')[0]

  const parseParts = (str: string) => {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d, 12, 0, 0)
  }

  const dt1 = parseParts(cleanStart)
  const dt2 = parseParts(cleanEnd)

  const getWeekday = (date: Date) => {
    const raw = date.toLocaleDateString('es-ES', { weekday: 'long' })
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }

  const [y1, m1, d1] = cleanStart.split('-').map(Number)
  const [y2, m2, d2] = cleanEnd.split('-').map(Number)

  if (cleanStart === cleanEnd) {
    const weekday = getWeekday(dt1)
    const month = dt1.toLocaleDateString('es-ES', { month: 'long' })
    return `${weekday}, ${d1} de ${month} de ${y1}`
  }

  const w1 = getWeekday(dt1)
  const w2 = getWeekday(dt2)
  const m1Name = dt1.toLocaleDateString('es-ES', { month: 'long' })
  const m2Name = dt2.toLocaleDateString('es-ES', { month: 'long' })

  const diffDays = Math.max(1, Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  const daysSuffix = ` (${diffDays} días)`

  if (y1 === y2 && m1 === m2) {
    return `${w1} ${d1} al ${w2} ${d2} de ${m1Name} de ${y1}${daysSuffix}`
  }

  if (y1 === y2) {
    return `${w1} ${d1} de ${m1Name} al ${w2} ${d2} de ${m2Name} de ${y1}${daysSuffix}`
  }

  return `${w1} ${d1} de ${m1Name} de ${y1} al ${w2} ${d2} de ${m2Name} de ${y2}${daysSuffix}`
}
