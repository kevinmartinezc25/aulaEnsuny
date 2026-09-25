'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/core/config/supabase/client'
import { 
  Calendar, Users, User, Sparkles, Search, Loader2, 
  Printer, X, FileText, CheckCircle2, Layers,
  Trash2, AlertTriangle
} from 'lucide-react'
import { clearAllScheduleSlotsAction } from '@/modules/admin/application/actions'
import { getGeneralSchedulePeriodsAction } from '@/app/admin/schedules/actions'

const SUBJECT_PALETTE = [
  '#059669', // emerald-600
  '#ea580c', // orange-600
  '#db2777', // pink-600
  '#0284c7', // sky-600
  '#9333ea', // purple-600
  '#dc2626', // red-600
  '#ca8a04', // yellow-600
  '#16a34a', // green-600
  '#0d9488', // teal-600
  '#e11d48', // rose-600
  '#7c3aed', // violet-600
  '#0891b2', // cyan-600
];

const getSubjectColor = (subjectName: string | undefined) => {
  if (!subjectName || subjectName === 'Jornada Institucional' || subjectName === 'Libre' || subjectName === 'Sin clase Asignada') {
    return '#f59e0b'; // amber-500
  }
  
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % SUBJECT_PALETTE.length;
  return SUBJECT_PALETTE[index];
}
interface Slot {
  id: string
  day_of_week: number
  period_id: number
  duration: number
  group_id: string
  teacher_id: string
  subject_id: string
  group: { name: string }
  teacher: { full_name: string }
  subject: { name: string; color?: string }
}

const DAYS = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
]

import StaticScheduleGrid from '@/app/teacher/schedule/components/StaticScheduleGrid'
import PrintableSchedule from '@/app/admin/schedules/components/PrintableSchedule'
import MobilePremiumScheduleView from '@/app/admin/schedules/components/MobilePremiumScheduleView'
import { generateTimeSlots } from '@/app/admin/schedules/utils/timeCalculator'
import { isOfficialGradeGroup } from '@/app/admin/schedules/utils/groupFilters'

