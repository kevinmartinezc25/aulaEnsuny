'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, ArrowRight, X, Clock, ShieldAlert } from 'lucide-react'

interface PendingPermissionsAlertModalProps {
  isOpen: boolean
  count: number
  role: 'superadmin' | 'admin'
  onClose: () => void
  onReview: () => void
}

export function PendingPermissionsAlertModal({
  isOpen,
  count,
  role,
  onClose,
  onReview
}: PendingPermissionsAlertModalProps) {
  if (!isOpen) return null

  const isRector = role === 'superadmin'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-blue-500/10 dark:bg-blue-500/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-500/10 dark:bg-amber-500/15 blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Cerrar notificación"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header & Icon */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 shadow-xs">
              <FileText className="h-7 w-7" />
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-white shadow-xs">
                {count > 9 ? '9+' : count}
              </span>
            </div>

            <div className="pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 mb-1.5">
                <ShieldAlert className="h-3 w-3" />
                {isRector ? 'Rectoría Institucional' : 'Coordinación Académica'}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Nuevas solicitudes pendientes de permiso
              </h3>
            </div>
          </div>

          {/* Body */}
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            {isRector ? (
              <>
                Se {count === 1 ? 'ha registrado' : 'han registrado'}{' '}
                <strong className="text-slate-900 dark:text-white font-semibold">
                  {count} {count === 1 ? 'solicitud de permiso docente pendiente' : 'solicitudes de permiso docente pendientes'}
                </strong>{' '}
                de revisión y decisión por Rectoría.
              </>
            ) : (
              <>
                Tienes{' '}
                <strong className="text-slate-900 dark:text-white font-semibold">
                  {count} {count === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
                </strong>{' '}
                de verificación o asignación de cobertura en el módulo de Permisos.
              </>
            )}
          </p>

          {/* Context box */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-100 dark:border-slate-800 mb-6 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>
              Revisa los soportes adjuntos y gestiona el trámite para asegurar la oportuna continuidad de las clases.
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={onReview}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-3 px-4 text-sm font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              <span>Revisar</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Más tarde
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
