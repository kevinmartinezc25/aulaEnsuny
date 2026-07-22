'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Briefcase, BookOpen, Users, Clock, HelpCircle } from 'lucide-react'
import { CurriculumBlock } from '../engine/Generator'

interface UnassignedBlocksModalProps {
  isOpen: boolean
  onClose: () => void
  unassignedBlocks: CurriculumBlock[]
}

export default function UnassignedBlocksModal({
  isOpen,
  onClose,
  unassignedBlocks
}: UnassignedBlocksModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 z-50 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  Diagnóstico de Bloques No Asignados
                  <span className="px-2 py-0.5 text-xs font-black bg-amber-500 text-white rounded-full">
                    {unassignedBlocks.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  El motor de horarios no pudo ubicar los siguientes bloques sin generar choques de docentes o cruces de disponibilidad.
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
          <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
            {unassignedBlocks.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Materia</th>
                      <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Grupo</th>
                      <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Docente</th>
                      <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center">Duración</th>
                      <th className="px-3.5 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Causa / Conflicto Detectado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {unassignedBlocks.map((block, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3.5 py-3 font-medium text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span>{block.subject_name || block.subject_id}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{block.group_name || block.group_id}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{block.teacher_name || block.teacher_id || 'Sin asignar'}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-center align-middle">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold text-[11px]">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {block.duration} h
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-amber-700 dark:text-amber-400 font-medium">
                          <div className="flex items-start gap-1.5 bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                            <HelpCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-[11px] leading-tight">
                              {block.reason || 'Cruces de horario con la disponibilidad o carga del docente.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">
                <p className="text-sm font-semibold">No hay bloques sin asignar.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Entendido / Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
