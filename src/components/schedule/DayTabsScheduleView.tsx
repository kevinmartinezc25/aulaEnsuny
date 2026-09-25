'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Calendar, 
  CalendarX2, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  Sparkles,
  Coffee
} from 'lucide-react'

// ==========================================
// TIPOS Y MODELO DE DATOS
// ==========================================

export type ScheduleStatus = 'scheduled' | 'cancelled' | 'in_progress' | 'completed' | 'free'

export interface ScheduleItem {
  id: string
  startTime: string // "07:00" o "07:00 AM"
  endTime: string   // "08:00" o "08:00 AM"
  subject: string
  teacher?: string
  location?: string
  group?: string
  period?: number
  status?: ScheduleStatus
  color?: string
  isFree?: boolean
  isNovedad?: boolean
}

export type ScheduleDayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'

export interface DayTabConfig {
  key: ScheduleDayKey
  label: string
  shortLabel: string
}

export const DEFAULT_DAYS: DayTabConfig[] = [
  { key: 'lunes', label: 'Lunes', shortLabel: 'LUN' },
  { key: 'martes', label: 'Martes', shortLabel: 'MAR' },
  { key: 'miercoles', label: 'Miércoles', shortLabel: 'MIÉ' },
  { key: 'jueves', label: 'Jueves', shortLabel: 'JUE' },
  { key: 'viernes', label: 'Viernes', shortLabel: 'VIE' },
]

export interface ScheduleData {
  [key: string]: ScheduleItem[]
}

export interface ScheduleContextInfo {
  title?: string            // Ej: "Mi horario"
  subtitle?: string         // Ej: "10°-1 · Jornada mañana" o "Prof. Juan Pérez · Docente"
  type: 'student' | 'teacher' | 'group'
}

export interface DayTabsScheduleViewProps {
  schedule?: ScheduleData
  context?: ScheduleContextInfo
  days?: DayTabConfig[]
  isLoading?: boolean
  error?: string | null
  isPublished?: boolean
  defaultDayKey?: ScheduleDayKey
  onClassClick?: (item: ScheduleItem) => void
  className?: string
  hideGroupBadge?: boolean
}

// ==========================================
// UTILIDADES INTERNAS (TIEMPO Y COMPARACIÓN)
// ==========================================

/**
 * Convierte un string de hora (ej: "07:00", "07:00 AM", "14:30") a minutos desde medianoche
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const clean = timeStr.trim().toUpperCase()
  const isPM = clean.includes('PM')
  const isAM = clean.includes('AM')
  
  const timeOnly = clean.replace(/[AP]M/, '').trim()
  const [hStr, mStr] = timeOnly.split(':')
  let hours = parseInt(hStr, 10) || 0
  const minutes = parseInt(mStr, 10) || 0

  if (isPM && hours < 12) hours += 12
  if (isAM && hours === 12) hours = 0

  return hours * 60 + minutes
}

/**
 * Determina si la clase está ocurriendo actualmente
 */
