'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, X, FileText, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { submitPermissionPostSupport } from '../../application/actions'

interface Props {
  requestId: string
  requestNumber: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PermissionPostSupportModal({
  requestId,
  requestNumber,
  isOpen,
  onClose,
  onSuccess
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      const ext = selected.name.split('.').pop()?.toLowerCase() || ''
      const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
      if (!allowed.includes(ext)) {
        toast.error('Formato no permitido. Solo se aceptan archivos PDF, JPG, PNG, DOC y DOCX.')
        return
      }
      if (selected.size > 15 * 1024 * 1024) {
        toast.error('El archivo excede el tamaño máximo permitido (15 MB).')
        return
      }
      setFile(selected)
      setFileName(selected.name)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileName) {
      toast.error('Debe adjuntar el archivo de soporte o constancia de cumplimiento')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('Radicando soporte post-permiso...')
    try {
      const fakeUrl = `https://storage.ensuny.edu.co/permissions/post-supports/${Date.now()}_${fileName}`
      const res = await submitPermissionPostSupport(requestId, {
        fileUrl: fakeUrl,
        fileName,
        notes: notes.trim() || undefined
      })

      if (!res.success) {
        throw new Error(res.error || 'Error al radicar soporte')
      }

      toast.success('Soporte radicado exitosamente. En revisión por Rectoría (Plazo máx: 3 días).', { id: toastId })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al adjuntar soporte', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <div className="p-6 bg-slate-900 text-white relative">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center">
                <UploadCloud className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 block">
                  Cierre de Trámite Institucional
                </span>
                <h3 className="text-lg font-bold text-white">
                  Adjuntar Soporte Post-Permiso
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Expediente: <strong className="text-white">{requestNumber}</strong>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {/* Alerta de plazo institucional (3 días) */}
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  <strong className="font-semibold block mb-0.5">Revisión de Rectoría:</strong>
                  Una vez adjuntado, el soporte entra a revisión directiva. El Rector (SuperAdmin) validará la constancia en un tiempo máximo de <strong>tres (3) días hábiles</strong>.
                </div>
              </div>

              {/* Selector de Archivo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Documento de Soporte o Constancia *
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-800/30 text-center relative transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {fileName ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                      <FileText className="h-5 w-5" />
                      <span>{fileName}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Haga clic o arrastre el archivo de soporte aquí
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Formatos válidos: PDF, JPG, PNG, DOC (Máx. 15 MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas u observaciones */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Observaciones / Descripción del Soporte (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej: Adjunto certificado médico emitido por la EPS o constancia de asistencia a la diligencia..."
                  disabled={isSubmitting}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !fileName}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Radicando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Radicar Soporte para Rectoría</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
