/**
 * Utilidades para cálculo de días festivos oficiales en Colombia.
 * Basado en la Ley 51 de 1983 (Ley Emiliani) y el cómputo de la Pascua católica (algoritmo Meeus/Butcher).
 */

export interface ColombianHoliday {
  date: string // 'YYYY-MM-DD'
  name: string
  type: 'fixed' | 'emiliani' | 'easter'
}

/**
 * Calcula el Domingo de Pascua para un año determinado utilizando el algoritmo Meeus/Butcher.
 */
function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1 // 0-indexed (2 = marzo, 3 = abril)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

/**
 * Traslada una fecha fija al siguiente lunes según la Ley Emiliani (Ley 51 de 1983).
 * Si la fecha ya cae en lunes, se mantiene. En cualquier otro caso, se traslada al lunes inmediatamente siguiente.
 */
function getNextMonday(year: number, monthIndex: number, day: number): Date {
  const d = new Date(Date.UTC(year, monthIndex, day))
  const dayOfWeek = d.getUTCDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  if (dayOfWeek === 1) return d
  const daysToAdd = (8 - dayOfWeek) % 7
  d.setUTCDate(d.getUTCDate() + daysToAdd)
  return d
}

function formatDateUTC(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysUTC(d: Date, days: number): Date {
  const res = new Date(d.getTime())
  res.setUTCDate(res.getUTCDate() + days)
  return res
}

/**
 * Obtiene la lista completa de los 18 días festivos oficiales de Colombia para un año específico.
 */
export function getColombianHolidays(year: number): ColombianHoliday[] {
  const holidays: ColombianHoliday[] = []

  // 1. Festivos de fecha fija (no se trasladan)
  holidays.push({ date: `${year}-01-01`, name: 'Año Nuevo', type: 'fixed' })
  holidays.push({ date: `${year}-05-01`, name: 'Día del Trabajo', type: 'fixed' })
  holidays.push({ date: `${year}-07-20`, name: 'Día de la Independencia', type: 'fixed' })
  holidays.push({ date: `${year}-08-07`, name: 'Batalla de Boyacá', type: 'fixed' })
  holidays.push({ date: `${year}-12-08`, name: 'Inmaculada Concepción', type: 'fixed' })
  holidays.push({ date: `${year}-12-25`, name: 'Navidad', type: 'fixed' })

  // 2. Festivos Ley Emiliani (fecha fija trasladada al lunes siguiente si no cae en lunes)
  const emilianiHolidays = [
    { month: 0, day: 6, name: 'Día de los Reyes Magos' },
    { month: 2, day: 19, name: 'Día de San José' },
    { month: 5, day: 29, name: 'San Pedro y San Pablo' },
    { month: 7, day: 15, name: 'Asunción de la Virgen' },
    { month: 9, day: 12, name: 'Día de la Raza' },
    { month: 10, day: 1, name: 'Todos los Santos' },
    { month: 10, day: 11, name: 'Independencia de Cartagena' },
  ]

  for (const h of emilianiHolidays) {
    const mondayDate = getNextMonday(year, h.month, h.day)
    holidays.push({
      date: formatDateUTC(mondayDate),
      name: h.name,
      type: 'emiliani'
    })
  }

  // 3. Festivos basados en la Pascua (Semana Santa y fiestas móviles)
  const { month: eMonth, day: eDay } = getEasterSunday(year)
  const easterSunday = new Date(Date.UTC(year, eMonth, eDay))

  // Jueves y Viernes Santo
  holidays.push({
    date: formatDateUTC(addDaysUTC(easterSunday, -3)),
    name: 'Jueves Santo',
    type: 'easter'
  })
  holidays.push({
    date: formatDateUTC(addDaysUTC(easterSunday, -2)),
    name: 'Viernes Santo',
    type: 'easter'
  })

  // Fiestas móviles de Pascua trasladadas al siguiente lunes (Ley Emiliani)
  // Ascensión del Señor: 40 días tras Pascua (jueves) -> lunes siguiente (+43 días)
  holidays.push({
    date: formatDateUTC(addDaysUTC(easterSunday, 43)),
    name: 'Ascensión del Señor',
    type: 'easter'
  })
  // Corpus Christi: 60 días tras Pascua (jueves) -> lunes siguiente (+64 días)
  holidays.push({
    date: formatDateUTC(addDaysUTC(easterSunday, 64)),
    name: 'Corpus Christi',
    type: 'easter'
  })
  // Sagrado Corazón de Jesús: 68 días tras Pascua (viernes) -> lunes siguiente (+71 días)
  holidays.push({
    date: formatDateUTC(addDaysUTC(easterSunday, 71)),
    name: 'Sagrado Corazón de Jesús',
    type: 'easter'
  })

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Consulta si una fecha específica (en zona horaria Colombia o Date local) corresponde a un festivo oficial.
 */
export function getColombianHoliday(date: Date): ColombianHoliday | null {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const targetDateStr = `${y}-${m}-${d}`

  const holidays = getColombianHolidays(y)
  const match = holidays.find(h => h.date === targetDateStr)
  return match || null
}

/**
 * Retorna true si la fecha dada es un día festivo oficial en Colombia.
 */
export function isColombianHoliday(date: Date): boolean {
  return getColombianHoliday(date) !== null
}