function isClassOngoing(item: ScheduleItem, isToday: boolean, currentMinutes: number): boolean {
  if (!isToday) return false
  const startMin = parseTimeToMinutes(item.startTime)
  let endMin = parseTimeToMinutes(item.endTime)
  if (startMin === 0 && endMin === 0) return false
  if (endMin <= startMin) {
    endMin = startMin + 55
  }
  return currentMinutes >= startMin && currentMinutes < endMin
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function DayTabsScheduleView({
  schedule = {},
  context = { title: 'Mi horario', subtitle: 'Jornada escolar', type: 'student' },
  days = DEFAULT_DAYS,
  isLoading = false,
  error = null,
  isPublished = true,
  defaultDayKey,
  onClassClick,
  className = '',
  hideGroupBadge = false
}: DayTabsScheduleViewProps) {
  // Detección exacta del día actual en la zona horaria institucional (America/Bogota)
  const todayKey = useMemo<ScheduleDayKey | null>(() => {
    try {
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota',
        weekday: 'short'
      }).format(new Date())

      const map: Record<string, ScheduleDayKey> = {
        Mon: 'lunes',
        Tue: 'martes',
        Wed: 'miercoles',
        Thu: 'jueves',
        Fri: 'viernes',
        Sat: 'sabado'
      }

      // Si es domingo ('Sun'), no hay jornada escolar ordinaria hoy, retorna null
      return map[weekday] || null
    } catch {
      const dayIndex = new Date().getDay()
      const map: Record<number, ScheduleDayKey> = {
        1: 'lunes',
        2: 'martes',
        3: 'miercoles',
        4: 'jueves',
        5: 'viernes',
        6: 'sabado'
      }
      return map[dayIndex] || null
    }
  }, [])

  // Día activo inicial: Si hoy es lunes a viernes abre en el día actual; en fin de semana abre en 'lunes'
  const [activeDay, setActiveDay] = useState<ScheduleDayKey>(() => {
    if (defaultDayKey) return defaultDayKey
    if (todayKey && todayKey !== 'sabado') return todayKey
    return 'lunes'
  })

  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    try {
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date())
      const [h, m] = timeStr.split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    } catch {
      const now = new Date()
      return now.getHours() * 60 + now.getMinutes()
    }
  })

  const tabsScrollRef = useRef<HTMLDivElement>(null)

  // Actualizar minutos cada minuto para el cálculo de clase en curso
  useEffect(() => {
    const update = () => {
      try {
        const timeStr = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Bogota',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(new Date())
        const [h, m] = timeStr.split(':').map(Number)
        setCurrentMinutes((h || 0) * 60 + (m || 0))
      } catch {
        const now = new Date()
        setCurrentMinutes(now.getHours() * 60 + now.getMinutes())
      }
    }
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [])

  // Auto-scroll para centrar la pestaña activa en pantallas pequeñas
  const handleDaySelect = (key: ScheduleDayKey) => {
    setActiveDay(key)
  }

  // Clases del día seleccionado, ordenadas cronológicamente
  const dayClasses = useMemo(() => {
    const raw = schedule[activeDay] || []
    return [...raw].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))
  }, [schedule, activeDay])

  const isSelectedDayToday = todayKey !== null && activeDay === todayKey

  // ==========================================
  // RENDERIZADO DE ESTADOS ESPECIALES
  // ==========================================

  if (isLoading) {
    return (
      <div className={`w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm ${className}`}>
        {/* Header Skeleton */}
        <div className="space-y-2 mb-6">
          <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800/60 rounded-md animate-pulse" />
        </div>
        {/* Tabs Skeleton */}
        <div className="flex gap-2 mb-6 pb-2 overflow-x-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 animate-pulse" />
          ))}
        </div>
        {/* Cards Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`w-full max-w-4xl mx-auto p-6 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/40 text-center ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 mx-auto flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Error al cargar el horario</h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">{error}</p>
      </div>
    )
  }

  if (!isPublished) {
    return (
      <div className={`w-full max-w-4xl mx-auto p-8 sm:p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center ${className}`}>
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 mx-auto flex items-center justify-center mb-3">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Horario aún no publicado</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          La institución educativa está finalizando la asignación de este período. Estará disponible en breve.
        </p>
      </div>
    )
  }

  // ==========================================
  // RENDERIZADO PRINCIPAL
  // ==========================================

  return (
    <div className={`w-full max-w-4xl mx-auto bg-slate-50/50 dark:bg-slate-950/40 sm:bg-white sm:dark:bg-slate-900 sm:border border-slate-200/80 dark:border-slate-800 sm:rounded-3xl sm:shadow-sm p-1 sm:p-6 lg:p-8 transition-colors ${className}`}>
      
      {/* ── 1. HEADER CONTEXTUAL ── */}
      <header className="mb-4 sm:mb-6 px-1 sm:px-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {context.title || 'Mi horario'}
            </h1>
            {context.subtitle && (
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {context.subtitle}
              </p>
            )}
          </div>
          {isSelectedDayToday && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Hoy, {new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date())}
            </span>
          )}
        </div>
      </header>

      {/* ── 2. TOP TABS — NAVEGACIÓN POR DÍAS (5 Días visibles sin scroll horizontal) ── */}
      <nav 
        role="tablist" 
        aria-label="Días de la semana"
        className={`grid ${days.length === 6 ? 'grid-cols-6' : 'grid-cols-5'} gap-1 sm:gap-1.5 w-full max-w-full overflow-hidden pb-2.5 pt-1 border-b border-slate-100 dark:border-slate-800/80 mb-5`}
      >
        {days.map(d => {
          const isActive = activeDay === d.key

          return (
            <button
              key={d.key}
              role="tab"
              id={`tab-${d.key}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${d.key}`}
              onClick={() => handleDaySelect(d.key)}
              className={`group relative min-w-0 w-full flex items-center justify-center py-2 sm:py-2.5 px-0.5 sm:px-2 rounded-xl sm:rounded-2xl font-bold transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 overflow-hidden ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="hidden sm:inline text-xs sm:text-sm font-black tracking-tight truncate max-w-full">
                {d.label}
              </span>
              <span className="sm:hidden text-xs font-black uppercase tracking-tight truncate">
                {d.shortLabel || d.label.substring(0, 3)}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ── 3. LISTADO CRONOLÓGICO DE CLASES / ESTADO VACÍO ── */}
      <main 
        role="tabpanel" 
        id={`tabpanel-${activeDay}`} 
        aria-labelledby={`tab-${activeDay}`}
        className="space-y-3 focus:outline-none"
      >
        {dayClasses.length === 0 ? (
          /* ESTADO DÍA SIN CLASES */
          <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
              <CalendarX2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              No hay clases programadas
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
              No tienes asignaciones de horario para este día.
            </p>
          </div>
        ) : (
          /* TARJETAS DE CLASES Y HUECOS */
          dayClasses.map((item, index) => {
            const isOngoing = isClassOngoing(item, isSelectedDayToday, currentMinutes)
            const hourLabel = item.period ? `${item.period}ª Hora` : `${index + 1}ª Hora`

            // CARD VACÍA / HUECO: Período sin clase asignada (Verde Pastel)
            if (item.isFree) {
              return (
                <article
                  key={item.id}
                  className={`relative group rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md cursor-default ${
                    isOngoing
                      ? 'bg-gradient-to-r from-emerald-100/95 via-emerald-50/95 to-emerald-100/90 dark:from-emerald-950/85 dark:via-emerald-900/50 dark:to-emerald-950/70 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/30 shadow-md'
                      : 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-800/60'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex items-center justify-between gap-3 min-h-[110px]">
                    <div className="flex-1 flex flex-col justify-between gap-2 min-w-0">
                      {/* Fila Superior: Badge Hora + Rango Horario + Estado */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tight shrink-0 shadow-xs ${
                          isOngoing
                            ? 'bg-emerald-600 text-white border border-emerald-700'
                            : 'bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-700/60'
                        }`}>
                          {hourLabel}
                        </span>

                        <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold ${
                          isOngoing ? 'text-emerald-900 dark:text-emerald-200' : 'text-emerald-700/80 dark:text-emerald-400/80'
                        }`}>
                          <Clock className={`w-3.5 h-3.5 shrink-0 ${isOngoing ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600/70 dark:text-emerald-400/70'}`} />
                          <span>{item.startTime}{item.endTime ? ` – ${item.endTime}` : ''}</span>
                        </div>

                        {isOngoing && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white border border-emerald-700 shadow-xs animate-pulse">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                            </span>
                            Hora Libre Actual
                          </span>
                        )}
                      </div>

                      {/* Título: Sin clase Asignada */}
                      <h2 className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-100 leading-snug tracking-tight truncate">
                        Sin clase Asignada
                      </h2>

                      {/* Subtítulo informativo */}
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-200 pt-0.5">
                        <Coffee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold">Disponibilidad / Tiempo Libre</span>
                      </div>
                    </div>

                    {/* Badge derecho */}
                    <div className={`shrink-0 flex flex-col items-center justify-center px-3.5 py-2 rounded-2xl shadow-xs min-w-[76px] ${
                      isOngoing
                        ? 'bg-emerald-600 text-white border border-emerald-700 shadow-md'
                        : 'bg-emerald-100/80 dark:bg-emerald-900/40 border border-emerald-200/80 dark:border-emerald-800/60'
                    }`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${
                        isOngoing ? 'text-emerald-100' : 'text-emerald-700/80 dark:text-emerald-300/80'
                      }`}>
                        {isOngoing ? 'Actual' : 'Estado'}
                      </span>
                      <span className={`text-base sm:text-lg font-black leading-tight mt-1 tracking-tight ${
                        isOngoing ? 'text-white' : 'text-emerald-800 dark:text-emerald-200'
                      }`}>
                        Libre
                      </span>
                    </div>
                  </div>
                </article>
              )
            }

            // CARD DE MATERIA ASIGNADA
            return (
              <article
                key={item.id}
                onClick={() => onClassClick && onClassClick(item)}
                tabIndex={0}
                className={`relative group rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md cursor-default ${
                  isOngoing 
                    ? 'bg-gradient-to-r from-emerald-100/90 via-emerald-50/95 to-emerald-100/80 dark:from-emerald-950/85 dark:via-emerald-900/50 dark:to-emerald-950/70 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/30 shadow-md' 
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="p-4 sm:p-5 flex items-center justify-between gap-3 min-h-[110px]">
                  <div className="flex-1 flex flex-col justify-between gap-2 min-w-0">
                    {/* Fila Superior: Badge Hora + Rango Horario + Badge Estado + Badge Novedad */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tight shrink-0 shadow-xs ${
                        isOngoing
                          ? 'bg-emerald-600 text-white border border-emerald-700'
                          : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70'
                      }`}>
                        {hourLabel}
                      </span>
                      
                      <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold ${
                        isOngoing ? 'text-emerald-900 dark:text-emerald-200 font-extrabold' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        <Clock className={`w-3.5 h-3.5 shrink-0 ${isOngoing ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                        <span>{item.startTime}{item.endTime ? ` – ${item.endTime}` : ''}</span>
                      </div>

                      {item.isNovedad && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60 ml-2">
                          <AlertCircle className="w-3 h-3" /> Horario Novedad
                        </span>
                      )}

                      {isOngoing && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white border border-emerald-700 shadow-xs animate-pulse">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                          </span>
                          Hora en Curso
                        </span>
                      )}
                    </div>

                    {/* Materia (Elemento dominante) */}
                    <h2 className={`text-base sm:text-lg font-black leading-snug tracking-tight text-center break-words whitespace-normal w-full ${
                      isOngoing ? 'text-emerald-950 dark:text-emerald-50' : 'text-slate-900 dark:text-white'
                    }`}>
                      {item.subject}
                    </h2>

                    {/* Fila Inferior: Información Secundaria (Aula, Docente) */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                      {item.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isOngoing ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                          <span className={`font-semibold ${isOngoing ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>{item.location}</span>
                        </div>
                      )}

                      {/* Según el contexto: mostramos docente (para estudiante o grupo) */}
                      {context.type === 'student' && item.teacher && (
                        <div className="flex items-center gap-1.5">
                          <User className={`w-3.5 h-3.5 shrink-0 ${isOngoing ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                          <span className={isOngoing ? 'text-emerald-900 dark:text-emerald-200 font-semibold' : ''}>Prof. {item.teacher}</span>
                        </div>
                      )}

                      {context.type === 'group' && item.teacher && (
                        <div className="flex items-center gap-1.5">
                          <User className={`w-3.5 h-3.5 shrink-0 ${isOngoing ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                          <span className={isOngoing ? 'text-emerald-900 dark:text-emerald-200 font-semibold' : ''}>{item.teacher}</span>
                        </div>
                      )}

                      {!item.location && !item.teacher && (
                        <span className={`font-medium ${isOngoing ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'}`}>Clase Programada</span>
                      )}
                    </div>
                  </div>

                  {/* A la derecha: Badge del Grupo o Jornada / Actual */}
                  {hideGroupBadge && context.type === 'student' ? (
                    <div className={`shrink-0 flex flex-col items-center justify-center px-3.5 py-2 rounded-2xl shadow-xs min-w-[76px] ${
                      isOngoing
                        ? 'bg-emerald-600 text-white border border-emerald-700 shadow-md'
                        : 'bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/20 dark:border-emerald-800/40'
                    }`}>
                      <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                        isOngoing ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {isOngoing ? 'En Curso' : 'Jornada'}
                      </span>
                      <span className={`text-xs sm:text-sm font-black leading-tight mt-1 tracking-tight whitespace-nowrap ${
                        isOngoing ? 'text-white' : 'text-[#1F4E31] dark:text-emerald-300'
                      }`}>
                        {hourLabel}
                      </span>
                    </div>
                  ) : !hideGroupBadge && context.type !== 'group' && Boolean(item.group) && item.group !== 'Jornada Institucional' ? (
                    <div className={`shrink-0 flex flex-col items-center justify-center px-3 sm:px-3.5 py-2 rounded-2xl shadow-xs min-w-[76px] max-w-[45%] sm:max-w-[35%] ${
                      isOngoing
                        ? 'bg-emerald-600 text-white border border-emerald-700 shadow-md'
                        : 'bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60'
                    }`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 ${
                        isOngoing ? 'text-emerald-100' : 'text-indigo-400 dark:text-indigo-400'
                      }`}>
                        {isOngoing ? 'En Curso' : 'Grupo'}
                      </span>
                      <span className={`font-black leading-tight tracking-tight text-center break-words whitespace-normal w-full ${(item.group?.length || 0) > 8 ? 'text-xs sm:text-sm' : 'text-xl sm:text-2xl'} ${
                        isOngoing ? 'text-white' : 'text-indigo-700 dark:text-indigo-300'
                      }`}>
                        {item.group}
                      </span>
                    </div>
                  ) : isOngoing ? (
                    <div className="shrink-0 flex flex-col items-center justify-center px-3.5 py-2 rounded-2xl bg-emerald-600 text-white border border-emerald-700 shadow-md min-w-[76px]">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100 leading-none mb-1">
                        Actual
                      </span>
                      <span className="text-xs sm:text-sm font-black text-white leading-tight mt-0.5 tracking-tight whitespace-nowrap">
                        {hourLabel}
                      </span>
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })
        )}
      </main>
    </div>
  )
}
