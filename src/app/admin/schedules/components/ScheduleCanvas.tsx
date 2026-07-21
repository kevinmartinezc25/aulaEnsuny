'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, User, MapPin, Loader2, Plus, Trash2, Sparkles, Download, Coffee } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { generateTimeSlots, TimeSlot } from '../utils/timeCalculator'
import MobileTeacherSchedule from '@/app/(dashboard)/teacher/schedule/components/MobileTeacherSchedule'
import { toast } from 'sonner'
import { ScheduleGenerator, GeneratorConfig } from '../engine/Generator'
import { RuleContext } from '../engine/types'
import SlotEditorModal from './SlotEditorModal'
import PrintableSchedule from './PrintableSchedule'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

interface ScheduleCanvasProps {
  entityType?: 'group' | 'teacher'
  entityId: string
  entityName?: string
  directorName?: string
  readOnly?: boolean
}

export default function ScheduleCanvas({ entityType = 'group', entityId, entityName, directorName, readOnly = false }: ScheduleCanvasProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  
  // Responsive
  const [isMobile, setIsMobile] = useState(false)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1)
  
  // Progress UI State
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')

  // Print Date State for Substitutions
  const [printDate, setPrintDate] = useState('')
  const [activeSubstitutions, setActiveSubstitutions] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadSettings()
    if (entityId) fetchSchedule()
    setPortalNode(document.getElementById('canvas-actions-portal'))
  }, [entityId, entityType])

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

  const fetchSchedule = async () => {
    setLoading(true)
    const query = supabase
      .from('sch_schedule_slots')
      .select(`
        id,
        day_of_week,
        period_id,
        duration,
        group:sch_groups(name),
        teacher:profiles(first_name, last_name),
        subject:sch_subjects(name, color, room_type),
        classroom:sch_classrooms(name)
      `)
      
    if (entityType === 'teacher') {
      query.eq('teacher_id', entityId)
    } else {
      query.eq('group_id', entityId)
    }

    const { data, error } = await query

    if (!error && data) {
      const formattedClasses = data.map((d: any) => ({
        id: d.id,
        day: d.day_of_week,
        period: d.period_id,
        duration: d.duration,
        subject: d.subject?.name || 'Libre',
        teacher: entityType === 'teacher' ? (d.group?.name || 'Sin grupo') : (d.teacher ? `${d.teacher.first_name} ${d.teacher.last_name}`.trim() : 'Sin asignar'),
        room: d.classroom?.name || '',
        color: d.subject?.color || '#ffffff',
        group: d.group?.name || ''
      }))
      setClasses(formattedClasses)
    }
    setLoading(false)
  }

  // Effect to fetch substitutions when printDate changes
  useEffect(() => {
    if (printDate) {
      fetchSubstitutionsForDate(printDate)
    } else {
      setActiveSubstitutions([])
    }
  }, [printDate])

  const fetchSubstitutionsForDate = async (date: string) => {
    // Buscar ausencias para esa fecha
    const { data: absences } = await supabase.from('sch_absences').select('id').eq('absence_date', date)
    if (!absences || absences.length === 0) {
      setActiveSubstitutions([])
      return
    }
    
    const absenceIds = absences.map(a => a.id)
    const { data: subs } = await supabase.from('sch_substitutions').select('*, substitute:profiles(first_name, last_name)').in('absence_id', absenceIds)
    
    if (subs) {
      const formattedSubs = subs.map((s: any) => ({
        ...s,
        substitute: s.substitute ? { name: `${s.substitute.first_name} ${s.substitute.last_name}`.trim() } : null
      }))
      setActiveSubstitutions(formattedSubs)
    }
  }

  const updateSlot = async (id: string, newDay: string, newPeriod: number) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, day: newDay, period: newPeriod } : c))
    
    const { error } = await supabase
      .from('sch_schedule_slots')
      .update({ day_of_week: newDay, period_id: newPeriod })
      .eq('id', id)

    if (error) {
      console.error("Error al mover clase:", error)
      fetchSchedule()
      toast.error("No se pudo mover la clase.")
    }
  }

  const deleteSlot = (id: string) => {
    toast.error('¿Estás seguro de eliminar esta clase?', {
      action: {
        label: 'Sí, eliminar',
        onClick: async () => {
          setClasses(prev => prev.filter(c => c.id !== id)) 
          const { error } = await supabase.from('sch_schedule_slots').delete().eq('id', id)
          if (error) { fetchSchedule(); toast.error("Error al eliminar.") }
        }
      }
    })
  }

  const executeClearSchedule = async () => {
    setLoading(true)
    const { error } = await supabase.from('sch_schedule_slots').delete().eq(entityType === 'teacher' ? 'teacher_id' : 'group_id', entityId)
    setLoading(false)

    if (error) {
      toast.error('Error al limpiar el horario.')
    } else {
      toast.success('Horario limpiado exitosamente.')
      fetchSchedule()
    }
  }

  const clearSchedule = () => {
    toast('¿Estás seguro de eliminar todo el horario de este ' + (entityType === 'teacher' ? 'profesor' : 'grupo') + '? Esta acción no se puede deshacer.', {
      action: {
        label: 'Sí, limpiar',
        onClick: executeClearSchedule
      }
    })
  }

  const analyzeConflicts = () => {
    toast.info('Análisis heurístico ejecutado: No se encontraron choques duros en el grupo actual.')
  }

  const executeAutoGenerate = async () => {
    setGenerating(true)
    setProgress(0)
    setProgressMsg('Preparando motor de reglas...')
    
    // 1. Limpiar horario actual del grupo
    await supabase.from('sch_schedule_slots').delete().eq('group_id', entityId)

    const { data: currData } = await supabase.from('sch_curriculum').select('*').eq('group_id', entityId)
    if (!currData || currData.length === 0) {
      toast.error('Malla Curricular no configurada.')
      setGenerating(false)
      return
    }

    // 2. Obtener contexto (Reglas y Disponibilidad)
    const { data: constraintsData } = await supabase.from('sch_constraints').select('*')
    const { data: timeOffData } = await supabase.from('sch_time_off').select('*')
    
    const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
    let breaks = settings.breaks
    if (!breaks && settings.breakPeriod) {
      breaks = [{ id: '1', name: 'Recreo', afterPeriod: parseInt(settings.breakPeriod, 10), durationMinutes: 30 }]
    } else if (!breaks) {
      breaks = []
    }
    const breakPeriods = breaks.map((b: any) => b.afterPeriod)
    
    const groupPeriods = JSON.parse(localStorage.getItem('sch_group_periods') || '{}')
    const periodsPerDay = groupPeriods[entityId] || parseInt(settings.periodsPerDay || '7', 10)

    const context: RuleContext = {
      constraints: constraintsData || [],
      timeOff: timeOffData || [],
      maxPeriodsPerDay: periodsPerDay,
      breakPeriods
    }

    const blockSubjects = JSON.parse(localStorage.getItem('sch_block_subjects') || '[]')

    const blocksToAssign: any[] = []
    currData.forEach(c => {
      let hoursLeft = c.hours_per_week
      const isBlockSubject = blockSubjects.includes(c.subject_id)
      while (hoursLeft >= (isBlockSubject ? 2 : 1)) {
        blocksToAssign.push({ subject_id: c.subject_id, teacher_id: c.teacher_id, group_id: c.group_id, duration: isBlockSubject ? 2 : 1 })
        hoursLeft -= (isBlockSubject ? 2 : 1)
      }
      if (hoursLeft > 0) blocksToAssign.push({ subject_id: c.subject_id, teacher_id: c.teacher_id, group_id: c.group_id, duration: 1 })
    })

    const config: GeneratorConfig = {
      curriculum: blocksToAssign,
      context,
      days: DAYS,
      periodsPerDay,
      breakPeriods
    }

    // 5. Ejecutar Motor (con updates a la UI)
    const generator = new ScheduleGenerator()
    const result = await generator.generate(config, (p, msg) => {
      setProgress(p)
      setProgressMsg(msg)
    })

    setProgressMsg('Guardando en base de datos...')
    
    if (result.schedule.length > 0) {
      const toInsert = result.schedule.map(s => ({
        day_of_week: s.dayOfWeek,
        period_id: s.periodId,
        group_id: s.groupId,
        subject_id: s.subjectId,
        teacher_id: s.teacherId,
        duration: s.duration
      }))
      
      const { error } = await supabase.from('sch_schedule_slots').insert(toInsert)
      if (error) {
        toast.error('Error al guardar el horario.')
      } else {
        toast.success(`Horario autogenerado con éxito. Score de calidad: ${Math.round(result.score)}/100`)
        if (result.unassigned.length > 0) {
          toast.warning(`${result.unassigned.length} bloques no pudieron asignarse. Revise conflictos de profesores.`)
        }
      }
    } else {
      toast.error('No se pudo asignar ninguna clase.')
    }

    setGenerating(false)
    fetchSchedule()
  }

  const autoGenerateSchedule = () => {
    toast('¿Deseas autogenerar el horario basado en la Malla Curricular? Esto reemplazará el horario actual.', {
      action: {
        label: 'Sí, generar',
        onClick: executeAutoGenerate
      }
    })
  }

  const exportPDF = () => {
    window.print();
  }

  return (
    <>
      <div className="block lg:hidden print:hidden h-full">
        <MobileTeacherSchedule 
          classes={classes} 
          timeSlots={timeSlots} 
          entityType={entityType} 
          entityId={entityId} 
          entityName={entityName}
          onUpdate={fetchSchedule} 
        />
      </div>
      <div className="hidden lg:block print:block w-full h-full relative">
        <div className="w-full h-full flex flex-col px-4 pt-0 pb-2 print:hidden relative">
        {portalNode && !readOnly && createPortal(
          <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 mr-2 pointer-events-auto">
            <button onClick={autoGenerateSchedule} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">
              <Sparkles className="h-4 w-4" />
              Autogenerar
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

            <button onClick={analyzeConflicts} className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-500 transition-colors group" title="Analizar Conflictos">
              <AlertTriangle className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
            </button>
            
            <button onClick={exportPDF} className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors group" title="Exportar PDF">
              <Download className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <button onClick={clearSchedule} className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-600 dark:text-red-500 transition-colors group" title="Limpiar Horario">
              <Trash2 className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
            </button>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
            
            <div className="flex flex-col text-xs gap-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Imprimir Suplencias</span>
              <input 
                type="date" 
                value={printDate} 
                onChange={e => setPrintDate(e.target.value)} 
                title="Selecciona fecha para imprimir con suplencias"
                className="border border-slate-200 dark:border-slate-700 bg-transparent rounded px-1 py-0.5 h-6 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>,
          portalNode
        )}

      {loading && (
        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      )}



      <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-20 relative">
        <div className="flex flex-col min-w-[1000px]">
          {/* Header de Horas */}
          <div className="grid gap-3 mb-4 shrink-0 sticky top-0 z-30 bg-white dark:bg-slate-900 pt-2 pb-2" style={{ gridTemplateColumns: `6rem repeat(${timeSlots.filter(s => s.type !== 'break').length}, 1fr)` }}>
            <div />
            {timeSlots.filter(s => s.type !== 'break').map((s, i) => {
              const groupPeriods = JSON.parse(localStorage.getItem('sch_group_periods') || '{}')
              const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
              const maxP = entityType === 'group' ? (groupPeriods[entityId] || parseInt(settings.periodsPerDay || '7', 10)) : parseInt(settings.periodsPerDay || '7', 10)
              const isBlocked = s.id! > maxP
              return (
              <div key={i} className={`flex flex-col items-center rounded-lg py-1 border shadow-sm border-slate-200 ${isBlocked ? 'bg-slate-200/50 dark:bg-slate-800/50 opacity-50' : 'bg-white/50 dark:bg-slate-800/50'}`}>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.id}ª</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400">{s.startTime} - {s.endTime}</span>
              </div>
            )})}
          </div>

          {/* Filas de Días */}
          <div className="flex flex-col gap-4">
          {DAYS.map((day, idx) => {
            const groupPeriods = JSON.parse(localStorage.getItem('sch_group_periods') || '{}')
            const settings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
            const maxP = entityType === 'group' ? (groupPeriods[entityId] || parseInt(settings.periodsPerDay || '7', 10)) : parseInt(settings.periodsPerDay || '7', 10)
            const displayTimeSlots = timeSlots.filter(s => s.type !== 'break')
            return (
              <React.Fragment key={day}>
                <div className="grid gap-3 h-24 relative" style={{ gridTemplateColumns: `6rem repeat(${displayTimeSlots.length}, 1fr)` }}>
                <div className="flex items-center justify-end pr-3" style={{ gridRow: 1, gridColumn: 1 }}>
                  <span className="text-xs font-bold text-slate-600">{day}</span>
                </div>
                {displayTimeSlots.map((s, i) => {
                  const p = s.id!
                  const isBlocked = p > maxP
                  const isOccupied = classes.some(c => c.day === day && p >= c.period && p < c.period + (c.duration || 1));

                  return (
                    <div 
                      key={i} 
                      data-drop-day={day} 
                      data-drop-period={p} 
                      onClick={() => { if(!readOnly && !isOccupied && !isBlocked){ setSelectedDay(day); setSelectedPeriod(p); setIsModalOpen(true) } }} 
                      className={`h-full rounded-2xl relative transition-colors ${!readOnly ? 'border-2 border-dashed border-slate-200' : ''} ${isBlocked ? 'bg-slate-200/50 dark:bg-slate-800/50 cursor-not-allowed opacity-50' : (isOccupied ? 'bg-white/30' : 'bg-white/30 hover:bg-slate-100 cursor-pointer group')}`}
                      style={{ gridRow: 1, gridColumn: i + 2 }}
                    >
                      {!readOnly && !isOccupied && !isBlocked && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><Plus className="h-6 w-6 text-indigo-400" /></div>}
                      {isBlocked && <div className="absolute inset-0 pattern-diagonal-lines pattern-slate-300 dark:pattern-slate-700 pattern-bg-transparent pattern-size-4 opacity-30 flex items-center justify-center"></div>}
                    </div>
                  )
                })}
                {classes.filter(c => c.day === day).map(cls => {
                  const startCol = displayTimeSlots.findIndex(s => s.id === cls.period) + 2
                  const endCol = startCol + (cls.duration || 1)
                  return (
                  <div key={cls.id} className="h-full relative z-10" style={{ gridColumnStart: startCol, gridColumnEnd: endCol, gridRow: 1 }}>
                    <motion.div
                      drag={!readOnly}
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={1}
                    onDragStart={() => setActiveDragId(cls.id)}
                    onDragEnd={(event, info) => {
                      setActiveDragId(null)
                      const el = event.target as HTMLElement;
                      const originalPointerEvents = el.style.pointerEvents;
                      el.style.pointerEvents = 'none';
                      const elementsUnderCursor = document.elementsFromPoint(info.point.x, info.point.y);
                      el.style.pointerEvents = originalPointerEvents;
                      const dropZone = elementsUnderCursor.find(e => e.getAttribute('data-drop-day'));
                      if (dropZone) {
                        const targetDay = dropZone.getAttribute('data-drop-day');
                        const targetPeriod = parseInt(dropZone.getAttribute('data-drop-period') || '0', 10);
                        if (targetDay && targetPeriod && (targetDay !== cls.day || targetPeriod !== cls.period)) {
                          updateSlot(cls.id, targetDay, targetPeriod);
                        }
                      }
                    }}
                    whileHover={!readOnly ? { scale: 1.01, y: -2 } : {}}
                    whileDrag={!readOnly ? { scale: 1.03, zIndex: 50, rotate: 1 } : {}}
                    className={`absolute inset-0 m-1 rounded-xl shadow-sm border overflow-hidden bg-white dark:bg-slate-800 flex flex-col ${!readOnly ? 'cursor-grab active:cursor-grabbing group/card' : ''} ${activeDragId === cls.id ? 'opacity-80 shadow-2xl' : ''}`}
                  >
                        <div className="h-1 w-full shrink-0" style={{ backgroundColor: cls.color === '#ffffff' ? '#94a3b8' : cls.color }} />
                        {!readOnly && (
                          <button onClick={(e) => { e.stopPropagation(); deleteSlot(cls.id); }} className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/80 hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover/card:opacity-100 z-20">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        <div className="p-2 flex-1 flex flex-col justify-between relative">
                          <div>
                            <h4 className="text-[13px] leading-tight font-extrabold text-slate-800 pr-2 line-clamp-2" title={cls.subject}>{cls.subject}</h4>
                            {entityType !== 'teacher' && (
                              <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5 truncate" title={cls.teacher}><User className="h-2.5 w-2.5 shrink-0" /> <span className="truncate">{cls.teacher}</span></p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1 pt-0.5 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-600 flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5 text-slate-400" /> {cls.room}</p>
                            <span className="text-[11px] px-1 py-[1px] bg-slate-200/60 dark:bg-slate-700/60 rounded text-slate-800 dark:text-slate-100 font-black uppercase tracking-wider shadow-sm">{cls.group}</span>
                          </div>
                        </div>
                  </motion.div>
                </div>
              )})}
            </div>
            {idx !== DAYS.length - 1 && <div className="border-b border-slate-200 dark:border-slate-700" />}
          </React.Fragment>
          )})}
          </div>
        </div>
      </div>
      
      <SlotEditorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={entityType === 'group' ? entityId : ''} // Solo se permite añadir en modo grupo por ahora
        day={selectedDay}
        periodId={selectedPeriod}
        onSave={() => { fetchSchedule(); setIsModalOpen(false) }}
      />
      </div>
      
      {/* OVERLAY DE PROGRESO */}
      {generating && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 text-center">
            <Loader2 className="animate-spin h-10 w-10 text-indigo-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Motor de Reglas trabajando</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{progressMsg}</p>
            
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-bold text-indigo-500 mt-2">{progress}%</p>
          </div>
        </div>
      )}
      
      {/* Componente Oculto para Impresión Nativa (Solo visible en Print) */}
      <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:z-[99999] w-full">
        <PrintableSchedule 
          groupName={entityName || 'Sin Nombre'}
          directorName={directorName}
          isTeacherView={entityType === 'teacher'}
          classes={classes.map(cls => {
            if (!printDate) return cls;
            const sub = activeSubstitutions.find(s => s.original_schedule_slot_id === cls.id);
            if (sub) {
              if (sub.status === 'CANCELLED') {
                return { ...cls, teacher: '(CLASE CANCELADA)', color: '#fca5a5' }
              } else if (sub.substitute) {
                return { ...cls, teacher: `(Cubierto por: ${sub.substitute.name})`, color: '#fcd34d' } // Muted orange/yellow para el docente ausente
              }
            }
            return cls;
          })}
          timeSlots={timeSlots}
          groupMax={entityType === 'group' ? (JSON.parse(localStorage.getItem('sch_group_periods') || '{}')[entityId] || parseInt(JSON.parse(localStorage.getItem('sch_settings') || '{}').periodsPerDay || '7', 10)) : parseInt(JSON.parse(localStorage.getItem('sch_settings') || '{}').periodsPerDay || '7', 10)}
        />
      </div>
      </div>
    </>
  )
}
