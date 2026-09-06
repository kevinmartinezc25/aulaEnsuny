'use client'

import React, { useState, useEffect } from 'react'
import { Pencil, X, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { updateDocument } from '../../application/documentActions'

interface EditDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  currentTitle: string
  currentDescription?: string | null
  onUpdated: () => void
}

export function EditDocumentModal({
  isOpen,
  onClose,
  documentId,
  currentTitle,
  currentDescription,
  onUpdated,
}: EditDocumentModalProps) {
  const [title, setTitle] = useState(currentTitle)
  const [description, setDescription] = useState(currentDescription || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle)
      setDescription(currentDescription || '')
      setIsSubmitting(false)
    }
  }, [isOpen, currentTitle, currentDescription])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('El título del documento es obligatorio')
      return
    }

    setIsSubmitting(true)
    const { data, error } = await updateDocument(documentId, {
      title: title.trim(),
      description: description.trim() || null,
    })
    setIsSubmitting(false)

    if (error) {
      toast.error('Error al actualizar documento', { description: error })
      return
    }

    if (data) {
      toast.success(`Documento "${data.title}" actualizado exitosamente`)
      onUpdated()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#0071e3] dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Editar Documento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modifica el título y descripción del archivo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Título del Documento *
            </label>
            <input
              type="text"
              autoFocus
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre del documento..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Descripción / Resumen
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Breve descripción del contenido..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0071e3] hover:bg-[#005bb5] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
