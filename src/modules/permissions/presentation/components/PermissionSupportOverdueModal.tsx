'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Clock, ArrowRight, X, FileText, Calendar } from 'lucide-react'
import { PermissionRequest } from '../../domain/entities'

interface Props {
  isOpen: boolean
  overdueRequest: PermissionRequest | null
  onClose: () => void
  onOpenUpload: (req: PermissionRequest) => void
}

export function PermissionSupportOverdueModal({
  isOpen,
  overdueRequest,
  onClose,
  onOpenUpload
}: Props) {
  if (!isOpen || !overdueRequest) return null

  // Calcular días transcurridos desde la fecha de finalización
  const endDate = new Date(overdueRequest.endDate)
  const today = new Date()
  endDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const daysElapsed = Math.max(0, Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-rose-400 dark:border-rose-700/80 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-rose-600 to-red-700 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <AlertTriangle className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-100 block">
                  Alerta Preventiva Institucional
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">
                  Plazo de Entrega de Soporte Vencido
                </h3>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-950 dark:text-rose-200 leading-relaxed space-y-1">
              <p className="font-bold text-rose-900 dark:text-rose-100 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-rose-600 shrink-0" />
                Han transcurrido {daysElapsed} días desde la finalización de su permiso.
              </p>
              <p className="text-[11px] text-rose-800/90 dark:text-rose-300/90">
                Al haber superado los 5 días de vigencia, el reglamento docente institucional le exige
                adjuntar el soporte justificativo o constancia de cumplimiento en un plazo máximo e improrrogable de{' '}
                <strong className="underline">dos (2) días hábiles</strong> para revisión de Rectoría.
              </p>
            </div>

            {/* Ficha de la solicitud vencida */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Expediente:</span>
                <span className="font-bold text-slate-900 dark:text-white">{overdueRequest.requestNumber}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tipo:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{overdueRequest.typeSnapshot.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Finalizó el:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {overdueRequest.endDate}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium block mb-0.5">Motivo radicado:</span>
                <p className="text-slate-700 dark:text-slate-300 italic text-[11px] line-clamp-2">
                  "{overdueRequest.reason}"
                </p>
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
              Cerrar por ahora
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenUpload(overdueRequest)
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Adjuntar Soporte Ahora</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
