'use client'

import React from 'react'
import { BookOpen, Gavel, Scale, FileText, Eye, Download, CheckCircle2 } from 'lucide-react'
import type { InstitutionalDocumentItem } from '../../domain/constants/knowledgeCatalog'

interface InstitutionalDocCardProps {
  document: InstitutionalDocumentItem
  onReadOnline: (docSlug: string) => void
  onDownload: (docSlug: string) => void
}

export function InstitutionalDocCard({
  document,
  onReadOnline,
  onDownload,
}: InstitutionalDocCardProps) {
  const getDocIcon = () => {
    switch (document.iconName) {
      case 'menu_book':
        return <BookOpen className="w-4 h-4 text-[#0071e3]" />
      case 'gavel':
        return <Gavel className="w-4 h-4 text-teal-600 dark:text-teal-400" />
      case 'grading':
        return <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      case 'file_text':
        return <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  return (
    <div className={`rounded-xl p-3.5 border ${document.subtleBgLight} ${document.subtleBorderLight} subtle-card-hover flex flex-col justify-between group h-full min-h-[195px] transition-all`}>
      <div>
        {/* Top Badges & Icon */}
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight ${document.badgeColorClass}`}>
            {document.statusBadge}
          </span>
          <div className="w-7 h-7 rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-2xs flex items-center justify-center border border-black/5 dark:border-white/5">
            {getDocIcon()}
          </div>
        </div>

        {/* Document Title & Description */}
        <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-[#0071e3] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {document.title}
        </h3>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mb-3 line-clamp-2">
          {document.description}
        </p>
      </div>

      <div>
        {/* Resolution pill */}
        <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg px-2 py-1.5 text-[10px] text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-1.5 border border-black/5 dark:border-white/5">
          <CheckCircle2 className="w-3 h-3 text-[#0071e3] shrink-0" />
          <span className="truncate">{document.versionResolution}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReadOnline(document.slug)}
            className="flex-1 py-1.5 px-3 rounded-lg bg-[#0071e3] hover:bg-[#005bb5] text-white text-[11px] font-semibold text-center transition-all active:scale-[0.98] flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
          >
            <Eye className="w-3 h-3" />
            <span>{document.readOnlineLabel}</span>
          </button>

          <button
            onClick={() => onDownload(document.slug)}
            title="Descargar documento oficial"
            className="p-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-black/5 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
