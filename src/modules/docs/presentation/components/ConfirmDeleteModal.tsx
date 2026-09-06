'use client'

import React, { useState } from 'react'
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  itemName: string
  itemType: 'carpeta' | 'documento'
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
}: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-xs">
            <Trash2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ¿Estás seguro de que deseas eliminar {itemType === 'carpeta' ? 'la carpeta' : 'el documento'}{' '}
              <strong className="font-semibold text-slate-900 dark:text-white block mt-0.5 break-words">
                "{itemName}"
              </strong>
              ? Esta acción no se puede deshacer.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirm}
              className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
