'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, AlertTriangle, ArrowRight, X, ShieldCheck } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function PermissionAdvanceNoticeModal({ isOpen, onClose, onConfirm }: Props) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-blue-100 block">
                  Reglamento Institucional aulaEnsuny
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">
                  Radicación con 8 Días de Anticipación
                </h3>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong className="block font-bold mb-1 text-amber-950 dark:text-amber-100">
                  Aviso para el cuerpo docente:
                </strong>
                Toda solicitud de permiso institucional debe adelantarse con al menos{' '}
                <strong>ocho (8) días calendario de anticipación</strong> a la fecha solicitada.
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Este plazo reglamentario permite a la <strong>Rectoría</strong> y a la{' '}
              <strong>Coordinación Académica</strong> planear oportunamente la cobertura de clases,
              asignar docentes de acompañamiento y garantizar la continuidad pedagógica sin alterar la
              jornada escolar.
            </p>

            <div className="space-y-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Plan de contingencia con actividades por cada grupo afectado.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Revisión directiva en doble instancia (Rectoría y Coordinación).</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Regresar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Entendido, Continuar con la Solicitud</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
