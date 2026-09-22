'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { getScheduleSlotsAction } from '@/modules/admin/application/actions'
import { generateTimeSlots, TimeSlot } from '../../utils/timeCalculator'
import { Loader2, AlertCircle } from 'lucide-react'
import { isOfficialGradeGroup } from '../../utils/groupFilters'

interface DailyPreviewCanvasProps {
  targetDate: string
}

export default function DailyPreviewCanvas({ targetDate }: DailyPreviewCanvasProps) {
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'group' | 'teacher'>('group')
  const [groups, setGroups] = useState<any[]>([])
  const [teachers, setTeachers] = useState<Record<string, any>>({})
  const [slots, setSlots] = useState<any[]>([])
  const [subjects, setSubjects] = useState<Record<string, any>>({})
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])

  const supabase = createClient()

  useEffect(() => {
    if (targetDate) {
      fetchData()
    }
  }, [targetDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Configuracion
      const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
      const startHour = settings.startHour || '07:00'
      const blockDuration = parseInt(settings.blockDuration || '55', 10)
      const periodsPerDay = parseInt(settings.periodsPerDay || '7', 10)
      const use12h = settings.timeFormat !== '24h'
      let breaks = settings.breaks || []
      setTimeSlots(generateTimeSlots(startHour, blockDuration, periodsPerDay, breaks, use12h))

      // Data de entidades
      const [gData, slData, subData, profsData] = await Promise.all([
        supabase.from('sch_groups').select('id, name'),
        getScheduleSlotsAction(undefined, undefined, targetDate),
        supabase.from('sch_subjects').select('id, name, color'),
        supabase.from('academic_teachers').select('id, full_name')
      ])

      if (gData.data) {
        setGroups(gData.data.filter(g => isOfficialGradeGroup(g.name)).sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric:true})))
      }
      
      const tMap: Record<string, any> = {}
      profsData.data?.forEach(t => {
        tMap[t.id] = { id: t.id, name: t.full_name }
      })
      setTeachers(tMap)
      
      const subMap: Record<string, any> = {}
      subData.data?.forEach(s => { subMap[s.id] = s })
      setSubjects(subMap)

      // Filtrar el slots devuelto por getScheduleSlotsAction() al día de la semana objetivo
      const dateObj = new Date(`${targetDate}T12:00:00Z`)
      const jsDay = dateObj.getUTCDay()
      if (jsDay === 0 || jsDay === 6) {
        setSlots([])
      } else {
        const targetAscDay = jsDay
        const filtered = (slData || []).filter(s => parseInt(s.day_of_week) === targetAscDay)
        setSlots(filtered)
      }
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  const getSlot = (entityId: string, period: number) => {
    return slots.find(s => (viewMode === 'group' ? s.group_id === entityId : s.teacher_id === entityId) && parseInt(s.period_id) === period)
  }

  const entities = viewMode === 'group' ? groups : Object.values(teachers).sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric:true}))
  const activePeriods = timeSlots.filter(s => s.type !== 'break')

  if (loading) return <div className="p-8 text-center flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500"/></div>

  return (
    <div className="flex flex-col h-[600px] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm mt-6">
      <div className="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <button onClick={() => setViewMode('group')} className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-colors ${viewMode === 'group' ? 'bg-[#1F4E31] dark:bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>Grupos</button>
        <button onClick={() => setViewMode('teacher')} className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-colors ${viewMode === 'teacher' ? 'bg-[#1F4E31] dark:bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>Docentes</button>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-white dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 p-3 min-w-[150px] shadow-[1px_1px_5px_-2px_rgba(0,0,0,0.1)]">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{viewMode === 'group' ? 'Grupos' : 'Docentes'}</span>
              </th>
              {activePeriods.map((p, sIdx) => (
                <th key={p.id} className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/50 border-b border-r border-slate-200 dark:border-slate-700 p-2 min-w-[90px] text-center shadow-[0_1px_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{p.id}ª</span>
                    <span className="text-[9px] font-medium mt-0.5">{p.startTime} - {p.endTime}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entities.map((entity, idx) => (
              <tr key={entity.id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 p-3 font-black text-sm text-slate-700 dark:text-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  {entity.name}
                </td>
                {activePeriods.map(p => {
                  const slot = getSlot(entity.id, p.id!)
                  
                  if (!slot) {
                    return (
                      <td key={`${entity.id}-${p.id}`} className="border-b border-r border-slate-200 dark:border-slate-700 p-1 h-[55px] relative hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                         <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                           <span className="text-[10px] text-slate-300">-</span>
                         </div>
                      </td>
                    )
                  }

                  const isNovedad = slot.isNovedad === true
                  const subject = slot.subject || subjects[slot.subject_id]
                  const subjectName = subject?.name || 'Clase'
                  const color = subject?.color || '#cbd5e1'

                  // Texto secundario (el profe para los grupos, o el grupo para los profes)
                  let secondaryText = ''
                  if (viewMode === 'group') {
                    secondaryText = teachers[slot.teacher_id]?.name || ''
                  } else {
                    secondaryText = groups.find(g => g.id === slot.group_id)?.name || ''
                  }

                  return (
                    <td key={`${entity.id}-${p.id}`} className="border-b border-r border-slate-200 dark:border-slate-700 p-1 h-[55px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div 
                        className={`relative w-full h-full rounded flex flex-col justify-center px-1.5 overflow-hidden transition-colors ${isNovedad ? 'border border-amber-400 bg-amber-50 dark:bg-amber-900/30' : ''}`}
                        style={isNovedad ? {} : { backgroundColor: `${color}20`, borderLeft: `3px solid ${color}` }}
                      >
                        {isNovedad && <AlertCircle className="w-3 h-3 text-amber-500 absolute top-1 right-1" />}
                        <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 truncate leading-tight w-full pr-3" title={subjectName}>
                          {subjectName}
                        </span>
                        {secondaryText && (
                          <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5" title={secondaryText}>
                            {secondaryText}
                          </span>
                        )}
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
  )
}
