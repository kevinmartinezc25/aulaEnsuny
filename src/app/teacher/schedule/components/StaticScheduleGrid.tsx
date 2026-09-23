'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { getScheduleSlotsAction } from '@/modules/admin/application/actions'
import { Loader2, CalendarX2, AlertCircle } from 'lucide-react'
import { generateTimeSlots } from '@/app/admin/schedules/utils/timeCalculator'
import PrintableSchedule from '@/app/admin/schedules/components/PrintableSchedule'
import DayTabsScheduleView, { ScheduleData, ScheduleDayKey } from '@/components/schedule/DayTabsScheduleView'

interface StaticScheduleGridProps {
  entityType: 'group' | 'teacher'
  entityId: string
  entityName?: string
  directorName?: string
  disablePrint?: boolean
  hideGroupBadge?: boolean
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export default function StaticScheduleGrid({ 
  entityType, 
  entityId, 
  entityName, 
  directorName, 
  disablePrint = false,
  hideGroupBadge = false 
}: StaticScheduleGridProps) {
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [maxPeriods, setMaxPeriods] = useState<number>(7)
  const [visualSettings, setVisualSettings] = useState({
    density: 'relaxed',
    showClassrooms: false,
    showWeekends: false,
    hideEmptyPeriods: false
  })
  const visibleDays = visualSettings.showWeekends ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

  useEffect(() => {
    if (entityId) {
      loadSettingsAndSchedule()
    }
  }, [entityId, entityType])

  // --- DATOS FORMATEADOS PARA VISTA MOBILE CON PESTAÑAS (Hook al inicio) ---
  const mobileScheduleData = useMemo(() => {
    const dayKeyMap: Record<number, ScheduleDayKey> = {
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes'
    }

    const data: ScheduleData = {
      lunes: [],
      martes: [],
      miercoles: [],
      jueves: [],
      viernes: []
    }

    // Determine dynamic max period based on actual classes
    const actualMaxPeriod = classes.reduce((max: number, c: any) => {
      const endP = c.period + (c.duration || 1) - 1;
      return endP > max ? endP : max;
    }, 0);

    // Aseguramos cantidad de períodos diarios a evaluar (adaptativo si el docente tiene menos)
    const basePeriods = Math.max(maxPeriods || 7, timeSlots.length || 7);
    const totalPeriods = entityType === 'teacher' && actualMaxPeriod > 0 && actualMaxPeriod < basePeriods
      ? actualMaxPeriod
      : basePeriods;

    // Lista de slots con tiempos formateados
    const effectiveSlots: { id: number; startTime: string; endTime: string }[] = []
    for (let p = 1; p <= totalPeriods; p++) {
      const found = timeSlots.find(s => s.id === p)
      effectiveSlots.push({
        id: p,
        startTime: found?.startTime || `${p}ª Hora`,
        endTime: found?.endTime || ''
      })
    }

    // Recorrer los 5 días de la semana (1: Lunes a 5: Viernes)
    for (let dayNum = 1; dayNum <= 5; dayNum++) {
      const dayKey = dayKeyMap[dayNum]
      if (!dayKey) continue

      const dayClasses = classes.filter(c => c.day === dayNum)

      if (entityType === 'teacher') {
        // Calcular el período máximo específicamente para ESTE DÍA
        const actualMaxPeriodForDay = dayClasses.reduce((max: number, c: any) => {
          const endP = c.period + (c.duration || 1) - 1;
          return endP > max ? endP : max;
        }, 0);

        // Siempre se van a pintar 6 horas como mínimo, pero si viene con la 7ma (o más) se pinta hasta esa hora.
        const periodsForThisDay = Math.max(6, actualMaxPeriodForDay);

        let p = 1
        while (p <= periodsForThisDay) {
          const slotInfo = effectiveSlots.find(s => s.id === p) || { id: p, startTime: `${p}ª Hora`, endTime: '' }
          
          // Buscar si hay una clase asignada que comience o cubra este período
          const cls = dayClasses.find(c => c.period <= p && (c.period + (c.duration || 1) - 1) >= p)

          if (cls) {
            // Solo añadir en el período inicial del bloque
            if (cls.period === p) {
              const dur = cls.duration || 1
              const endP = p + dur - 1
              const endSlotInfo = effectiveSlots.find(s => s.id === endP) || slotInfo
              data[dayKey].push({
                id: `${dayNum}-${p}`,
                period: p,
                startTime: slotInfo.startTime,
                endTime: endSlotInfo.endTime || slotInfo.endTime,
                subject: cls.subject || 'Clase',
                group: cls.labelSubtitle === 'Jornada Institucional' ? 'Jornada Institucional' : cls.labelSubtitle,
                location: cls.room || '',
                color: cls.isJornada ? '#f59e0b' : (cls.color || '#4f46e5'),
                isFree: false,
                isNovedad: cls.isNovedad
              })
              p += dur
              continue
            }
          } else {
            // Hueco libre del docente (Sin clase Asignada)
            data[dayKey].push({
              id: `free-${dayNum}-${p}`,
              period: p,
              startTime: slotInfo.startTime,
              endTime: slotInfo.endTime,
              subject: 'Sin clase Asignada',
              group: undefined,
              location: '',
              color: '#94a3b8',
              isFree: true
            })
          }
          p++
        }
      } else {
        // Grupos: Renderizar materias asignadas
        dayClasses.forEach(c => {
          const startSlot = effectiveSlots.find(s => s.id === c.period)
          const endPeriod = c.period + (c.duration || 1) - 1
          const endSlot = effectiveSlots.find(s => s.id === endPeriod)

          data[dayKey].push({
            id: `${c.day}-${c.period}`,
            period: c.period,
            startTime: startSlot?.startTime || `${c.period}ª`,
            endTime: endSlot?.endTime || startSlot?.endTime || '',
            subject: c.subject || 'Clase',
            teacher: c.teachers?.join(', ') || c.labelTitle,
            group: undefined,
            location: c.room || '',
            color: c.color || '#4f46e5',
            isFree: false,
            isNovedad: c.isNovedad
          })
        })
      }
    }

    return data
  }, [classes, timeSlots, maxPeriods, entityType])

  const loadSettingsAndSchedule = async () => {
    setLoading(true)
    
    // 1. Cargar configuración de horarios
    let activeSlots: any[] = []
    let periodsPerDay = 7
    let startHour = '07:00'
    let blockDuration = 55
    let use12h = true
    let breaks: any[] = []

    try {
      const settings = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sch_settings') || '{}') : {}
      startHour = settings.startHour || '07:00'
      blockDuration = parseInt(settings.blockDuration || '55', 10)
      
      setVisualSettings({
        density: settings.density || 'relaxed',
        showClassrooms: settings.showClassrooms ?? false,
        showWeekends: settings.showWeekends ?? false,
        hideEmptyPeriods: settings.hideEmptyPeriods ?? false
      })
      
      const groupPeriods = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sch_group_periods') || '{}') : {}
      periodsPerDay = entityType === 'group' && groupPeriods[entityId] 
        ? groupPeriods[entityId] 
        : parseInt(settings.periodsPerDay || '7', 10)
      
      if (!periodsPerDay || periodsPerDay < 6) periodsPerDay = 7
      setMaxPeriods(periodsPerDay)

      use12h = settings.timeFormat !== '24h'
      breaks = settings.breaks || []

      const generated = generateTimeSlots(startHour, blockDuration, periodsPerDay, breaks, use12h)
      // Solo tomamos los periodos académicos (ignorar recreos para la cuadrícula compacta)
      activeSlots = generated.filter(s => s.type !== 'break')
      setTimeSlots(activeSlots)
    } catch(e) {
      console.error('Error cargando configuración:', e)
      const generated = generateTimeSlots('07:00', 55, 7, [{ id: '1', name: 'Recreo', afterPeriod: 3, durationMinutes: 30 }], true)
      activeSlots = generated.filter(s => s.type !== 'break')
      setTimeSlots(activeSlots)
    }

    // 2. Fetch de datos desde la base de datos usando el Server Action (para saltar RLS)
    const data = await getScheduleSlotsAction(entityType, entityId)

    if (!data) {
      setClasses([])
      setLoading(false)
      return
    }

    // Si data tiene períodos mayores a periodsPerDay, ajustar maxPeriods y regenerar slots
    const maxPeriodInData = (data || []).reduce((max: number, d: any) => {
      const p = parseInt(d.period_id || '0', 10)
      const duration = parseInt(d.duration || '1', 10)
      const endP = p + duration - 1
      return endP > max ? endP : max
    }, 0)

    if (maxPeriodInData > periodsPerDay) {
      periodsPerDay = maxPeriodInData
    } else if (visualSettings.hideEmptyPeriods && maxPeriodInData > 0) {
      periodsPerDay = maxPeriodInData
    }

    setMaxPeriods(periodsPerDay)
    const generated = generateTimeSlots(startHour, blockDuration, periodsPerDay, breaks, use12h)
    activeSlots = generated.filter(s => s.type !== 'break')
    setTimeSlots(activeSlots)

    // 3. Formatear y agrupar clases (por si hay bloques unidos o múltiples docentes)
    const groupedSlots = new Map<string, any>()
      
    ;(data || []).forEach((d: any) => {
      // Filtrar el grupo virtual de jornada si estamos viendo el horario de un grupo estudiantil
      // (esas asignaciones pertenecen al docente, no al grupo)
      if (entityType === 'group') {
        if (!d.group?.name || d.group.name === 'Jornada Institucional') return
        const isOfficial = !d.group.name.toLowerCase().includes('comité') && !d.group.name.toLowerCase().includes('reunión')
        if (!isOfficial) return
      }

      // La llave agrupa si misma materia en mismo dia/hora para no duplicar bloques
      const slotKey = `${d.day_of_week}-${d.period_id}-${d.subject?.name || 'libre'}`
      
      if (!groupedSlots.has(slotKey)) {
        groupedSlots.set(slotKey, {
          id: d.id,
          day: parseInt(d.day_of_week, 10),
          period: parseInt(d.period_id, 10),
          duration: parseInt(d.duration || '1', 10),
          subject: d.subject?.name || 'Libre',
          teachers: [],
          groups: [],
          color: d.subject?.color || '#ffffff',
          room: d.classroom?.name || '',
          isNovedad: d.isNovedad || false
        })
      }
      const item = groupedSlots.get(slotKey)!
      
      if (d.teacher?.full_name && !item.teachers.includes(d.teacher.full_name)) {
        item.teachers.push(d.teacher.full_name)
      }
      if (d.group?.name && !item.groups.includes(d.group.name)) {
        item.groups.push(d.group.name)
      }
    })

    const formattedClasses = Array.from(groupedSlots.values()).map((item: any) => {
      const isInstitucional = item.groups.includes('Jornada Institucional') || item.groups.length === 0
      const displayGroup = isInstitucional
        ? 'Jornada Institucional'
        : item.groups.filter((g: string) => g !== 'Jornada Institucional').join(', ')

      // Bandera para estilo diferenciado en la card de escritorio
      const isJornada = isInstitucional

      let labelTitle = ''
      let labelSubtitle = ''

      if (entityType === 'teacher') {
        // Docente: Grupo en grande (arriba), Materia en pequeño (abajo). Fix Next.js Cache
        labelSubtitle = isInstitucional ? item.subject : displayGroup;
        labelTitle = isInstitucional ? '' : item.subject;
      } else {
        // Grupo: Materia en grande (arriba), Docente en pequeño (abajo)
        labelSubtitle = item.subject
        labelTitle = item.teachers.join(', ') || 'Sin asignar'
      }

      return {
        ...item,
        labelTitle,
        labelSubtitle,
        isJornada,
        isNovedad: item.isNovedad
      }
    })
    
    setClasses(formattedClasses)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center min-h-[300px] text-slate-500">
        <CalendarX2 className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
        <p className="font-medium">No se encontró horario asignado.</p>
      </div>
    )
  }

