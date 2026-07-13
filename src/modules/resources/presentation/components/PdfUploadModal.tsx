'use client'

import React, { useState, useRef } from 'react'
import { UploadCloud, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { uploadPdfAction } from '../actions/resourceActions'
import { toast } from 'sonner'

interface PdfUploadModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  courseName: string
  moduleId?: string
  moduleName?: string
  uploadedBy: string
  onSuccess?: (resource: any) => void
}

export function PdfUploadModal({ isOpen, onClose, courseId, courseName, moduleId, moduleName, uploadedBy, onSuccess }: PdfUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleFileSelection = (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF.')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('El archivo excede el límite de 10MB.')
      return
    }
    setFile(selectedFile)
    if (!title) {
      // Auto-fill title with file name without extension
      setTitle(selectedFile.name.replace('.pdf', ''))
    }
  }

  const handleUpload = async () => {
    if (!file || !title) {
      toast.error('El archivo y el título son obligatorios.')
      return
    }

    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('courseId', courseId)
    formData.append('courseName', courseName)
    if (moduleId) formData.append('moduleId', moduleId)
    if (moduleName) formData.append('moduleName', moduleName)
    formData.append('uploadedBy', uploadedBy)

    try {
      const result = await uploadPdfAction(formData)
      if (result.success) {
        toast.success('Archivo subido exitosamente a Google Drive.')
        onSuccess?.(result.resource)
        onClose()
      } else {
        toast.error(result.error || 'Error al subir el archivo.')
      }
    } catch (err) {
      toast.error('Error de conexión.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={!isUploading ? onClose : undefined} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-slate-900 ring-1 ring-slate-900/5 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800/60">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Subir Material PDF
          </h2>
          <button 
            onClick={onClose} 
            disabled={isUploading}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* File Upload Area */}
          {!file ? (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-900/20' 
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50'
              }`}
            >
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange}
              />
              <div className="rounded-full bg-white p-3 shadow-sm dark:bg-slate-900 mb-4 ring-1 ring-slate-900/5">
                <UploadCloud className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Arrastra tu PDF aquí o <span className="text-blue-600 dark:text-blue-400">explora</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Solo archivos PDF hasta 10MB
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={() => setFile(null)}
                disabled={isUploading}
                className="p-2 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Título del Recurso</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Guía Práctica de Cinemática"
                disabled={isUploading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Descripción <span className="text-slate-400 font-normal">(Opcional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción del contenido..."
                rows={3}
                disabled={isUploading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>
            
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>El archivo se guardará en Google Drive bajo: <span className="font-semibold">{courseName} {moduleName ? `/ ${moduleName}` : ''}</span></p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800/60 dark:bg-slate-800/20 flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isUploading}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={handleUpload}
            disabled={!file || !title || isUploading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo a Drive...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                Confirmar y Subir
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
