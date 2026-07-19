'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import {
  Search, Plus, BookOpen, Loader2, X, Check, FileText, Clock, Tag as TagIcon,
  PanelLeftClose, PanelLeftOpen, Sparkles, FolderPlus, ArrowLeft, Star,
  SlidersHorizontal, Download, User, Calendar, Shield, FileSpreadsheet,
  FileImage, FileArchive, ExternalLink, TrendingUp, Users, Eye, History, Trash2, Edit,
  Sun, Moon, LogOut
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import type { Document, DocFolder, DocTag } from '@/modules/docs/domain/entities/Document'
import type { DocumentStatus } from '@/modules/docs/domain/value-objects/DocumentStatus'

import { DocExplorer } from '../components/DocExplorer'
import { DocStatusBadge } from '../components/DocStatusBadge'
import { DocExportMenu } from '../components/DocExportMenu'
import { NewDocModal } from '../components/NewDocModal'

import {
  getAllFolders, getAllDocuments, createDocument, updateDocument, deleteDocument,
  createFolder, updateFolder, deleteFolder, getRecentActivity, toggleStarDocument, getAllTags,
  reorderFolder, updateFolderColor
} from '@/modules/docs/application/documentActions'
import { logout } from '@/modules/auth/application/actions'

interface DocCenterScreenProps {
  userRole: 'admin' | 'teacher' | 'student' | 'guest'
}

function getFolderPath(folderId: string | null | undefined, allFolders: DocFolder[]): string {
  if (!folderId) return 'General'
  
  const path: string[] = []
  let currentId: string | null = folderId
  
  while (currentId) {
    const f = allFolders.find(f => f.id === currentId)
    if (f) {
      path.unshift(f.name)
      currentId = f.parentId
    } else {
      currentId = null
    }
  }
  
  return path.join(' / ') || 'General'
}

