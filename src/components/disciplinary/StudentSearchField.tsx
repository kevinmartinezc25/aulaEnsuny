'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, Loader2, User, CheckCircle2, X } from 'lucide-react'
import { StudentRef } from '@/modules/disciplinary/application/actions'
import { searchStudentsUnified } from '@/modules/disciplinary/application/studentSearchAction'

// Como useDebounce puede no existir, lo implementamos aquí inline
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

interface Props {
  value?: StudentRef | null
  onChange: (student: StudentRef | null) => void
  error?: string
}

export function StudentSearchField({ value, onChange, error }: Props) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounceValue(query, 400)
  const [results, setResults] = useState<StudentRef[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Buscar estudiantes cuando cambia el query debounced
  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setResults([])
        return
      }
      
      setLoading(true)
      try {
        const data = await searchStudentsUnified(debouncedQuery)
        setResults(data)
        setIsOpen(true)
      } catch (err) {
        console.error('Error buscando estudiantes:', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery])

  // Si hay un valor seleccionado, no mostrar buscador sino el valor
  if (value) {
    return (
      <div className="relative">
        <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                {value.fullName}
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Grado: {value.gradeLevel} - Grupo: {value.groupName}
                {value.documentId && ` • Doc: ${value.documentId}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setQuery('')
            }}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Cambiar estudiante"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          className={`block w-full pl-10 pr-3 py-3 border ${
            error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500'
          } rounded-xl leading-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 sm:text-sm transition-colors`}
          placeholder="Buscar estudiante por nombre o documento (mínimo 2 letras)..."
        />
      </div>
      
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}

      {/* Resultados del Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute z-10 mt-2 w-full bg-white dark:bg-slate-800 shadow-lg max-h-60 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-slate-100 dark:border-slate-700">
          {loading ? (
            <div className="py-4 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
              <Loader2 className="h-5 w-5 animate-spin mb-2" />
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <div className="py-4 text-center text-slate-500 dark:text-slate-400">
              No se encontraron estudiantes
            </div>
          ) : (
            results.map((student) => (
              <button
                key={`${student.source}-${student.id}`}
                type="button"
                onClick={() => {
                  onChange(student)
                  setIsOpen(false)
                }}
                className="w-full text-left cursor-default select-none relative py-3 pl-4 pr-9 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/30 last:border-0"
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    student.source === 'profile' 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                  </div>
                  <div className="ml-3 flex flex-col">
                    <span className="font-medium text-slate-900 dark:text-white block truncate">
                      {student.fullName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Grado {student.gradeLevel} - Grupo {student.groupName}
                      {student.documentId && ` • Doc: ${student.documentId}`}
                      {student.source === 'directory' && ' (Directorio)'}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
