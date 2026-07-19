'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronDown, ChevronUp, Folder, FolderOpen, FileText,
  Plus, MoreHorizontal, Pencil, Trash2, FolderPlus, FilePlus, Palette, X
} from 'lucide-react'
import type { Document, DocFolder } from '@/modules/docs/domain/entities/Document'
import { DocStatusBadge } from './DocStatusBadge'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TreeFolder extends DocFolder {
  children: TreeFolder[]
  documents: Document[]
}

interface DocExplorerProps {
  folders: DocFolder[]
  documents: Document[]
  selectedDocId?: string | null
  selectedFolderId?: string | null
  userRole: 'admin' | 'teacher' | 'student' | 'guest'
  onSelectDoc: (doc: Document) => void
  onSelectFolder: (folderId: string | null) => void
  onNewDocument: (folderId?: string | null) => void
  onNewFolder: (parentId?: string | null) => void
  onRenameFolder: (folder: DocFolder) => void
  onDeleteFolder: (folder: DocFolder) => void
  onDeleteDoc: (doc: Document) => void
  onReorderFolder?: (folderId: string, direction: 'up' | 'down') => void
  onColorFolder?: (folderId: string, color: string | null) => void
}

// ─── Folder Color Palette ──────────────────────────────────────────────────────
const FOLDER_COLORS = [
  { label: 'Predeterminado', value: null },
  { label: 'Oceano',     value: '#4A90E2' },
  { label: 'Cielo',      value: '#67B8F7' },
  { label: 'Menta',      value: '#34C78A' },
  { label: 'Bosque',     value: '#1F6F3C' },
  { label: 'Lima',       value: '#A0D468' },
  { label: 'Oro',        value: '#F5A623' },
  { label: 'Naranja',    value: '#F06529' },
  { label: 'Rosa',       value: '#E91E8C' },
  { label: 'Uva',        value: '#9B59B6' },
  { label: 'Lila',       value: '#C39BD3' },
  { label: 'Tormenta',   value: '#546E7A' },
  { label: 'Rojo',       value: '#E53935' },
]

