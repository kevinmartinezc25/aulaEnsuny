'use client'

import React, { useState, useEffect } from 'react'
import { Settings2, Save, Clock, CalendarDays, AlignLeft, Eye, Sun, LayoutGrid, Coffee, Hash, CheckSquare, Plus, Trash2, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'
import { Break, generateTimeSlots, TimeSlot } from '../utils/timeCalculator'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    academicYear: '2024 - 2025',
    blockDuration: '55',
    startHour: '07:00',
    workingDays: 'L-V',
    shift: 'morning',
    periodsPerDay: '7',
    timeFormat: '12h',
    visibility: 'draft',
    maxHoursPrimary: '25',
    maxHoursSecondary: '22',
    maxHoursPFC: '20'
  })
  const [breaks, setBreaks] = useState<Break[]>([
    { id: '1', name: 'Recreo', afterPeriod: 3, durationMinutes: 30 }
  ])
  const [periods, setPeriods] = useState(['2023 - 2024', '2024 - 2025', '2025 - 2026', '2026 - I', '2026 - II'])
  const [newPeriod, setNewPeriod] = useState('')
  const [subjects, setSubjects] = useState<{id: string, name: string, color: string}[]>([])
  const [blockSubjects, setBlockSubjects] = useState<string[]>([])
  const [groups, setGroups] = useState<{id: string, name: string}[]>([])
  const [groupPeriods, setGroupPeriods] = useState<Record<string, number>>({})
  
  const supabase = createClient()

  useEffect(() => {
    const savedSettings = localStorage.getItem('sch_settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        
        // Remove breakPeriod and handle breaks array
        const { breakPeriod, breaks: savedBreaksArray, ...restParsed } = parsed
        setSettings(s => ({ ...s, ...restParsed }))
        
        if (savedBreaksArray) {
          setBreaks(savedBreaksArray)
        } else if (breakPeriod) {
          // Backward compatibility
          setBreaks([{ id: '1', name: 'Recreo', afterPeriod: parseInt(breakPeriod, 10), durationMinutes: 30 }])
        }

        if (parsed.academicYear && !periods.includes(parsed.academicYear)) {
          setPeriods(prev => [...prev, parsed.academicYear])
        }
      } catch(e) {}
    } else {
      const savedPeriod = localStorage.getItem('sch_active_period')
      if (savedPeriod) {
        if (!periods.includes(savedPeriod)) {
          setPeriods(prev => [...prev, savedPeriod])
        }
        setSettings(s => ({ ...s, academicYear: savedPeriod }))
      }
    }
    
    const savedBlocks = localStorage.getItem('sch_block_subjects')
    if (savedBlocks) {
      try { setBlockSubjects(JSON.parse(savedBlocks)) } catch(e) {}
    }

    const savedGroupPeriods = localStorage.getItem('sch_group_periods')
    if (savedGroupPeriods) {
      try { setGroupPeriods(JSON.parse(savedGroupPeriods)) } catch(e) {}
    }

    fetchSubjects()
    fetchGroups()
  }, [])

  const fetchSubjects = async () => {
    const { data } = await supabase.from('sch_subjects').select('id, name, color').order('name')
    if (data) setSubjects(data)
  }

  const fetchGroups = async () => {
    const { data } = await supabase.from('sch_groups').select('id, name').order('name')
    if (data) {
      // Sort groups logically (e.g. 10°-1, 10°-2)
      const sortedGroups = data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      setGroups(sortedGroups)
    }
  }

  const handleSave = () => {
    const settingsToSave = { ...settings, breaks }
    localStorage.setItem('sch_settings', JSON.stringify(settingsToSave))
    localStorage.setItem('sch_active_period', settings.academicYear)
    localStorage.setItem('sch_block_subjects', JSON.stringify(blockSubjects))
    localStorage.setItem('sch_group_periods', JSON.stringify(groupPeriods))
    toast.success('Ajustes guardados. Los cambios en la cuadrícula de horarios requerirán recargar la vista del lienzo.')
  }

  const handleAddPeriod = () => {
    if (newPeriod.trim() && !periods.includes(newPeriod.trim())) {
      setPeriods([...periods, newPeriod.trim()])
      setSettings({ ...settings, academicYear: newPeriod.trim() })
      setNewPeriod('')
    }
  }

  const timePreview = generateTimeSlots(
    settings.startHour,
    parseInt(settings.blockDuration, 10),
    parseInt(settings.periodsPerDay, 10),
    breaks,
    settings.timeFormat === '12h'
  )

  const addBreak = () => {
    setBreaks([...breaks, { id: Date.now().toString(), name: 'Nuevo Descanso', afterPeriod: 4, durationMinutes: 15 }])
  }

  const removeBreak = (id: string) => {
    setBreaks(breaks.filter(b => b.id !== id))
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Settings2 className="h-6 w-6 text-indigo-500" />
            Ajustes Globales
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configuración macro de la institución que afectará a todos los horarios generados.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  Periodos Académicos
                </span>
              </label>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value)}
                  placeholder="Ej. 2027 - I"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPeriod()}
                />
                <button 
                  onClick={handleAddPeriod}
                  className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 dark:text-indigo-400 rounded-xl text-sm font-bold transition-colors"
                >
                  +
                </button>
              </div>

              <select 
                value={settings.academicYear}
                onChange={(e) => setSettings({...settings, academicYear: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow mt-2"
              >
                {periods.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">Añade periodos nuevos y selecciona el activo actual.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <Clock className="h-4 w-4 text-slate-400" />
                Duración de Bloque (Minutos)
              </label>
              <select 
                value={settings.blockDuration}
                onChange={(e) => setSettings({...settings, blockDuration: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              >
                <option value="45">45 minutos</option>
                <option value="50">50 minutos</option>
                <option value="55">55 minutos</option>
                <option value="60">60 minutos</option>
              </select>
              <p className="text-[11px] text-slate-500">Afectará la visualización de la cuadrícula en el lienzo.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <Clock className="h-4 w-4 text-slate-400" />
                Hora de Inicio (Primera hora)
              </label>
              <input 
                type="time"
                value={settings.startHour}
                onChange={(e) => setSettings({...settings, startHour: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              />
              <p className="text-[11px] text-slate-500">Hora en la que ingresan los estudiantes a la institución.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <Sun className="h-4 w-4 text-slate-400" />
                Jornada (Turno)
              </label>
              <select 
                value={settings.shift}
                onChange={(e) => setSettings({...settings, shift: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              >
                <option value="morning">Mañana</option>
                <option value="afternoon">Tarde</option>
                <option value="evening">Noche</option>
                <option value="full">Única (Todo el día)</option>
              </select>
              <p className="text-[11px] text-slate-500">Agrupa los horarios por jornada para colegios grandes.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                Días Laborables
              </label>
              <select 
                value={settings.workingDays}
                onChange={(e) => setSettings({...settings, workingDays: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              >
                <option value="L-V">Lunes a Viernes</option>
                <option value="L-S">Lunes a Sábado</option>
                <option value="L-D">Lunes a Domingo</option>
              </select>
              <p className="text-[11px] text-slate-500">Días que se mostrarán en la cuadrícula de horarios.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <Hash className="h-4 w-4 text-slate-400" />
                Periodos por Día
              </label>
              <select 
                value={settings.periodsPerDay}
                onChange={(e) => setSettings({...settings, periodsPerDay: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              >
                <option value="6">6 periodos (horas)</option>
                <option value="7">7 periodos (horas)</option>
                <option value="8">8 periodos (horas)</option>
                <option value="9">9 periodos (horas)</option>
              </select>
              <p className="text-[11px] text-slate-500">Cantidad máxima de horas dictadas en un día.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <Clock className="h-4 w-4 text-slate-400" />
                Formato de Hora
              </label>
              <select 
                value={settings.timeFormat}
                onChange={(e) => setSettings({...settings, timeFormat: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              >
                <option value="12h">12 Horas (AM / PM)</option>
                <option value="24h">24 Horas (Militar)</option>
              </select>
              <p className="text-[11px] text-slate-500">Cómo se mostrarán las horas en los ejes de la tabla.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <Eye className="h-4 w-4 text-slate-400" />
                Visibilidad del Horario
              </label>
              <select 
                value={settings.visibility}
                onChange={(e) => setSettings({...settings, visibility: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              >
                <option value="draft">Borrador (Solo Admin)</option>
                <option value="published">Publicado (Visible a Docentes)</option>
              </select>
              <p className="text-[11px] text-slate-500">Los docentes verán el horario solo si está publicado.</p>
            </div>
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-slate-400" />
                Carga Horaria Máxima de Docentes
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Primaria (Horas)</label>
                  <input 
                    type="number"
                    value={settings.maxHoursPrimary || 25}
                    onChange={(e) => setSettings({...settings, maxHoursPrimary: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Secundaria (Horas)</label>
                  <input 
                    type="number"
                    value={settings.maxHoursSecondary || 22}
                    onChange={(e) => setSettings({...settings, maxHoursSecondary: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">PFC (Horas)</label>
                  <input 
                    type="number"
                    value={settings.maxHoursPFC || 20}
                    onChange={(e) => setSettings({...settings, maxHoursPFC: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">La carga predeterminada según el nivel donde el docente tenga más horas asignadas.</p>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Breaks Configuration */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Coffee className="h-5 w-5 text-indigo-500" />
                  Descansos
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Configura los descansos, recesos o almuerzos.
                </p>
              </div>
              <button onClick={addBreak} className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>
            
            <div className="space-y-3">
              {breaks.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">Sin descansos configurados.</p>
              ) : (
                breaks.map((b, idx) => (
                  <div key={b.id} className="flex flex-wrap sm:flex-nowrap items-end gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Nombre</label>
                      <input 
                        type="text" 
                        value={b.name}
                        onChange={(e) => setBreaks(breaks.map(br => br.id === b.id ? { ...br, name: e.target.value } : br))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                    <div className="w-full sm:w-32 shrink-0">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Después de</label>
                      <select 
                        value={b.afterPeriod}
                        onChange={(e) => setBreaks(breaks.map(br => br.id === b.id ? { ...br, afterPeriod: parseInt(e.target.value, 10) } : br))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        {Array.from({length: parseInt(settings.periodsPerDay, 10)}).map((_, i) => (
                          <option key={i+1} value={i+1}>{i+1}ª Hora</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-32 shrink-0">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Minutos</label>
                      <input 
                        type="number" 
                        value={b.durationMinutes}
                        min="5"
                        step="5"
                        onChange={(e) => setBreaks(breaks.map(br => br.id === b.id ? { ...br, durationMinutes: parseInt(e.target.value, 10) } : br))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                    <button onClick={() => removeBreak(b.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors mt-2 sm:mt-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {/* Time Preview */}
            <div className="mt-6 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-xl p-4">
              <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-3">Previsualización de Tiempos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {timePreview.map((slot, i) => (
                  <div key={i} className={`px-3 py-2 rounded-lg text-xs flex justify-between items-center ${slot.type === 'break' ? 'bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-200/50 dark:border-amber-700/50' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
                    <span className={slot.type === 'period' ? 'font-bold text-slate-700 dark:text-slate-300' : ''}>
                      {slot.type === 'period' ? `${slot.id}ª Hora` : slot.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <hr className="border-slate-200 dark:border-slate-800 my-8" />

          {/* Block Subjects Section */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-indigo-500" />
                Materias en Bloque
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Selecciona las materias que, en caso de tener 2 o más horas, deben dictarse de forma continua (bloques de 2 horas seguidas).
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700 rounded-xl max-h-64 overflow-y-auto">
              {subjects.map(s => (
                <label key={s.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={blockSubjects.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) setBlockSubjects([...blockSubjects, s.id])
                      else setBlockSubjects(blockSubjects.filter(id => id !== s.id))
                    }}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color || '#cbd5e1' }} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{s.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800 my-8" />

          {/* Group Periods Section */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-500" />
                Límites de Horario por Grupo
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Por defecto, todos los grupos tendrán {settings.periodsPerDay} horas al día. Usa esta opción si algunos grados/grupos (ej. 6°) terminan antes que los demás.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700 rounded-xl max-h-64 overflow-y-auto">
              {groups.map(g => {
                const maxPeriods = groupPeriods[g.id] || parseInt(settings.periodsPerDay, 10);
                return (
                  <div key={g.id} className="flex flex-col gap-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{g.name}</span>
                    <select 
                      value={maxPeriods}
                      onChange={(e) => setGroupPeriods({ ...groupPeriods, [g.id]: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-600 dark:text-slate-400"
                    >
                      {Array.from({length: parseInt(settings.periodsPerDay, 10)}).map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1} Horas</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800 my-8" />

          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex gap-3">
            <AlignLeft className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Recálculo del Lienzo</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                Cambiar la duración del bloque o la hora de inicio puede descuadrar las tarjetas que ya tienes agendadas visualmente si no coinciden. Es recomendable establecer estos ajustes antes de iniciar la captura de horarios.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button 
            onClick={handleSave} 
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Save className="h-4 w-4" /> Guardar Ajustes
          </button>
        </div>
      </div>
    </div>
  )
}
