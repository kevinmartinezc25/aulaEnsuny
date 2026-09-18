'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, User, Users, ChevronRight, X, Sparkles } from 'lucide-react'
import { CurriculumBlock } from '../engine/Generator'

interface ConflictsSidebarProps {
  isOpen: boolean
  onClose: () => void
  unassignedBlocks: CurriculumBlock[]
  onSelectEntity: (type: 'teacher' | 'group', id: string, name: string) => void
  onAutoGenerateGlobal: () => void
}

export default function ConflictsSidebar({ isOpen, onClose, unassignedBlocks, onSelectEntity, onAutoGenerateGlobal }: ConflictsSidebarProps) {
  const teacherConflicts = React.useMemo(() => {
    const map = new Map<string, { id: string, name: string, count: number }>()
    unassignedBlocks.forEach(b => {
      if (!b.teacher_id) return
      const existing = map.get(b.teacher_id) || { id: b.teacher_id, name: b.teacher_name || 'Sin nombre', count: 0 }
      existing.count++
      map.set(b.teacher_id, existing)
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [unassignedBlocks])

  const groupConflicts = React.useMemo(() => {
    const map = new Map<string, { id: string, name: string, count: number }>()
    unassignedBlocks.forEach(b => {
      if (!b.group_id) return
      const existing = map.get(b.group_id) || { id: b.group_id, name: b.group_name || 'Sin nombre', count: 0 }
      existing.count++
      map.set(b.group_id, existing)
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [unassignedBlocks])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 z-50 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 dark:text-white">Analizador de Conflictos</h2>
                <p className="text-xs text-slate-500">{unassignedBlocks.length} bloques pendientes</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
             <button 
                onClick={onAutoGenerateGlobal}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Autogenerar Todo
              </button>
              <p className="text-[10px] text-center text-slate-500 mt-2">
                Presiona autogenerar para que el motor intente resolver todos los conflictos automáticamente.
              </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Docentes */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Docentes con Conflictos
              </h3>
              {teacherConflicts.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No hay docentes con bloques pendientes.</p>
              ) : (
                <div className="space-y-2">
                  {teacherConflicts.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelectEntity('teacher', t.id, t.name)
                        if (window.innerWidth < 1024) onClose()
                      }}
                      className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.name}</p>
                        <p className="text-xs text-rose-500 font-medium">{t.count} bloques pendientes</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grupos */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Grupos con Conflictos
              </h3>
              {groupConflicts.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No hay grupos con bloques pendientes.</p>
              ) : (
                <div className="space-y-2">
                  {groupConflicts.map(g => (
                    <button
                      key={g.id}
                      onClick={() => {
                        onSelectEntity('group', g.id, g.name)
                        if (window.innerWidth < 1024) onClose()
                      }}
                      className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{g.name}</p>
                        <p className="text-xs text-rose-500 font-medium">{g.count} bloques pendientes</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
