'use client'

import React, { useState, useMemo } from 'react'
import {
  ArrowLeft, Search, FileText, ChevronRight, FolderPlus,
  Folder, UploadCloud
} from 'lucide-react'
import { toast } from 'sonner'
import {
  type AcademicSubject,
  type VisualCardResource,
} from '../../domain/constants/knowledgeCatalog'
import { VisualFileCard } from '../components/VisualFileCard'
import { FolderCard } from '../components/FolderCard'
import { CreateFolderModal } from '../components/CreateFolderModal'
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal'
import { EditFolderModal } from '../components/EditFolderModal'
import { EditDocumentModal } from '../components/EditDocumentModal'
import { deleteFolder, deleteDocument } from '../../application/documentActions'
import type { Document, DocFolder } from '../../domain/entities/Document'

interface SubjectStudioScreenProps {
  subject: AcademicSubject
  onBackToPortal: () => void
  onOpenReader: (resource: VisualCardResource) => void
  onDownloadResource: (resource: VisualCardResource) => void
  userRole: 'admin' | 'superadmin' | 'teacher' | 'student' | 'guest'
  currentUserId?: string | null
  onUploadDoc?: (folderId: string, folderName: string) => void
  onFolderCreated?: (folder: DocFolder) => void
  onFolderDeleted?: (folderId: string) => void
  onFolderUpdated?: (updatedFolder: DocFolder) => void
  onDocDeleted?: (docId: string) => void
  onRefreshData?: () => void
  dbDocuments?: Document[]
  allFolders?: DocFolder[]
}