// ─── Recursive Document Count Helper ───────────────────────────────────────────
function getRecursiveDocCount(folder: TreeFolder): number {
  let count = folder.documents.length
  folder.children.forEach(child => {
    count += getRecursiveDocCount(child)
  })
  return count
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
  folder, depth, selectedDocId, selectedFolderId, userRole,
  onSelectDoc, onSelectFolder, onNewDocument, onNewFolder, onRenameFolder, onDeleteFolder, onDeleteDoc,
  onReorderFolder, onColorFolder
}: {
  folder: TreeFolder
  depth: number
  selectedDocId?: string | null
  selectedFolderId?: string | null
  userRole: 'admin' | 'teacher' | 'student' | 'guest'
  onSelectDoc: (doc: Document) => void
  onSelectFolder: (folderId: string | null) => void
  onNewDocument: (folderId?: string | null) => void
  onNewFolder: (parentId?: string | null) => void
  onRenameFolder: (folder: DocFolder) => void
  onDeleteFolder: (folder: DocFolder) => void
  onDeleteDoc: (doc: Document) => void
  onReorderFolder?: (folderId: string, direction: 'up' | 'down') => void
  onColorFolder?: (folderId: string, color: string | null) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const hasContent = folder.children.length > 0 || folder.documents.length > 0
  const canEdit = userRole !== 'student' && userRole !== 'guest'
  const isSelected = selectedFolderId === folder.id
  const docCount = getRecursiveDocCount(folder)
  const folderColor = folder.color ?? '#94a3b8' // default slate-400

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div>
      {/* Folder Header */}
      <div
        className={`group flex items-center rounded-xl px-2 py-1.5 transition-all duration-200 cursor-pointer text-xs
          ${isSelected 
            ? 'bg-[#1F4E31]/10 text-[#1F4E31] dark:bg-emerald-500/10 dark:text-[#4AB874] font-semibold' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-350'
          }`}
        style={{ paddingLeft: `${4 + depth * 12}px` }}
        onClick={() => {
          onSelectFolder(folder.id)
          setIsOpen(o => !o)
        }}
      >
        {/* Expand / Collapse Chevron */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            setIsOpen(o => !o)
          }}
          className="p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-750 text-slate-400 mr-0.5"
        >
          {hasContent ? (
            isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : (
            <span className="w-3" />
          )}
        </button>

        {/* Icon & Name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isOpen ? (
            <FolderOpen className="h-4 w-4 shrink-0" style={{ color: folderColor }} />
          ) : (
            <Folder className="h-4 w-4 shrink-0" style={{ color: folderColor }} />
          )}
          <span className="truncate">{folder.name}</span>
        </div>

        {/* Badges / Actions */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0" onClick={e => e.stopPropagation()}>
          {docCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              isSelected ? 'bg-[#1F4E31]/20 text-[#1F4E31]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              {docCount}
            </span>
          )}

          {canEdit && (
            <div ref={menuRef} className="relative opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <MoreHorizontal className="h-3 w-3 text-slate-400" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-1 z-[999] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl py-1 min-w-[185px]"
                  >
                    {userRole === 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={() => { onReorderFolder?.(folder.id, 'up'); setMenuOpen(false) }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <ChevronUp className="h-3.5 w-3.5" /> Mover arriba
                        </button>
                        <button
                          type="button"
                          onClick={() => { onReorderFolder?.(folder.id, 'down'); setMenuOpen(false) }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <ChevronDown className="h-3.5 w-3.5" /> Mover abajo
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => { onNewDocument(folder.id); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <FilePlus className="h-3.5 w-3.5" /> Nuevo documento
                    </button>
                    <button
                      type="button"
                      onClick={() => { onNewFolder(folder.id); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <FolderPlus className="h-3.5 w-3.5" /> Nueva subcarpeta
                    </button>

                    {/* ── Color Picker ── */}
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      type="button"
                      onClick={() => setColorPickerOpen(v => !v)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Palette className="h-3.5 w-3.5" />
                      <span>Color de carpeta</span>
                      <span
                        className="ml-auto h-3 w-3 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                        style={{ backgroundColor: folder.color ?? '#94a3b8' }}
                      />
                    </button>

                    {colorPickerOpen && (
                      <div className="px-3 pb-2">
                        <div className="grid grid-cols-6 gap-1.5 mt-1">
                          {FOLDER_COLORS.map(c => (
                            <button
                              key={c.label}
                              type="button"
                              title={c.label}
                              onClick={() => {
                                onColorFolder?.(folder.id, c.value)
                                setColorPickerOpen(false)
                                setMenuOpen(false)
                              }}
                              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                                folder.color === c.value
                                  ? 'border-slate-900 dark:border-white scale-110'
                                  : 'border-transparent'
                              }`}
                              style={{
                                backgroundColor: c.value ?? '#e2e8f0',
                                outline: c.value === null ? '1.5px dashed #94a3b8' : 'none'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      type="button"
                      onClick={() => { onRenameFolder(folder); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Renombrar
                    </button>
                    <button
                      type="button"
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
      </div>

      {/* Folder Contents */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {/* Subfolders */}
            {folder.children.map(child => (
              <FolderNode
                key={child.id}
                folder={child}
                depth={depth + 1}
                selectedDocId={selectedDocId}
                selectedFolderId={selectedFolderId}
                userRole={userRole}
                onSelectDoc={onSelectDoc}
                onSelectFolder={onSelectFolder}
                onNewDocument={onNewDocument}
                onNewFolder={onNewFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                onDeleteDoc={onDeleteDoc}
                onReorderFolder={onReorderFolder}
                onColorFolder={onColorFolder}
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
      className={`group flex items-center gap-2 rounded-xl transition-all duration-200 cursor-pointer text-xs py-1.5
        ${isSelected
          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-[#4AB874] font-semibold'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
        }`}
      style={{ paddingLeft: `${24 + depth * 12}px`, paddingRight: '8px' }}
      onClick={onSelect}
    >
      <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
      <span className="flex-1 truncate">{doc.title}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <DocStatusBadge status={doc.status} size="sm" />
        {canEdit && (
          <div className="relative">
            <button
              type="button"
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
                  className="absolute right-0 top-full mt-1 z-55 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl py-1 min-w-[130px]"
                >
                  <button
                    type="button"
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
  folders, documents, selectedDocId, selectedFolderId, userRole,
  onSelectDoc, onSelectFolder, onNewDocument, onNewFolder, onRenameFolder, onDeleteFolder, onDeleteDoc,
  onReorderFolder, onColorFolder
}: DocExplorerProps) {
  const tree = buildTree(folders, documents)
  const rootDocuments = documents.filter(d => !d.folderId)
  const canEdit = userRole !== 'student' && userRole !== 'guest'

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900/40">
      {/* Explorer Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/60">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Categorías</span>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNewFolder(null)}
              title="Nueva carpeta"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNewDocument(null)}
              title="Nuevo documento"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <FilePlus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {/* Root Selector (All documents) */}
        <div
          onClick={() => onSelectFolder(null)}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 cursor-pointer text-xs font-semibold
            ${selectedFolderId === null && !selectedDocId
              ? 'bg-[#1F4E31]/10 text-[#1F4E31] dark:bg-emerald-500/10 dark:text-[#4AB874]'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-350'
            }`}
        >
          <Folder className={`h-4 w-4 shrink-0 ${selectedFolderId === null && !selectedDocId ? 'text-[#1F4E31] dark:text-[#4AB874]' : 'text-slate-400'}`} />
          <span>Todos los Documentos</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold">
            {documents.length}
          </span>
        </div>

        <div className="my-2 border-t border-slate-100 dark:border-slate-850" />

        {/* Folders */}
        {tree.map(folder => (
          <FolderNode
            key={folder.id}
            folder={folder}
            depth={0}
            selectedDocId={selectedDocId}
            selectedFolderId={selectedFolderId}
            userRole={userRole}
            onSelectDoc={onSelectDoc}
            onSelectFolder={onSelectFolder}
            onNewDocument={onNewDocument}
            onNewFolder={onNewFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onDeleteDoc={onDeleteDoc}
            onReorderFolder={onReorderFolder}
            onColorFolder={onColorFolder}
          />
        ))}

        {/* Root documents (no folder) */}
        {rootDocuments.length > 0 && (
          <>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-3 pt-3 pb-1">General</div>
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
          </>
        )}

        {/* Empty state */}
        {tree.length === 0 && rootDocuments.length === 0 && (
          <div className="py-8 text-center">
            <FileText className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Sin carpetas aún</p>
            {canEdit && (
              <button
                type="button"
                onClick={() => onNewFolder(null)}
                className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Crear categoría
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
