'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, RotateCcw, User, ChevronDown, ChevronUp, X } from 'lucide-react'
import { toast } from 'sonner'
import { restoreDocumentVersion } from '@/modules/docs/application/documentActions'

interface Version {
  id: string
  version_num: number
  title: string
  content: string
  change_note: string | null
  created_at: string
  profiles?: { first_name: string; last_name: string }
}

interface DocVersionHistoryProps {
  documentId: string
  versions: Version[]
  onRestored?: () => void
  onClose?: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Hace un momento'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `Hace ${days}d`
}

export function DocVersionHistory({ documentId, versions, onRestored, onClose }: DocVersionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = async (versionId: string) => {
    setRestoringId(versionId)
    const { error } = await restoreDocumentVersion(documentId, versionId)
    setRestoringId(null)

    if (error) {
      toast.error('Error al restaurar versión', { description: error })
    } else {
      toast.success('Versión restaurada', { description: 'El documento ha sido restaurado a esta versión.' })
      onRestored?.()
      onClose?.()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Historial de versiones</h3>
          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {versions.length}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Versions list */}
      <div className="flex-1 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Sin versiones guardadas</p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Las versiones se crean automáticamente al guardar</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {versions.map((version, idx) => (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Version badge + title */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">v{version.version_num}</span>
                      {idx === 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{version.title}</p>
                    {version.change_note && (
                      <p className="text-xs text-slate-400 mt-0.5 italic">{version.change_note}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <User className="h-3 w-3" />
                        {version.profiles
                          ? `${version.profiles.first_name} ${version.profiles.last_name}`
                          : 'Desconocido'}
                      </div>
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-[10px] text-slate-400">{timeAgo(version.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(id => id === version.id ? null : version.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Ver contenido"
                    >
                      {expandedId === version.id
                        ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                    </button>
                    {idx > 0 && (
                      <button
                        onClick={() => handleRestore(version.id)}
                        disabled={restoringId === version.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                        title="Restaurar esta versión"
                      >
                        <RotateCcw className={`h-3 w-3 ${restoringId === version.id ? 'animate-spin' : ''}`} />
                        Restaurar
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable preview */}
                <AnimatePresence>
                  {expandedId === version.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 font-mono leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {version.content
                          ? version.content.substring(0, 400) + (version.content.length > 400 ? '…' : '')
                          : '(documento vacío)'}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
