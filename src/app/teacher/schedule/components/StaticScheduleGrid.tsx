'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { getScheduleSlotsAction } from '@/modules/admin/application/actions'
import { Loader2, CalendarX2 } from 'lucide-react'
import { generateTimeSlots } from '@/app/admin/schedules/utils/timeCalculator'
import PrintableSchedule from '@/app/admin/schedules/components/PrintableSchedule'
import DayTabsScheduleView, { ScheduleData, ScheduleDayKey } from '@/components/schedule/DayTabsScheduleView'

interface StaticScheduleGridProps {
  entityType: 'group' | 'teacher'
  entityId: string
  entityName?: string
  directorName?: string
  disablePrint?: boolean
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export default function StaticScheduleGrid({ entityType, entityId, entityName, directorName, disablePrint = false }: StaticScheduleGridProps) {
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [maxPeriods, setMaxPeriods] = useState<number>(7)

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

    classes.forEach(c => {
      const dayKey = dayKeyMap[c.day]
      if (!dayKey) return

      const startSlot = timeSlots.find(s => s.id === c.period)
      const endPeriod = c.period + (c.duration || 1) - 1
      const endSlot = timeSlots.find(s => s.id === endPeriod)

      data[dayKey].push({
        id: `${c.day}-${c.period}`,
        startTime: startSlot?.startTime || `${c.period}ª`,
        endTime: endSlot?.endTime || startSlot?.endTime || '',
        subject: c.subject || 'Clase',
        teacher: entityType === 'teacher' ? undefined : (c.teachers?.join(', ') || c.labelTitle),
        group: entityType === 'teacher' ? c.labelSubtitle : undefined,
        location: c.room || '',
        color: c.color || '#4f46e5'
      })
    })

    return data
  }, [classes, timeSlots, entityType])

  const loadSettingsAndSchedule = async () => {
    setLoading(true)
    
    // 1. Cargar configuración de horarios
    let activeSlots: any[] = []
    try {
      const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
      const startHour = settings.startHour || '07:00'
      const blockDuration = parseInt(settings.blockDuration || '55', 10)
      
      const groupPeriods = JSON.parse(localStorage.getItem('sch_group_periods') || '{}')
      const periodsPerDay = entityType === 'group' && groupPeriods[entityId] 
        ? groupPeriods[entityId] 
        : parseInt(settings.periodsPerDay || '7', 10)
      
      setMaxPeriods(periodsPerDay)

      const use12h = settings.timeFormat !== '24h'
      let breaks = settings.breaks
      if (!breaks && settings.breakPeriod) {
        breaks = [{ id: '1', name: 'Recreo', afterPeriod: parseInt(settings.breakPeriod, 10), durationMinutes: 30 }]
      } else if (!breaks) {
        breaks = []
      }

      const generated = generateTimeSlots(startHour, blockDuration, periodsPerDay, breaks, use12h)
      // Solo tomamos los periodos académicos (ignorar recreos para la cuadrícula compacta)
      activeSlots = generated.filter(s => s.type !== 'break')
      setTimeSlots(activeSlots)
    } catch(e) {
      console.error('Error cargando configuración:', e)
    }

    // 2. Fetch de datos desde la base de datos usando el Server Action (para saltar RLS)
    const data = await getScheduleSlotsAction(entityType, entityId)

    if (!data) {
      setClasses([])
      setLoading(false)
      return
    }

    // 3. Formatear y agrupar clases (por si hay bloques unidos o múltiples docentes)
    const groupedSlots = new Map<string, any>()
      
    ;(data || []).forEach((d: any) => {
      // Ignorar grupos externos si estamos viendo la vista de un Grupo Estudiantil
      if (entityType === 'group' && d.group?.name) {
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
          room: d.classroom?.name || ''
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
      const displayGroup = item.groups.length > 0 ? item.groups.join(', ') : 'Comité / Reunión'
      
      let labelTitle = ''
      let labelSubtitle = ''
      
      if (entityType === 'teacher') {
        // Docente: Grupo en grande (arriba), Materia en pequeño (abajo)
        labelSubtitle = displayGroup
        labelTitle = item.subject
      } else {
        // Grupo: Materia en grande (arriba), Docente en pequeño (abajo)
        labelSubtitle = item.subject
        labelTitle = item.teachers.join(', ') || 'Sin asignar'
      }

      return {
        ...item,
        labelTitle,
        labelSubtitle
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
      />
    </div>
  )

  // --- RENDERING DESKTOP (CSS Grid — filas 100% simétricas sin scroll) ---
  const renderDesktopView = () => {
    const activePeriods = timeSlots.filter(slot => slot.id! <= maxPeriods)
    const numPeriods = activePeriods.length

    // CSS Grid: columna fija para el día + N columnas iguales para períodos
    const gridCols = `5rem repeat(${numPeriods}, minmax(0, 1fr))`
    // Filas: header auto + 5 días con 1fr exacto (todos iguales, sin importar contenido)
    const gridRows = `auto repeat(${DAYS.length}, 1fr)`

    return (
      <div
        className="hidden lg:grid w-full h-full bg-white dark:bg-slate-900 overflow-hidden"
        style={{ gridTemplateColumns: gridCols, gridTemplateRows: gridRows }}
      >
        {/* ── HEADER ROW ── */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border-b border-r border-slate-200 dark:border-slate-800 flex items-center justify-center py-2 px-1">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Día</span>
        </div>
        {activePeriods.map(slot => (
          <div key={`h-${slot.id}`} className="bg-slate-50 dark:bg-slate-950/80 border-b border-r last:border-r-0 border-slate-200 dark:border-slate-800 flex flex-row items-center justify-center gap-1.5 py-2 px-1">
            <span className="text-xs sm:text-[13px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap">
              {slot.id}ª
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {slot.startTime}
            </span>
          </div>
        ))}

        {/* ── FILAS DE DÍAS (cada día ocupa exactamente 1fr) ── */}
        {DAYS.map((day) => (
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
              const dayNumber = DAYS.indexOf(day) + 1
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

              return (
                <div
                  key={`${day}-${period}`}
                  className="border-b last:border-b-0 border-r last:border-r-0 border-slate-100 dark:border-slate-800 relative"
                  style={{ gridColumn: `span ${cls.duration}` }}
                >
                  <div
                    className="absolute inset-[3px] rounded-lg border flex flex-col overflow-hidden transition-all hover:shadow-md hover:brightness-95 cursor-default"
                    style={{
                      backgroundColor: `${cls.color}18`,
                      borderColor: `${cls.color}50`,
                    }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3.5px] rounded-l-lg" style={{ backgroundColor: cls.color || '#cbd5e1' }} />
                    <div className="flex-1 flex flex-col justify-center items-center text-center px-1 pl-2 overflow-hidden">
                      {entityType === 'teacher' ? (
                        <div className="w-full h-full flex flex-col justify-center items-center py-0.5">
                          <h4 
                            className={`font-black text-indigo-700 dark:text-indigo-300 tracking-tighter select-none ${
                              cls.labelSubtitle.length <= 6 
                                ? 'text-[20px] sm:text-[22px] xl:text-[24px] leading-tight' 
                                : 'text-[11px] sm:text-[13px] leading-tight'
                            }`}
                          >
                            {cls.labelSubtitle}
                          </h4>
                          <span className="text-slate-600 dark:text-slate-300 text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-1 mt-0.5 max-w-[95%] truncate tracking-tight">
                            {cls.labelTitle}
                          </span>
                          {cls.room && (
                            <span className="text-slate-400 dark:text-slate-500 text-[7px] font-extrabold uppercase tracking-wider leading-none mt-0.5">
                              {cls.room}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-full flex flex-col justify-center items-center gap-0.5">
                          <h4 className="font-black text-indigo-700 dark:text-indigo-300 text-[15px] sm:text-[16px] leading-tight tracking-tight line-clamp-2">
                            {cls.labelSubtitle}
                          </h4>
                          <span className="text-slate-500 dark:text-slate-400 text-[9px] font-semibold leading-tight line-clamp-1">
                            {cls.labelTitle}
                          </span>
                          {cls.room && (
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
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="h-full w-full overflow-y-auto lg:overflow-hidden custom-scrollbar flex flex-col p-1 sm:p-4 lg:p-0 print:hidden">
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
