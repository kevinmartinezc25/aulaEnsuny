'use client'

import React, { useState, useEffect } from 'react'
import { Pencil, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { DocFolder } from '../../domain/entities/Document'
import { updateFolder } from '../../application/documentActions'

interface EditFolderModalProps {
  isOpen: boolean
  onClose: () => void
  folderId: string
  currentName: string
  currentDescription?: string | null
  onUpdated: (folder: DocFolder) => void
}

export function EditFolderModal({
  isOpen,
  onClose,
  folderId,
  currentName,
  currentDescription = '',
  onUpdated,
}: EditFolderModalProps) {
  const [folderName, setFolderName] = useState(currentName)
  const [folderDescription, setFolderDescription] = useState(currentDescription || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFolderName(currentName)
      setFolderDescription(currentDescription || '')
      setIsSubmitting(false)
    }
  }, [isOpen, currentName, currentDescription])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folderName.trim()) {
      toast.error('El nombre de la carpeta no puede estar vacío')
      return
    }

    const trimmedName = folderName.trim()
    const trimmedDesc = folderDescription.trim()
    const origName = currentName.trim()
    const origDesc = (currentDescription || '').trim()

    if (trimmedName === origName && trimmedDesc === origDesc) {
      onClose()
      return
    }

    setIsSubmitting(true)
    const { data, error } = await updateFolder(folderId, trimmedName, trimmedDesc)
    setIsSubmitting(false)

    if (error) {
      toast.error('Error al actualizar carpeta', { description: error })
      return
    }

    if (data) {
      toast.success(`Carpeta "${data.name}" actualizada exitosamente`)
      const updatedFolder: DocFolder = {
        ...data,
        description: trimmedDesc || null,
      }
      onUpdated(updatedFolder)
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
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Editar Carpeta
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modifica el nombre y la descripción de la carpeta
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
              Nombre de la Carpeta *
            </label>
            <input
              type="text"
              autoFocus
              required
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              placeholder="Nombre de la carpeta..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Descripción de la Carpeta
            </label>
            <textarea
              rows={3}
              value={folderDescription}
              onChange={e => setFolderDescription(e.target.value)}
              placeholder="Describe los contenidos, propósitos o acuerdos de esta carpeta..."
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
              disabled={isSubmitting || !folderName.trim()}
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
