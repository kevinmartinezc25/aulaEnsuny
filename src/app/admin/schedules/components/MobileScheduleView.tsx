'use client'

import React, { useState } from 'react'
import { TimeSlot } from '../utils/timeCalculator'
import { ChevronDown, Clock, User, Users } from 'lucide-react'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

interface MobileScheduleViewProps {
  viewMode: 'group' | 'teacher'
  entities: any[]
  slots: any[]
  subjects: Record<string, any>
  teachers: Record<string, any>
  groups: any[]
  timeSlots: TimeSlot[]
}

export default function MobileScheduleView({
  viewMode,
  entities,
  slots,
  subjects,
  teachers,
  groups,
  timeSlots
}: MobileScheduleViewProps) {
  // Estado para el día seleccionado en móvil (por defecto el índice 0: Lunes)
  const [activeDayIdx, setActiveDayIdx] = useState(0)
  
  // Estado para rastrear qué entidad (Docente o Grupo) está expandida
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null)

  const activeDayName = DAYS[activeDayIdx]

  // Periodos válidos (ignoramos recreos para la asignación principal)
  const activePeriods = timeSlots.filter(s => s.type !== 'break')

  // Helper para agrupar los slots por entidad y periodo para el día actual
  const getSlot = (entityId: string, period: number) => {
    return slots.filter(s => 
      (viewMode === 'group' ? s.group_id === entityId : s.teacher_id === entityId) && 
      s.day_of_week === activeDayName && 
      s.period_id === period
    )
  }

  const toggleEntity = (id: string) => {
    setExpandedEntityId(prev => prev === id ? null : id)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 space-y-4">
      {/* Selector de Día (Tabs Horizontales) */}
      <div className="flex overflow-x-auto custom-scrollbar bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-slate-800 shrink-0">
        {DAYS.map((day, idx) => (
          <button
            key={day}
            onClick={() => setActiveDayIdx(idx)}
            className={`flex-1 min-w-[70px] py-2.5 px-3 rounded-xl text-xs font-bold transition-colors text-center ${
              activeDayIdx === idx 
                ? 'bg-indigo-500 text-white shadow-md' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {day.substring(0, 3)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {viewMode === 'group' ? 'Grupos' : 'Docentes'} - {activeDayName}
        </h3>
        <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-800 px-2.5 py-1 rounded-full">
          {entities.length} {viewMode === 'group' ? 'grupos' : 'docentes'}
        </span>
      </div>

      {/* Lista de Entidades en Acordeón */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-20 custom-scrollbar">
        {entities.map(entity => {
          const isExpanded = expandedEntityId === entity.id
          
          // Contamos cuántas clases tiene asignadas en todo este día
          const dailySlotsCount = slots.filter(s => 
            (viewMode === 'group' ? s.group_id === entity.id : s.teacher_id === entity.id) && 
            s.day_of_week === activeDayName
          ).length

          return (
            <div 
              key={entity.id} 
              className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-colors shadow-sm ${
                isExpanded ? 'border-indigo-300 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Cabecera del Acordeón */}
              <button 
                onClick={() => toggleEntity(entity.id)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`p-2 rounded-lg ${isExpanded ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {viewMode === 'group' ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[15px]">{entity.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {dailySlotsCount > 0 ? `${dailySlotsCount} periodos de clase` : 'Día libre'}
                    </p>
                  </div>
                </div>
                <div className={`p-1.5 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-indigo-50 text-indigo-500 rotate-180 dark:bg-indigo-900/30' : 'text-slate-400'}`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>

              {/* Contenido Expandido: Línea de Tiempo Vertical */}
              {isExpanded && (
                <div className="p-4 pt-1 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800">
                  {dailySlotsCount === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-400 font-medium bg-white dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                      No hay clases registradas hoy.
                    </div>
                  ) : (
                    <div className="relative pl-3 mt-3 border-l-2 border-indigo-100 dark:border-indigo-900/40 space-y-4">
                      {activePeriods.map(period => {
                        const matchingSlots = getSlot(entity.id, period.id!)
                        if (matchingSlots.length === 0) return null // Ocultar horas libres en el timeline móvil

                        const hasConflict = matchingSlots.length > 1

                        return (
                          <div key={period.id} className="relative">
                            {/* Punto del timeline */}
                            <div className="absolute -left-[21px] top-3 w-3 h-3 bg-indigo-500 rounded-full ring-4 ring-slate-50 dark:ring-slate-950"></div>
                            
                            <div className={`p-3 rounded-xl border ${hasConflict ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'} shadow-sm`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {period.startTime} - {period.endTime} ({period.id}ª)
                                </span>
                                {hasConflict && (
                                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 rounded-md">
                                    ⚠️ Cruce detectado
                                  </span>
                                )}
                              </div>

                              <div className="space-y-2">
                                {matchingSlots.map((slot, i) => {
                                  const subject = subjects[slot.subject_id]
                                  let secondaryText = ''
                                  
                                  if (viewMode === 'group') {
                                    const tName = teachers[slot.teacher_id]?.name || 'Trab. Autónomo'
                                    secondaryText = tName
                                  } else {
                                    const gName = groups.find(g => g.id === slot.group_id)?.name
                                    secondaryText = gName || 'Grupo Desconocido'
                                  }

                                  return (
                                    <div key={i} className="flex flex-col bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: subject?.color || '#cbd5e1' }}></span>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                          {subject?.name || 'Materia Desconocida'}
                                        </span>
                                      </div>
                                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-medium pl-4.5 gap-1.5 mt-1">
                                        {viewMode === 'group' ? <User className="w-3.5 h-3.5 shrink-0" /> : <Users className="w-3.5 h-3.5 shrink-0" />}
                                        <span className="truncate">{secondaryText}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
