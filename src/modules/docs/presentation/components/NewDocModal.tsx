'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Plus, Tag as TagIcon, FolderPlus, Loader2, Check, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { DocFolder, DocTag } from '@/modules/docs/domain/entities/Document'
import { DocumentStatus } from '@/modules/docs/domain/value-objects/DocumentStatus'
import { getAllTags, createTag, createFolder } from '@/modules/docs/application/documentActions'

interface NewDocModalProps {
  folderId: string | null
  folders: DocFolder[]
  onConfirm: (payload: {
    title: string
    description: string
    folderId: string | null
    base64File: string | null
    fileName: string | null
    mimeType: string | null
    fileSize: number | null
    tagIds: string[]
    status: DocumentStatus
  }) => Promise<void>
  onClose: () => void
  initialDoc?: {
    id: string
    title: string
    description: string | null
    folderId: string | null
    status?: DocumentStatus
    tags?: DocTag[]
  }
}

function getFormattedFolders(folders: DocFolder[]): { id: string; name: string }[] {
  const map: Record<string, DocFolder & { childIds: string[] }> = {}
  const roots: string[] = []

  folders.forEach(f => {
    map[f.id] = { ...f, childIds: [] }
  })

  folders.forEach(f => {
    if (f.parentId && map[f.parentId]) {
      map[f.parentId].childIds.push(f.id)
    } else {
      roots.push(f.id)
    }
  })

  const result: { id: string; name: string }[] = []

  function traverse(id: string, depth: number) {
    const folder = map[id]
    if (!folder) return
    const prefix = '— '.repeat(depth)
    result.push({ id: folder.id, name: `${prefix}${folder.name}` })
    folder.childIds.forEach(childId => traverse(childId, depth + 1))
  }

  roots.forEach(rootId => traverse(rootId, 0))
  return result
}