export function SubjectStudioScreen({
  subject,
  onBackToPortal,
  onOpenReader,
  onDownloadResource,
  userRole,
  currentUserId,
  onUploadDoc,
  onFolderCreated,
  onFolderDeleted,
  onFolderUpdated,
  onDocDeleted,
  onRefreshData,
  dbDocuments = [],
  allFolders = [],
}: SubjectStudioScreenProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [editTargetFolder, setEditTargetFolder] = useState<DocFolder | null>(null)
  const [editTargetDoc, setEditTargetDoc] = useState<VisualCardResource | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
    type: 'carpeta' | 'documento'
  } | null>(null)

  // ─── Hierarchical Folder Navigation State ─────────────────────────────────
  const rootFolderId = subject.dbFolderId || null
  const [activeFolderId, setActiveFolderId] = useState<string | null>(rootFolderId)
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: rootFolderId, name: subject.title }
  ])

  // Current folder name
  const currentFolderName = useMemo(() => {
    if (!activeFolderId || activeFolderId === rootFolderId) return subject.title
    const f = allFolders.find(item => item.id === activeFolderId)
    return f?.name || subject.title
  }, [activeFolderId, rootFolderId, allFolders, subject.title])

  const canManage = userRole === 'admin' || userRole === 'teacher' || userRole === 'superadmin'

  // Subfolders inside current active folder
  const currentSubfolders = useMemo(() => {
    if (!activeFolderId) return []
    return allFolders.filter(f => (f.parentId || f.parent_id) === activeFolderId)
  }, [allFolders, activeFolderId])

  // Helper to count items in a subfolder (children folders + direct documents)
  const getSubfolderElementCount = (subfolderId: string) => {
    const childFoldersCount = allFolders.filter(f => (f.parentId || f.parent_id) === subfolderId).length
    const childDocsCount = dbDocuments.filter(d => d.folderId === subfolderId).length
    return childFoldersCount + childDocsCount
  }

  // Navigate into a subfolder
  const handleEnterSubfolder = (subfolderId: string) => {
    const sub = allFolders.find(f => f.id === subfolderId)
    if (!sub) return
    setActiveFolderId(sub.id)
    setFolderBreadcrumbs(prev => [...prev, { id: sub.id, name: sub.name }])
    setSearchQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Navigate back via breadcrumb
  const handleBreadcrumbClick = (index: number) => {
    if (index < 0) {
      onBackToPortal()
      return
    }
    const target = folderBreadcrumbs[index]
    setActiveFolderId(target.id)
    setFolderBreadcrumbs(prev => prev.slice(0, index + 1))
    setSearchQuery('')
  }

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'carpeta') {
      const { error } = await deleteFolder(deleteTarget.id)
      if (error) {
        toast.error('Error al eliminar carpeta', { description: error })
        return
      }
      toast.success(`Carpeta "${deleteTarget.name}" eliminada exitosamente`)
      if (onFolderDeleted) onFolderDeleted(deleteTarget.id)
      if (onRefreshData) onRefreshData()
    } else {
      const { error } = await deleteDocument(deleteTarget.id)
      if (error) {
        toast.error('Error al eliminar documento', { description: error })
        return
      }
      toast.success(`Documento "${deleteTarget.name}" eliminado exitosamente`)
      if (onDocDeleted) onDocDeleted(deleteTarget.id)
      if (onRefreshData) onRefreshData()
    }
  }

  // Map real database documents that belong to current active folder
  const currentFolderResources: VisualCardResource[] = useMemo(() => {
    return dbDocuments
      .filter(doc => {
        if (activeFolderId) {
          if (doc.folderId === activeFolderId) return true
          // Resiliencia cuando se está en la raíz de la carpeta institucional o de área
          if (activeFolderId === rootFolderId) {
            if (subject.dbFolderId && doc.folderId === subject.dbFolderId) return true
            if (subject.slug === 'pei' && (doc.id === '527a9478-7208-49f3-9136-7d68446fe761' || doc.title.toLowerCase().includes('pei'))) {
              return true
            }
          }
          return false
        }
        return false
      })
      .map(doc => {
        const mime = doc.mimeType?.toLowerCase() || ''
        const title = doc.title

        let fType: VisualCardResource['fileType'] = 'pdf'
        if (mime.includes('code') || mime.includes('javascript') || title.endsWith('.py') || title.endsWith('.js')) {
          fType = 'code'
        } else if (mime.startsWith('video/')) {
          fType = 'video'
        } else if (mime.includes('spreadsheet') || mime.includes('excel') || title.endsWith('.xlsx')) {
          fType = 'sheet'
        }

        const sizeFormatted = doc.fileSize
          ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB`
          : '1.5 MB'

        const dateFormatted = doc.createdAt
          ? new Date(doc.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Vigente'

        const author = doc.createdByProfile
          ? `${doc.createdByProfile.firstName} ${doc.createdByProfile.lastName}`
          : 'Equipo Docente'

        return {
          id: doc.id,
          subjectSlug: subject.slug,
          title: doc.title,
          description: doc.description || `Documento institucional alojado para ${currentFolderName}.`,
          fileType: fType,
          fileSizeText: sizeFormatted,
          gradeText: 'Escuela Normal',
          termText: 'Ciclo Actual',
          authorName: author,
          authorRole: 'Docente Titular',
          updatedAtText: dateFormatted,
          category: 'Documento',
          downloadUrl: doc.driveUrl || undefined,
          driveFileId: doc.driveFileId || undefined,
          subtleBgColor: subject.subtleBgLight,
          createdBy: doc.createdBy,
        }
      })
  }, [activeFolderId, dbDocuments, subject.slug, subject.subtleBgLight, currentFolderName, rootFolderId, subject.dbFolderId])

  // Filter resources by search query
  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return currentFolderResources
    const q = searchQuery.toLowerCase()
    return currentFolderResources.filter(res =>
      res.title.toLowerCase().includes(q) ||
      res.description.toLowerCase().includes(q) ||
      res.authorName.toLowerCase().includes(q)
    )
  }, [currentFolderResources, searchQuery])

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-150">
      {/* ── BREADCRUMBS & TOP ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        {/* Interactive Breadcrumb Trail */}
        <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <button
            onClick={onBackToPortal}
            className="hover:text-[#0071e3] dark:hover:text-blue-400 font-medium transition-colors cursor-pointer flex items-center gap-1"
            title="Volver al Portal de Conocimiento Escolar"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal Escolar</span>
          </button>

          {folderBreadcrumbs.map((crumb, idx) => {
            const isLast = idx === folderBreadcrumbs.length - 1
            return (
              <React.Fragment key={crumb.id || idx}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                {isLast ? (
                  <span className="font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                    {crumb.name}
                  </span>
                ) : (
                  <button
                    onClick={() => handleBreadcrumbClick(idx)}
                    className="hover:text-[#0071e3] dark:hover:text-blue-400 font-medium transition-colors cursor-pointer max-w-[160px] truncate"
                  >
                    {crumb.name}
                  </button>
                )}
              </React.Fragment>
            )
          })}
        </nav>

        {/* Action Buttons (Para docente y coordinador: Crear Carpeta + Subir Archivo) */}
        {canManage && (
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* 1. Crear Carpeta / Subcarpeta */}
            <button
              onClick={() => setIsCreateFolderOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-250 dark:border-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Crear Carpeta</span>
            </button>

            {/* 2. Subir Archivo a esta carpeta */}
            {onUploadDoc && activeFolderId && (
              <button
                onClick={() => onUploadDoc(activeFolderId, currentFolderName)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#005bb5] text-white text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Subir Archivo</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── HEADER BANNER (COMPACT & SUBTLE) ── */}
      <div className={`rounded-2xl p-4 sm:p-6 border ${subject.subtleBgLight} ${subject.subtleBorderLight} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/5">
              {subject.categoryBadge}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{subject.coordinator}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1 flex items-center gap-2">
            {activeFolderId !== rootFolderId && (
              <Folder className="w-5 h-5 text-[#0071e3]" />
            )}
            <span>{currentFolderName}</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            {activeFolderId === rootFolderId
              ? subject.description
              : `Subcarpeta de contenidos dentro de ${subject.title}. Organiza el material pedagógico institucional.`}
          </p>
        </div>

        {/* Counter Pill */}
        {(currentSubfolders.length > 0 || currentFolderResources.length > 0) && (
          <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 p-3 rounded-xl border border-black/5 dark:border-white/5 shrink-0 text-center">
            {currentSubfolders.length > 0 && (
              <div>
                <div className="text-lg font-bold text-[#0071e3]">
                  {currentSubfolders.length}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Subcarpetas
                </div>
              </div>
            )}
            {currentSubfolders.length > 0 && currentFolderResources.length > 0 && (
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            )}
            {currentFolderResources.length > 0 && (
              <div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {currentFolderResources.length}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Archivos
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION: SUBCARPETAS (IF ANY) ── */}
      {currentSubfolders.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#0071e3]" />
              <span>Subcarpetas ({currentSubfolders.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {currentSubfolders.map(subfolder => (
              <FolderCard
                key={subfolder.id}
                folder={subfolder}
                elementsCount={getSubfolderElementCount(subfolder.id)}
                onClick={handleEnterSubfolder}
                currentUserId={currentUserId}
                userRole={userRole}
                onEdit={(f) => setEditTargetFolder(f)}
                onDelete={(f) => setDeleteTarget({ id: f.id, name: f.name, type: 'carpeta' })}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION: ARCHIVOS / DOCUMENTOS (SOLO SI EXISTEN ARCHIVOS) ── */}
      {currentFolderResources.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0071e3]" />
              <span>Archivos ({currentFolderResources.length})</span>
            </h2>

            {/* Search Input within Current Folder */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar archivos..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredResources.map(resource => (
              <VisualFileCard
                key={resource.id}
                resource={resource}
                onReadOnline={onOpenReader}
                onDownload={onDownloadResource}
                currentUserId={currentUserId}
                userRole={userRole}
                onEdit={(res) => setEditTargetDoc(res)}
                onDelete={(res) => setDeleteTarget({ id: res.id, name: res.title, type: 'documento' })}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── CREATE SUBFOLDER MODAL ── */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        parentFolderId={activeFolderId}
        parentFolderName={currentFolderName}
        onCreated={(newFolder) => {
          if (onFolderCreated) onFolderCreated(newFolder)
        }}
      />

      {/* ── CONFIRM DELETE MODAL (ONLY FOR AUTHOR) ── */}
      {deleteTarget && (
        <ConfirmDeleteModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          title={deleteTarget.type === 'carpeta' ? 'Eliminar Carpeta' : 'Eliminar Documento'}
          itemName={deleteTarget.name}
          itemType={deleteTarget.type}
        />
      )}

      {/* ── EDIT FOLDER MODAL (FOR AUTHOR, ADMIN, SUPERADMIN) ── */}
      {editTargetFolder && (
        <EditFolderModal
          isOpen={!!editTargetFolder}
          onClose={() => setEditTargetFolder(null)}
          folderId={editTargetFolder.id}
          currentName={editTargetFolder.name}
          currentDescription={editTargetFolder.description}
          onUpdated={(updated) => {
            if (onFolderUpdated) onFolderUpdated(updated)
            if (onRefreshData) onRefreshData()
          }}
        />
      )}

      {/* ── EDIT DOCUMENT MODAL (FOR AUTHOR, ADMIN, SUPERADMIN) ── */}
      {editTargetDoc && (
        <EditDocumentModal
          isOpen={!!editTargetDoc}
          onClose={() => setEditTargetDoc(null)}
          documentId={editTargetDoc.id}
          currentTitle={editTargetDoc.title}
          currentDescription={editTargetDoc.description}
          onUpdated={() => {
            if (onRefreshData) onRefreshData()
          }}
        />
      )}
    </div>
  )
}
