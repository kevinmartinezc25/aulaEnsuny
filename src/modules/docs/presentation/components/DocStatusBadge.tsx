'use client'

import { DocumentStatus, DocumentStatusLabel, DocumentStatusColor } from '@/modules/docs/domain/value-objects/DocumentStatus'
import { motion } from 'framer-motion'

interface DocStatusBadgeProps {
  status: DocumentStatus
  size?: 'sm' | 'md'
  interactive?: boolean
  onStatusChange?: (status: DocumentStatus) => void
}

const statusConfig = {
  draft: {
    label: 'Borrador',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
    dot: 'bg-amber-400',
  },
  published: {
    label: 'Publicado',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    dot: 'bg-emerald-500 animate-pulse',
  },
  archived: {
    label: 'Archivado',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
}

export function DocStatusBadge({ status, size = 'sm', interactive, onStatusChange }: DocStatusBadgeProps) {
  const cfg = statusConfig[status]

  const content = (
    <span className={`
      inline-flex items-center gap-1.5 rounded-full border font-medium
      ${cfg.bg} ${cfg.text} ${cfg.border}
      ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'}
      ${interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    `}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )

  if (!interactive || !onStatusChange) return content

  return (
    <div className="relative group">
      {content}
      <div className="absolute top-full left-0 mt-1.5 z-50 hidden group-hover:flex flex-col gap-0.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl p-1.5 min-w-[130px]">
        {(Object.keys(statusConfig) as DocumentStatus[]).map((s) => {
          const c = statusConfig[s]
          return (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${s === status ? `${c.bg} ${c.text}` : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}
              `}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
