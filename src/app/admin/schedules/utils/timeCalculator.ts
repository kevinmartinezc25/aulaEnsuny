export interface Break {
  id: string
  name: string
  afterPeriod: number
  durationMinutes: number
}

export interface TimeSlot {
  type: 'period' | 'break'
  id?: number // period number
  name?: string // break name
  startTime: string
  endTime: string
}

export interface PeriodTimeConfig {
  period: number
  name: string
  startTime: string // "HH:MM" ej: "07:00"
  endTime: string   // "HH:MM" ej: "07:55"
}

export const formatTime = (date: Date, use12h: boolean): string => {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  
  if (use12h) {
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`
  } else {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }
}

/**
 * Convierte un string de hora en formato 24h ("07:00", "13:00") o similar
 * al formato deseado (12h con AM/PM o 24h).
 */
export const formatTimeString = (timeStr: string, use12h: boolean): string => {
  if (!timeStr) return ''
  const clean = timeStr.trim()
  const match = clean.match(/^(\d{1,2}):(\d{2})(\s*(AM|PM))?$/i)
  if (!match) return timeStr

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const modifier = match[4]?.toUpperCase()

  if (modifier === 'PM' && hours < 12) hours += 12
  if (modifier === 'AM' && hours === 12) hours = 0

  const d = new Date(2000, 0, 1, hours, minutes)
  return formatTime(d, use12h)
}

export const generateTimeSlots = (
  startHour: string = '07:00', 
  blockDuration: number = 55, 
  periodsPerDay: number = 7, 
  breaks: Break[] = [],
  use12h: boolean = true,
  customPeriods?: PeriodTimeConfig[]
): TimeSlot[] => {
  // Si no se proporcionaron customPeriods explícitamente, intentar leerlos de localStorage en el cliente
  let effectiveCustomPeriods = customPeriods
  if (!effectiveCustomPeriods && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('sch_settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed.customPeriods) && parsed.customPeriods.length > 0) {
          effectiveCustomPeriods = parsed.customPeriods
        }
      }
    } catch {
      // Ignorar fallback
    }
  }

  // Si existen periodos personalizados configurados, usarlos prioritariamente
  if (effectiveCustomPeriods && effectiveCustomPeriods.length > 0) {
    const slots: TimeSlot[] = []
    const sorted = [...effectiveCustomPeriods].sort((a, b) => a.period - b.period)
    const totalCount = Math.max(periodsPerDay, sorted.length)

    let lastCalculatedTime: Date | null = null

    for (let p = 1; p <= totalCount; p++) {
      const custom = sorted.find(c => c.period === p)
      if (custom && custom.startTime && custom.endTime) {
        slots.push({
          type: 'period',
          id: p,
          name: custom.name || `${p}ª`,
          startTime: formatTimeString(custom.startTime, use12h),
          endTime: formatTimeString(custom.endTime, use12h)
        })

        const [h, m] = custom.endTime.split(':').map(Number)
        if (!isNaN(h) && !isNaN(m)) {
          lastCalculatedTime = new Date(2000, 0, 1, h, m)
        }
      } else if (lastCalculatedTime) {
        const periodStart = new Date(lastCalculatedTime)
        lastCalculatedTime.setMinutes(lastCalculatedTime.getMinutes() + blockDuration)
        const periodEnd = new Date(lastCalculatedTime)

        slots.push({
          type: 'period',
          id: p,
          name: `${p}ª`,
          startTime: formatTime(periodStart, use12h),
          endTime: formatTime(periodEnd, use12h)
        })
      }

      // Descansos configurados tras este período
      const breaksAfterThis = breaks.filter(b => b.afterPeriod === p)
      for (const b of breaksAfterThis) {
        if (lastCalculatedTime) {
          const breakStart = new Date(lastCalculatedTime)
          lastCalculatedTime.setMinutes(lastCalculatedTime.getMinutes() + b.durationMinutes)
          const breakEnd = new Date(lastCalculatedTime)

          slots.push({
            type: 'break',
            name: b.name,
            startTime: formatTime(breakStart, use12h),
            endTime: formatTime(breakEnd, use12h)
          })
        }
      }
    }

    return slots
  }

  // Generador secuencial por defecto
  const slots: TimeSlot[] = []
  const [hours, mins] = (startHour || '07:00').split(':').map(Number)
  let currentTime = new Date(2000, 0, 1, isNaN(hours) ? 7 : hours, isNaN(mins) ? 0 : mins)

  for (let p = 1; p <= periodsPerDay; p++) {
    // Add Period
    const periodStart = new Date(currentTime)
    currentTime.setMinutes(currentTime.getMinutes() + blockDuration)
    const periodEnd = new Date(currentTime)

    slots.push({
      type: 'period',
      id: p,
      name: `${p}ª`,
      startTime: formatTime(periodStart, use12h),
      endTime: formatTime(periodEnd, use12h)
    })

    // Check if there are breaks after this period
    const breaksAfterThis = breaks.filter(b => b.afterPeriod === p)
    for (const b of breaksAfterThis) {
      const breakStart = new Date(currentTime)
      currentTime.setMinutes(currentTime.getMinutes() + b.durationMinutes)
      const breakEnd = new Date(currentTime)

      slots.push({
        type: 'break',
        name: b.name,
        startTime: formatTime(breakStart, use12h),
        endTime: formatTime(breakEnd, use12h)
      })
    }
  }

  return slots
}