  // --- RENDERING MOBILE (Vista Moderna por días con pestañas) ---
  const renderMobileView = () => (
    <div className="block lg:hidden w-full pb-8">
      <DayTabsScheduleView
        schedule={mobileScheduleData}
        context={{
          title: entityName || (entityType === 'teacher' ? 'Horario Personal' : 'Horario de Grupo'),
          subtitle: entityType === 'teacher' ? 'Docente' : (directorName ? `Director: ${directorName}` : 'Horario de Clases'),
          type: entityType
        }}
        hideGroupBadge={hideGroupBadge || entityType === 'group'}
      />
    </div>
  )

  // --- RENDERING DESKTOP (CSS Grid — filas 100% simétricas sin scroll) ---
  const renderDesktopView = () => {
    const activePeriods = timeSlots.filter(slot => slot.id! <= maxPeriods)
    const numPeriods = activePeriods.length

    // CSS Grid: columna fija para el día + N columnas iguales para períodos
    const gridCols = `5rem repeat(${numPeriods}, minmax(0, 1fr))`
    // Filas: header auto + días con 1fr exacto
    const gridRows = `auto repeat(${visibleDays.length}, 1fr)`
    
    const densityPadding = visualSettings.density === 'compact' ? 'py-1 px-1' : 'py-2 px-1'

    return (
      <div
        className="hidden lg:grid flex-1 w-full bg-white dark:bg-slate-900 overflow-hidden"
        style={{ gridTemplateColumns: gridCols, gridTemplateRows: gridRows }}
      >
        {/* ── HEADER ROW ── */}
        <div className={`bg-slate-50 dark:bg-slate-950/80 border-b border-r border-slate-200 dark:border-slate-800 flex items-center justify-center ${densityPadding}`}>
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Día</span>
        </div>
        {activePeriods.map(slot => (
          <div key={`h-${slot.id}`} className={`bg-slate-50 dark:bg-slate-950/80 border-b border-r last:border-r-0 border-slate-200 dark:border-slate-800 flex flex-row items-center justify-center gap-1.5 ${densityPadding}`}>
            <span className="text-xs sm:text-[13px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap">
              {slot.id}ª
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {slot.startTime}
            </span>
          </div>
        ))}

        {/* ── FILAS DE DÍAS (cada día ocupa exactamente 1fr) ── */}
        {visibleDays.map((day) => {
          let skipUntil = 0;
          return (
          <React.Fragment key={day}>
            {/* Celda nombre del día */}
            <div className="border-b last:border-b-0 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-center">
              <span className="text-xs sm:text-[13px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                {day.substring(0, 3)}
              </span>
            </div>

            {/* Celdas de períodos */}
            {activePeriods.map(slot => {
              const period = slot.id!
              const dayNumber = visibleDays.indexOf(day) + 1
              
              if (period < skipUntil) return null;

              const cls = classes.find(c => c.day === dayNumber && period >= c.period && period < c.period + c.duration)

              // Celda vacía
              if (!cls) {
                return (
                  <div key={`${day}-${period}`} className="border-b last:border-b-0 border-r last:border-r-0 border-slate-100 dark:border-slate-800 relative group">
                    <div className="absolute inset-[4px] border border-dashed border-slate-200 dark:border-slate-800 rounded-lg pointer-events-none group-hover:border-slate-300 dark:group-hover:border-slate-700 transition-colors" />
                  </div>
                )
              }

              // Celda que NO es el inicio del bloque — el span en el inicio la cubre
              if (period > cls.period) return null

              let span = cls.duration || 1;

              // Check consecutive blocks with the exact same details
              for (let i = period + span; i <= activePeriods.length; i++) {
                const nextCls = classes.find(c => c.day === dayNumber && i === c.period);
                if (nextCls && 
                    nextCls.subject === cls.subject && 
                    nextCls.labelTitle === cls.labelTitle && 
                    nextCls.labelSubtitle === cls.labelSubtitle) {
                   span += nextCls.duration || 1;
                   i += (nextCls.duration || 1) - 1; // Advance loop by the extra duration
                } else {
                   break;
                }
              }

              skipUntil = period + span;

              return (
                <div
                  key={`${day}-${period}`}
                  className="border-b last:border-b-0 border-r last:border-r-0 border-slate-100 dark:border-slate-800 relative"
                  style={{ gridColumn: `span ${span}` }}
                >
                  <div
                    className={`absolute inset-[3px] rounded-lg border flex flex-col overflow-hidden transition-all hover:shadow-md hover:brightness-95 cursor-default ${
                      cls.isJornada
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/50'
                        : ''
                    }`}
                    style={cls.isJornada ? {} : {
                      backgroundColor: `${cls.color}18`,
                      borderColor: `${cls.color}50`,
                    }}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-[3.5px] rounded-l-lg ${cls.isJornada ? 'bg-amber-400' : ''}`}
                      style={cls.isJornada ? {} : { backgroundColor: cls.color || '#cbd5e1' }}
                    />
                    {cls.isNovedad && (
                      <div className="absolute top-0 right-0 p-1" title="Horario con Novedad">
                        <AlertCircle className="w-3 h-3 text-amber-500 bg-white dark:bg-slate-900 rounded-full" />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-center items-center text-center px-1 pl-2 overflow-hidden">
                      {entityType === 'teacher' ? (
                        <div className="w-full h-full flex flex-col justify-center items-center py-0.5">
                          <h4
                            className={`font-black tracking-tighter select-none text-center break-words w-full ${
                              cls.isJornada
                                ? 'text-amber-700 dark:text-amber-300 text-[10px] sm:text-[11px] leading-tight'
                                : `text-indigo-700 dark:text-indigo-300 ${
                                    cls.labelSubtitle.length <= 6
                                      ? (visualSettings.density === 'compact' ? 'text-[16px] sm:text-[18px] leading-tight' : 'text-[20px] sm:text-[22px] xl:text-[24px] leading-tight')
                                      : (visualSettings.density === 'compact' ? 'text-[10px] sm:text-[11px] leading-tight' : 'text-[11px] sm:text-[13px] leading-tight')
                                  }`
                            }`}
                          >
                            {cls.labelSubtitle}
                          </h4>
                          <span className="text-slate-600 dark:text-slate-300 text-[9px] sm:text-[10px] font-bold leading-tight mt-0.5 tracking-tight text-center break-words w-full px-0.5">
                            {cls.labelTitle}
                          </span>
                          {visualSettings.showClassrooms && cls.room && (
                            <span className="text-slate-400 dark:text-slate-500 text-[7px] font-extrabold uppercase tracking-wider leading-none mt-0.5 text-center break-words">
                              {cls.room}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-full flex flex-col justify-center items-center gap-0.5">
                          <h4 className={`font-black text-indigo-700 dark:text-indigo-300 ${visualSettings.density === 'compact' ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-[13px]'} leading-tight tracking-tight text-center break-words w-full px-0.5`}>
                            {cls.labelSubtitle}
                          </h4>
                          <span className={`text-slate-500 dark:text-slate-400 ${visualSettings.density === 'compact' ? 'text-[8px]' : 'text-[9px]'} font-semibold leading-tight text-center break-words w-full px-0.5`}>
                            {cls.labelTitle}
                          </span>
                          {visualSettings.showClassrooms && cls.room && (
                            <span className="text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase tracking-wider leading-none">
                              {cls.room}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </React.Fragment>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 w-full overflow-y-auto lg:overflow-hidden custom-scrollbar flex flex-col p-1 sm:p-4 lg:p-0 print:hidden">
        {renderMobileView()}
        {renderDesktopView()}
      </div>

      {/* Vista de Impresión Oficial A4 Landscape */}
      {!disablePrint && (
        <div className="hidden print:block w-full">
          <PrintableSchedule
            groupName={entityName || (entityType === 'teacher' ? 'Docente' : 'Grupo')}
            directorName={directorName}
            isTeacherView={entityType === 'teacher'}
            classes={classes.map(c => ({
              ...c,
              day: typeof c.day === 'number' ? DAYS[c.day - 1] : c.day,
              subject: c.subject,
              teacher: entityType === 'teacher' ? c.labelSubtitle : (c.teachers?.length > 0 ? c.teachers.join(', ') : c.labelTitle),
              group: entityType === 'teacher' ? c.labelSubtitle : (c.groups?.length > 0 ? c.groups.join(', ') : c.labelTitle)
            }))}
            timeSlots={timeSlots}
            groupMax={maxPeriods}
          />
        </div>
      )}
    </>
  )
}
