'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import {
  Search, Plus, BookOpen, Loader2, AlertCircle, X, Check,
  FileText, Clock, Tag, Share2, History, PanelLeftClose, PanelLeftOpen, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

import type { Document, DocFolder } from '@/modules/docs/domain/entities/Document'
import type { DocumentStatus } from '@/modules/docs/domain/value-objects/DocumentStatus'

import { DocExplorer } from '../components/DocExplorer'
import { DocSearch } from '../components/DocSearch'
import { DocStatusBadge } from '../components/DocStatusBadge'
import { DocVersionHistory } from '../components/DocVersionHistory'
import { DocExportMenu } from '../components/DocExportMenu'
import { TiptapEditor } from '../components/TiptapEditor'

import {
  getAllFolders, getAllDocuments, createDocument, updateDocument, deleteDocument,
  createFolder, updateFolder, deleteFolder, getDocumentVersions
} from '@/modules/docs/application/documentActions'

// ─── Props ─────────────────────────────────────────────────────────────────────
interface DocCenterScreenProps {
  userRole: 'admin' | 'teacher' | 'student'
}

// ─── New Document Modal ────────────────────────────────────────────────────────
function NewDocModal({
  folderId, folders, onConfirm, onClose
}: {
  folderId: string | null
  folders: DocFolder[]
  onConfirm: (title: string, folderId: string | null) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('Sin título')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(folderId)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Nuevo documento</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Título</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onConfirm(title, selectedFolder)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-shadow"
              placeholder="Título del documento"
            />
          </div>
          {folders.length > 0 && (
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Carpeta</label>
              <select
                value={selectedFolder ?? ''}
                onChange={e => setSelectedFolder(e.target.value || null)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Sin carpeta</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(title, selectedFolder)}
            disabled={!title.trim()}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Crear
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Rename Folder Modal ───────────────────────────────────────────────────────
function RenameFolderModal({ folder, onConfirm, onClose }: {
  folder: DocFolder
  onConfirm: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(folder.name)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Renombrar carpeta</h3>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm(name)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-400 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
          <button onClick={() => onConfirm(name)} className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90">
            Guardar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export function DocCenterScreen({ userRole }: DocCenterScreenProps) {
  // State
  const [folders, setFolders] = useState<DocFolder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [explorerVisible, setExplorerVisible] = useState(true)

  // Modals
  const [newDocModal, setNewDocModal] = useState<{ parentFolderId: string | null } | null>(null)
  const [newFolderModal, setNewFolderModal] = useState<{ parentId: string | null } | null>(null)
  const [renameFolderTarget, setRenameFolderTarget] = useState<DocFolder | null>(null)

  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const canEdit = userRole !== 'student'

  // ─── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [foldersRes, docsRes] = await Promise.all([getAllFolders(), getAllDocuments()])
    if (foldersRes.error) toast.error('Error al cargar carpetas')
    if (docsRes.error) toast.error('Error al cargar documentos')
    setFolders(foldersRes.data)
    // Students only see published
    const visibleDocs = userRole === 'student'
      ? docsRes.data.filter(d => d.status === 'published')
      : docsRes.data
    setDocuments(visibleDocs)
    setIsLoading(false)
  }, [userRole])

  useEffect(() => { loadData() }, [loadData])

  // ─── Auto-save debounced ────────────────────────────────────────────────────
  const handleContentChange = useCallback((html: string) => {
    setEditorContent(html)
    setIsDirty(true)

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!selectedDoc) return
      setIsSaving(true)
      const { error } = await updateDocument(selectedDoc.id, { content: html })
      setIsSaving(false)
      if (error) toast.error('Error al guardar', { description: error })
      else setIsDirty(false)
    }, 2000)
  }, [selectedDoc])

  // Ctrl+S manual save
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        if (!selectedDoc) return
        setIsSaving(true)
        updateDocument(selectedDoc.id, { content: editorContent }).then(({ error }) => {
          setIsSaving(false)
          if (error) toast.error('Error al guardar')
          else { setIsDirty(false); toast.success('Guardado', { duration: 1500 }) }
        })
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [selectedDoc, editorContent])

  // ─── Select document ────────────────────────────────────────────────────────
  const handleSelectDoc = useCallback((doc: Document) => {
    setSelectedDoc(doc)
    setEditorContent(doc.content ?? '')
    setIsDirty(false)
    setShowVersions(false)
  }, [])

  // ─── Create document ────────────────────────────────────────────────────────
  const handleCreateDocument = async (title: string, folderId: string | null) => {
    setNewDocModal(null)
    const { data, error } = await createDocument({ title, folderId })
    if (error) { toast.error('Error al crear documento', { description: error }); return }
    if (data) {
      setDocuments(prev => [...prev, data])
      handleSelectDoc(data)
      toast.success('Documento creado')
    }
  }

  // ─── Create folder ──────────────────────────────────────────────────────────
  const handleCreateFolder = async (name: string, parentId: string | null) => {
    setNewFolderModal(null)
    const { data, error } = await createFolder(name, parentId)
    if (error) { toast.error('Error al crear carpeta', { description: error }); return }
    if (data) { setFolders(prev => [...prev, data]); toast.success('Carpeta creada') }
  }

  // ─── Rename folder ──────────────────────────────────────────────────────────
  const handleRenameFolder = async (name: string) => {
    if (!renameFolderTarget) return
    const { data, error } = await updateFolder(renameFolderTarget.id, name)
    setRenameFolderTarget(null)
    if (error) { toast.error('Error al renombrar', { description: error }); return }
    if (data) setFolders(prev => prev.map(f => f.id === data.id ? data : f))
  }

  // ─── Delete folder ──────────────────────────────────────────────────────────
  const handleDeleteFolder = async (folder: DocFolder) => {
    if (!confirm(`¿Eliminar la carpeta "${folder.name}" y todo su contenido?`)) return
    const { error } = await deleteFolder(folder.id)
    if (error) { toast.error('Error al eliminar', { description: error }); return }
    setFolders(prev => prev.filter(f => f.id !== folder.id))
    if (selectedDoc?.folderId === folder.id) setSelectedDoc(null)
    toast.success('Carpeta eliminada')
  }

  // ─── Delete document ────────────────────────────────────────────────────────
  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm(`¿Eliminar "${doc.title}"? Esta acción es irreversible.`)) return
    const { error } = await deleteDocument(doc.id)
    if (error) { toast.error('Error al eliminar', { description: error }); return }
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
    if (selectedDoc?.id === doc.id) setSelectedDoc(null)
    toast.success('Documento eliminado')
  }

  // ─── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (status: DocumentStatus) => {
    if (!selectedDoc) return
    const { data, error } = await updateDocument(selectedDoc.id, { status })
    if (error) { toast.error('Error al cambiar estado', { description: error }); return }
    if (data) {
      setSelectedDoc(data)
      setDocuments(prev => prev.map(d => d.id === data.id ? data : d))
      toast.success(`Estado cambiado a "${status === 'published' ? 'Publicado' : status === 'archived' ? 'Archivado' : 'Borrador'}"`)
    }
  }

  // ─── Version history ────────────────────────────────────────────────────────
  const handleShowVersions = async () => {
    if (!selectedDoc) return
    const { data, error } = await getDocumentVersions(selectedDoc.id)
    if (error) { toast.error('Error al cargar versiones'); return }
    setVersions(data)
    setShowVersions(true)
  }

  // ─── Title change ───────────────────────────────────────────────────────────
  const handleTitleChange = async (newTitle: string) => {
    if (!selectedDoc || newTitle === selectedDoc.title) return
    const { data, error } = await updateDocument(selectedDoc.id, { title: newTitle })
    if (error) { toast.error('Error al renombrar', { description: error }); return }
    if (data) {
      setSelectedDoc(data)
      setDocuments(prev => prev.map(d => d.id === data.id ? data : d))
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Cargando centro de documentación…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -mx-6 md:-mx-8 -mt-6 md:-mt-8 overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        {/* Toggle explorer */}
        <button
          onClick={() => setExplorerVisible(v => !v)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          title={explorerVisible ? 'Ocultar panel' : 'Mostrar panel'}
        >
          {explorerVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>

        {/* Logo/title */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <BookOpen className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">Centro de Documentación</span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-2">{documents.length} documentos</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Save indicator */}
          {selectedDoc && canEdit && (
            <span className={`hidden sm:flex items-center gap-1 text-[11px] font-medium transition-colors ${
              isSaving ? 'text-amber-500' : isDirty ? 'text-slate-400' : 'text-emerald-500'
            }`}>
              {isSaving ? <><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</> : isDirty ? '● Sin guardar' : <><Check className="h-3 w-3" /> Guardado</>}
            </span>
          )}

          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs transition-colors"
            title="Buscar (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="hidden md:inline text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">⌘K</kbd>
          </button>

          {canEdit && (
            <button
              onClick={() => setNewDocModal({ parentFolderId: null })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-900 text-xs font-medium transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup orientation="horizontal" className="h-full">
          {/* Explorer Panel */}
          {explorerVisible && (
            <>
              <Panel defaultSize="22%" minSize="16%" maxSize="35%" className="border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <DocExplorer
                  folders={folders}
                  documents={documents}
                  selectedDocId={selectedDoc?.id}
                  userRole={userRole}
                  onSelectDoc={handleSelectDoc}
                  onNewDocument={(folderId) => setNewDocModal({ parentFolderId: folderId ?? null })}
                  onNewFolder={(parentId) => {
                    // Inline for simplicity: prompt
                    const name = prompt('Nombre de la carpeta:')
                    if (name?.trim()) handleCreateFolder(name.trim(), parentId ?? null)
                  }}
                  onRenameFolder={setRenameFolderTarget}
                  onDeleteFolder={handleDeleteFolder}
                  onDeleteDoc={handleDeleteDoc}
                />
              </Panel>
              <PanelResizeHandle className="w-1 bg-slate-100 dark:bg-slate-800/60 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors cursor-col-resize" />
            </>
          )}

          {/* Editor Panel */}
          <Panel className="flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            {selectedDoc ? (
              <>
                {/* Document header */}
                <div className="flex items-center justify-between gap-3 px-6 md:px-12 py-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {canEdit ? (
                      <input
                        key={selectedDoc.id}
                        defaultValue={selectedDoc.title}
                        onBlur={e => handleTitleChange(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        className="text-xl font-bold text-slate-900 dark:text-white bg-transparent outline-none border-b-2 border-transparent focus:border-blue-400 transition-colors min-w-0 flex-1 truncate"
                      />
                    ) : (
                      <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{selectedDoc.title}</h1>
                    )}
                  </div>

                  {/* Doc actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {canEdit && (
                      <DocStatusBadge
                        status={selectedDoc.status}
                        size="sm"
                        interactive
                        onStatusChange={handleStatusChange}
                      />
                    )}
                    {!canEdit && <DocStatusBadge status={selectedDoc.status} size="sm" />}

                    {canEdit && (
                      <button
                        onClick={handleShowVersions}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Historial de versiones"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Historial</span>
                      </button>
                    )}

                    <DocExportMenu content={editorContent} title={selectedDoc.title} />

                    {/* Doc meta */}
                    <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(selectedDoc.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Panel group editor + version history */}
                <div className="flex flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto">
                    <TiptapEditor
                      key={selectedDoc.id}
                      content={editorContent}
                      onChange={handleContentChange}
                      editable={canEdit}
                      autoFocus={canEdit}
                    />
                  </div>

                  {/* Version history side panel */}
                  <AnimatePresence>
                    {showVersions && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 300, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="border-l border-slate-100 dark:border-slate-800 overflow-hidden shrink-0"
                      >
                        <DocVersionHistory
                          documentId={selectedDoc.id}
                          versions={versions}
                          onRestored={loadData}
                          onClose={() => setShowVersions(false)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 20 }}
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-7 w-7 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Centro de Documentación Académica
                  </h2>
                  <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-6">
                    Repositorio oficial del conocimiento institucional. Crea, organiza y comparte documentación académica y administrativa.
                  </p>
                  {canEdit ? (
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => setNewDocModal({ parentFolderId: null })}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        <Plus className="h-4 w-4" /> Nuevo documento
                      </button>
                      <button
                        onClick={() => setShowSearch(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Search className="h-4 w-4" /> Buscar
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Selecciona un documento del panel izquierdo para comenzar</p>
                  )}
                </motion.div>
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {newDocModal && (
          <NewDocModal
            folderId={newDocModal.parentFolderId}
            folders={folders}
            onConfirm={handleCreateDocument}
            onClose={() => setNewDocModal(null)}
          />
        )}
        {renameFolderTarget && (
          <RenameFolderModal
            folder={renameFolderTarget}
            onConfirm={handleRenameFolder}
            onClose={() => setRenameFolderTarget(null)}
          />
        )}
        {showSearch && (
          <DocSearch
            onSelect={handleSelectDoc}
            onClose={() => setShowSearch(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
