'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search, X, FileText, BookOpen, ExternalLink, ArrowRight, CornerDownLeft, Sparkles, Folder
} from 'lucide-react'
import {
  ACADEMIC_SUBJECTS,
  INSTITUTIONAL_DOCS,
  type AcademicSubject,
  type InstitutionalDocumentItem,
  type VisualCardResource
} from '../../domain/constants/knowledgeCatalog'
import type { Document } from '../../domain/entities/Document'

interface SpotlightSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectSubject: (subjectSlug: string) => void
  onSelectDoc: (docSlug: string) => void
  onOpenResourceReader: (resource: VisualCardResource) => void
  dbDocuments?: Document[]
  allSubjects?: AcademicSubject[]
}

export function SpotlightSearchModal({
  isOpen,
  onClose,
  onSelectSubject,
  onSelectDoc,
  onOpenResourceReader,
  dbDocuments = [],
  allSubjects,
}: SpotlightSearchModalProps) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'subjects' | 'docs' | 'resources'>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Filtered search results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const subjectsPool = allSubjects || ACADEMIC_SUBJECTS

    const matchingSubjects = subjectsPool.filter(s =>
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.categoryBadge.toLowerCase().includes(q)
    ).map(s => ({
      type: 'subject' as const,
      id: s.id,
      title: s.title,
      subtitle: `${s.categoryBadge} • ${s.coordinator}`,
      badge: 'ÁREA',
      item: s,
    }))

    const matchingDocs = INSTITUTIONAL_DOCS.filter(d =>
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.versionResolution.toLowerCase().includes(q)
    ).map(d => ({
      type: 'doc' as const,
      id: d.id,
      title: d.title,
      subtitle: d.versionResolution,
      badge: 'Institucional',
      item: d,
    }))

    const matchingResources = (dbDocuments || []).filter(doc =>
      !q ||
      doc.title.toLowerCase().includes(q) ||
      (doc.description && doc.description.toLowerCase().includes(q))
    ).map(doc => {
      const res: VisualCardResource = {
        id: doc.id,
        subjectSlug: 'documento',
        title: doc.title,
        description: doc.description || 'Documento institucional',
        fileType: doc.mimeType?.includes('pdf') ? 'pdf' : 'doc',
        fileSizeText: doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB` : '1.5 MB',
        gradeText: 'Oficial',
        termText: 'ENSUNY',
        authorName: doc.createdByProfile ? `${doc.createdByProfile.firstName} ${doc.createdByProfile.lastName}` : 'Docente',
        authorRole: 'Institucional',
        updatedAtText: 'Vigente',
        category: 'Documento',
        downloadUrl: doc.driveUrl || undefined,
        subtleBgColor: '',
      }
      return {
        type: 'resource' as const,
        id: doc.id,
        title: doc.title,
        subtitle: doc.description || 'Documento alojado en el sistema',
        badge: 'ARCHIVO',
        item: res,
      }
    })

    let all: Array<{
      type: 'subject' | 'doc' | 'resource'
      id: string
      title: string
      subtitle: string
      badge: string
      item: any
    }> = []

    if (activeCategory === 'all') {
      all = [...matchingSubjects, ...matchingDocs, ...matchingResources]
    } else if (activeCategory === 'subjects') {
      all = matchingSubjects
    } else if (activeCategory === 'docs') {
      all = matchingDocs
    } else {
      all = matchingResources
    }

    return all.slice(0, 8)
  }, [query, activeCategory])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = results[selectedIndex]
        if (selected) {
          handleExecute(selected)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  const handleExecute = (item: (typeof results)[0]) => {
    onClose()
    if (item.type === 'subject') {
      onSelectSubject((item.item as AcademicSubject).slug)
    } else if (item.type === 'doc') {
      onSelectDoc((item.item as InstitutionalDocumentItem).slug)
    } else if (item.type === 'resource') {
      onOpenResourceReader(item.item as VisualCardResource)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Dimmed Scrim */}
      <div
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Spotlight Window */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-[#0071e3] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Buscar guías, talleres, asignaturas, PEI o manual..."
            className="w-full bg-transparent border-none text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700">
            ESC
          </span>
        </div>

        {/* Filter Pills Tray */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-[#0071e3] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveCategory('subjects')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${
              activeCategory === 'subjects'
                ? 'bg-[#0071e3] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Asignaturas
          </button>
          <button
            onClick={() => setActiveCategory('docs')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${
              activeCategory === 'docs'
                ? 'bg-[#0071e3] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Institucional
          </button>
          <button
            onClick={() => setActiveCategory('resources')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${
              activeCategory === 'resources'
                ? 'bg-[#0071e3] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Guías y Talleres
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/40">
          {results.length === 0 ? (
            <div className="p-8 text-center">
              <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No se encontraron resultados para &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Prueba buscando por tema, número de guía o nombre de profesor.
              </p>
            </div>
          ) : (
            results.map((res, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={res.id}
                  onClick={() => handleExecute(res)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        res.type === 'subject'
                          ? 'bg-blue-100 text-[#0071e3] dark:bg-blue-900/50'
                          : res.type === 'doc'
                            ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50'
                      }`}
                    >
                      {res.type === 'subject' ? (
                        <Folder className="w-4 h-4" />
                      ) : res.type === 'doc' ? (
                        <BookOpen className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate">{res.title}</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {res.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {res.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#0071e3] font-medium pr-1">
                        <CornerDownLeft className="w-3 h-3" /> Abrir
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info strip */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Usa las flechas ↑ ↓ para navegar y ENTER para abrir</span>
          <span>Indexación en tiempo real</span>
        </div>
      </div>
    </div>
  )
}
