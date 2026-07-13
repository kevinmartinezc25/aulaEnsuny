'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, FileText, Loader2, Clock, Tag } from 'lucide-react'
import type { Document } from '@/modules/docs/domain/entities/Document'

interface DocSearchProps {
  onSelect?: (doc: Document) => void
  onClose?: () => void
}

export function DocSearch({ onSelect, onClose }: DocSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recentDocs, setRecentDocs] = useState<Document[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const { searchDocuments } = await import('@/modules/docs/application/documentActions')
        const { data } = await searchDocuments(query, { limit: 10 })
        setResults(data)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      />

      {/* Search Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl"
      >
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            {isLoading
              ? <Loader2 className="h-4 w-4 text-slate-400 animate-spin shrink-0" />
              : <Search className="h-4 w-4 text-slate-400 shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar documentos, carpetas, etiquetas…"
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            <AnimatePresence mode="wait">
              {results.length > 0 ? (
                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {results.map((doc, idx) => (
                    <motion.button
                      key={doc.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => { onSelect?.(doc); onClose?.() }}
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
                    >
                      <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{doc.title}</p>
                        {doc.content && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {doc.content.replace(/[#*`_[\]]/g, '').substring(0, 80)}
                          </p>
                        )}
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Tag className="h-3 w-3 text-slate-300" />
                            {doc.tags.slice(0, 3).map(tag => (
                              <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-0.5
                        ${doc.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : doc.status === 'archived' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}
                      >
                        {doc.status === 'published' ? 'Publicado' : doc.status === 'archived' ? 'Archivado' : 'Borrador'}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              ) : query && !isLoading ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                  <p className="text-sm text-slate-400">Sin resultados para &ldquo;{query}&rdquo;</p>
                </motion.div>
              ) : !query ? (
                <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Sugerencia</p>
                  <p className="text-xs text-slate-400">Escribe para buscar por título, contenido o etiquetas</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Footer hint */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><kbd className="font-mono">↑↓</kbd> navegar</span>
              <span className="flex items-center gap-1"><kbd className="font-mono">↵</kbd> abrir</span>
            </div>
            <span className="text-[10px] text-slate-300 dark:text-slate-600">Centro de Documentación</span>
          </div>
        </div>
      </motion.div>
    </>
  )
}