function sortGroupsNaturally<T extends { name: string }>(a: T, b: T): number {
  const matchA = a.name.match(/^(\d+)[°º\-]?\s*(\d+)?/)
  const matchB = b.name.match(/^(\d+)[°º\-]?\s*(\d+)?/)

  if (matchA && matchB) {
    const gradeA = parseInt(matchA[1], 10)
    const gradeB = parseInt(matchB[1], 10)
    if (gradeA !== gradeB) return gradeA - gradeB
    const subA = matchA[2] ? parseInt(matchA[2], 10) : 0
    const subB = matchB[2] ? parseInt(matchB[2], 10) : 0
    if (subA !== subB) return subA - subB
  }
  if (matchA && !matchB) return -1
  if (!matchA && matchB) return 1

  const isPfcA = a.name.startsWith('PFC')
  const isPfcB = b.name.startsWith('PFC')
  if (isPfcA && !isPfcB) return -1
  if (!isPfcA && isPfcB) return 1

  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

export function PremiumScheduleViewer() {
  const searchParams = useSearchParams()
  const initialGroup = searchParams?.get('group')
  const initialId = searchParams?.get('id')
  const initialView = searchParams?.get('view') as 'general' | 'group' | 'teacher' | null

  const [viewMode, setViewMode] = useState<'general' | 'group' | 'teacher'>(
    initialView || (initialGroup || initialId ? 'group' : 'general')
  )
  const [selectedEntity, setSelectedEntity] = useState<string | null>(initialId || null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [periods, setPeriods] = useState<number[]>([1, 2, 3, 4, 5, 6, 7])
  const [periodTimes, setPeriodTimes] = useState<Record<number, string>>({})
  const [timeSlotsList, setTimeSlotsList] = useState<any[]>([])

  // Estado del Modal de Impresión
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [printType, setPrintType] = useState<'group' | 'teacher'>('group')
  const [printScope, setPrintScope] = useState<'single' | 'all'>('single')
  const [selectedPrintEntityId, setSelectedPrintEntityId] = useState<string>('')

  // Estado del Modal de Borrado de Horario
  const [isClearModalOpen, setIsClearModalOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)
  const [clearSuccess, setClearSuccess] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      
      const { data: slotsData, error: slotsError } = await supabase
        .from('sch_schedule_slots')
        .select(`
          id, day_of_week, period_id, group_id, teacher_id, subject_id, duration,
          group:sch_groups(name),
          teacher:academic_teachers(full_name),
          subject:sch_subjects(name, color)
        `)

      if (!slotsError && slotsData) {
        setSlots(slotsData as any)
      } else if (slotsError) {
        console.error("Supabase slots error:", slotsError)
        setErrorMsg(slotsError.message || "Error al cargar horarios.")
      }

      const { data: gData } = await supabase.from('sch_groups').select('id, name')
      const { data: tData } = await supabase.from('academic_teachers').select('id, full_name').eq('is_active', true)
      
      if (gData) {
        const sorted = [...gData].sort(sortGroupsNaturally)
        setGroups(sorted)
      }

      if (tData) {
        const mappedTeachers = tData.map(t => ({ id: t.id, name: t.full_name }))
        setTeachers(mappedTeachers)
      }
      
      try {
        const res = await getGeneralSchedulePeriodsAction()
        let settings: any = {}
        let activeSlots: any[] = []

        if (res.success && res.config) {
          settings = res.config

          if (res.config.periods && res.config.periods.length > 0) {
            activeSlots = res.config.periods.map((p, idx) => ({
              id: p.period || idx + 1,
              name: p.name || `${p.period}ª Hora`,
              startTime: p.startTime,
              endTime: p.endTime,
              type: 'period' as const
            }))
            setTimeSlotsList(activeSlots)
            const pTimes: Record<number, string> = {}
            activeSlots.forEach(s => {
              if (s.id != null) {
                pTimes[Number(s.id)] = s.startTime
              }
            })
            setPeriodTimes(pTimes)
            setPeriods(activeSlots.map((s: any) => s.id))
          }
        }

        if (activeSlots.length === 0) {
          const localSettings = JSON.parse(localStorage.getItem('sch_settings') || '{}')
          const startHour = localSettings.startHour || '07:00'
          const blockDuration = parseInt(localSettings.blockDuration || '55', 10)
          const maxP = parseInt(localSettings.periodsPerDay || '7', 10)
          const pArr = Array.from({length: maxP}, (_, i) => i + 1)
          setPeriods(pArr)

          const use12h = localSettings.visualSettings?.timeFormat !== '24h'
          let breaks = localSettings.breaks || []
          
          const generated = generateTimeSlots(startHour, blockDuration, maxP, breaks, use12h)
          activeSlots = generated.filter(s => s.type !== 'break')
          setTimeSlotsList(activeSlots)
          const pTimes: Record<number, string> = {}
          activeSlots.forEach(s => {
            if (s.id != null) {
              pTimes[Number(s.id)] = s.startTime
            }
          })
          setPeriodTimes(pTimes)
        }
      } catch (e) {
        setPeriods([1, 2, 3, 4, 5, 6, 7])
      }

      setIsLoading(false)
    }
    fetchData()
  }, [])

  // Sincronizar automáticamente con los parámetros de la URL (view, id, group)
  useEffect(() => {
    if (!searchParams) return
    const viewParam = searchParams.get('view') as 'general' | 'group' | 'teacher' | null
    const idParam = searchParams.get('id')
    const groupParam = searchParams.get('group')

    if (viewParam === 'group' || idParam || groupParam) {
      setViewMode('group')
      if (idParam) {
        setSelectedEntity(idParam)
      } else if (groupParam && groups.length > 0) {
        const matched = groups.find(g => 
          g.name.toLowerCase() === groupParam.toLowerCase() || g.id === groupParam
        )
        if (matched) setSelectedEntity(matched.id)
      } else if (groups.length > 0 && !selectedEntity) {
        setSelectedEntity(groups[0].id)
      }
    } else if (viewParam === 'teacher') {
      setViewMode('teacher')
      if (idParam) {
        setSelectedEntity(idParam)
      } else if (groupParam && teachers.length > 0) {
        const matched = teachers.find(t => 
          t.name.toLowerCase() === groupParam.toLowerCase() || t.id === groupParam
        )
        if (matched) setSelectedEntity(matched.id)
      } else if (teachers.length > 0 && !selectedEntity) {
        setSelectedEntity(teachers[0].id)
      }
    } else if (viewParam === 'general') {
      setViewMode('general')
      setSelectedEntity(null)
    }
  }, [searchParams, groups, teachers])

  const filteredSlots = useMemo(() => {
    if (viewMode === 'general') return slots
    if (viewMode === 'group' && selectedEntity) return slots.filter(s => s.group_id === selectedEntity)
    if (viewMode === 'teacher' && selectedEntity) return slots.filter(s => s.teacher_id === selectedEntity)
    return []
  }, [slots, viewMode, selectedEntity])

  const slotMap = useMemo(() => {
    const map = new Map<string, Slot>()
    filteredSlots.forEach(s => {
      const key = viewMode === 'general' 
        ? `${s.group_id}-${s.day_of_week}-${s.period_id}`
        : `${s.day_of_week}-${s.period_id}`
      map.set(key, s)
    })
    return map
  }, [filteredSlots, viewMode])

  // Solo los grupos oficiales que están en la Sábana General (con clases asignadas)
  const officialGroups = useMemo(() => {
    return groups.filter(g => {
      if (!isOfficialGradeGroup(g.name)) return false
      return slots.some(s => s.group_id === g.id)
    })
  }, [groups, slots])

  const filteredGroups = officialGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const filteredTeachers = teachers.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))

  // Helpers para el sistema de impresión
  const getPrintClasses = (type: 'group' | 'teacher', entityId: string) => {
    const targetId = String(entityId)
    const entitySlots = slots.filter(s => 
      type === 'group' ? String(s.group_id) === targetId : String(s.teacher_id) === targetId
    )
    return entitySlots.map(s => ({
      id: s.id,
      day: s.day_of_week,
      period: parseInt(String(s.period_id), 10),
      duration: parseInt(String(s.duration || 1), 10) || 1,
      subject: s.subject?.name || 'Clase',
      teacher: s.teacher?.full_name || '',
      group: s.group?.name || '',
      color: getSubjectColor(s.subject?.name)
    }))
  }

  const handleOpenPrintModal = () => {
    const type = viewMode === 'teacher' ? 'teacher' : 'group'
    setPrintType(type)
    setPrintScope('single')
    const list = type === 'group' ? officialGroups : teachers
    if (selectedEntity && list.some(item => item.id === selectedEntity)) {
      setSelectedPrintEntityId(selectedEntity)
    } else {
      setSelectedPrintEntityId(list[0]?.id || '')
    }
    setIsPrintModalOpen(true)
  }

  const handleSwitchPrintType = (newType: 'group' | 'teacher') => {
    setPrintType(newType)
    const list = newType === 'group' ? officialGroups : teachers
    setSelectedPrintEntityId(list[0]?.id || '')
  }

  const handleExecutePrint = () => {
    setIsPrintModalOpen(false)
    setTimeout(() => {
      window.print()
    }, 200)
  }

  const handleConfirmClearSchedule = async () => {
    setIsClearing(true)
    setClearError(null)
    try {
      const res = await clearAllScheduleSlotsAction()
      if (res.success) {
        setSlots([])
        setClearSuccess(true)
      } else {
        setClearError(res.error || 'Ocurrió un error al intentar borrar el horario.')
      }
    } catch (err: any) {
      setClearError(err?.message || 'Error de comunicación con el servidor.')
    } finally {
      setIsClearing(false)
    }
  }

  const handleCloseClearModal = () => {
    if (isClearing) return
    setIsClearModalOpen(false)
    setClearError(null)
    setClearSuccess(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Cargando horario premium...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 p-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl">
            <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Horario Institucional
          </h1>
        </div>

        <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
          <button
            onClick={() => { setViewMode('general'); setSelectedEntity(null); }}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'general' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Sábana General
          </button>
          <button
            onClick={() => { setViewMode('group'); setSelectedEntity(officialGroups[0]?.id || null); }}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${viewMode === 'group' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Users className="h-4 w-4" /> Grupos
          </button>
          <button
            onClick={() => { setViewMode('teacher'); setSelectedEntity(teachers[0]?.id || null); }}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${viewMode === 'teacher' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <User className="h-4 w-4" /> Docentes
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              setClearSuccess(false)
              setClearError(null)
              setIsClearModalOpen(true)
            }}
            disabled={slots.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-xl text-sm font-semibold shadow-xs transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            title={slots.length === 0 ? 'No hay clases asignadas para borrar' : 'Borrar horario actual para cargar un nuevo XML'}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Limpiar Horario</span>
          </button>

          <button
            onClick={handleOpenPrintModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold shadow-xs transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Imprimir horario individual o en lote"
          >
            <Printer className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          <a 
            href="/admin/schedules/import"
            className="flex items-center gap-2 px-3 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Importar aSc XML</span>
            <span className="sm:hidden">Importar</span>
          </a>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden print:hidden">
        {viewMode !== 'general' && (
          <div className="w-40 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={`Buscar...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {(viewMode === 'group' ? filteredGroups : filteredTeachers).map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedEntity(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    selectedEntity === item.id 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`flex-1 min-h-0 ${viewMode === 'general' ? 'overflow-auto' : 'h-full overflow-hidden p-3 flex flex-col'} bg-slate-50 dark:bg-[#0B1120] custom-scrollbar`}>
          {slots.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto mt-20">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                  <Calendar className="h-10 w-10 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Lienzo Vacío</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  No hay ningún bloque de clase registrado en la base de datos para mostrar. Importa tu archivo XML de aSc TimeTables para comenzar.
                </p>
                {errorMsg && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">
                    <strong>Error de DB:</strong> {errorMsg}
                  </div>
                )}
                <a href="/admin/schedules/import" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-transform hover:-translate-y-1 shadow-lg shadow-indigo-500/25">
                  Importar Horario Ahora
                </a>
              </div>
          ) : viewMode === 'general' ? (
            (() => {
              const PERIOD_WIDTH = 125
              const GROUP_COL_WIDTH = 120
              const dayWidth = periods.length * PERIOD_WIDTH
              const totalTableWidth = GROUP_COL_WIDTH + (DAYS.length * dayWidth)

              return (
                <>
                <div 
                  className="hidden md:flex bg-white dark:bg-slate-900 flex-col relative border-b border-slate-300 dark:border-slate-700"
                  style={{ width: `${totalTableWidth}px`, minWidth: `${totalTableWidth}px` }}
                >
                  {/* Header de la Sábana: Inmovilizado verticalmente (sticky top-0) */}
                  <div className="sticky top-0 z-30 flex border-b-4 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
                    {/* Esquina superior izquierda: Inmovilizada tanto en scroll vertical como horizontal */}
                    <div 
                      className="flex-shrink-0 p-3 font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center justify-center border-r-4 border-slate-300 dark:border-slate-700 sticky top-0 left-0 z-40 bg-slate-100 dark:bg-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]"
                      style={{ width: `${GROUP_COL_WIDTH}px`, minWidth: `${GROUP_COL_WIDTH}px`, maxWidth: `${GROUP_COL_WIDTH}px` }}
                    >
                      Grupos
                    </div>
                    
                    <div className="flex flex-shrink-0">
                      {DAYS.map((day, dIdx) => {
                        const dayColor = [
                          'bg-blue-100 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200',
                          'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200',
                          'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200',
                          'bg-purple-100 dark:bg-purple-950/80 text-purple-950 dark:text-purple-200',
                          'bg-rose-100 dark:bg-rose-950/80 text-rose-950 dark:text-rose-200'
                        ][dIdx % 5]

                        return (
                          <div 
                            key={day.id} 
                            className="flex-shrink-0 border-r-4 border-slate-300 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900"
                            style={{ width: `${dayWidth}px`, minWidth: `${dayWidth}px`, maxWidth: `${dayWidth}px` }}
                          >
                            <div className={`p-2 text-center font-black text-sm border-b-2 border-slate-300/70 dark:border-slate-700/70 uppercase tracking-widest ${dayColor}`}>
                              {day.name}
                            </div>
                            <div className="flex flex-shrink-0 bg-slate-50 dark:bg-slate-900">
                              {periods.map(p => (
                                <div 
                                  key={p} 
                                  className="flex-shrink-0 py-1.5 px-1 text-center flex flex-col items-center justify-center border-r border-slate-300/80 dark:border-slate-700/80 last:border-r-0"
                                  style={{ width: `${PERIOD_WIDTH}px`, minWidth: `${PERIOD_WIDTH}px`, maxWidth: `${PERIOD_WIDTH}px` }}
                                >
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{p}ª</span>
                                  {periodTimes[p] && (
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                      {periodTimes[p]}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col divide-y-2 divide-slate-200 dark:divide-slate-800">
                    {officialGroups.map((group) => {
                      const hasSlots = periods.some(p => DAYS.some(d => slotMap.has(`${group.id}-${d.id}-${p}`)))
                      if (!hasSlots) return null

                      return (
                        <div key={group.id} className="flex hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors bg-white dark:bg-slate-900">
                          {/* Columna de grupo: Fija horizontalmente (sticky left-0), se mueve libremente en scroll vertical */}
                          <div 
                            className="flex-shrink-0 p-3 font-black text-slate-800 dark:text-slate-100 border-r-4 border-slate-300 dark:border-slate-700 flex items-center justify-center text-sm sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]"
                            style={{ width: `${GROUP_COL_WIDTH}px`, minWidth: `${GROUP_COL_WIDTH}px`, maxWidth: `${GROUP_COL_WIDTH}px` }}
                          >
                            {group.name}
                          </div>
                          
                          <div className="flex flex-shrink-0">
                            {DAYS.map((day, dIdx) => {
                              let skipUntil = 0;
                              const dayColor = [
                                'bg-blue-50/20 dark:bg-blue-900/5',
                                'bg-emerald-50/20 dark:bg-emerald-900/5',
                                'bg-amber-50/20 dark:bg-amber-900/5',
                                'bg-purple-50/20 dark:bg-purple-900/5',
                                'bg-rose-50/20 dark:bg-rose-900/5'
                              ][dIdx % 5]

                              return (
                                <div 
                                  key={day.id} 
                                  className={`flex-shrink-0 flex border-r-4 border-slate-300 dark:border-slate-700 ${dayColor}`}
                                  style={{ width: `${dayWidth}px`, minWidth: `${dayWidth}px`, maxWidth: `${dayWidth}px` }}
                                >
                                  {periods.map(period => {
                                    if (period < skipUntil) return null;
                                    
                                    const slot = slotMap.get(`${group.id}-${day.id}-${period}`)
                                    let span = 1;

                                    if (slot) {
                                      for (let i = period + 1; i <= periods.length; i++) {
                                        const nextSlot = slotMap.get(`${group.id}-${day.id}-${i}`)
                                        if (nextSlot && nextSlot.subject_id === slot.subject_id && nextSlot.teacher_id === slot.teacher_id) {
                                          span++;
                                        } else {
                                          break;
                                        }
                                      }
                                      if (span > 1) skipUntil = period + span;
                                    }

                                    const slotWidth = span * PERIOD_WIDTH

                                    return (
                                      <div 
                                        key={period} 
                                        className="flex-shrink-0 p-1 min-h-[75px] border-r border-slate-200/60 dark:border-slate-700/60 last:border-r-0" 
                                        style={{ width: `${slotWidth}px`, minWidth: `${slotWidth}px`, maxWidth: `${slotWidth}px` }}
                                      >
                                        {slot && (
                                          <div className="h-full w-full rounded-md bg-white/90 dark:bg-slate-800/90 border border-slate-300/60 dark:border-slate-600/50 p-1.5 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow cursor-default overflow-hidden relative">
                                            {span > 1 && (
                                              <div className="absolute right-1 bottom-1 text-[8px] font-bold text-slate-400 opacity-70">
                                                {span} H
                                              </div>
                                            )}
                                            <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight" title={slot.subject?.name}>
                                              {slot.subject?.name}
                                            </div>
                                            {slot.teacher?.full_name ? (
                                              <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium" title={slot.teacher.full_name}>
                                                {slot.teacher.full_name.split(' ').slice(0, 2).join(' ')}
                                              </div>
                                            ) : (
                                              <div className="mt-0.5">
                                                <span className="inline-block px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-[8px] uppercase tracking-wider">
                                                  Trab. Autónomo
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="block md:hidden flex-1 w-full bg-white dark:bg-slate-900">
                  <MobilePremiumScheduleView
                    groups={officialGroups}
                    teachers={teachers}
                    slots={slots}
                    periods={periods}
                    periodTimes={periodTimes}
                    getSubjectColor={getSubjectColor}
                  />
                </div>
                </>
              )
            })()
          ) : selectedEntity ? (
            /* Vista individual de Grupos o Docentes: Únicamente StaticScheduleGrid con ajuste perfecto 100% sin scroll */
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-full w-full flex-1 min-h-0 flex flex-col relative">
              <StaticScheduleGrid 
                entityType={viewMode}
                entityId={selectedEntity}
                entityName={viewMode === 'group' ? officialGroups.find(g => g.id === selectedEntity)?.name : teachers.find(t => t.id === selectedEntity)?.name}
                disablePrint={true}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 mt-20">
              <Users className="h-12 w-12 mb-2 stroke-1" />
              <p>Selecciona un {viewMode === 'group' ? 'grupo' : 'docente'} de la lista para ver su horario.</p>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor oficial para impresión (oculto en pantalla, se activa con window.print()) */}
      <div className="hidden print:block w-full">
        {printScope === 'single' ? (
          (() => {
            const entity = (printType === 'group' ? officialGroups : teachers).find(e => e.id === selectedPrintEntityId)
            if (!entity) return null
            return (
              <PrintableSchedule
                groupName={entity.name}
                isTeacherView={printType === 'teacher'}
                classes={getPrintClasses(printType, entity.id)}
                timeSlots={timeSlotsList}
                groupMax={periods.length}
              />
            )
          })()
        ) : (
          (printType === 'group' ? officialGroups : teachers).map((entity) => {
            const entityClasses = getPrintClasses(printType, entity.id)
            if (entityClasses.length === 0) return null
            return (
              <div key={entity.id} className="w-full">
                <PrintableSchedule
                  groupName={entity.name}
                  isTeacherView={printType === 'teacher'}
                  classes={entityClasses}
                  timeSlots={timeSlotsList}
                  groupMax={periods.length}
                />
              </div>
            )
          })
        )}
      </div>

      {/* Modal de Configuración y Confirmación de Impresión */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Imprimir Horarios
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Formato oficial institucional A4 apaisado
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tipo de Horario
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleSwitchPrintType('group')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      printType === 'group'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Por Grupo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchPrintType('teacher')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      printType === 'teacher'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Por Docente
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Alcance
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPrintScope('single')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      printScope === 'single'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Uno solo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintScope('all')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      printScope === 'all'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Todos en lote
                  </button>
                </div>
              </div>

              {printScope === 'single' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Seleccionar {printType === 'group' ? 'Grupo' : 'Docente'}
                  </label>
                  <select
                    value={selectedPrintEntityId}
                    onChange={(e) => setSelectedPrintEntityId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {(printType === 'group' ? officialGroups : teachers).map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Layers className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Se generará el reporte para los <strong>{(printType === 'group' ? officialGroups : teachers).length} {printType === 'group' ? 'grupos' : 'docentes'}</strong> (1 hoja A4 individual por cada uno).
                  </span>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecutePrint}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/25 transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                {printScope === 'single' ? 'Imprimir Horario' : 'Imprimir Todos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación y Limpieza de Horario */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${clearSuccess ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                  {clearSuccess ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {clearSuccess ? 'Horario Limpiado con Éxito' : '¿Borrar Horario Actual?'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {clearSuccess ? 'Listo para importar una nueva versión' : 'Acción administrativa de reinicio'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseClearModal}
                disabled={isClearing}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              {clearSuccess ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                    <p className="font-semibold text-sm mb-1">Se han borrado las clases semanales.</p>
                    <p>
                      El lienzo de horarios ha quedado completamente limpio. Los grupos, docentes y asignaturas se conservan en la base de datos para asociarse automáticamente con el nuevo archivo XML.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Estás a punto de eliminar todas las clases asignadas en el sistema (<strong className="text-rose-600 dark:text-rose-400">{slots.length} clases semanales</strong>).
                  </p>

                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-semibold">Datos protegidos que se conservan:</p>
                      <p className="mt-0.5 text-emerald-700 dark:text-emerald-400">
                        Grupos oficiales, directores de grupo, cuentas de profesores, calificaciones y catálogo de materias se mantienen intactos.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <span>
                      Hasta que importes el nuevo XML, la consulta de horarios para estudiantes y docentes indicará que no hay clases programadas.
                    </span>
                  </div>

                  {clearError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                      {clearError}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              {clearSuccess ? (
                <>
                  <button
                    type="button"
                    onClick={handleCloseClearModal}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <a
                    href="/admin/schedules/import"
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/25 transition-all hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    Subir nuevo XML ahora
                  </a>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCloseClearModal}
                    disabled={isClearing}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClearSchedule}
                    disabled={isClearing}
                    className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/25 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClearing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Borrando horario...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Sí, borrar horario</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}} />
    </div>
  )
}
