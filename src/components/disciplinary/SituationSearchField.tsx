'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Info, CheckCircle2, X } from 'lucide-react'
import Fuse from 'fuse.js'
import { DisciplinarySituation } from '@/modules/disciplinary/application/actions'

interface Props {
  situations: DisciplinarySituation[]
  value?: DisciplinarySituation | null
  onChange: (situation: DisciplinarySituation | null) => void
  error?: string
}

export function SituationSearchField({ situations, value, onChange, error }: Props) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'Tipo I' | 'Tipo II' | 'Tipo III'>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filtrar primero por tipo
  const filteredSituations = useMemo(() => {
    if (typeFilter === 'all') return situations
    return situations.filter(s => s.type === typeFilter)
  }, [situations, typeFilter])

  // Configurar Fuse.js para búsqueda difusa (fuzzy search)
  const fuse = useMemo(() => {
    return new Fuse(filteredSituations, {
      keys: ['code', 'title', 'description', 'type'],
      threshold: 0.3, // 0 = coincidencia exacta, 1 = coincide con todo
      includeScore: true
    })
  }, [filteredSituations])

  // Obtener resultados basados en el query
  const results = useMemo(() => {
    if (!query) return filteredSituations
    const searchResults = fuse.search(query)
    return searchResults.map(result => result.item)
  }, [query, fuse, filteredSituations])

  // Cerrar dropdown si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Componente de Badge de Tipo
  const TypeBadge = ({ type }: { type: string }) => {
    const colors = {
      'Tipo I': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300',
      'Tipo II': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300',
      'Tipo III': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300'
    }
    const colorClass = colors[type as keyof typeof colors] || 'bg-slate-100 text-slate-700'
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
        {type}
      </span>
    )
  }

  // Vista cuando hay una situación seleccionada
  if (value) {
    return (
      <div className="relative group">
        <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-500/50 rounded-xl shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-slate-500 dark:text-slate-400">
                    {value.code}
                  </span>
                  <TypeBadge type={value.type} />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white leading-tight">
                  {value.title}
                </h4>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setQuery('')
              }}
              className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Cambiar situación"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="pl-13 pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {value.description}
                </p>
                {value.manualReference && (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    Ref. Manual: {value.manualReference}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vista de búsqueda
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector de Tipificación */}
      <div className="flex gap-2 mb-3">
        {(['all', 'Tipo I', 'Tipo II', 'Tipo III'] as const).map(type => {
          const isActive = typeFilter === type
          let activeClass = 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 border border-transparent'
          if (isActive) {
            if (type === 'Tipo I') activeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-700/50'
            else if (type === 'Tipo II') activeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50'
            else if (type === 'Tipo III') activeClass = 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border border-red-300 dark:border-red-700/50'
          }

          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setTypeFilter(type)
                if (!isOpen) setIsOpen(true)
              }}
              className={`px-3 py-2 rounded-xl text-sm font-bold transition-all flex-1 ${
                isActive
                  ? activeClass
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700/50'
              }`}
            >
              {type === 'all' ? 'Todos' : type}
            </button>
          )
        })}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className={`block w-full pl-10 pr-3 py-3.5 border ${
            error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500'
          } rounded-xl leading-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 sm:text-sm transition-colors shadow-sm`}
          placeholder="Buscar por código, título o palabras clave..."
        />
      </div>
      
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}

      {/* Resultados del Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-white dark:bg-slate-900 shadow-xl max-h-96 rounded-xl py-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-slate-200 dark:border-slate-700">
          {results.length === 0 ? (
            <div className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
              <Search className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="font-medium">No se encontraron situaciones</p>
              <p className="text-xs mt-1">Intenta con otros términos de búsqueda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((situation) => (
                <button
                  key={situation.id}
                  type="button"
                  onClick={() => {
                    onChange(situation)
                    setIsOpen(false)
                  }}
                  className="w-full text-left cursor-default select-none relative p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {situation.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {situation.code}
                        </span>
                        <TypeBadge type={situation.type} />
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {situation.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
