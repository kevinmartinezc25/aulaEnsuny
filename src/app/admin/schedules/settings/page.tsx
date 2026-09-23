'use client'

import React, { useState, useEffect } from 'react'
import { Settings2, Eye, CalendarClock, Palette, Save, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'

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

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<ScheduleSettings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
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
      }
    } catch(e) {
      console.error(e)
    }
    setIsLoaded(true)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Leer configuraciones existentes (incluyendo reglas de negocio que no tocamos aquí)
      const stored = localStorage.getItem('sch_settings')
      let existingSettings = {}
      if (stored) {
        existingSettings = JSON.parse(stored)
      }
      
      const newSettings = {
        ...existingSettings,
        ...settings
      }
      
      localStorage.setItem('sch_settings', JSON.stringify(newSettings))
      toast.success('Ajustes visuales guardados correctamente. Los cambios se reflejarán en las grillas de horario.')
    } catch (e) {
      toast.error('Error al guardar los ajustes locales.')
    }
    setIsSaving(false)
  }

  if (!isLoaded) return null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-slate-500" />
            Ajustes de Visualización
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configura cómo se renderizan los calendarios y las grillas de horario en el portal. (Las reglas de negocio ahora se gestionan nativamente en aSc TimeTables).
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1F4E31] dark:bg-emerald-600 text-white rounded-xl font-bold hover:bg-[#153622] dark:hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap"
        >
          {isSaving ? 'Guardando...' : <><Save className="h-4 w-4" /> Guardar Cambios</>}
        </button>
      </div>

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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Formato de Hora</label>
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setSettings({ ...settings, timeFormat: '12h' })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${settings.timeFormat === '12h' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  12 Horas (AM/PM)
                </button>
                <button
                  onClick={() => setSettings({ ...settings, timeFormat: '24h' })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${settings.timeFormat === '24h' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  24 Horas
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Estilos */}
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
                  onClick={() => setSettings({ ...settings, density: 'relaxed' })}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${settings.density === 'relaxed' ? 'border-[#1F4E31] dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Relajada</span>
                  <span className="text-[10px] text-slate-500 text-center mt-1">Mejor legibilidad, mayor espacio</span>
                </button>
                <button
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
