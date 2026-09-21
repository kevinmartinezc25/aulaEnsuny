'use client'

import React, { useState } from 'react'
import { Settings2, Eye, CalendarClock, Palette, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    showWeekends: false,
    themeColor: 'emerald',
    startTime: '07:00',
    endTime: '15:00',
  })

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save to DB or LocalStorage
    await new Promise(resolve => setTimeout(resolve, 800))
    toast.success('Ajustes visuales guardados correctamente.')
    setIsSaving(false)
  }

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
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
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
          
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showWeekends}
                onChange={e => setSettings({ ...settings, showWeekends: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">Mostrar fines de semana</p>
                <p className="text-xs text-slate-500">Activa esta opción si la institución imparte clases los sábados o domingos.</p>
              </div>
            </label>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hora de inicio visible</label>
                <input
                  type="time"
                  value={settings.startTime}
                  onChange={e => setSettings({ ...settings, startTime: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hora de fin visible</label>
                <input
                  type="time"
                  value={settings.endTime}
                  onChange={e => setSettings({ ...settings, endTime: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Estilos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Palette className="h-5 w-5 text-pink-500" />
            Apariencia
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Color principal del módulo</label>
              <div className="flex gap-3">
                {['emerald', 'blue', 'indigo', 'orange'].map(color => (
                  <button
                    key={color}
                    onClick={() => setSettings({ ...settings, themeColor: color })}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${settings.themeColor === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'indigo' ? '#6366f1' : '#f97316' }}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Afecta los botones y resaltados principales de las vistas de calendario.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
