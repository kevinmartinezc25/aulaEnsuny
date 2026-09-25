'use client'

import React, { useState } from 'react'
import { ChevronRight, Clock, Users, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const DAYS = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' }
]

interface MobilePremiumScheduleViewProps {
  groups: any[]
  teachers: any[]
  slots: any[]
  periods: number[]
  periodTimes: Record<number, string>
  getSubjectColor: (name: string | undefined) => string
  defaultActiveDayId?: number
  hideDaySelector?: boolean
}

export default function MobilePremiumScheduleView({
  groups,
  teachers,
  slots,
  periods,
  periodTimes,
  getSubjectColor,
  defaultActiveDayId = 1,
  hideDaySelector = false
}: MobilePremiumScheduleViewProps) {
  const [activeDayId, setActiveDayId] = useState(defaultActiveDayId)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'group' | 'teacher'>('group')

  const activeDayName = DAYS.find(d => d.id === activeDayId)?.name || 'Lunes'
  const activeEntities = viewMode === 'group' ? groups : teachers

  const selectedEntity = selectedEntityId ? activeEntities.find(e => e.id === selectedEntityId) : null
  const selectedEntitySlots = selectedEntity ? slots.filter(s => 
    (viewMode === 'group' ? s.group_id === selectedEntity.id : s.teacher_id === selectedEntity.id) && 
    Number(s.day_of_week) === activeDayId
  ) : []

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 space-y-4">
      {/* Selector de Día (Tabs Horizontales) */}
      {!hideDaySelector && (
        <div className="flex overflow-x-auto custom-scrollbar bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-slate-800 shrink-0">
          {DAYS.map((day) => (
            <button
              key={day.id}
              onClick={() => setActiveDayId(day.id)}
              className={`flex-1 min-w-[70px] py-2.5 px-3 rounded-xl text-xs font-bold transition-colors text-center ${
                activeDayId === day.id 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {day.name.substring(0, 3)}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-2">
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => { setViewMode('group'); setSelectedEntityId(null); }}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'group' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
          >
            Grupos
          </button>
          <button
            onClick={() => { setViewMode('teacher'); setSelectedEntityId(null); }}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'teacher' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
          >
            Docentes
          </button>
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {activeEntities.length} {viewMode === 'group' ? 'grupos' : 'docentes'}
        </span>
      </div>

      {/* Lista de Entidades */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-20 custom-scrollbar">
        {activeEntities.map(entity => {
          const entitySlots = slots.filter(s => 
            (viewMode === 'group' ? s.group_id === entity.id : s.teacher_id === entity.id) && 
            Number(s.day_of_week) === activeDayId
          )
          const dailySlotsCount = entitySlots.length

          if (dailySlotsCount === 0) return null; // Ocultar sin clases

          return (
            <button 
              key={entity.id}
              onClick={() => setSelectedEntityId(entity.id)}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[15px]">{entity.name || entity.full_name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {dailySlotsCount > 0 ? `${dailySlotsCount} periodos de clase` : 'Día libre'}
                  </p>
                </div>
              </div>
              <div className="p-1.5 text-slate-400">
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Bottom Sheet Modal */}
      <AnimatePresence>
        {selectedEntityId && selectedEntity && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 0.4 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedEntityId(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] h-[85vh]"
            >
              {/* Grabber for bottom sheet */}
              <div className="flex justify-center pt-3 pb-1 shrink-0 bg-white dark:bg-slate-900 cursor-pointer" onClick={() => setSelectedEntityId(null)}>
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </div>

              <div className="flex items-center justify-between px-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">
                      {selectedEntity.name || selectedEntity.full_name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      Horario del {activeDayName}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEntityId(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 pb-10 bg-slate-50/50 dark:bg-slate-900/30 custom-scrollbar">
                {selectedEntitySlots.length === 0 ? (
                  <div className="text-center py-10 text-sm text-slate-400 font-medium bg-white dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    No hay clases registradas hoy.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {periods.map(period => {
                      const matchingSlots = selectedEntitySlots.filter(s => Number(s.period_id) === period)
                      
                      if (matchingSlots.length === 0) {
                        if (viewMode === 'teacher') {
                          return (
                            <div key={period} className="flex items-center bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm opacity-75">
                              <div className="flex flex-col items-center justify-center min-w-[70px] border-r border-slate-200 dark:border-slate-700 pr-3 mr-3 shrink-0">
                                <span className="text-sm font-bold text-slate-400 dark:text-slate-500">{period}ª</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 text-center leading-tight">
                                  {periodTimes[period]?.replace(' - ', '\n') || ''}
                                </span>
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-bold text-slate-400 dark:text-slate-500">Hora Libre</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }

                      const hasConflict = matchingSlots.length > 1

                      return (
                        <div key={period} className={`flex items-center bg-white dark:bg-slate-800 border ${hasConflict ? 'border-rose-200 dark:border-rose-800/50 bg-rose-50/30' : 'border-slate-200 dark:border-slate-700'} rounded-xl p-3 shadow-sm`}>
                          <div className="flex flex-col items-center justify-center min-w-[70px] border-r border-slate-200 dark:border-slate-700 pr-3 mr-3 shrink-0">
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{period}ª</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 text-center leading-tight">
                              {periodTimes[period]?.replace(' - ', '\n') || ''}
                            </span>
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            {matchingSlots.map((slot, i) => {
                              let secondaryText = ''
                              if (viewMode === 'group') {
                                secondaryText = slot.teacher?.full_name || 'Trabajo Autónomo'
                              } else {
                                secondaryText = slot.group?.name || 'Grupo Desconocido'
                              }

                              return (
                                <div key={i} className="flex flex-col">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: slot.subject?.color || getSubjectColor(slot.subject?.name) }}></span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                      {slot.subject?.name || 'Materia'}
                                    </span>
                                    {hasConflict && (
                                      <span className="ml-auto text-[9px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                                        CRUCE
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pl-4.5">
                                    {secondaryText}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
