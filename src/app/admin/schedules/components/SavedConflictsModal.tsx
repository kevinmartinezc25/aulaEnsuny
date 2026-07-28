'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Users, BookOpen, Clock } from 'lucide-react'

interface SavedConflictsModalProps {
  isOpen: boolean
  onClose: () => void
  conflicts: any[][]
}

export default function SavedConflictsModal({ isOpen, onClose, conflicts }: SavedConflictsModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 z-[70] flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-red-50/50 dark:bg-red-950/20 border-b border-red-200/60 dark:border-red-900/40">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  Cruces de Docentes Detectados
                  <span className="px-2 py-0.5 text-xs font-black bg-red-500 text-white rounded-full">
                    {conflicts.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Los siguientes docentes están asignados a más de un grupo al mismo tiempo en el horario actual.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
            {conflicts.map((slotGroup, idx) => {
              const teacher = slotGroup[0].teacher ? `${slotGroup[0].teacher.first_name} ${slotGroup[0].teacher.last_name}`.trim() : 'Docente Desconocido'
              const day = slotGroup[0].day_of_week
              const period = slotGroup[0].period_id

              return (
                <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-3">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-500" />
                      {teacher}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{day} - {period}ª hora</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Clases solapadas:</p>
                    {slotGroup.map((slot, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-1.5 rounded-md">
                          <BookOpen className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {slot.subject?.name || 'Materia desconocida'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Grupo:</span> {slot.group?.name || 'Desconocido'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
