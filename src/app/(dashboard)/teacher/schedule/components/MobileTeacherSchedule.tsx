'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { Calendar, Clock, MapPin, User, AlertCircle, CheckCircle2, XCircle, Coffee, Loader2, LayoutGrid, Info } from 'lucide-react'
import { TimeSlot } from '@/app/admin/schedules/utils/timeCalculator'

interface MobileTeacherScheduleProps {
  classes: any[]
  timeSlots: TimeSlot[]
  entityType: 'teacher' | 'group'
  entityId: string
  entityName?: string
  onUpdate?: () => void
}

export default function MobileTeacherSchedule({
  classes,
  timeSlots,
  entityType,
  entityId,
  entityName,
  onUpdate
}: MobileTeacherScheduleProps) {
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [absences, setAbsences] = useState<any[]>([])
  const [substitutions, setSubstitutions] = useState<any[]>([])
  const [coveringSubstitutions, setCoveringSubstitutions] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly')

  const supabase = createClient()

  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

  // Set current day on mount
  useEffect(() => {
    const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayMap: Record<number, string> = {
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes'
    }
    setSelectedDay(dayMap[today] || 'Lunes')
  }, [])

  // Helper to get local date for a given day of the week
  const getLocalDateForDay = (dayName: string) => {
    const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    const targetIndex = daysOfWeek.indexOf(dayName) + 1 // 1 = Monday, 5 = Friday
    if (targetIndex === 0) return null

    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const currentDayAdjusted = currentDay === 0 ? 7 : currentDay
    const diff = targetIndex - currentDayAdjusted

    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + diff)
    return targetDate.toISOString().split('T')[0]
  }

  useEffect(() => {
    if (!selectedDay || !entityId) return
    fetchDayData()
  }, [selectedDay, entityId])

  const fetchDayData = async () => {
    setLoading(true)
    try {
      const dateStr = getLocalDateForDay(selectedDay)
      if (!dateStr) return

      // 1. Fetch absences for this date
      const { data: absencesData } = await supabase
        .from('sch_absences')
        .select('id, teacher_id, reason, is_full_day, start_period, end_period')
        .eq('absence_date', dateStr)

      setAbsences(absencesData || [])

      if (absencesData && absencesData.length > 0) {
        const absenceIds = absencesData.map(a => a.id)
        // 2. Fetch substitutions for these absences
        const { data: subsData } = await supabase
          .from('sch_substitutions')
          .select('*, substitute:profiles(first_name, last_name)')
          .in('absence_id', absenceIds)

        setSubstitutions(subsData || [])
      } else {
        setSubstitutions([])
      }

      // 3. If we are a teacher, fetch classes we are covering as a substitute
      if (entityType === 'teacher') {
        const { data: coveringData } = await supabase
          .from('sch_substitutions')
          .select(`
            id,
            period_id,
            status,
            original_schedule_slot_id,
            absence:sch_absences!inner(absence_date, teacher:profiles(first_name, last_name)),
            slot:sch_schedule_slots(
              id,
              group:sch_groups(name),
              subject:sch_subjects(name, color),
              classroom:sch_classrooms(name)
            )
          `)
          .eq('substitute_teacher_id', entityId)
          .eq('absence.absence_date', dateStr)

        setCoveringSubstitutions(coveringData || [])
      } else {
        setCoveringSubstitutions([])
      }
    } catch (error) {
      console.error('Error fetching mobile schedule data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper to render status badge
  const renderStatusBadge = (status: string, text: string) => {
    const styles: Record<string, string> = {
      normal: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900',
      covered: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900',
      covering: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900'
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || styles.normal}`}>
        {status === 'normal' && <CheckCircle2 className="h-3 w-3" />}
        {status === 'cancelled' && <XCircle className="h-3 w-3" />}
        {status === 'covered' && <AlertCircle className="h-3 w-3" />}
        {status === 'covering' && <User className="h-3 w-3" />}
        {text}
      </span>
    )
  }

  // Generate unique subjects for legend
  const uniqueSubjects = React.useMemo(() => {
    const subjectsMap = new Map<string, string>()
    classes.forEach(c => {
      if (c.subject && c.color && c.subject !== 'Hora Libre' && c.subject !== 'Receso') {
        subjectsMap.set(c.subject, c.color === '#ffffff' ? '#6366f1' : c.color)
      }
    })
    return Array.from(subjectsMap.entries()).map(([name, color]) => ({ name, color }))
  }, [classes])

  // Get periods for table header (excluding breaks)
  const displayTimeSlots = timeSlots.filter(s => s.type !== 'break')

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0f1c]">
      {/* View Toggle */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex gap-3">
          <button
            onClick={() => setViewMode('weekly')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl border transition-all ${
              viewMode === 'weekly' 
                ? 'border-indigo-100 bg-white text-indigo-600 shadow-sm' 
                : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Vista semanal
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl border transition-all ${
              viewMode === 'daily' 
                ? 'border-indigo-100 bg-white text-indigo-600 shadow-sm' 
                : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Vista por día
          </button>
        </div>
      </div>

      {viewMode === 'daily' ? (
        <>
          {/* Selector de Día */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 sticky top-0 z-20 shrink-0">
            <div className="flex justify-between items-center gap-2 overflow-x-auto no-scrollbar">
              {DAYS.map(day => {
                const isSelected = selectedDay === day
                const dateStr = getLocalDateForDay(day)
                const formattedDate = dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''
                
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl min-w-[70px] transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-xs font-black">{day.substring(0, 3)}</span>
                    <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {formattedDate}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

      {/* Timeline Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 pl-6 space-y-6">
            {/* Timeline items will be appended here */}
            {timeSlots.map((slot, index) => {
              if (slot.type === 'break') {
                return (
                  <div key={`break-${index}`} className="relative">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-slate-50 dark:border-[#0a0f1c] flex items-center justify-center" />
                    
                    {/* Break Card */}
                    <div className="bg-slate-100/80 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Coffee className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">{slot.name || 'Receso'}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{slot.startTime} - {slot.endTime}</span>
                    </div>
                  </div>
                )
              }

              const periodId = slot.id!
              const dayClasses = classes.filter(c => c.day === selectedDay)
              const cls = dayClasses.find(c => c.period === periodId)
              const covering = coveringSubstitutions.find(s => s.period_id === periodId)

              // Determine status and details
              let cardTitle = 'Hora Libre'
              let cardSubtitle = ''
              let cardRoom = ''
              let cardColor = '#94a3b8' // Slate-400
              let cardGroup = ''
              let statusType = 'normal'
              let statusText = ''

              if (cls) {
                cardTitle = cls.subject
                cardSubtitle = entityType === 'teacher' ? cls.group : cls.teacher
                cardRoom = cls.room
                cardColor = cls.color === '#ffffff' ? '#6366f1' : cls.color
                cardGroup = cls.group

                // Check if there is a substitution for this slot
                const sub = substitutions.find(s => s.original_schedule_slot_id === cls.id)
                if (sub) {
                  if (sub.status === 'CANCELLED') {
                    statusType = 'cancelled'
                    statusText = 'Clase Cancelada'
                  } else if (sub.substitute_teacher_id) {
                    statusType = 'covered'
                    statusText = `Cubierto por: ${sub.substituteName || 'Suplente'}`
                  }
                }
              } else if (covering) {
                cardTitle = covering.slot?.subject?.name || 'Suplencia'
                cardSubtitle = `Cubriendo a: ${covering.absence?.teacher ? `${covering.absence.teacher.first_name} ${covering.absence.teacher.last_name}`.trim() : 'Docente ausente'}`
                cardRoom = covering.slot?.classroom?.name || ''
                cardColor = covering.slot?.subject?.color || '#f59e0b' // Amber-500
                cardGroup = covering.slot?.group?.name || ''
                statusType = 'covering'
                statusText = 'Suplencia Asignada'
              }

              const isFree = !cls && !covering

              return (
                <div key={`period-${periodId}`} className="relative">
                  {/* Timeline Dot */}
                  <div 
                    className={`absolute -left-[31px] top-4 w-4 h-4 rounded-full border-4 border-slate-50 dark:border-[#0a0f1c] transition-colors ${
                      isFree 
                        ? 'bg-slate-300 dark:bg-slate-700' 
                        : statusType === 'cancelled'
                        ? 'bg-rose-500'
                        : statusType === 'covered'
                        ? 'bg-amber-500'
                        : statusType === 'covering'
                        ? 'bg-indigo-500'
                        : 'bg-emerald-500'
                    }`} 
                  />

                  {/* Period Card */}
                  <div className={`bg-white dark:bg-slate-900 border rounded-2xl shadow-sm overflow-hidden transition-all ${
                    isFree 
                      ? 'border-slate-200 dark:border-slate-800 opacity-60' 
                      : 'border-slate-200 dark:border-slate-800 hover:shadow-md'
                  }`}>
                    {/* Color Bar */}
                    {!isFree && (
                      <div className="h-1.5 w-full" style={{ backgroundColor: cardColor }} />
                    )}

                    <div className="p-4">
                      {/* Header: Period & Time */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {periodId}ª Hora
                        </span>
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-bold">{slot.startTime} - {slot.endTime}</span>
                        </div>
                      </div>

                      {/* Body: Subject & Teacher/Group */}
                      <div className="space-y-1">
                        <h3 className={`text-base font-black leading-tight ${isFree ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                          {cardTitle}
                        </h3>
                        {cardSubtitle && (
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{cardSubtitle}</span>
                          </p>
                        )}
                      </div>

                      {/* Footer: Room, Group & Status */}
                      {!isFree && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            {cardRoom && (
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                {cardRoom}
                              </span>
                            )}
                            {cardGroup && (
                              <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300 font-black uppercase tracking-wider">
                                {cardGroup}
                              </span>
                            )}
                          </div>

                          {statusText && renderStatusBadge(statusType, statusText)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </>
      ) : (
        /* Weekly View */
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 pb-24">
          <div className="p-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-center border-collapse table-fixed">
                <thead>
                  <tr className="bg-[#1e293b] text-white">
                    <th className="sticky left-0 bg-[#1e293b] z-10 p-1 text-[9px] font-bold border-r border-slate-700 w-[14%] align-middle break-words">DÍA</th>
                    {displayTimeSlots.map((s, idx) => (
                      <th key={s.id} className={`p-0.5 text-[7px] border-slate-700 align-middle ${idx !== displayTimeSlots.length - 1 ? 'border-r' : ''}`}>
                        <div className="font-bold text-[10px] mb-0.5 text-white">{s.id}ª</div>
                        <div className="text-slate-300 leading-none">{s.startTime}<br/>-<br/>{s.endTime}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIndex) => {
                    const dayClasses = classes.filter(c => c.day === day)
                    const renderedPeriods = new Set<number>()
                    
                    return (
                      <tr key={day} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800 p-1 align-middle">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="h-6 w-6 rounded-full border border-indigo-100 bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-500">
                              <Calendar className="h-3 w-3" />
                            </div>
                            <span className="text-[8px] font-black uppercase text-slate-700 dark:text-slate-300">{day}</span>
                          </div>
                        </td>
                        {displayTimeSlots.map((slot, sIdx) => {
                          const periodId = slot.id!
                          if (renderedPeriods.has(periodId)) return null
                          
                          const cls = dayClasses.find(c => c.period === periodId)
                          if (cls) {
                            const duration = cls.duration || 1
                            for (let i = 0; i < duration; i++) {
                              renderedPeriods.add(periodId + i)
                            }
                            
                            const color = cls.color === '#ffffff' ? '#6366f1' : cls.color
                            const teacherOrGroup = entityType === 'teacher' ? cls.group : cls.teacher
                            
                            return (
                              <td 
                                key={periodId} 
                                colSpan={duration} 
                                className={`border-r border-slate-200 dark:border-slate-800 align-middle ${sIdx + duration - 1 === displayTimeSlots.length - 1 ? 'border-r-0' : ''}`}
                                style={{ borderTop: `4px solid ${color}`, backgroundColor: `${color}15` }}
                              >
                                <div className="h-full min-h-[50px] flex flex-col items-center justify-center p-0.5">
                                  <span className="text-[8px] font-bold text-slate-800 dark:text-slate-200 mb-0.5 leading-tight text-center line-clamp-3">{cls.subject}</span>
                                  <span className="text-[7px] text-slate-500 dark:text-slate-400 leading-tight text-center truncate w-full px-0.5">{teacherOrGroup}</span>
                                </div>
                              </td>
                            )
                          } else {
                            return (
                              <td key={periodId} className={`border-r border-slate-200 dark:border-slate-800 p-1 text-slate-300 dark:text-slate-400 font-bold align-middle ${sIdx === displayTimeSlots.length - 1 ? 'border-r-0' : ''}`}>
                                -
                              </td>
                            )
                          }
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            {uniqueSubjects.length > 0 && (
              <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 bg-slate-50 dark:bg-slate-800/30">
                {uniqueSubjects.map(sub => (
                  <div key={sub.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: sub.color }} />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{sub.name}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Info Footer */}
            <div className="mt-6 flex items-start gap-2 text-slate-500 dark:text-slate-400">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
              <span className="text-xs leading-relaxed">Los horarios pueden estar sujetos a cambios.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
