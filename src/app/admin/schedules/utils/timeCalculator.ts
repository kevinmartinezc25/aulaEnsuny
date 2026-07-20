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

const formatTime = (date: Date, use12h: boolean): string => {
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

export const generateTimeSlots = (
  startHour: string, 
  blockDuration: number, 
  periodsPerDay: number, 
  breaks: Break[],
  use12h: boolean = true
): TimeSlot[] => {
  const slots: TimeSlot[] = []
  
  // Parse start time
  const [hours, mins] = startHour.split(':').map(Number)
  let currentTime = new Date(2000, 0, 1, hours, mins)

  for (let p = 1; p <= periodsPerDay; p++) {
    // Add Period
    const periodStart = new Date(currentTime)
    currentTime.setMinutes(currentTime.getMinutes() + blockDuration)
    const periodEnd = new Date(currentTime)

    slots.push({
      type: 'period',
      id: p,
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
