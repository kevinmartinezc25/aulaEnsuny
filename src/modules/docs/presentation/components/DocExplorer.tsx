'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, FileText,
  Plus, MoreHorizontal, Pencil, Trash2, FolderPlus, FilePlus
} from 'lucide-react'
import type { Document, DocFolder } from '@/modules/docs/domain/entities/Document'
import { DocStatusBadge } from './DocStatusBadge'
import type { DocumentStatus } from '@/modules/docs/domain/value-objects/DocumentStatus'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TreeFolder extends DocFolder {
  children: TreeFolder[]
  documents: Document[]
}

interface DocExplorerProps {
  folders: DocFolder[]
  documents: Document[]
  selectedDocId?: string | null
  userRole: 'admin' | 'teacher' | 'student' | 'guest'
  onSelectDoc: (doc: Document) => void
  onNewDocument: (folderId?: string | null) => void
  onNewFolder: (parentId?: string | null) => void
  onRenameFolder: (folder: DocFolder) => void
  onDeleteFolder: (folder: DocFolder) => void
  onDeleteDoc: (doc: Document) => void
}

// ─── Build tree from flat list ─────────────────────────────────────────────────
function buildTree(folders: DocFolder[], documents: Document[]): TreeFolder[] {
  const map: Record<string, TreeFolder> = {}
  const roots: TreeFolder[] = []

  folders.forEach(f => {
    map[f.id] = { ...f, children: [], documents: [] }
  })

  folders.forEach(f => {
    if (f.parentId && map[f.parentId]) {
      map[f.parentId].children.push(map[f.id])
    } else {
      roots.push(map[f.id])
    }
  })

  documents.forEach(doc => {
    if (doc.folderId && map[doc.folderId]) {
      map[doc.folderId].documents.push(doc)
    }
  })

  return roots
}

// ─── Single folder node ────────────────────────────────────────────────────────
function FolderNode({
  folder, depth, selectedDocId, userRole,
  onSelectDoc, onNewDocument, onNewFolder, onRenameFolder, onDeleteFolder, onDeleteDoc
}: {
  folder: TreeFolder
  depth: number
  selectedDocId?: string | null
  userRole: 'admin' | 'teacher' | 'student' | 'guest'
  onSelectDoc: (doc: Document) => void
  onNewDocument: (folderId?: string | null) => void
  onNewFolder: (parentId?: string | null) => void
  onRenameFolder: (folder: DocFolder) => void
  onDeleteFolder: (folder: DocFolder) => void
  onDeleteDoc: (doc: Document) => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const hasContent = folder.children.length > 0 || folder.documents.length > 0
  const canEdit = userRole !== 'student' && userRole !== 'guest'

  return (
    <div>
      {/* Folder Header */}
      <div
        className="group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <button
          onClick={() => setIsOpen(o => !o)}
          className="flex items-center gap-1.5 flex-1 min-w-0"
        >
          <span className="text-slate-400">
            {hasContent
              ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)
              : <span className="w-3.5" />
            }
          </span>
          {isOpen
            ? <FolderOpen className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
            : <Folder className="h-4 w-4 text-slate-400 shrink-0" />
          }
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{folder.name}</span>
          {folder.documents.length > 0 && (
            <span className="ml-auto shrink-0 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {folder.documents.length}
            </span>
          )}
        </button>

        {/* Folder Actions */}
        {canEdit && (
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl py-1 min-w-[160px]"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => { onNewDocument(folder.id); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <FilePlus className="h-3.5 w-3.5" /> Nuevo documento
                  </button>
                  <button
                    onClick={() => { onNewFolder(folder.id); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <FolderPlus className="h-3.5 w-3.5" /> Nueva subcarpeta
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    onClick={() => { onRenameFolder(folder); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Renombrar
                  </button>
                  <button
                    onClick={() => { onDeleteFolder(folder); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Folder Contents */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {/* Subfolders */}
            {folder.children.map(child => (
              <FolderNode
                key={child.id}
                folder={child}
                depth={depth + 1}
                selectedDocId={selectedDocId}
                userRole={userRole}
                onSelectDoc={onSelectDoc}
                onNewDocument={onNewDocument}
                onNewFolder={onNewFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                onDeleteDoc={onDeleteDoc}
              />
            ))}
            {/* Documents */}
            {folder.documents.map(doc => (
              <DocNode
                key={doc.id}
                doc={doc}
                depth={depth + 1}
                isSelected={selectedDocId === doc.id}
                userRole={userRole}
                onSelect={() => onSelectDoc(doc)}
                onDelete={() => onDeleteDoc(doc)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Document node ─────────────────────────────────────────────────────────────
function DocNode({ doc, depth, isSelected, userRole, onSelect, onDelete }: {
  doc: Document
  depth: number
  isSelected: boolean
  userRole: 'admin' | 'teacher' | 'student' | 'guest'
  onSelect: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const canEdit = userRole !== 'student' && userRole !== 'guest'

  return (
    <div
      className={`group flex items-center gap-1.5 rounded-lg transition-colors cursor-pointer
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
        }`}
      style={{ paddingLeft: `${20 + depth * 16}px`, paddingRight: '8px', paddingTop: '6px', paddingBottom: '6px' }}
      onClick={onSelect}
    >
      <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
      <span className="text-xs font-medium flex-1 truncate">{doc.title}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <DocStatusBadge status={doc.status} size="sm" />
        {canEdit && (
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <MoreHorizontal className="h-3 w-3 text-slate-400" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl py-1 min-w-[130px]"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Explorer ─────────────────────────────────────────────────────────────
export function DocExplorer({
  folders, documents, selectedDocId, userRole,
  onSelectDoc, onNewDocument, onNewFolder, onRenameFolder, onDeleteFolder, onDeleteDoc
}: DocExplorerProps) {
  const tree = buildTree(folders, documents)
  const rootDocuments = documents.filter(d => !d.folderId)
  const canEdit = userRole !== 'student' && userRole !== 'guest'

  return (
    <div className="flex flex-col h-full">
      {/* Explorer Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100 dark:border-slate-800/60">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Documentos</span>
        {canEdit && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onNewFolder(null)}
              title="Nueva carpeta"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onNewDocument(null)}
              title="Nuevo documento"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <FilePlus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2 px-1">
        {/* Folders */}
        {tree.map(folder => (
          <FolderNode
            key={folder.id}
            folder={folder}
            depth={0}
            selectedDocId={selectedDocId}
            userRole={userRole}
            onSelectDoc={onSelectDoc}
            onNewDocument={onNewDocument}
            onNewFolder={onNewFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onDeleteDoc={onDeleteDoc}
          />
        ))}
        {/* Root documents (no folder) */}
        {rootDocuments.map(doc => (
          <DocNode
            key={doc.id}
            doc={doc}
            depth={0}
            isSelected={selectedDocId === doc.id}
            userRole={userRole}
            onSelect={() => onSelectDoc(doc)}
            onDelete={() => onDeleteDoc(doc)}
          />
        ))}
        {/* Empty state */}
        {tree.length === 0 && rootDocuments.length === 0 && (
          <div className="py-8 text-center">
            <FileText className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Sin documentos aún</p>
            {canEdit && (
              <button
                onClick={() => onNewDocument(null)}
                className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Crear el primero
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
