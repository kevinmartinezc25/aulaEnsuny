'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { authenticatePlanillaStudent } from '@/modules/planilla-asistida/application/studentAuthActions'
import { Loader2, ArrowRight, ShieldCheck, CreditCard, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function StudentLoginClient() {
  const [documentId, setDocumentId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitizar en tiempo real: eliminar cualquier caracter no numérico
    const digitsOnly = e.target.value.replace(/\D/g, '')
    setDocumentId(digitsOnly)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir teclas de control/navegación
    const allowedKeys = ['Backspace', 'Tab', 'Enter', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (allowedKeys.includes(e.key)) return

    // Permitir combinaciones de teclado como Ctrl+A, Ctrl+C, Ctrl+V, etc.
    if (e.ctrlKey || e.metaKey) return

    // Bloquear cualquier tecla que no sea un dígito 0-9
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    // Extraer exclusivamente los dígitos numéricos
    const digitsOnly = text.replace(/\D/g, '')
    if (digitsOnly) {
      setDocumentId(digitsOnly.slice(0, 15))
    } else {
      toast.error('Solo se aceptan números en este campo.')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const docClean = documentId.trim().replace(/\D/g, '')
    if (!docClean) {
      toast.error('Por favor, ingresa tu número de documento de identidad.')
      return
    }

    try {
      setIsLoading(true)
      const result = await authenticatePlanillaStudent(docClean)
      if (result.success) {
        toast.success(`¡Bienvenido(a), ${result.studentName}!`)
        router.push('/consulta-calificaciones')
        router.refresh()
      } else {
        toast.error((result as any).message || 'Error al consultar la información.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al consultar la información.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-12 px-2">
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[32px] border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="p-7 sm:p-10">
          {/* Cabecera */}
          <div className="text-center mb-7">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-[#1F4E31] dark:text-emerald-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-[#1F4E31] dark:text-emerald-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Acceso de Solo Lectura</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
              Consulta Académica
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Consulta tus calificaciones y el horario correspondiente a tu grupo matriculado.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                Número de documento de identidad
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <CreditCard className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={documentId}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Ej: 1045234567"
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={15}
                  autoComplete="off"
                  className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#1F4E31] dark:focus:ring-emerald-500 focus:border-transparent transition-all text-base outline-none font-medium"
                  disabled={isLoading}
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Solo se admiten números (sin puntos, guiones, espacios ni letras).
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !documentId.trim()}
              className="w-full bg-[#1F4E31] hover:bg-[#183e27] text-white h-12 rounded-2xl text-sm sm:text-base font-bold shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all cursor-pointer dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Consultando información...</span>
                </>
              ) : (
                <>
                  <span>Consultar</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Aviso informativo de seguridad */}
          <div className="mt-7 flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              No necesitas contraseña ni correo para este módulo. Tus datos académicos oficiales se cargan automáticamente desde tu matrícula activa.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
