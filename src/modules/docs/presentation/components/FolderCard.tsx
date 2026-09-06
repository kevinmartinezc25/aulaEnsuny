'use client'

import React from 'react'
import { Folder, ChevronRight, FileText, Trash2, Pencil } from 'lucide-react'
import type { DocFolder } from '../../domain/entities/Document'
import { getSubtleCardStyle } from '../../domain/constants/knowledgeCatalog'

interface FolderCardProps {
  folder: DocFolder
  elementsCount: number
  onClick: (folderId: string) => void
  currentUserId?: string | null
  userRole?: string
  onEdit?: (folder: DocFolder) => void
  onDelete?: (folder: DocFolder) => void
}

export function FolderCard({
  folder,
  elementsCount,
  onClick,
  currentUserId,
  userRole,
  onEdit,
  onDelete,
}: FolderCardProps) {
  const subtleStyle = getSubtleCardStyle(folder.id || folder.name)
  const isPrivileged = userRole === 'admin' || userRole === 'superadmin'
  const isAuthor = !!(currentUserId && folder.createdBy && currentUserId === folder.createdBy)
  const canManage = isPrivileged || isAuthor

  return (
    <div
      onClick={() => onClick(folder.id)}
      className={`rounded-xl p-3.5 border ${subtleStyle.bg} ${subtleStyle.border} subtle-card-hover flex flex-col justify-between cursor-pointer h-full min-h-[165px] transition-all group select-none relative`}
    >
      <div>
        {/* Top Header with Squircle Icon, Delete (Author only) & Category Badge */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-2xs flex items-center justify-center border border-black/5 dark:border-white/5">
            <Folder className="w-4 h-4 text-[#0071e3] fill-[#0071e3]/20" />
          </div>

          <div className="flex items-center gap-1.5">
            {canManage && onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(folder)
                }}
                title="Editar carpeta"
                className="w-6 h-6 rounded-md bg-white/80 dark:bg-slate-800/80 text-slate-400 hover:text-[#0071e3] hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-center transition-all cursor-pointer border border-black/5 dark:border-white/5"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {canManage && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(folder)
                }}
                title="Eliminar carpeta"
                className="w-6 h-6 rounded-md bg-white/80 dark:bg-slate-800/80 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center transition-all cursor-pointer border border-black/5 dark:border-white/5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5">
              Subcarpeta
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-[#0071e3] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {folder.name}
        </h3>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
          {folder.description || 'Contenidos pedagógicos y documentos organizados en esta sección.'}
        </p>
      </div>

      {/* Footer Strip with Real Count and Circular Arrow */}
      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between mt-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <FileText className="w-3 h-3 text-slate-400" />
          <span>{elementsCount} {elementsCount === 1 ? 'elemento' : 'elementos'}</span>
        </span>

        <div className="w-6 h-6 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:bg-[#0071e3] group-hover:text-white transition-all shadow-2xs">
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  )
}