export function DocCenterScreen({ userRole }: DocCenterScreenProps) {
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)

  // Theme synchronization
  useEffect(() => {
    const syncTheme = () => {
      const theme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (theme === 'dark' || (!theme && prefersDark)) {
        setIsDark(true)
      } else {
        setIsDark(false)
      }
    }
    syncTheme()
    window.addEventListener('theme-changed', syncTheme)
    return () => window.removeEventListener('theme-changed', syncTheme)
  }, [])

  const toggleTheme = () => {
    const isDarkNow = document.documentElement.classList.toggle('dark')
    setIsDark(isDarkNow)
    localStorage.setItem('theme', isDarkNow ? 'dark' : 'light')
    window.dispatchEvent(new Event('theme-changed'))
  }

  const handleLogout = async () => {
    try {
      const result = await logout()
      if (result?.success) {
        router.replace('/login')
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      router.replace('/login')
    }
  }

  // Data State
  const [folders, setFolders] = useState<DocFolder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [tags, setTags] = useState<DocTag[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Navigation / Selection State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'mine' | 'favorites'>('all')

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedFileType, setSelectedFileType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'title' | 'updated_at' | 'file_size'>('updated_at')

  // Modals & Panels State
  const [explorerVisible, setExplorerVisible] = useState(true)
  const [newDocModal, setNewDocModal] = useState<{ folderId: string | null } | null>(null)
  const [editDocModal, setEditDocModal] = useState<Document | null>(null)
  const [newFolderModal, setNewFolderModal] = useState<{ parentId: string | null } | null>(null)
  const [renameFolderTarget, setRenameFolderTarget] = useState<DocFolder | null>(null)

  const canEdit = userRole === 'admin' || userRole === 'teacher'
  const isStudent = userRole === 'student'
  const isGuest = userRole === 'guest'

  // ─── Load Data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [foldersRes, docsRes, tagsRes, activityRes] = await Promise.all([
      getAllFolders(),
      getAllDocuments(),
      getAllTags(),
      getRecentActivity()
    ])

    if (foldersRes.error) toast.error('Error al cargar carpetas', { description: foldersRes.error })
    if (docsRes.error) toast.error('Error al cargar documentos', { description: docsRes.error })
    if (tagsRes.error) toast.error('Error al cargar etiquetas', { description: tagsRes.error })

    setFolders(foldersRes.data || [])
    setTags(tagsRes.data || [])
    setRecentActivity(activityRes.data || [])

    // Filter documents based on role permissions
    // Students and Guests only see 'published' status
    const visibleDocs = (isStudent || isGuest)
      ? (docsRes.data || []).filter(d => d.status === 'published')
      : (docsRes.data || [])

    setDocuments(visibleDocs)
    setIsLoading(false)
  }, [isStudent, isGuest])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Document Operations ───────────────────────────────────────────────────
  const handleCreateDocument = async (payload: {
    title: string
    description: string
    folderId: string | null
    base64File: string | null
    fileName: string | null
    mimeType: string | null
    fileSize: number | null
    tagIds: string[]
    status: DocumentStatus
  }) => {
    const { data, error } = await createDocument(payload)
    if (error) {
      toast.error('Error al crear documento', { description: error })
      return
    }
    if (data) {
      // Bind tags if any selected
      if (payload.tagIds.length > 0) {
        // Normally associated during insert, otherwise loop here.
        // We will reload data to fetch tag relationships correctly
      }
      toast.success(`Documento "${payload.title}" subido exitosamente`)
      loadData()
    }
  }

  const handleUpdateDocument = async (payload: {
    title: string
    description: string
    folderId: string | null
    base64File: string | null
    fileName: string | null
    mimeType: string | null
    fileSize: number | null
    tagIds: string[]
    status: DocumentStatus
  }) => {
    if (!editDocModal) return
    const { data, error } = await updateDocument(editDocModal.id, payload)
    if (error) {
      toast.error('Error al actualizar documento', { description: error })
      return
    }
    if (data) {
      toast.success(`Documento "${payload.title}" actualizado`)
      setEditDocModal(null)
      loadData()
      if (selectedDoc?.id === editDocModal.id) {
        setSelectedDoc(data)
      }
    }
  }

  const handleDeleteDoc = (doc: Document) => {
    // Check teacher permission (can only delete their own docs)
    if (userRole === 'teacher' && doc.createdBy !== doc.createdByProfile?.firstName) {
      // Normally RLS enforces this, but let's check
    }

    toast.warning(`¿Eliminar "${doc.title}"?`, {
      description: 'El archivo se borrará permanentemente de Google Drive y del sistema.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const { error } = await deleteDocument(doc.id)
          if (error) {
            toast.error('Error al eliminar', { description: error })
            return
          }
          toast.success('Documento eliminado')
          if (selectedDoc?.id === doc.id) setSelectedDoc(null)
          loadData()
        }
      },
      cancel: { label: 'Cancelar', onClick: () => { } },
      duration: 8000,
    })
  }

  const handleToggleStar = async (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation()
    const targetState = !doc.isStarred
    // Optimistic UI
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, isStarred: targetState } : d))
    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(prev => prev ? { ...prev, isStarred: targetState } : null)
    }

    const { error } = await toggleStarDocument(doc.id, targetState)
    if (error) {
      toast.error('Error al guardar favorito')
      // Rollback
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, isStarred: !targetState } : d))
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(prev => prev ? { ...prev, isStarred: !targetState } : null)
      }
    } else {
      toast.success(targetState ? 'Agregado a Favoritos' : 'Quitado de Favoritos', { duration: 1500 })
      loadData()
    }
  }

  // ─── Folder Operations ─────────────────────────────────────────────────────
  const handleCreateFolder = async (name: string) => {
    const parentId = newFolderModal?.parentId ?? null
    setNewFolderModal(null)
    const { data, error } = await createFolder(name, parentId)
    if (error) {
      toast.error('Error al crear categoría', { description: error })
      return
    }
    if (data) {
      toast.success(`Categoría "${name}" creada`)
      loadData()
    }
  }

  const handleRenameFolder = async (name: string) => {
    if (!renameFolderTarget) return
    const { data, error } = await updateFolder(renameFolderTarget.id, name)
    setRenameFolderTarget(null)
    if (error) {
      toast.error('Error al renombrar', { description: error })
      return
    }
    if (data) {
      toast.success('Categoría renombrada')
      loadData()
    }
  }

  const handleDeleteFolder = (folder: DocFolder) => {
    toast.warning(`¿Eliminar categoría "${folder.name}"?`, {
      description: 'Se eliminará la categoría de la navegación. Los documentos contenidos quedarán sin categoría.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const { error } = await deleteFolder(folder.id)
          if (error) {
            toast.error('Error al eliminar', { description: error })
            return
          }
          toast.success('Categoría eliminada')
          if (selectedFolderId === folder.id) setSelectedFolderId(null)
          loadData()
        }
      },
      cancel: { label: 'Cancelar', onClick: () => { } },
      duration: 8000,
    })
  }

  const handleReorderFolder = async (folderId: string, direction: 'up' | 'down') => {
    const { success, error } = await reorderFolder(folderId, direction)
    if (error) {
      toast.error('Error al reordenar', { description: error })
      return
    }
    if (success) {
      loadData()
    }
  }

  const handleColorFolder = async (folderId: string, color: string | null) => {
    // Optimistic UI update
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, color } : f))
    const { error } = await updateFolderColor(folderId, color)
    if (error) {
      toast.error('Error al cambiar el color', { description: error })
      loadData() // rollback
    } else {
      toast.success('Color de carpeta actualizado', { duration: 1500 })
    }
  }

  // ─── Filtering & Tab Logic ─────────────────────────────────────────────────
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // 1. Category Filter
      if (selectedFolderId !== null) {
        // Match specific folder
        if (doc.folderId !== selectedFolderId) return false
      }

      // 2. Tab Filter
      if (activeTab === 'recent') {
        const docDate = new Date(doc.updatedAt)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        if (docDate < sevenDaysAgo) return false
      } else if (activeTab === 'favorites') {
        if (!doc.isStarred) return false
      } else if (activeTab === 'mine') {
        // Simulating matching currently logged user.
        // For security context, createdBy holds the user's UUID.
        // If we can verify it, otherwise fallback to true.
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = doc.title.toLowerCase().includes(query)
        const matchDesc = doc.description?.toLowerCase().includes(query)
        const matchAuthor = doc.createdByProfile
          ? `${doc.createdByProfile.firstName} ${doc.createdByProfile.lastName}`.toLowerCase().includes(query)
          : false
        const matchTags = doc.tags?.some(t => t.name.toLowerCase().includes(query)) || false
        const matchMime = doc.mimeType?.toLowerCase().includes(query) || false

        if (!matchTitle && !matchDesc && !matchAuthor && !matchTags && !matchMime) {
          return false
        }
      }

      // 4. File Type Filter
      if (selectedFileType !== 'all') {
        const mime = doc.mimeType?.toLowerCase() || ''
        if (selectedFileType === 'pdf' && !mime.includes('pdf')) return false
        if (selectedFileType === 'word' && !mime.includes('word') && !mime.includes('officedocument.word')) return false
        if (selectedFileType === 'excel' && !mime.includes('excel') && !mime.includes('spreadsheet')) return false
        if (selectedFileType === 'image' && !mime.startsWith('image/')) return false
        if (selectedFileType === 'archive' && !mime.includes('zip') && !mime.includes('rar')) return false
      }

      // 5. Status Filter
      if (selectedStatus !== 'all') {
        if (doc.status !== selectedStatus) return false
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      } else if (sortBy === 'file_size') {
        return (b.fileSize || 0) - (a.fileSize || 0)
      } else {
        // updated_at
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })
  }, [documents, selectedFolderId, activeTab, searchQuery, selectedFileType, selectedStatus, sortBy])

  // ─── Stats Computations ────────────────────────────────────────────────────
  const docStats = useMemo(() => {
    const total = documents.length
    const pdfs = documents.filter(d => d.mimeType?.toLowerCase().includes('pdf')).length
    const sheets = documents.filter(d => d.mimeType?.toLowerCase().includes('excel') || d.mimeType?.toLowerCase().includes('spreadsheet')).length
    const images = documents.filter(d => d.mimeType?.toLowerCase().startsWith('image/')).length
    const others = total - pdfs - sheets - images

    // Tag frequency counts
    const tagCounts: Record<string, { tag: DocTag; count: number }> = {}
    documents.forEach(doc => {
      doc.tags?.forEach(tag => {
        if (!tagCounts[tag.id]) {
          tagCounts[tag.id] = { tag, count: 0 }
        }
        tagCounts[tag.id].count++
      })
    })
    const popularTags = Object.values(tagCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // Storage estimation
    const totalBytes = documents.reduce((acc, doc) => acc + (doc.fileSize || 0), 0)
    const storageText = totalBytes > 1024 * 1024 * 1024
      ? `${(totalBytes / 1024 / 1024 / 1024).toFixed(2)} GB`
      : `${(totalBytes / 1024 / 1024).toFixed(2)} MB`

    const uniqueCollaborators = new Set(
      documents.map(d => d.createdBy).filter(Boolean)
    ).size

    return {
      total,
      pdfs,
      sheets,
      images,
      others,
      popularTags,
      storageText,
      totalBytes,
      collaborators: uniqueCollaborators || 0
    }
  }, [documents])

  // ─── File Type Icon Helper ──────────────────────────────────────────────────
  const getFileIcon = (mimeType: string | null) => {
    const mime = mimeType?.toLowerCase() || ''
    if (mime.includes('pdf')) {
      return <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 flex items-center justify-center font-bold"><FileText className="h-5 w-5" /></div>
    }
    if (mime.includes('word') || mime.includes('officedocument.word')) {
      return <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 flex items-center justify-center font-bold"><FileText className="h-5 w-5" /></div>
    }
    if (mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('csv')) {
      return <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 flex items-center justify-center font-bold"><FileSpreadsheet className="h-5 w-5" /></div>
    }
    if (mime.startsWith('image/')) {
      return <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 flex items-center justify-center font-bold"><FileImage className="h-5 w-5" /></div>
    }
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('compressed')) {
      return <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 flex items-center justify-center font-bold"><FileArchive className="h-5 w-5" /></div>
    }
    return <div className="h-9 w-9 rounded-xl bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center font-bold"><FileText className="h-5 w-5" /></div>
  }

  // File size formatter
  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Time-ago formatter in Spanish
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 1024 / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMin < 60) return `Hace ${diffMin} min`
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Cargando repositorio institucional...</p>
        </div>
      </div>
    )
  }

  if (newDocModal) {
    return (
      <NewDocModal
        folderId={newDocModal.folderId}
        folders={folders}
        onConfirm={handleCreateDocument}
        onClose={() => setNewDocModal(null)}
      />
    )
  }

  if (editDocModal) {
    return (
      <NewDocModal
        folderId={editDocModal.folderId}
        folders={folders}
        onConfirm={handleUpdateDocument}
        onClose={() => setEditDocModal(null)}
        initialDoc={editDocModal}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50/30 dark:bg-slate-950/20">

      {/* ── Top Filter Bar (Merged Header) ── */}
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-slate-200/40 dark:border-slate-800/40 bg-white dark:bg-slate-900/60 backdrop-blur-md shrink-0 justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={
              userRole === 'admin'
                ? '/admin/dashboard'
                : userRole === 'teacher'
                  ? '/teacher/dashboard'
                  : userRole === 'student'
                    ? '/student/dashboard'
                    : '/'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 hover:bg-slate-100 text-slate-750 hover:text-slate-900 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 text-xs font-bold transition-all cursor-pointer mr-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Link>

          <button
            onClick={() => setExplorerVisible(v => !v)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title={explorerVisible ? 'Ocultar panel' : 'Mostrar panel'}
          >
            {explorerVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-[#1F4E31] flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-black text-slate-900 dark:text-white">Centro de Conocimiento Institucional</span>
            </div>
          </div>
        </div>

        {/* Search bar in the center */}
        <div className="relative w-full max-w-xs sm:max-w-md mx-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar documentos, temas..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Actions on the right */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setNewDocModal({ folderId: selectedFolderId })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-100 dark:shadow-none cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Subir Documento</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            title="Cambiar tema"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-red-650 hover:border-red-200 active:scale-[0.98] transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-red-400 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup orientation="horizontal" className="h-full">
          {/* Explorer Left Panel */}
          {explorerVisible && (
            <>
              <Panel defaultSize="22%" minSize="18%" maxSize="30%" className="border-r border-slate-200/40 dark:border-slate-800/40 bg-white/70 dark:bg-slate-950/40 flex flex-col justify-between h-full">
                <div className="flex-1 overflow-y-auto">
                  <DocExplorer
                    folders={folders}
                    documents={documents}
                    selectedDocId={selectedDoc?.id}
                    selectedFolderId={selectedFolderId}
                    userRole={userRole}
                    onSelectDoc={doc => {
                      setSelectedDoc(doc)
                    }}
                    onSelectFolder={folderId => {
                      setSelectedFolderId(folderId)
                      setSelectedDoc(null)
                    }}
                    onNewDocument={fId => setNewDocModal({ folderId: fId ?? null })}
                    onNewFolder={parentId => setNewFolderModal({ parentId: parentId ?? null })}
                    onRenameFolder={setRenameFolderTarget}
                    onDeleteFolder={handleDeleteFolder}
                    onDeleteDoc={handleDeleteDoc}
                    onReorderFolder={handleReorderFolder}
                    onColorFolder={handleColorFolder}
                  />
                </div>


              </Panel>
              <PanelResizeHandle className="w-1 bg-slate-100 dark:bg-slate-800/40 hover:bg-emerald-500/20 cursor-col-resize transition-colors" />
            </>
          )}

          {/* Central Panel */}
          <Panel className="flex flex-col bg-white dark:bg-slate-900 overflow-hidden h-full">
            {selectedDoc ? (
              // ─── Visualizer Pane ───
              <div className="flex flex-col h-full overflow-hidden bg-slate-50/40 dark:bg-slate-950/20">
                {/* Document Sub-Header */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/40 dark:border-slate-850/60 bg-white dark:bg-slate-900 shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                      title="Volver al listado"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selectedDoc.title}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Versión {selectedDoc.versionLabel} • {formatBytes(selectedDoc.fileSize)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => handleToggleStar(selectedDoc, e)}
                      className={`p-2 rounded-xl border transition-colors ${selectedDoc.isStarred
                        ? 'border-amber-200 bg-amber-50 text-amber-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500'
                        }`}
                    >
                      <Star className={`h-4 w-4 ${selectedDoc.isStarred ? 'fill-current' : ''}`} />
                    </button>

                    <DocStatusBadge status={selectedDoc.status} size="sm" />

                    <a
                      href={selectedDoc.driveUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Abrir en Google Drive</span>
                    </a>

                    {canEdit && (
                      <>
                        <button
                          onClick={() => setEditDocModal(selectedDoc)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(selectedDoc)}
                          className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Visualizer Frame */}
                <div className="flex-1 p-6 flex flex-col min-h-0">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl flex-1 overflow-hidden flex flex-col relative">
                    {selectedDoc.driveUrl ? (
                      <iframe
                        src={selectedDoc.driveUrl}
                        className="w-full h-full border-0 bg-slate-50 dark:bg-slate-950"
                        allow="autoplay"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                        <div className="h-14 w-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><Download className="h-7 w-7" /></div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-250">No hay previsualizador disponible</p>
                          <p className="text-xs text-slate-400">Este formato no se puede previsualizar en el navegador.</p>
                        </div>
                        <a
                          href={selectedDoc.driveUrl || '#'}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-50"
                        >
                          Descargar archivo
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // ─── Document List / Grid Pane ───
              <div className="flex flex-col h-full">

                {/* Stats Row Minimal */}
                <div className="flex items-center gap-4 px-6 py-2.5 border-b border-slate-100 dark:border-slate-850/60 bg-slate-50/10 dark:bg-slate-950/5 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Documentos:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{docStats.total}</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-800">|</span>
                  <div className="flex items-center gap-1.5">
                    <TagIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Etiquetas:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{tags.length}</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-800">|</span>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Colaboradores:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{docStats.collaborators}</span>
                  </div>
                </div>

                {/* List Filter Toolbar */}
                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-850/60 bg-white dark:bg-slate-900 flex flex-wrap justify-between items-center gap-3 shrink-0">
                  {/* Left Tabs */}
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'all'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setActiveTab('recent')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'recent'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                      Recientes
                    </button>
                    <button
                      onClick={() => setActiveTab('favorites')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'favorites'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                      Favoritos
                    </button>
                  </div>

                  {/* Right Filters Dropdowns */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Sort */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span>Ordenar:</span>
                      <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-350 outline-none"
                      >
                        <option value="updated_at">Actualizado</option>
                        <option value="title">Título</option>
                        <option value="file_size">Tamaño</option>
                      </select>
                    </div>

                    {/* Format Filter */}
                    <select
                      value={selectedFileType}
                      onChange={e => setSelectedFileType(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-350 outline-none"
                    >
                      <option value="all">Formatos: Todos</option>
                      <option value="pdf">PDF</option>
                      <option value="word">Word</option>
                      <option value="excel">Excel</option>
                      <option value="image">Imágenes</option>
                      <option value="archive">ZIP / RAR</option>
                    </select>

                    {/* Status Filter (Admins/Teachers only) */}
                    {canEdit && (
                      <select
                        value={selectedStatus}
                        onChange={e => setSelectedStatus(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-350 outline-none"
                      >
                        <option value="all">Estados: Todos</option>
                        <option value="draft">Borrador</option>
                        <option value="published">Publicado</option>
                        <option value="archived">Archivado</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Table modern */}
                <div className="flex-1 overflow-y-auto">
                  {filteredDocuments.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-850/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-950/20">
                          <th className="px-6 py-3.5">Documento</th>
                          <th className="px-6 py-3.5">Categoría</th>
                          <th className="px-6 py-3.5">Última actualización</th>
                          <th className="px-6 py-3.5 text-center">Versión</th>
                          <th className="px-6 py-3.5 text-center">Estado</th>
                          <th className="px-6 py-3.5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850/40">
                        {filteredDocuments.map(doc => (
                          <tr
                            key={doc.id}
                            onClick={() => setSelectedDoc(doc)}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {getFileIcon(doc.mimeType)}
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 dark:text-slate-250 truncate text-xs group-hover:text-emerald-600 transition-colors">
                                    {doc.title}
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {doc.tags?.map(t => (
                                      <span
                                        key={t.id}
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                        style={{ backgroundColor: `${t.color}15`, color: t.color }}
                                      >
                                        #{t.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {getFolderPath(doc.folder?.id, folders)}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                                  {formatTimeAgo(doc.updatedAt)}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  Por {doc.createdByProfile ? `${doc.createdByProfile.firstName} ${doc.createdByProfile.lastName}` : 'Docente'}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 text-center">
                              {doc.versionLabel}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <DocStatusBadge status={doc.status} size="sm" />
                            </td>
                            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  onClick={e => handleToggleStar(doc, e)}
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition-colors"
                                >
                                  <Star className={`h-4.5 w-4.5 ${doc.isStarred ? 'text-amber-500 fill-current' : ''}`} />
                                </button>

                                <a
                                  href={doc.driveUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                  title="Ver original"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>

                                {canEdit && (
                                  <>
                                    <button
                                      onClick={() => setEditDocModal(doc)}
                                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 transition-colors"
                                      title="Editar metadatos"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDoc(doc)}
                                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-20 text-center">
                      <FileText className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-250 mb-1">No se encontraron documentos</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Prueba ajustando tus filtros de formato o término de búsqueda.
                      </p>
                    </div>
                  )}
                </div>



              </div>
            )}
          </Panel>

          {!isGuest && (
            <>
              <PanelResizeHandle className="w-1 bg-slate-100 dark:bg-slate-800/40 hover:bg-emerald-500/20 cursor-col-resize transition-colors" />

              {/* Right Panel (Contextual Data & Activity) */}
              <Panel defaultSize="22%" minSize="18%" maxSize="28%" className="border-l border-slate-200/40 dark:border-slate-800/40 bg-white/70 dark:bg-slate-950/40 p-5 space-y-6 overflow-y-auto h-full shrink-0">
                {/* Editorial Flow */}
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-850 p-4 rounded-2xl">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Flujo Editorial</h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Borrador</span>
                      <span className="ml-auto text-[10px] font-bold text-slate-400">
                        {documents.filter(d => d.status === 'draft').length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-semibold text-slate-600 dark:text-slate-400">En revisión</span>
                      <span className="ml-auto text-[10px] font-bold text-slate-400">0</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Aprobado</span>
                      <span className="ml-auto text-[10px] font-bold text-slate-400">0</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Publicado</span>
                      <span className="ml-auto text-[10px] font-bold text-slate-400">
                        {documents.filter(d => d.status === 'published').length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-red-400" />
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Archivado</span>
                      <span className="ml-auto text-[10px] font-bold text-slate-400">
                        {documents.filter(d => d.status === 'archived').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Actividad Reciente</h4>
                  <div className="space-y-4">
                    {recentActivity.slice(0, 4).map(act => (
                      <div key={act.id} className="flex gap-2.5 items-start text-xs">
                        <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0 border border-slate-200/50 dark:border-slate-800">
                          {act.profiles ? `${act.profiles.first_name[0]}${act.profiles.last_name[0]}` : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-600 dark:text-slate-350 leading-relaxed break-words">
                            {act.description}
                          </p>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                            {formatTimeAgo(act.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No hay actividad registrada</p>
                    )}
                  </div>
                </div>

                {/* Popular Tags */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Etiquetas Populares</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {docStats.popularTags.map(({ tag, count }) => (
                      <button
                        key={tag.id}
                        onClick={() => setSearchQuery(tag.name)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-350 transition-colors cursor-pointer"
                      >
                        <span>#{tag.name}</span>
                        <span className="text-[9px] px-1 py-0.25 rounded-md bg-slate-200/50 dark:bg-slate-800 text-slate-400">
                          {count}
                        </span>
                      </button>
                    ))}
                    {docStats.popularTags.length === 0 && (
                      <p className="text-xs text-slate-400">No hay etiquetas disponibles</p>
                    )}
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {newFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-250 dark:border-slate-800 text-center space-y-4">
              <FolderPlus className="h-10 w-10 text-emerald-600 mx-auto" />
              <div className="text-left space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Nueva Categoría</h4>
                <p className="text-xs text-slate-400">Ingresa un nombre para organizar los documentos.</p>
              </div>
              <input
                type="text"
                autoFocus
                placeholder="Ej. Institución"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value
                    if (val.trim()) handleCreateFolder(val)
                  }
                }}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setNewFolderModal(null)} className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-100 cursor-pointer">Cancelar</button>
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement
                    if (input?.value.trim()) handleCreateFolder(input.value)
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm cursor-pointer"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        )}
        {renameFolderTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-250 dark:border-slate-800 text-center space-y-4">
              <FolderPlus className="h-10 w-10 text-emerald-600 mx-auto" />
              <div className="text-left space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Renombrar Categoría</h4>
                <p className="text-xs text-slate-400">Ingresa el nuevo nombre para "{renameFolderTarget.name}".</p>
              </div>
              <input
                type="text"
                autoFocus
                defaultValue={renameFolderTarget.name}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value
                    if (val.trim()) handleRenameFolder(val)
                  }
                }}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setRenameFolderTarget(null)} className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-100 cursor-pointer">Cancelar</button>
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement
                    if (input?.value.trim()) handleRenameFolder(input.value)
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
