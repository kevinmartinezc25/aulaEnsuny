'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PwaWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PwaWelcomeModal({ isOpen, onClose }: PwaWelcomeModalProps) {
  // Manejo de la tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Telón de fondo con desenfoque de material Cupertino */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Tarjeta modal con físicas de resorte (Apple Spring) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{
              type: 'spring',
              damping: 26,
              stiffness: 280,
              mass: 0.8,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-welcome-title"
            className="relative w-full max-w-sm rounded-[28px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 shadow-2xl shadow-emerald-950/20 text-center flex flex-col items-center gap-5 z-10"
          >
            {/* Botón de cierre sutil */}
            <button
              onClick={onClose}
              type="button"
              aria-label="Cerrar mensaje de bienvenida"
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-90 duration-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Encabezado: Mensaje principal */}
            <div className="space-y-1.5 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold mb-1 border border-emerald-200/50 dark:border-emerald-800/50">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>Aplicación Instalada</span>
              </div>
              <h2
                id="pwa-welcome-title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              >
                Bienvenido a aulaEnsuny
              </h2>
            </div>

            {/* Icono oficial situado justo debajo del mensaje, proporcional al texto */}
            <div className="relative group my-1">
              {/* Resplandor sutil detrás del icono */}
              <div className="absolute -inset-2 rounded-[26px] bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 blur-lg opacity-80 group-hover:opacity-100 transition-opacity" />

              {/* Contenedor squircle oficial */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-[#10B981] to-[#1F4E31] flex items-center justify-center text-white shadow-lg shadow-emerald-900/25 ring-1 ring-white/30 dark:ring-white/10 transition-transform active:scale-95 duration-100">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[2.2]" />
              </div>
            </div>

            {/* Subtexto descriptivo institucional */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
              Tu portal escolar integral de la Escuela Normal Superior del Nordeste ahora está listo en tu dispositivo.
            </p>

            {/* Botón de acción principal */}
            <Button
              onClick={onClose}
              type="button"
              className="w-full rounded-full bg-[#1F4E31] hover:bg-[#183e27] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-semibold text-sm py-2.5 h-11 shadow-sm shadow-emerald-950/20 active:scale-[0.97] transition-all duration-100 cursor-pointer"
            >
              Comenzar
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