export function NewDocModal({
  folderId,
  folders: initialFolders,
  onConfirm,
  onClose,
  initialDoc
}: NewDocModalProps) {
  const [title, setTitle] = useState(initialDoc?.title ?? '')
  const [description, setDescription] = useState(initialDoc?.description ?? '')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(initialDoc?.folderId ?? folderId)
  const [status, setStatus] = useState<DocumentStatus>(initialDoc?.status ?? 'published')
  const [folders, setFolders] = useState<DocFolder[]>(initialFolders)

  // File states
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Tags states
  const [availableTags, setAvailableTags] = useState<DocTag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialDoc?.tags?.map(t => t.id) ?? []
  )
  const [newTagName, setNewTagName] = useState('')
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  // Inline Category states
  const [showNewFolderForm, setShowNewFolderForm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // Load tags
  const [isLoadingTags, setIsLoadingTags] = useState(true)

  useEffect(() => {
    async function loadTags() {
      setIsLoadingTags(true)
      const { data, error } = await getAllTags()
      setIsLoadingTags(false)
      if (error) {
        toast.error('Error al cargar etiquetas')
      } else {
        setAvailableTags(data ?? [])
      }
    }
    loadTags()
  }, [])

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      setFile(selected)
      if (!title) {
        // Auto-fill title with file name minus extension
        const baseName = selected.name.substring(0, selected.name.lastIndexOf('.')) || selected.name
        setTitle(baseName)
      }
    }
  }

  // Create tag on the fly
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    setIsCreatingTag(true)
    const color = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'][Math.floor(Math.random() * 6)]
    const { data, error } = await createTag(newTagName.trim(), color)
    setIsCreatingTag(false)
    if (error) {
      toast.error('Error al crear etiqueta', { description: error })
    } else if (data) {
      setAvailableTags(prev => [...prev, data])
      setSelectedTags(prev => [...prev, data.id])
      setNewTagName('')
      toast.success(`Etiqueta #${data.name} creada`)
    }
  }

  // Create category on the fly
  const handleCreateFolderInline = async () => {
    if (!newFolderName.trim()) return
    setIsCreatingFolder(true)
    const { data, error } = await createFolder(newFolderName.trim())
    setIsCreatingFolder(false)
    if (error) {
      toast.error('Error al crear categoría', { description: error })
    } else if (data) {
      setFolders(prev => [...prev, data])
      setSelectedFolder(data.id)
      setNewFolderName('')
      setShowNewFolderForm(false)
      toast.success(`Categoría "${data.name}" creada`)
    }
  }

  // Helper to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1]
        resolve(base64String)
      }
      reader.onerror = error => reject(error)
    })
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('El título es obligatorio')
      return
    }
    if (!initialDoc && !file) {
      toast.error('Debes seleccionar un archivo para el documento')
      return
    }

    setIsUploading(true)
    try {
      let base64File: string | null = null
      let fileName: string | null = null
      let mimeType: string | null = null
      let fileSize: number | null = null

      if (file) {
        base64File = await fileToBase64(file)
        fileName = file.name
        mimeType = file.type || 'application/octet-stream'
        fileSize = file.size
      }

      await onConfirm({
        title: title.trim(),
        description: description.trim(),
        folderId: selectedFolder,
        base64File,
        fileName,
        mimeType,
        fileSize,
        tagIds: selectedTags,
        status
      })
      onClose()
    } catch (err: any) {
      toast.error('Error al guardar el documento', { description: err.message })
    } finally {
      setIsUploading(false)
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-y-auto"
    >
      {/* Top navigation row */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200/40 dark:border-slate-850/60 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-85 bg-slate-50 hover:bg-slate-100 text-slate-750 hover:text-slate-900 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al repositorio</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            {initialDoc ? 'Editar Documento' : 'Subir Nuevo Documento'}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form Body Container */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: File & Basic Info */}
            <div className="space-y-5">
              {/* File Upload Zone */}
              {!initialDoc && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Archivo de Google Drive *
                  </label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-8 text-center hover:bg-slate-50/10 dark:hover:bg-slate-955/10 transition-all cursor-pointer relative group min-h-[160px] flex flex-col justify-center items-center">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      required={!initialDoc}
                    />
                    <div className="space-y-3">
                      <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center mx-auto transition-transform group-hover:scale-105">
                        <Upload className="h-6 w-6" />
                      </div>
                      {file ? (
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate max-w-xs mx-auto">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-slate-650 dark:text-slate-400">
                            Arrastra tu archivo aquí o haz clic para seleccionar
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            PDF, Word, Excel, PPT, Imágenes, ZIP (Max. 50MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Título del Documento *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all font-medium"
                  placeholder="Ej. PEI - Proyecto Educativo Institucional"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Descripción Breve
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all resize-none font-medium"
                  placeholder="Escribe un resumen o detalles breves del documento..."
                />
              </div>
            </div>

            {/* Right Column: Categories & Tags */}
            <div className="space-y-5">
              {/* Category / Folder Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Categoría / Carpeta *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewFolderForm(!showNewFolderForm)}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <FolderPlus className="h-3 w-3" />
                    Nueva Categoría
                  </button>
                </div>

                {showNewFolderForm ? (
                  <motion.div
                     initial={{ opacity: 0, y: -5 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800"
                   >
                     <input
                       type="text"
                       value={newFolderName}
                       onChange={e => setNewFolderName(e.target.value)}
                       placeholder="Nombre de categoría"
                       className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                     />
                     <button
                       type="button"
                       onClick={handleCreateFolderInline}
                       disabled={isCreatingFolder || !newFolderName.trim()}
                       className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                     >
                       {isCreatingFolder ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                       Crear
                     </button>
                  </motion.div>
                ) : (
                  <select
                    value={selectedFolder ?? ''}
                    onChange={e => setSelectedFolder(e.target.value || null)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all font-semibold"
                    required
                  >
                    <option value="">-- Selecciona una categoría --</option>
                    {getFormattedFolders(folders).map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Status Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Estado del Documento *
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all font-semibold"
                  required
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Etiquetas (Tags)
                </label>
                
                {/* Tag selector list */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-200/60 dark:border-slate-800/60 rounded-xl bg-slate-50/50 dark:bg-slate-955/40">
                  {availableTags.map(tag => {
                    const isSelected = selectedTags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        #{tag.name}
                      </button>
                    )
                  })}
                  {availableTags.length === 0 && (
                    <span className="text-[10px] text-slate-400 p-1">
                      {isLoadingTags ? 'Cargando etiquetas...' : 'No hay etiquetas creadas. Crea una abajo.'}
                    </span>
                  )}
                </div>

                {/* Inline tag creator */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    placeholder="Crear otra etiqueta (Ej. Física)"
                    className="flex-1 px-3 py-2 text-[11px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateTag()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    disabled={isCreatingTag || !newTagName.trim()}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {isCreatingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading || !title.trim()}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-100 dark:shadow-none flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Subiendo a Google Drive...</span>
                </>
              ) : (
                <span>{initialDoc ? 'Actualizar' : 'Guardar y Subir'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
