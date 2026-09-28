'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mail, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  Edit3, 
  Settings,
  Loader2 
} from 'lucide-react'
import Link from 'next/link'
import { getStudentEmailStatus, saveOrUpdateStudentEmail } from '../../application/studentEmailActions'

interface StudentVirtualCourseModalProps {
  isOpen: boolean
  onClose: () => void
  onEmailUpdated?: (newEmail: string) => void
}

export function StudentVirtualCourseModal({
  isOpen,
  onClose,
  onEmailUpdated
}: StudentVirtualCourseModalProps) {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inputEmail, setInputEmail] = useState('')
  const [hasEmail, setHasEmail] = useState(false)
  const [fullName, setFullName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successSaved, setSuccessSaved] = useState(false)

  // Cargar estado del correo al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadStatus()
    } else {
      setIsEditing(false)
      setErrorMessage(null)
      setSuccessSaved(false)
    }
  }, [isOpen])

  // Cerrar al pulsar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  async function loadStatus() {
    setLoading(true)
    setErrorMessage(null)
    try {
      const status = await getStudentEmailStatus()
      setEmail(status.email)
      setInputEmail(status.email)
      setHasEmail(status.hasEmail)
      setFullName(status.fullName)
    } catch (err) {
      console.error('Error cargando estado del correo:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const clean = inputEmail.trim().toLowerCase()
    if (!clean) {
      setErrorMessage('Por favor escribe tu correo electrónico.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(clean)) {
      setErrorMessage('Ingresa un formato de correo válido (ej: nombre@gmail.com).')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await saveOrUpdateStudentEmail(clean)
      if (!res.success) {
        setErrorMessage(res.error || 'No se pudo guardar el correo. Intenta nuevamente.')
      } else {
        setEmail(clean)
        setHasEmail(true)
        setIsEditing(false)
        setSuccessSaved(true)
        if (onEmailUpdated) onEmailUpdated(clean)
        setTimeout(() => setSuccessSaved(false), 3000)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión al guardar el correo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop con Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        />

        {/* Contenedor Modal Centrado (Cuadro Compacto) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-[92vw] max-w-[340px] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800"
        >
          {/* Botón Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="p-5 overflow-y-auto max-h-[85vh]">
            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-2.5">
                <Loader2 className="h-7 w-7 text-teal-600 animate-spin" />
                <p className="text-[11px] text-slate-400 font-medium">Verificando requisitos...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cabecera con Icono */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    {hasEmail && !isEditing ? (
                      <BookOpen className="h-5 w-5" />
                    ) : (
                      <Mail className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      <Sparkles className="h-2.5 w-2.5" />
                      Campus Virtual
                    </span>
                    <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                      {hasEmail && !isEditing ? 'Acceso Habilitado' : 'Requisito: Correo'}
                    </h2>
                  </div>
                </div>

                {/* Banner de feedback si se guardó */}
                {successSaved && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>¡Correo guardado correctamente!</span>
                  </motion.div>
                )}

                {/* ESTADO 1: YA TIENE CORREO (Y NO ESTÁ EDITANDO) */}
                {hasEmail && !isEditing ? (
                  <div className="space-y-3.5">
                    {/* Tarjeta de Correo Actual */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 shrink-0 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase font-bold text-slate-400">Correo Vinculado</p>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                            {email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInputEmail(email)
                          setIsEditing(true)
                        }}
                        className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 shrink-0 px-1.5 py-0.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Cambiar</span>
                      </button>
                    </div>

                    {/* Mensaje de acceso al campus */}
                    <div className="rounded-xl border border-teal-200/70 dark:border-teal-900/40 bg-teal-50/70 dark:bg-teal-950/20 p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 text-[11px] font-bold">
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                        <span>Acceso al Campus Virtual</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-teal-900/80 dark:text-teal-200/80">
                        Tu correo ya está registrado. Ingresa al campus virtual y matricúlate en tus asignaturas desde el botón <strong>Agregar curso</strong>.
                      </p>
                    </div>

                    <div className="pt-1 flex flex-col gap-2">
                      <Link
                        href="/student/courses"
                        onClick={onClose}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-sm"
                      >
                        <span>Ir al Campus Virtual</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-[11px] font-semibold text-slate-600 dark:text-slate-400 transition-colors"
                      >
                        <span>Cerrar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ESTADO 2: NO TIENE CORREO O ESTÁ EDITANDO */
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Para acceder a tus contenidos en línea y notificaciones de tus docentes, registra un correo personal o institucional válido.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                        </div>
                        <input
                          type="email"
                          required
                          value={inputEmail}
                          onChange={(e) => {
                            setInputEmail(e.target.value)
                            if (errorMessage) setErrorMessage(null)
                          }}
                          placeholder="ejemplo@correo.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-3 focus:ring-teal-500/10"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Se guardará en tu Configuración de Cuenta.
                      </p>
                    </div>

                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-1.5 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[11px] font-medium"
                      >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                      </motion.div>
                    )}

                    <div className="pt-1 flex items-center gap-2">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false)
                            setInputEmail(email)
                            setErrorMessage(null)
                          }}
                          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 transition-colors"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <span>Guardar y Vincular</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

