'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { getTeachersList } from '@/modules/admin/application/actions'
import { generateTimeSlots, TimeSlot } from '../utils/timeCalculator'
import { Loader2, Calendar, Printer, AlertTriangle } from 'lucide-react'

interface DailyImpactCanvasProps {
  selectedDate: string // YYYY-MM-DD
}

export default function DailyImpactCanvas({ selectedDate }: DailyImpactCanvasProps) {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([]) // Modified slots (with substitutions)
  const [subjects, setSubjects] = useState<Record<string, any>>({})
  const [teachers, setTeachers] = useState<Record<string, any>>({})
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [fullDate, setFullDate] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    loadSettings()
    fetchImpactData()
  }, [selectedDate])

  const loadSettings = () => {
    try {
      const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
      const startHour = settings.startHour || '07:00'
      const blockDuration = parseInt(settings.blockDuration || '55', 10)
      const periodsPerDay = parseInt(settings.periodsPerDay || '7', 10)
      const use12h = settings.timeFormat !== '24h'
      let breaks = settings.breaks
      
      if (!breaks && settings.breakPeriod) {
        breaks = [{ id: '1', name: 'Recreo', afterPeriod: parseInt(settings.breakPeriod, 10), durationMinutes: 30 }]
      } else if (!breaks) {
        breaks = []
      }

      setTimeSlots(generateTimeSlots(startHour, blockDuration, periodsPerDay, breaks, use12h))
    } catch(e) {
      console.error(e)
    }
  }

  const fetchImpactData = async () => {
    setLoading(true)
    try {
      // 1. Calculate Day of Week
      const [y, m, d] = selectedDate.split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      const targetDay = days[dateObj.getDay()]
      setDayOfWeek(targetDay)
      setFullDate(dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }))

      // 2. Fetch basic data (Groups, Subjects, Teachers)
      const [gData, subData, tList] = await Promise.all([
        supabase.from('sch_groups').select('id, name'),
        supabase.from('sch_subjects').select('id, name, color'),
        getTeachersList()
      ])

      if (gData.data) {
        setGroups(gData.data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })))
      }
      
      const subMap: Record<string, any> = {}
      subData.data?.forEach(s => { subMap[s.id] = s })
      setSubjects(subMap)

      const tMap: Record<string, any> = {}
      tList.forEach(t => { tMap[t.id] = { id: t.id, name: t.name } })
      setTeachers(tMap)

      // 3. Fetch Master Schedule for that specific day
      const { data: scheduleData } = await supabase
        .from('sch_schedule_slots')
        .select('*')
        .eq('day_of_week', targetDay)

      // 4. Fetch Absences and Substitutions for the specific date
      const { data: absencesData } = await supabase
        .from('sch_absences')
        .select('id, teacher_id')
        .eq('absence_date', selectedDate)

      const absenceIds = absencesData?.map(a => a.id) || []
      
      let subsMap: Record<string, any> = {}
      if (absenceIds.length > 0) {
        const { data: subsData } = await supabase
          .from('sch_substitutions')
          .select('*')
          .in('absence_id', absenceIds)
          
        subsData?.forEach(sub => {
          subsMap[sub.original_schedule_slot_id] = sub
        })
      }

      // 5. Build modified slots
      const masterSlots = scheduleData || []
      const modifiedSlots = masterSlots.map(slot => {
        const sub = subsMap[slot.id]
        if (sub) {
          return {
            ...slot,
            original_teacher_id: slot.teacher_id,
            teacher_id: sub.substitute_teacher_id || slot.teacher_id,
            is_cancelled: sub.status === 'CANCELLED',
            is_substituted: sub.status === 'COVERED' && sub.substitute_teacher_id
          }
        }
        
        const isAbsent = absencesData?.some(a => a.teacher_id === slot.teacher_id)
        if (isAbsent) {
          return {
            ...slot,
            is_pending_substitution: true
          }
        }

        return slot
      })

      setSlots(modifiedSlots)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const getSlot = (groupId: string, periodId: number) => {
    return slots.find(s => s.group_id === groupId && s.period_id === periodId)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !printRef.current) return

    const tableHtml = printRef.current.innerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Horario del Día - ${dayOfWeek} ${fullDate}</title>
          <style>
            @page { margin: 10mm; size: A4 landscape; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; }
            
            .print-header {
              text-align: center;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid #1e293b;
            }
            .print-header h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 4px; }
            .print-header h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; }
            .print-header .date-badge {
              display: inline-block;
              background: #1e3a8a;
              color: white;
              padding: 4px 16px;
              border-radius: 999px;
              font-size: 11px;
              font-weight: 700;
              margin-top: 6px;
              text-transform: capitalize;
            }
            
            .legend {
              display: flex;
              gap: 16px;
              justify-content: center;
              margin-bottom: 12px;
              font-size: 9px;
              font-weight: 600;
            }
            .legend-item { display: flex; align-items: center; gap: 4px; }
            .legend-dot { width: 10px; height: 10px; border-radius: 3px; }
            .dot-normal { background: #e2e8f0; border: 1px solid #94a3b8; }
            .dot-sub { background: #d1fae5; border: 1px solid #10b981; }
            .dot-cancel { background: #ffe4e6; border: 1px dashed #f43f5e; }
            .dot-pending { background: #fef3c7; border: 1px dashed #f59e0b; }
            
            table { width: 100%; border-collapse: collapse; font-size: 9px; border: 2px solid #1e293b; }
            th { background: #f1f5f9; padding: 6px 4px; border: 1px solid #cbd5e1; font-weight: 800; text-transform: uppercase; font-size: 8px; }
            td { padding: 4px; border: 1px solid #e2e8f0; height: 38px; vertical-align: middle; }
            .group-name { font-weight: 900; font-size: 10px; background: #f8fafc; white-space: nowrap; }
            
            .slot { border-radius: 4px; padding: 3px 5px; height: 100%; display: flex; flex-direction: column; justify-content: center; }
            .slot-name { font-weight: 700; font-size: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .slot-teacher { font-size: 7px; font-weight: 500; color: #64748b; margin-top: 1px; }
            
            .slot-normal { border-left: 3px solid; }
            .slot-sub { background: #d1fae5; border-left: 3px solid #10b981; border: 1px solid #6ee7b7; }
            .slot-sub .slot-teacher { color: #047857; font-weight: 700; }
            .slot-cancel { background: #fff1f2; border: 1px dashed #fda4af; opacity: 0.7; }
            .slot-cancel .slot-name { text-decoration: line-through; color: #9ca3af; }
            .slot-cancel .slot-teacher { color: #e11d48; }
            .slot-pending { background: #fef9c3; border: 1px dashed #fbbf24; border-left: 3px solid #f59e0b; }
            .slot-pending .slot-teacher { color: #b45309; font-weight: 700; }
            
            .blocked-cell { background: repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 4px, #e2e8f0 4px, #e2e8f0 5px); }
            
            .footer { text-align: center; margin-top: 12px; font-size: 8px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h3>Institución Educativa Escuela Normal Superior del Nordeste - ENSUNY ${new Date().getFullYear()}</h3>
            <h1>Horario del Día con Sustituciones</h1>
            <div class="date-badge">${dayOfWeek}, ${fullDate}</div>
          </div>
          
          <div class="legend">
            <div class="legend-item"><div class="legend-dot dot-normal"></div> Clase Regular</div>
            <div class="legend-item"><div class="legend-dot dot-sub"></div> Suplencia Asignada</div>
            <div class="legend-item"><div class="legend-dot dot-cancel"></div> Clase Cancelada</div>
            <div class="legend-item"><div class="legend-dot dot-pending"></div> ⚠ Sin Cubrir</div>
          </div>
          
          ${tableHtml}
          
          <div class="footer">
            Generado por aulaEnsuny • ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
        <p>Cargando impacto global...</p>
      </div>
    )
  }

  if (dayOfWeek === 'Domingo' || dayOfWeek === 'Sábado') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Calendar className="h-12 w-12 mb-4 opacity-30" />
        <h2 className="text-xl font-bold mb-2 text-slate-600 dark:text-slate-300">Fin de Semana</h2>
        <p>No hay clases programadas para {dayOfWeek}.</p>
      </div>
    )
  }

  const displayTimeSlots = timeSlots.filter(s => s.type !== 'break')
  const globalSettingsData = JSON.parse(localStorage.getItem('sch_settings') || '{}')
  const groupPeriods = JSON.parse(localStorage.getItem('sch_group_periods') || '{}')
  const basePeriodsPerDay = parseInt(globalSettingsData.periodsPerDay || '7', 10)

  // Count pending substitutions
  const pendingCount = slots.filter(s => s.is_pending_substitution).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Impacto Global del {dayOfWeek}
            <span className="text-sm font-normal text-slate-500 capitalize">— {fullDate}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visualización general de todos los grupos con los reemplazos aplicados.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-bold">
              <AlertTriangle className="h-4 w-4" />
              {pendingCount} clase{pendingCount > 1 ? 's' : ''} sin cubrir
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500"></div> Suplencia</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-500/10 border border-rose-500 border-dashed"></div> Cancelada</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500 border-dashed"></div> Sin cubrir</div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        {/* Printable table (also used for screen) */}
        <div ref={printRef}>
          <table className="w-max border-collapse shadow-sm rounded-lg overflow-hidden text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 p-2 font-bold text-slate-500 min-w-[120px]">
                  GRUPO
                </th>
                {displayTimeSlots.map((slot, sIdx) => (
                  <th key={sIdx} className="bg-slate-50 dark:bg-slate-800/50 border-b border-r border-slate-200 dark:border-slate-700 p-2 min-w-[100px] text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{slot.id}ª</span>
                      <span className="text-[9px] font-medium opacity-70">{slot.startTime} - {slot.endTime}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group, idx) => (
                <tr key={group.id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}>
                  <td className="group-name sticky left-0 z-10 bg-white dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700 p-3 font-black text-slate-700 dark:text-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {group.name}
                  </td>
                  
                  {displayTimeSlots.map((timeSlot) => {
                    const p = timeSlot.id!
                    const maxP = groupPeriods[group.id] || basePeriodsPerDay
                    
                    if (p > maxP) {
                      return (
                        <td key={`${group.id}-${p}`} className="blocked-cell border-b border-r border-slate-200 dark:border-slate-700 p-0 relative bg-slate-100 dark:bg-slate-900/50">
                          <div className="absolute inset-0 pattern-diagonal-lines pattern-slate-200 dark:pattern-slate-800 pattern-bg-transparent pattern-size-4 opacity-50"></div>
                        </td>
                      )
                    }
                    
                    const slot = getSlot(group.id, p)
                    const subject = slot ? subjects[slot.subject_id] : null
                    const teacher = slot ? teachers[slot.teacher_id] : null
                    const origTeacher = slot?.original_teacher_id ? teachers[slot.original_teacher_id] : null

                    if (!slot || !subject) {
                      return <td key={`${group.id}-${p}`} className="border-b border-r border-slate-200 dark:border-slate-700 p-1 h-[60px]"></td>
                    }

                    if (slot.is_cancelled) {
                      return (
                        <td key={`${group.id}-${p}`} className="border-b border-r border-slate-200 dark:border-slate-700 p-1 h-[60px]">
                          <div className="slot slot-cancel w-full h-full rounded flex flex-col justify-center px-2 bg-rose-50 dark:bg-rose-900/10 border-2 border-dashed border-rose-300 dark:border-rose-800 opacity-60">
                            <span className="slot-name font-bold truncate line-through decoration-rose-500 text-slate-400">{subject.name}</span>
                            <span className="slot-teacher text-[10px] text-rose-500 font-medium">Cancelada</span>
                          </div>
                        </td>
                      )
                    }

                    let wrapperStyle: React.CSSProperties = {
                      backgroundColor: `${subject.color}15`,
                      borderLeft: `3px solid ${subject.color}`
                    }
                    
                    let borderClass = ""
                    let slotClass = "slot slot-normal"
                    let statusLabel = ""

                    if (slot.is_substituted) {
                      wrapperStyle.backgroundColor = '#10B98115'
                      wrapperStyle.borderLeft = `3px solid #10B981`
                      borderClass = "border border-emerald-400"
                      slotClass = "slot slot-sub"
                      statusLabel = origTeacher ? `Sup: ${teacher?.name?.split(' ')[0]}` : teacher?.name?.split(' ')[0]
                    } else if (slot.is_pending_substitution) {
                      wrapperStyle.backgroundColor = '#F59E0B15'
                      wrapperStyle.borderLeft = `3px solid #F59E0B`
                      borderClass = "border border-amber-400 border-dashed"
                      slotClass = "slot slot-pending"
                      statusLabel = "⚠ Sin cubrir"
                    } else {
                      statusLabel = teacher?.name?.split(' ')[0] || ''
                    }

                    return (
                      <td key={`${group.id}-${p}`} className="border-b border-r border-slate-200 dark:border-slate-700 p-1 h-[60px]">
                        <div className={`${slotClass} w-full h-full rounded flex flex-col justify-center px-2 overflow-hidden ${borderClass}`} style={wrapperStyle}>
                          <span className="slot-name font-bold truncate text-slate-800 dark:text-slate-200" title={subject.name}>{subject.name}</span>
                          <div className="flex items-center gap-1 text-[10px] mt-0.5">
                            <span className={`slot-teacher truncate font-medium ${slot.is_substituted ? 'text-emerald-600 dark:text-emerald-400' : slot.is_pending_substitution ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
