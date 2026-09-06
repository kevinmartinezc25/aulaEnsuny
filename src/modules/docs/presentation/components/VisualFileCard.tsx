'use client'

import React from 'react'
import {
  FileText, Code2, Play, Presentation, FileSpreadsheet, Download,
  Eye, User, Clock, CheckCircle, Trash2, Pencil
} from 'lucide-react'
import { type VisualCardResource, getSubtleCardStyle } from '../../domain/constants/knowledgeCatalog'

interface VisualFileCardProps {
  resource: VisualCardResource
  onReadOnline: (resource: VisualCardResource) => void
  onDownload: (resource: VisualCardResource) => void
  currentUserId?: string | null
  userRole?: string
  onEdit?: (resource: VisualCardResource) => void
  onDelete?: (resource: VisualCardResource) => void
}

export function VisualFileCard({
  resource,
  onReadOnline,
  onDownload,
  currentUserId,
  userRole,
  onEdit,
  onDelete,
}: VisualFileCardProps) {
  const subtleStyle = getSubtleCardStyle(resource.id)
  const isPrivileged = userRole === 'admin' || userRole === 'superadmin'
  const isAuthor = !!(currentUserId && resource.createdBy && currentUserId === resource.createdBy)
  const canManage = isPrivileged || isAuthor

  const renderVisualAssetPreview = () => {
    switch (resource.fileType) {
      case 'code':
        return (
          <div className="h-20 w-full bg-slate-950 p-2 flex flex-col justify-between font-mono text-[10px] select-none overflow-hidden relative border-b border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500/80"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
                <span className="text-[9px] text-slate-400 pl-1.5 truncate">código</span>
              </div>
              <Code2 className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-[9px] text-slate-300 font-mono leading-tight truncate">
              {resource.title}
            </div>
            <div className="text-[8px] text-slate-500">Documento de Código Fuente</div>
          </div>
        )

      case 'video':
        return (
          <div className="h-20 w-full bg-gradient-to-tr from-sky-900 to-slate-900 p-2 flex flex-col justify-between select-none relative border-b border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between z-10">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white">
                VIDEO
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-white/90 text-[#0071e3] flex items-center justify-center shadow-xs">
                <Play className="w-3 h-3 fill-current ml-0.5" />
              </div>
            </div>
            <div className="z-10 text-[9px] text-slate-300 font-medium truncate">Material Multimedia</div>
          </div>
        )

      case 'sheet':
        return (
          <div className="h-20 w-full bg-emerald-100/60 dark:bg-emerald-950/40 p-2 flex flex-col justify-between select-none relative border-b border-emerald-200/50 dark:border-emerald-800/50">
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">
                EXCEL / HOJA
              </span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="grid grid-cols-4 gap-1 opacity-70">
              <div className="h-2 bg-emerald-300/80 rounded-xs"></div>
              <div className="h-2 bg-emerald-300/80 rounded-xs"></div>
              <div className="h-2 bg-emerald-300/80 rounded-xs"></div>
              <div className="h-2 bg-emerald-300/80 rounded-xs"></div>
            </div>
            <div className="text-[9px] text-emerald-800 dark:text-emerald-300 font-medium">
              Datos y Calificaciones
            </div>
          </div>
        )

      default:
        // PDF Schematic (Compact)
        return (
          <div className="h-20 w-full bg-white/80 dark:bg-slate-800/80 p-2.5 flex flex-col justify-between select-none relative border-b border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0071e3] text-white">
                PDF OFICIAL
              </span>
              <FileText className="w-3.5 h-3.5 text-[#0071e3]" />
            </div>
            <div className="space-y-1 max-w-[85%]">
              <div className="h-1.5 w-3/5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
              <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="h-1 w-4/5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
              <span>{resource.fileSizeText}</span>
              <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                <CheckCircle className="w-2.5 h-2.5" /> Verificado
              </span>
            </div>
          </div>
        )
    }
  }

  return (
    <div
      className={`rounded-xl border ${subtleStyle.bg} ${subtleStyle.border} subtle-card-hover flex flex-col justify-between overflow-hidden group h-full min-h-[220px] transition-all`}
    >
      {/* Visual Asset Thumbnail (Compact 30% smaller) */}
      {renderVisualAssetPreview()}

      {/* Content Body */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata Badges */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-800/80 text-[9px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/5">
              {resource.category}
            </span>
            <span className="text-[9px] text-slate-400">
              {resource.updatedAtText}
            </span>
          </div>

          {/* Title */}
          <h4 className="font-semibold text-xs text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-[#0071e3] dark:group-hover:text-blue-400 transition-colors line-clamp-2">
            {resource.title}
          </h4>

          {/* Description */}
          {resource.description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 mb-2">
              {resource.description}
            </p>
          )}
        </div>

        <div>
          {/* Author */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-2">
            <div className="flex items-center gap-1 truncate">
              <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              <span className="truncate font-medium">{resource.authorName}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onReadOnline(resource)}
              className="flex-1 py-1 px-2.5 rounded-lg bg-[#0071e3] hover:bg-[#005bb5] text-white text-[10px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
            >
              <Eye className="w-3 h-3" />
              <span>Leer</span>
            </button>

            <button
              onClick={() => onDownload(resource)}
              title="Descargar archivo"
              className="p-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-black/5 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Download className="w-3 h-3" />
            </button>

            {canManage && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(resource)}
                title="Editar documento"
                className="p-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-black/5 dark:border-white/5 text-slate-400 hover:text-[#0071e3] hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}

            {canManage && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(resource)}
                title="Eliminar documento"
                className="p-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-black/5 dark:border-white/5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
