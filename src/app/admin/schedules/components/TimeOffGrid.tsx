'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { generateTimeSlots, TimeSlot } from '../utils/timeCalculator'
import { Loader2, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface TimeOffGridProps {
  entityType: 'TEACHER' | 'GROUP' | 'CLASSROOM'
  entityId: string
  entityName: string
}

type Status = 'ALLOWED' | 'DISCOURAGED' | 'FORBIDDEN'

interface TimeBlock {
  id?: string
  day_of_week: string
  period_id: number
  status: Status
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export default function TimeOffGrid({ entityType, entityId, entityName }: TimeOffGridProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
    if (entityId) fetchBlocks()
  }, [entityId])

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

  const fetchBlocks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sch_time_off')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)

    if (!error && data) {
      setBlocks(data.map(d => ({
        id: d.id,
        day_of_week: d.day_of_week,
        period_id: d.period_id,
        status: d.status as Status
      })))
    }
    setLoading(false)
  }

  const toggleSlot = (day: string, periodId: number) => {
    setBlocks(prev => {
      const existingIdx = prev.findIndex(b => b.day_of_week === day && b.period_id === periodId)
      if (existingIdx >= 0) {
        const currentStatus = prev[existingIdx].status
        const nextStatus = currentStatus === 'DISCOURAGED' ? 'FORBIDDEN' : 'ALLOWED'
        
        if (nextStatus === 'ALLOWED') {
          return prev.filter((_, i) => i !== existingIdx)
        } else {
          const newArr = [...prev]
          newArr[existingIdx] = { ...newArr[existingIdx], status: nextStatus }
          return newArr
        }
      } else {
        return [...prev, { day_of_week: day, period_id: periodId, status: 'DISCOURAGED' }]
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Borrar todos los anteriores
      await supabase
        .from('sch_time_off')
        .delete()
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)

      // Insertar nuevos (solo los que no sean ALLOWED)
      const toInsert = blocks
        .filter(b => b.status !== 'ALLOWED')
        .map(b => ({
          entity_type: entityType,
          entity_id: entityId,
          day_of_week: b.day_of_week,
          period_id: b.period_id,
          status: b.status
        }))

      if (toInsert.length > 0) {
        const { error } = await supabase.from('sch_time_off').insert(toInsert)
        if (error) throw error
      }
      
      toast.success('Disponibilidad guardada correctamente')
      fetchBlocks()
    } catch (error) {
      console.error(error)
      toast.error('Error al guardar la disponibilidad')
    }
    setSaving(false)
  }

  const periodsOnly = timeSlots.filter(t => t.type === 'period')

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Matriz de Disponibilidad</h3>
          <p className="text-sm text-slate-500">{entityName}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchBlocks} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></div> Permitido</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300"></div> No recomendado</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300"></div> Prohibido</div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm text-center border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 border-b border-r border-slate-200 font-semibold text-slate-600 w-24">Hora</th>
                {DAYS.map(day => (
                  <th key={day} className="p-3 border-b border-slate-200 font-semibold text-slate-600 w-1/5">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodsOnly.map((slot, index) => (
                <tr key={slot.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="p-3 border-r border-slate-200 bg-slate-50 font-medium text-slate-500">
                    <div>{index + 1}ª Hora</div>
                    <div className="text-xs text-slate-400 font-normal">{slot.startTime}-{slot.endTime}</div>
                  </td>
                  {DAYS.map(day => {
                    const block = blocks.find(b => b.day_of_week === day && b.period_id === slot.id)
                    const status = block?.status || 'ALLOWED'
                    
                    let bgClass = 'bg-white hover:bg-slate-100 cursor-pointer'
                    let Icon = null
                    
                    if (status === 'DISCOURAGED') {
                      bgClass = 'bg-amber-100 hover:bg-amber-200 border-amber-300 cursor-pointer text-amber-600'
                      Icon = AlertTriangle
                    } else if (status === 'FORBIDDEN') {
                      bgClass = 'bg-rose-100 hover:bg-rose-200 border-rose-300 cursor-pointer text-rose-600'
                      Icon = XCircle
                    }

                    return (
                      <td key={`${day}-${slot.id}`} className="p-1">
                        <div 
                          onClick={() => toggleSlot(day, slot.id as number)}
                          className={`w-full h-16 rounded-md border flex items-center justify-center transition-all ${bgClass}`}
                        >
                          {Icon && <Icon size={20} strokeWidth={2.5} />}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
