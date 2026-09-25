'use client'

import React, { useState, useEffect } from 'react'
import { 
  Settings2, 
  Eye, 
  Clock, 
  Palette, 
  Save, 
  LayoutGrid, 
  Plus, 
  Trash2, 
  Wand2, 
  Coffee, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  getGeneralSchedulePeriodsAction, 
  saveGeneralSchedulePeriodsAction 
} from '../actions'
import { PeriodTimeConfig } from '../utils/timeCalculator'

interface ScheduleSettings {
  showWeekends: boolean;
  themeColor: string;
  timeFormat: '12h' | '24h';
  density: 'compact' | 'relaxed';
  showClassrooms: boolean;
  hideEmptyPeriods: boolean;
}

const defaultSettings: ScheduleSettings = {
  showWeekends: false,
  themeColor: 'emerald',
  timeFormat: '12h',
  density: 'relaxed',
  showClassrooms: false,
  hideEmptyPeriods: false
}

const defaultPeriodTimes: PeriodTimeConfig[] = [
  { period: 1, name: '1ra Hora', startTime: '07:00', endTime: '07:55' },
  { period: 2, name: '2da Hora', startTime: '07:55', endTime: '08:50' },
  { period: 3, name: '3ra Hora', startTime: '09:10', endTime: '10:05' },
  { period: 4, name: '4ta Hora', startTime: '10:05', endTime: '11:00' },
  { period: 5, name: '5ta Hora', startTime: '11:10', endTime: '12:05' },
  { period: 6, name: '6ta Hora', startTime: '12:05', endTime: '13:00' },
  { period: 7, name: '7ma Hora', startTime: '13:00', endTime: '14:00' }
]

function getMinutesDiff(start: string, end: string): number {
  if (!start || !end) return 0
  const [h1, m1] = start.split(':').map(Number)
  const [h2, m2] = end.split(':').map(Number)
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0
  return (h2 * 60 + m2) - (h1 * 60 + m1)
}

function addMinutesToTime(timeStr: string, minsToAdd: number): string {
  const [hStr, mStr] = (timeStr || '07:00').split(':')
  let h = parseInt(hStr, 10) || 7
  let m = parseInt(mStr, 10) || 0
  const total = h * 60 + m + minsToAdd
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
}

