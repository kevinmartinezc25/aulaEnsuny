'use client'

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, UploadCloud, FileText, CheckCircle2, Folder,
  Tag as TagIcon, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import type { DocFolder, DocTag } from '../../domain/entities/Document'
import { DocumentStatus } from '../../domain/value-objects/DocumentStatus'
import {
  getAllFolders, getAllTags, createDocument, createTag, toggleDocumentTag
} from '../../application/documentActions'
import { INSTITUTION_INFO } from '../../domain/constants/knowledgeCatalog'

interface UploadDocScreenProps {
  userRole?: 'admin' | 'superadmin' | 'teacher' | 'student' | 'guest'
  backUrl?: string
  defaultFolderId?: string | null
}

function UploadDocScreenInner({
  userRole = 'teacher',
  backUrl = '/teacher/docs',
  defaultFolderId = null,
}: UploadDocScreenProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const folderIdFromQuery = searchParams.get('folderId')
  const folderNameFromQuery = searchParams.get('folderName')
  const backUrlFromQuery = searchParams.get('backUrl')

  const effectiveBackUrl = backUrlFromQuery || backUrl
  const effectiveFolderId = folderIdFromQuery || defaultFolderId

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Data states
  const [folders, setFolders] = useState<DocFolder[]>([])
  const [availableTags, setAvailableTags] = useState<DocTag[]>([])

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(effectiveFolderId)
  const [prevFolderId, setPrevFolderId] = useState(effectiveFolderId)
  if (effectiveFolderId !== prevFolderId) {
    setPrevFolderId(effectiveFolderId)
    if (effectiveFolderId) {
      setSelectedFolder(effectiveFolderId)
    }
  }
  const [status, setStatus] = useState<DocumentStatus>('published')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Tag creation on the fly
  const [newTagName, setNewTagName] = useState('')
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  useEffect(() => {
    async function loadData() {
      const [foldersRes, tagsRes] = await Promise.all([
        getAllFolders(),
        getAllTags(),
      ])
      setFolders(foldersRes.data || [])
      setAvailableTags(tagsRes.data || [])
    }
    loadData()
  }, [])

  // Resolve destination folder name
  const destinationFolderName = useMemo(() => {
    if (folderNameFromQuery) return folderNameFromQuery
    if (selectedFolder) {
      const f = folders.find(item => item.id === selectedFolder)
      if (f) return f.name
    }
    return 'Carpeta seleccionada'
  }, [folderNameFromQuery, selectedFolder, folders])

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      setFile(selected)
      if (!title) {
        const baseName = selected.name.substring(0, selected.name.lastIndexOf('.')) || selected.name
        setTitle(baseName)
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0]
      setFile(selected)
      if (!title) {
        const baseName = selected.name.substring(0, selected.name.lastIndexOf('.')) || selected.name
        setTitle(baseName)
      }
    }
  }

  // Convert file to base64
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

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('El título del documento es obligatorio')
      return
    }

    if (!file) {
      toast.error('Debes seleccionar un archivo para el documento')
      return
    }

    setIsUploading(true)
    try {
      const base64File = await fileToBase64(file)
      const fileName = file.name
      const mimeType = file.type || 'application/octet-stream'
      const fileSize = file.size

      const { data, error } = await createDocument({
        title: title.trim(),
        description: description.trim(),
        folderId: selectedFolder,
        base64File,
        fileName,
        mimeType,
        fileSize,
        status,
      })

      if (error) {
        toast.error('Error al subir documento', { description: error })
        setIsUploading(false)
        return
      }

      // Attach tags if any
      if (data?.id && selectedTags.length > 0) {
        await Promise.all(
          selectedTags.map(tagId => toggleDocumentTag(data.id, tagId, true))
        )
      }

      toast.success(`Documento "${title}" subido exitosamente`, {
        description: `Guardado en: ${destinationFolderName}`,
      })

      // Navigate back to origin folder
      router.push(effectiveBackUrl)
      router.refresh()
    } catch (err: unknown) {
      console.error('Error al subir documento:', err)
      toast.error('Error inesperado al procesar el archivo')
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#faf8fe] dark:bg-[#12141a] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={effectiveBackUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all active:scale-[0.97]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 truncate">
                {INSTITUTION_INFO.shortName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0071e3] dark:bg-blue-950/60 dark:text-blue-300 text-[11px] font-bold">
              {userRole === 'admin' ? 'Coordinador / Admin' : 'Perfil Docente'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Subir Nuevo Documento Pedagógico
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Publica planes de aula, mallas curriculares, guías o material didáctico oficial para la Escuela Normal Superior del Nordeste.
          </p>
        </div>

        {/* Upload Form Card */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: File Upload Drop Zone */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#0071e3]" />
              <span>Archivo del Documento</span>
            </h2>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                file
                  ? 'border-[#0071e3] bg-blue-50/30 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-[#0071e3] bg-slate-50/50 dark:bg-slate-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-[#0071e3] flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Archivo digital'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Archivo listo para subir</span>
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                    Arrastra y suelta tu archivo aquí, o haz clic para explorar
                  </span>
                  <span className="text-xs text-slate-400">
                    Formatos soportados: PDF, DOCX, XLSX, PPTX, MP4, ZIP (Hasta 50MB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Document Information & Destination Confirmation */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Información y Ubicación
            </h2>

            {/* Ubicación de Destino Fijada (Sin dropdown) */}
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Folder className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0071e3] dark:text-blue-400 block">
                    Carpeta de Destino
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {destinationFolderName}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    El documento quedará guardado automáticamente en esta carpeta seleccionada.
                  </p>
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-blue-200/60 dark:border-blue-800 text-[#0071e3] dark:text-blue-300 text-[11px] font-semibold shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Destino fijado</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Título del Documento *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej. Guía Pedagógica: Algoritmos y Diagramas de Flujo"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Descripción Pedagógica o Instrucciones
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Explica brevemente los objetivos de aprendizaje, ciclo temático o instrucciones para los estudiantes..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 resize-none"
              />
            </div>

            {/* Status Selector */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Estado de Publicación
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as DocumentStatus)}
                className="w-full sm:w-1/2 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
              >
                <option value="published">Publicado (Visible para estudiantes)</option>
                <option value="draft">Borrador (Solo visible para docentes)</option>
              </select>
            </div>
          </div>

          {/* Card 3: Tags / Categories */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-[#0071e3]" />
                <span>Etiquetas Temáticas</span>
              </h2>
            </div>

            {/* Tag Pills */}
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map(tag => {
                const isSelected = selectedTags.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setSelectedTags(prev =>
                        isSelected ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                      )
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0071e3] text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    #{tag.name}
                  </button>
                )
              })}
            </div>

            {/* Create new tag inline */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                placeholder="Nueva etiqueta..."
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
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
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isCreatingTag ? 'Creando...' : '+ Agregar Etiqueta'}
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href={effectiveBackUrl}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={isUploading || !file || !title.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#005bb5] text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Subiendo Documento...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Publicar Documento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export function UploadDocScreen(props: UploadDocScreenProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#faf8fe] dark:bg-[#12141a] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#0071e3] border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <UploadDocScreenInner {...props} />
    </Suspense>
  )
}
