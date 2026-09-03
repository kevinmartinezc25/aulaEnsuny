'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, FileText, CheckCircle2, AlertCircle, ExternalLink, Loader2, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { rectorProcessPostSupport } from '../../application/adminActions'

interface Props {
  isOpen: boolean
  requestId: string
  requestNumber: string
  teacherName: string
  postSupportName?: string | null
  postSupportUrl?: string | null
  postSupportSubmittedAt?: string | null
  teacherNotes?: string | null
  onClose: () => void
  onSuccess: () => void
}

export function RectorSupportReviewModal({
  isOpen,
  requestId,
  requestNumber,
  teacherName,
  postSupportName,
  postSupportUrl,
  postSupportSubmittedAt,
  teacherNotes,
  onClose,
  onSuccess
}: Props) {
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsProcessing(true)
    const toastId = toast.loading('Procesando revisión del soporte...')
    try {
      const res = await rectorProcessPostSupport(requestId, decision, notes.trim() || undefined)
      if (!res.success) {
        throw new Error(res.error || 'Error al procesar la revisión')
      }

      if (decision === 'approve') {
        toast.success('Soporte aprobado exitosamente. Permiso cerrado en conformidad.', { id: toastId })
      } else {
        toast.info('Soporte rechazado / devuelto al docente con observaciones.', { id: toastId })
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la revisión', { id: toastId })
    } finally {
      setIsProcessing(false)
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
          <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white relative">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
                  Revisión Directiva • SuperAdmin / Rector
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">
                  Validación de Soporte Post-Permiso
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Docente: <strong>{teacherName}</strong> | Expediente: <strong>{requestNumber}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Tarjeta de soporte entregado */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                Soporte Radicado por el Docente:
              </span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>{postSupportName || 'Constancia_Cumplimiento.pdf'}</span>
                </div>
                {postSupportUrl && (
                  <a
                    href={postSupportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <span>Ver archivo</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {postSupportSubmittedAt && (
                <p className="text-[11px] text-slate-500">
                  Radicado el: {new Date(postSupportSubmittedAt).toLocaleString('es-CO')}
                </p>
              )}
              {teacherNotes && (
                <p className="text-slate-600 dark:text-slate-400 italic text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                  "{teacherNotes}"
                </p>
              )}
            </div>

            {/* Selector de Decisión */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Decisión de Rectoría:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDecision('approve')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    decision === 'approve'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs block">Aprobar Soporte</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Cierre definitivo</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('reject')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    decision === 'reject'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Ban className="h-5 w-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs block">Rechazar / Devolver</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Solicitar ajuste</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Observaciones de Rectoría */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Observaciones del Rector (Opcional):
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Indique las razones de aprobación o especifique qué correcciones debe realizar el docente..."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer ${
                decision === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : decision === 'approve' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Aprobar Soporte y Cerrar Permiso</span>
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  <span>Devolver con Observaciones</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
