'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { Loader2, Calendar, AlertCircle } from 'lucide-react'
import { generateTimeSlots } from '@/app/admin/schedules/utils/timeCalculator'

interface EmergencyScheduleViewProps {
  profileId: string
  academicTeacherId: string
}

export default function EmergencyScheduleView({ profileId, academicTeacherId }: EmergencyScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [dailyClasses, setDailyClasses] = useState<any[]>([])
  const [isAbsent, setIsAbsent] = useState(false)
  const [substitutions, setSubstitutions] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (selectedDate && academicTeacherId) {
      fetchEmergencySchedule()
    }
  }, [selectedDate, academicTeacherId])

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

  const fetchEmergencySchedule = async () => {
    setLoading(true)
    
    // 1. Determinar el día de la semana para la fecha seleccionada
    const dateObj = new Date(selectedDate + 'T12:00:00Z') // Forzar zona neutral para evitar corrimiento
    const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const dayOfWeek = daysMap[dateObj.getUTCDay()]

    // 2. Fetch horario regular de ESE día
    const { data: regularSlots } = await supabase
      .from('sch_schedule_slots')
      .select(`
        id, period_id, duration,
        group:sch_groups(name),
        subject:sch_subjects(name, color),
        classroom:sch_classrooms(name)
      `)
      .eq('teacher_id', academicTeacherId)
      .eq('day_of_week', dayOfWeek)

    // 3. Revisar si el docente ESTÁ AUSENTE ese día
    const { data: absences } = await supabase
      .from('sch_absences')
      .select('id, reason')
      .eq('teacher_id', profileId)
      .eq('absence_date', selectedDate)

    const teacherIsAbsent = !!(absences && absences.length > 0)
    setIsAbsent(teacherIsAbsent)

    // 4. Revisar si el docente tiene SUPLENCIAS ASIGNADAS ese día
    const { data: allAbsencesToday } = await supabase
      .from('sch_absences')
      .select('id, teacher:profiles(first_name, last_name)')
      .eq('absence_date', selectedDate)

    let subsData: any[] = []
    if (allAbsencesToday && allAbsencesToday.length > 0) {
      const absenceIds = allAbsencesToday.map(a => a.id)
      const { data: mySubs } = await supabase
        .from('sch_substitutions')
        .select(`
          period_id, 
          absence_id,
          sch_schedule_slots!inner(
            group:sch_groups(name),
            subject:sch_subjects(name, color),
            classroom:sch_classrooms(name)
          )
        `)
        .in('absence_id', absenceIds)
        .eq('substitute_id', profileId)

      if (mySubs) {
        subsData = mySubs.map((s: any) => {
          const absenceInfo = allAbsencesToday.find(a => a.id === s.absence_id) as any
          const teacherObj = Array.isArray(absenceInfo?.teacher) ? absenceInfo?.teacher[0] : absenceInfo?.teacher
          return {
            period_id: s.period_id,
            duration: 1, // Suplencias son por hora usualmente
            isSubstitution: true,
            absentTeacherName: teacherObj ? `${teacherObj.first_name} ${teacherObj.last_name}` : 'Colega',
            group: s.sch_schedule_slots?.group,
            subject: s.sch_schedule_slots?.subject,
            classroom: s.sch_schedule_slots?.classroom
          }
        })
      }
    }
    setSubstitutions(subsData)

    // Procesar las clases regulares
    let formattedClasses = (regularSlots || []).map((d: any) => ({
      id: d.id,
      period: d.period_id,
      duration: d.duration || 1,
      subject: d.subject?.name || 'Libre',
      color: d.subject?.color || '#ffffff',
      room: d.classroom?.name || '',
      group: d.group?.name || 'Comité',
      isRegular: true
    }))

    setDailyClasses(formattedClasses)
    setLoading(false)
  }

  const activePeriods = timeSlots.filter(s => s.type !== 'break')

  return (
    <div className="h-full flex flex-col space-y-4 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950/20">
      
      {/* Selector de Fecha */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Fecha de Contingencia
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Selecciona un día para previsualizar tu cuadrícula diaria con ausencias y suplencias.</p>
        </div>
        <div className="relative shrink-0">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="pl-4 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-bold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer w-full sm:w-auto"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          
          {/* Header Indicadores */}
          <div className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 p-3 sm:px-6 flex flex-wrap gap-4 text-xs font-bold shrink-0 items-center">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600"></div>
              Horario Regular
            </div>
            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
              <div className="w-3 h-3 rounded-full bg-orange-100 dark:bg-orange-900/50 border border-orange-500"></div>
              Suplencia Asignada
            </div>
            {isAbsent && (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 ml-auto bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4" />
                Estás reportado como Ausente hoy
              </div>
            )}
          </div>

          {/* Lista Diaria en Cuadrícula Vertical */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6">
            <div className="max-w-3xl mx-auto flex flex-col gap-3">
              {activePeriods.map((slot) => {
                const pId = slot.id!
                const regularClass = dailyClasses.find(c => pId >= c.period && pId < c.period + c.duration)
                const subClass = substitutions.find(s => s.period_id === pId)
                
                let content = null
                let wrapperClass = "flex gap-4 p-4 rounded-2xl border bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/50"

                if (subClass) {
                  // Si hay suplencia, PISA a la clase regular o a la hora libre
                  wrapperClass = "flex gap-4 p-4 rounded-2xl border bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-800/50 shadow-sm relative overflow-hidden transition-all hover:shadow-md"
                  content = (
                    <div className="flex-1 z-10">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-md mb-1.5 border border-orange-200/50 dark:border-orange-500/30">
                            <AlertCircle className="h-3 w-3" /> SUPLENCIA
                          </span>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{subClass.subject?.name}</h4>
                        </div>
                        <span className="inline-block px-3 py-1 bg-white dark:bg-slate-900 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">
                          {subClass.group?.name}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <p>Cubriendo a: <span className="font-bold text-slate-800 dark:text-slate-200">{subClass.absentTeacherName}</span></p>
                        {subClass.classroom?.name && (
                          <p>Salón: <span className="font-bold text-slate-800 dark:text-slate-200">{subClass.classroom.name}</span></p>
                        )}
                      </div>
                      <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                        <AlertCircle className="h-32 w-32" />
                      </div>
                    </div>
                  )
                } else if (regularClass) {
                  if (isAbsent) {
                    wrapperClass = "flex gap-4 p-4 rounded-2xl border bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 opacity-60 relative overflow-hidden grayscale"
                    content = (
                      <div className="flex-1 z-10 relative">
                        {/* Tachado Visual */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="h-0.5 w-full bg-red-500/40 rotate-[1deg]"></div>
                        </div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-lg font-bold text-slate-500 dark:text-slate-400 line-through">{regularClass.subject}</h4>
                          <span className="px-3 py-1 rounded-xl text-xs font-bold text-slate-400 border border-slate-200">{regularClass.group}</span>
                        </div>
                      </div>
                    )
                  } else {
                    wrapperClass = "flex gap-4 p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md"
                    content = (
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center break-words">{regularClass.subject}</h4>
                          {regularClass.group !== 'Jornada Institucional' && (
                            <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-xs font-black text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 text-center break-words">
                              {regularClass.group}
                            </span>
                          )}
                        </div>
                        {regularClass.room && (
                          <p className="text-xs text-slate-500 mt-2 font-medium">Salón: <span className="font-bold text-slate-700 dark:text-slate-300">{regularClass.room}</span></p>
                        )}
                      </div>
                    )
                  }
                } else {
                  content = (
                    <div className="flex-1 flex items-center text-slate-400 dark:text-slate-500 text-sm font-semibold tracking-wide px-2">
                      Sin clase Asignada
                    </div>
                  )
                }

                return (
                  <div key={pId} className={wrapperClass}>
                    {/* Indicador de Hora (Columna Izquierda) */}
                    <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-800 pr-4 sm:pr-6">
                      <span className="text-xl sm:text-2xl font-black text-slate-300 dark:text-slate-600">{pId}ª</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">{slot.startTime}</span>
                    </div>
                    {/* Contenido (Columna Derecha) */}
                    {content}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
