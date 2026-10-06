'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, CheckCircle } from 'lucide-react'

interface Props {
  isOpen: boolean
  title: string
  description: string
  confirmText: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onClose: () => void
  onConfirm: () => void
}

export function PermissionConfirmModal({
  isOpen,
  title,
  description,
  confirmText,
  cancelText = 'Cancelar',
  type = 'warning',
  onClose,
  onConfirm
}: Props) {
  if (!isOpen) return null

  const getThemeColors = () => {
    switch (type) {
      case 'danger':
        return {
          headerBg: 'from-rose-600 to-red-700',
          iconBg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20',
          icon: <AlertTriangle className="h-6 w-6" />
        }
      case 'info':
        return {
          headerBg: 'from-blue-600 to-indigo-700',
          iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20',
          icon: <CheckCircle className="h-6 w-6 text-white" />
        }
      case 'warning':
      default:
        return {
          headerBg: 'from-amber-500 to-orange-600',
          iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20',
          icon: <AlertTriangle className="h-6 w-6 text-white" />
        }
    }
  }

  const theme = getThemeColors()

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className={`p-5 bg-gradient-to-r ${theme.headerBg} text-white relative flex flex-col items-center justify-center text-center`}>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs mb-3">
              {theme.icon}
            </div>
            <h3 className="text-lg font-bold text-white leading-tight">
              {title}
            </h3>
          </div>

          {/* Body */}
          <div className="p-6 text-center">
            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer ${theme.confirmBtn}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