function formatTimePreview(timeStr: string, use12h: boolean): string {
  if (!timeStr) return '--:--'
  if (!use12h) return timeStr
  const [hStr, mStr] = timeStr.split(':')
  let h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return timeStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  h = h ? h : 12
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<ScheduleSettings>(defaultSettings)
  const [periods, setPeriods] = useState<PeriodTimeConfig[]>(defaultPeriodTimes)
  const [isLoaded, setIsLoaded] = useState(false)

  // Asistente rápido de autocalculado
  const [showQuickAssistant, setShowQuickAssistant] = useState(false)
  const [bulkStart, setBulkStart] = useState('07:00')
  const [bulkDuration, setBulkDuration] = useState(55)
  const [bulkCount, setBulkCount] = useState(7)
  const [bulkBreak1After, setBulkBreak1After] = useState(2)
  const [bulkBreak1Mins, setBulkBreak1Mins] = useState(20)
  const [bulkBreak2After, setBulkBreak2After] = useState(4)
  const [bulkBreak2Mins, setBulkBreak2Mins] = useState(10)

  useEffect(() => {
    async function loadData() {
      try {
        let loadedPeriods: PeriodTimeConfig[] | null = null

        // 1. Intentar cargar desde localStorage primero para rapidez
        const stored = localStorage.getItem('sch_settings')
        if (stored) {
          const parsed = JSON.parse(stored)
          setSettings({
            showWeekends: parsed.showWeekends ?? defaultSettings.showWeekends,
            themeColor: parsed.themeColor || defaultSettings.themeColor,
            timeFormat: parsed.timeFormat || defaultSettings.timeFormat,
            density: parsed.density || defaultSettings.density,
            showClassrooms: parsed.showClassrooms ?? defaultSettings.showClassrooms,
            hideEmptyPeriods: parsed.hideEmptyPeriods ?? defaultSettings.hideEmptyPeriods
          })
          if (Array.isArray(parsed.customPeriods) && parsed.customPeriods.length > 0) {
            loadedPeriods = parsed.customPeriods
          }
        }

        // 2. Sincronizar desde la base de datos institucional
        const res = await getGeneralSchedulePeriodsAction()
        if (res.success && res.config) {
          if (res.config.periods && res.config.periods.length > 0) {
            loadedPeriods = res.config.periods
          }
          if (res.config.visualSettings) {
            setSettings({
              showWeekends: res.config.visualSettings.showWeekends ?? defaultSettings.showWeekends,
              themeColor: res.config.visualSettings.themeColor || defaultSettings.themeColor,
              timeFormat: res.config.visualSettings.timeFormat || defaultSettings.timeFormat,
              density: res.config.visualSettings.density || defaultSettings.density,
              showClassrooms: res.config.visualSettings.showClassrooms ?? defaultSettings.showClassrooms,
              hideEmptyPeriods: res.config.visualSettings.hideEmptyPeriods ?? defaultSettings.hideEmptyPeriods
            })
          }
        }

        if (loadedPeriods && loadedPeriods.length > 0) {
          setPeriods(loadedPeriods)
        } else {
          setPeriods(defaultPeriodTimes)
        }
      } catch (e) {
        console.error('Error cargando configuración:', e)
      } finally {
        setIsLoaded(true)
      }
    }

    loadData()
  }, [])

  // Modificar inicio, fin o nombre de un periodo
  const handlePeriodChange = (index: number, field: keyof PeriodTimeConfig, value: any) => {
    const updated = [...periods]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setPeriods(updated)
  }

  // Añadir una nueva hora
  const handleAddPeriod = () => {
    const nextNum = periods.length + 1
    const lastPeriod = periods[periods.length - 1]
    const startTime = lastPeriod?.endTime || '07:00'
    const duration = lastPeriod ? getMinutesDiff(lastPeriod.startTime, lastPeriod.endTime) || 55 : 55
    const endTime = addMinutesToTime(startTime, duration)

    const newPeriod: PeriodTimeConfig = {
      period: nextNum,
      name: `${nextNum}ª Hora`,
      startTime,
      endTime
    }
    setPeriods([...periods, newPeriod])
  }

  // Eliminar una hora
  const handleRemovePeriod = (index: number) => {
    if (periods.length <= 1) {
      toast.error('Debe existir al menos 1 hora configurada en el horario general.')
      return
    }
    const filtered = periods.filter((_, i) => i !== index)
    // Reindexar periodos correlativamente
    const reindexed = filtered.map((p, i) => ({
      ...p,
      period: i + 1,
      name: p.name.includes('Hora') ? `${i + 1}ª Hora` : p.name
    }))
    setPeriods(reindexed)
  }

  // Aplicar autocalculado masivo
  const handleApplyQuickBulk = () => {
    if (bulkCount < 1 || bulkCount > 15) {
      toast.error('El número de horas debe estar entre 1 y 15.')
      return
    }

    let currentTime = bulkStart
    const generated: PeriodTimeConfig[] = []

    for (let p = 1; p <= bulkCount; p++) {
      const pStart = currentTime
      const pEnd = addMinutesToTime(pStart, bulkDuration)

      generated.push({
        period: p,
        name: `${p}ª Hora`,
        startTime: pStart,
        endTime: pEnd
      })

      currentTime = pEnd

      // Aplicar descansos si corresponde
      if (bulkBreak1After === p && bulkBreak1Mins > 0) {
        currentTime = addMinutesToTime(currentTime, bulkBreak1Mins)
      } else if (bulkBreak2After === p && bulkBreak2Mins > 0) {
        currentTime = addMinutesToTime(currentTime, bulkBreak2Mins)
      }
    }

    setPeriods(generated)
    setShowQuickAssistant(false)
    toast.success(`${bulkCount} horas generadas correctamente. Recuerda guardar los cambios.`)
  }

  // Restaurar valores por defecto institucionales
  const handleResetDefaults = () => {
    setPeriods(defaultPeriodTimes)
    toast.info('Se han cargado las franjas horarias por defecto (07:00 a 14:00).')
  }

  const handleSave = async () => {
    // Validaciones
    for (const p of periods) {
      if (!p.startTime || !p.endTime) {
        toast.error(`La ${p.name || `Hora ${p.period}`} tiene campos de hora incompletos.`)
        return
      }
      const diff = getMinutesDiff(p.startTime, p.endTime)
      if (diff <= 0) {
        toast.error(`En la ${p.name || `Hora ${p.period}`}, la hora de fin debe ser posterior a la de inicio.`)
        return
      }
    }

    setIsSaving(true)
    try {
      const stored = localStorage.getItem('sch_settings')
      let existingSettings = stored ? JSON.parse(stored) : {}

      const startHour = periods[0]?.startTime || '07:00'
      const blockDuration = getMinutesDiff(periods[0]?.startTime, periods[0]?.endTime) || 55
      const periodsPerDay = periods.length

      const newSettings = {
        ...existingSettings,
        ...settings,
        customPeriods: periods,
        startHour,
        blockDuration,
        periodsPerDay
      }

      // Guardar en localStorage
      localStorage.setItem('sch_settings', JSON.stringify(newSettings))

      // Guardar en la base de datos institucional (sch_constraints)
      const res = await saveGeneralSchedulePeriodsAction({
        periods,
        startHour,
        blockDuration,
        periodsPerDay,
        visualSettings: settings
      })

      if (!res.success) {
        console.warn('Aviso al persistir en DB:', res.error)
      }

      toast.success('Ajustes y franjas horarias guardados correctamente. Se actualizarán todas las vistas de horario.')
    } catch (e: any) {
      console.error(e)
      toast.error('Error al guardar los ajustes.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isLoaded) return null

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-[#1F4E31] dark:text-emerald-500" />
            Ajustes del Horario General
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configura los rangos de inicio/fin de cada hora de clase y la apariencia visual de las grillas de horario.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1F4E31] dark:bg-emerald-600 text-white rounded-xl font-bold hover:bg-[#153622] dark:hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-md whitespace-nowrap"
        >
          {isSaving ? 'Guardando...' : <><Save className="h-4 w-4" /> Guardar Cambios</>}
        </button>
      </div>

      {/* SECCIÓN PRINCIPAL: FRANJAS HORARIAS DEL HORARIO GENERAL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 mt-0.5">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Horas de Clase (Inicio y Fin de Periodos)
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#1F4E31] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {periods.length} {periods.length === 1 ? 'Hora' : 'Horas'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Define a qué hora exacta inicia y termina cada bloque de clase del horario institucional.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowQuickAssistant(!showQuickAssistant)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Wand2 className="h-3.5 w-3.5 text-amber-500" />
              Asistente Rápido
              {showQuickAssistant ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Restaurar a 07:00 a 14:00"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Estándar
            </button>
          </div>
        </div>

        {/* Panel Colapsable de Asistente Rápido */}
        {showQuickAssistant && (
          <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-800/60 space-y-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              Generador Masivo de Horas
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Autocalcula los horarios de todas las horas especificando la hora de inicio, la duración uniforme y los descansos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Inicio 1ª Hora
                </label>
                <input
                  type="time"
                  value={bulkStart}
                  onChange={e => setBulkStart(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Duración por Hora (min)
                </label>
                <input
                  type="number"
                  min={20}
                  max={120}
                  value={bulkDuration}
                  onChange={e => setBulkDuration(parseInt(e.target.value, 10) || 55)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cantidad de Horas
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={bulkCount}
                  onChange={e => setBulkCount(parseInt(e.target.value, 10) || 7)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleApplyQuickBulk}
                  className="w-full px-4 py-2 bg-[#1F4E31] dark:bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-[#153622] transition-colors shadow-sm"
                >
                  Generar Horarios
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-200/50 dark:border-amber-800/40 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Descanso 1:</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={bulkBreak1Mins}
                  onChange={e => setBulkBreak1Mins(parseInt(e.target.value, 10) || 0)}
                  className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <span>minutos tras la</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={bulkBreak1After}
                  onChange={e => setBulkBreak1After(parseInt(e.target.value, 10) || 2)}
                  className="w-14 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <span>ª hora</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Descanso 2:</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={bulkBreak2Mins}
                  onChange={e => setBulkBreak2Mins(parseInt(e.target.value, 10) || 0)}
                  className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <span>minutos tras la</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={bulkBreak2After}
                  onChange={e => setBulkBreak2After(parseInt(e.target.value, 10) || 4)}
                  className="w-14 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <span>ª hora</span>
              </div>
            </div>
          </div>
        )}

        {/* LISTA CONFIGURABLE DE HORAS */}
        <div className="space-y-2.5">
          {periods.map((p, index) => {
            const duration = getMinutesDiff(p.startTime, p.endTime)
            const isDurationValid = duration > 0

            // Pausa con respecto al periodo anterior
            let gapMinutes = 0
            let previousPeriod: PeriodTimeConfig | null = null
            if (index > 0) {
              previousPeriod = periods[index - 1]
              gapMinutes = getMinutesDiff(previousPeriod.endTime, p.startTime)
            }

            return (
              <React.Fragment key={p.period}>
                {/* Separador de pausa/receso o solapamiento */}
                {index > 0 && previousPeriod && (
                  gapMinutes > 0 ? (
                    <div className="flex items-center gap-2 my-1.5 px-4 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/40 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                      <Coffee className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Descanso / Receso institucional: {gapMinutes} min</span>
                      <span className="text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                        ({formatTimePreview(previousPeriod.endTime, settings.timeFormat === '12h')} → {formatTimePreview(p.startTime, settings.timeFormat === '12h')})
                      </span>
                    </div>
                  ) : gapMinutes < 0 ? (
                    <div className="flex items-center gap-2 my-1.5 px-4 py-1.5 rounded-xl bg-rose-500/10 dark:bg-rose-950/30 border border-rose-300/50 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                      <span>¡Atención! Solapamiento de {Math.abs(gapMinutes)} min entre la {previousPeriod.name} y la {p.name}.</span>
                    </div>
                  ) : null
                )}

                {/* Card de la Hora */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-8 w-8 rounded-xl font-black text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white shadow-xs shrink-0">
                      {p.period}º
                    </span>
                    <input
                      type="text"
                      value={p.name}
                      onChange={e => handlePeriodChange(index, 'name', e.target.value)}
                      className="w-28 sm:w-32 px-2.5 py-1 text-xs font-bold rounded-lg border border-transparent hover:border-slate-300 focus:border-[#1F4E31] dark:hover:border-slate-700 dark:focus:border-emerald-500 bg-transparent text-slate-800 dark:text-white transition-colors"
                      placeholder={`Hora ${p.period}`}
                    />
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Inicio */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inicia</span>
                      <input
                        type="time"
                        value={p.startTime}
                        onChange={e => handlePeriodChange(index, 'startTime', e.target.value)}
                        className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white shadow-2xs focus:ring-1 focus:ring-[#1F4E31]"
                      />
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />

                    {/* Fin */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Termina</span>
                      <input
                        type="time"
                        value={p.endTime}
                        onChange={e => handlePeriodChange(index, 'endTime', e.target.value)}
                        className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white shadow-2xs focus:ring-1 focus:ring-[#1F4E31]"
                      />
                    </div>

                    {/* Pill Duración */}
                    <div className="min-w-[70px] text-right">
                      {isDurationValid ? (
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {duration} min
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          Hora Inválida
                        </span>
                      )}
                    </div>

                    {/* Botón Eliminar */}
                    <button
                      type="button"
                      onClick={() => handleRemovePeriod(index)}
                      disabled={periods.length <= 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Eliminar esta hora"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
        </div>

        {/* Botón Agregar Hora */}
        <div className="pt-2 flex justify-between items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAddPeriod}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#1F4E31] dark:hover:border-emerald-500 hover:text-[#1F4E31] dark:hover:text-emerald-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Añadir Hora Adicional
          </button>

          <span className="text-xs text-slate-400">
            Jornada total: {periods[0]?.startTime || '--'} a {periods[periods.length - 1]?.endTime || '--'}
          </span>
        </div>
      </div>

      {/* SEGUNDA SECCIÓN: AJUSTES VISUALES Y APARIENCIA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grilla General */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Eye className="h-5 w-5 text-indigo-500" />
            Estructura de la Grilla
          </h3>
          
          <div className="space-y-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.showWeekends}
                onChange={e => setSettings({ ...settings, showWeekends: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1F4E31] dark:text-emerald-500 focus:ring-[#1F4E31]"
              />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-[#1F4E31] transition-colors">Mostrar fines de semana</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Activa esta opción si la institución imparte clases los sábados o domingos en su horario regular.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.hideEmptyPeriods}
                onChange={e => setSettings({ ...settings, hideEmptyPeriods: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1F4E31] dark:text-emerald-500 focus:ring-[#1F4E31]"
              />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-[#1F4E31] transition-colors">Ocultar periodos vacíos finales</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Reduce el alto de la grilla ocultando las últimas horas del día si no hay ninguna clase programada.</p>
              </div>
            </label>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Formato de Hora en Grillas</label>
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, timeFormat: '12h' })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${settings.timeFormat === '12h' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  12 Horas (AM/PM)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, timeFormat: '24h' })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${settings.timeFormat === '24h' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  24 Horas
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Estilos y Densidad */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <LayoutGrid className="h-5 w-5 text-pink-500" />
            Apariencia y Densidad
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Densidad de Vista</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, density: 'relaxed' })}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${settings.density === 'relaxed' ? 'border-[#1F4E31] dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Relajada</span>
                  <span className="text-[10px] text-slate-500 text-center mt-1">Mejor legibilidad, mayor espacio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, density: 'compact' })}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${settings.density === 'compact' ? 'border-[#1F4E31] dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Compacta</span>
                  <span className="text-[10px] text-slate-500 text-center mt-1">Más clases visibles sin scroll</span>
                </button>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group border-t border-slate-100 dark:border-slate-800 pt-5">
              <input
                type="checkbox"
                checked={settings.showClassrooms}
                onChange={e => setSettings({ ...settings, showClassrooms: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1F4E31] dark:text-emerald-500 focus:ring-[#1F4E31]"
              />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-[#1F4E31] transition-colors">Mostrar Aulas</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Si está activo, mostrará el nombre corto del aula asignada debajo del nombre del docente en cada celda de la grilla.</p>
              </div>
            </label>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Palette className="w-4 h-4 text-slate-400" /> Color de Acentos</label>
              <div className="flex gap-3">
                {['emerald', 'blue', 'indigo', 'orange'].map(color => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setSettings({ ...settings, themeColor: color })}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${settings.themeColor === color ? 'border-slate-900 dark:border-white scale-110 shadow-md' : 'border-transparent hover:scale-105 opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'indigo' ? '#6366f1' : '#f97316' }}
                    title={`Tema ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
