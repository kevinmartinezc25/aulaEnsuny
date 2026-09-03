'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, CheckCircle, XCircle, RotateCcw, AlertCircle } from 'lucide-react'

export type DecisionType = 'approve' | 'reject' | 'return'

interface Props {
  isOpen: boolean
  onClose: () => void
  decisionType: DecisionType
  roleContext: 'rector' | 'coordinator'
  requestNumber: string
  teacherName: string
  onConfirm: (payload: { decision: DecisionType; notes: string; reason: string }) => Promise<void>
}

export function ApprovalDecisionModal({
  isOpen,
  onClose,
  decisionType,
  roleContext,
  requestNumber,
  teacherName,
  onConfirm
}: Props) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const isReject = decisionType === 'reject'
  const isReturn = decisionType === 'return'
  const isApprove = decisionType === 'approve'

  const title = isApprove
    ? 'Aprobar Solicitud de Permiso'
    : isReturn
    ? 'Devolver Solicitud para Corrección'
    : 'Rechazar Solicitud de Permiso'

  const description = isApprove
    ? roleContext === 'rector'
      ? 'La solicitud pasará a Coordinación Académica para verificación de cobertura y aprobación final.'
      : 'La solicitud quedará aprobada definitivamente con su constancia oficial.'
    : isReturn
    ? 'El docente recibirá una notificación con las observaciones para ajustar su solicitud y reenviarla.'
    : 'La solicitud será cerrada como rechazada con la justificación ingresada.'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if ((isReject || isReturn) && (!reason || reason.trim().length < 5)) {
      setError('La justificación u observación es obligatoria (mínimo 5 caracteres).')
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm({
        decision: decisionType,
        notes: notes.trim(),
        reason: reason.trim()
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al procesar decisión.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isApprove
                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : isReturn
                  ? 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                  : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
              }`}
            >
              {isApprove && <CheckCircle className="h-5 w-5" />}
              {isReturn && <RotateCcw className="h-5 w-5" />}
              {isReject && <XCircle className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <p className="text-xs text-slate-500">
                {requestNumber} — Docente: {teacherName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {(isReject || isReturn) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isReturn ? 'Observaciones / Cambios requeridos *' : 'Justificación / Motivo del rechazo *'}
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={
                  isReturn
                    ? 'Describa qué documentos o datos debe ajustar el docente...'
                    : 'Explique la razón institucional por la cual no se aprueba el permiso...'
                }
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {isApprove && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Observaciones institucionales (opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observaciones adicionales que se registrarán en el expediente..."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : isReturn
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting
                ? 'Procesando...'
                : isApprove
                ? 'Confirmar Aprobación'
                : isReturn
                ? 'Devolver Solicitud'
                : 'Confirmar Rechazo'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
