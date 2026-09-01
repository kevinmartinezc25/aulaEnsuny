'use client'

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import SignaturePad from 'signature_pad'
import { Eraser, CheckCircle2 } from 'lucide-react'

export interface SignatureCanvasRef {
  isEmpty: () => boolean
  clear: () => void
  getDataURL: () => string | null
  getBlob: () => Promise<Blob | null>
}

interface Props {
  onBegin?: () => void
  onEnd?: () => void
  disabled?: boolean
  className?: string
  defaultConfirmed?: boolean
}

export const SignatureCanvas = forwardRef<SignatureCanvasRef, Props>(
  ({ onBegin, onEnd, disabled = false, className = '', defaultConfirmed = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const padRef = useRef<SignaturePad | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [confirmed, setConfirmed] = useState(defaultConfirmed)

    // Inicializar pad y manejar resize
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Initialize pad
      padRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: 'rgb(15, 23, 42)', // slate-900
        minWidth: 1.5,
        maxWidth: 3,
      })

      if (disabled || confirmed) {
        padRef.current.off()
      } else {
        padRef.current.on()
      }

      // Handle resize for high DPI screens
      const resizeCanvas = () => {
        const parent = containerRef.current
        if (!parent || !canvas) return

        // Save data to restore after resize
        const data = padRef.current?.toData()

        const ratio = Math.max(window.devicePixelRatio || 1, 1)
        const rect = parent.getBoundingClientRect()
        
        // Ajustamos la resolución interna
        canvas.width = rect.width * ratio
        canvas.height = rect.height * ratio
        
        // Ajustamos el tamaño visual
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`
        
        canvas.getContext('2d')?.scale(ratio, ratio)

        if (padRef.current) {
          padRef.current.clear()
          if (data && data.length > 0) {
            padRef.current.fromData(data)
          }
        }
      }

      window.addEventListener('resize', resizeCanvas)
      // Ejecutar una vez al montar, con un pequeño delay para asegurar dimensiones de layout
      setTimeout(resizeCanvas, 50)

      return () => {
        window.removeEventListener('resize', resizeCanvas)
        if (padRef.current) {
          padRef.current.off()
        }
      }
    }, [disabled, confirmed])

    // Escuchar eventos
    useEffect(() => {
      const pad = padRef.current
      if (!pad) return

      const handleBegin = () => {
        if (onBegin) onBegin()
      }
      
      const handleEnd = () => {
        if (onEnd) onEnd()
      }

      pad.addEventListener('beginStroke', handleBegin)
      pad.addEventListener('endStroke', handleEnd)

      return () => {
        pad.removeEventListener('beginStroke', handleBegin)
        pad.removeEventListener('endStroke', handleEnd)
      }
    }, [onBegin, onEnd])

    // Update disabled state
    useEffect(() => {
      if (!padRef.current) return
      if (disabled || confirmed) {
        padRef.current.off()
      } else {
        padRef.current.on()
      }
    }, [disabled, confirmed])

    // Exponer métodos
    useImperativeHandle(ref, () => ({
      isEmpty: () => {
        return padRef.current?.isEmpty() ?? true
      },
      clear: () => {
        padRef.current?.clear()
        setConfirmed(false)
        if (onEnd) onEnd()
      },
      getDataURL: () => {
        if (padRef.current?.isEmpty()) return null
        // Retorna PNG con fondo transparente
        return padRef.current?.toDataURL('image/png') ?? null
      },
      getBlob: () => {
        return new Promise((resolve) => {
          const canvas = canvasRef.current
          if (!canvas || padRef.current?.isEmpty()) {
            resolve(null)
            return
          }
          canvas.toBlob((blob) => {
            resolve(blob)
          }, 'image/png')
        })
      }
    }))

    const handleClear = () => {
      padRef.current?.clear()
      setConfirmed(false)
      if (onEnd) onEnd()
    }

    const toggleConfirm = () => {
      if (!confirmed && padRef.current?.isEmpty()) return
      setConfirmed(!confirmed)
    }

    return (
      <div className={`space-y-3 ${className}`}>
        {/* Canvas Container */}
        <div 
          ref={containerRef}
          className={`relative w-full h-48 md:h-64 rounded-xl border-2 overflow-hidden transition-colors ${
            confirmed 
              ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-900/10' 
              : disabled
                ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        >
          {/* Instrucción visual si está vacío */}
          {!confirmed && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
              <span className="text-slate-400 dark:text-slate-500 font-medium text-sm md:text-base select-none">
                Firme aquí (usa el mouse o dedo)
              </span>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none dark:invert"
            style={{ touchAction: 'none' }}
          />

          {/* Overlay de confirmado */}
          {confirmed && (
            <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] pointer-events-none" />
          )}
        </div>

        {/* Acciones */}
        {!disabled && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              disabled={confirmed}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eraser className="h-4 w-4" /> Limpiar
            </button>

            <button
              type="button"
              onClick={toggleConfirm}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                confirmed
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30'
                  : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'
              }`}
            >
              {confirmed ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Firma bloqueada
                </>
              ) : (
                'Bloquear firma'
              )}
            </button>
          </div>
        )}
      </div>
    )
  }
)

SignatureCanvas.displayName = 'SignatureCanvas'
