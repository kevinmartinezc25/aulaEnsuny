'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen, Calendar, ChevronRight, RotateCcw, Filter, Award } from 'lucide-react'
import { StudentSubjectView } from '@/modules/planilla-asistida/application/studentQueries'

interface StudentSubjectsClientViewProps {
  subjects: StudentSubjectView[]
  studentName?: string
}

export function StudentSubjectsClientView({ subjects }: StudentSubjectsClientViewProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')

  // Extraer nombres únicos de materias cargadas
  const availableSubjectNames = useMemo(() => {
    const set = new Set<string>()
    subjects.forEach((sub) => {
      if (sub.name && sub.name.trim()) {
        set.add(sub.name.trim())
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [subjects])

  // Extraer lista única y ordenada de períodos presentes
  const availablePeriods = useMemo(() => {
    const set = new Set<string>()
    subjects.forEach((sub) => {
      if (sub.period && sub.period.trim()) {
        set.add(sub.period.trim())
      }
    })
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10)
      const numB = parseInt(b.replace(/\D/g, ''), 10)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a.localeCompare(b)
    })
  }, [subjects])

  // Filtrado reactivo en memoria
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSubject =
        selectedSubject === 'all' ||
        subject.name.trim().toLowerCase() === selectedSubject.trim().toLowerCase()

      const matchesPeriod =
        selectedPeriod === 'all' ||
        subject.period.trim().toLowerCase() === selectedPeriod.trim().toLowerCase()

      return matchesSubject && matchesPeriod
    })
  }, [subjects, selectedSubject, selectedPeriod])

  const hasActiveFilters = selectedSubject !== 'all' || selectedPeriod !== 'all'

  const clearFilters = () => {
    setSelectedSubject('all')
    setSelectedPeriod('all')
  }

  return (
    <div className="space-y-6">
      {/* Banner Principal */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Tus Materias
        </h1>
        <p className="text-slate-500 text-sm sm:text-base">
          Selecciona una materia para consultar tus calificaciones y progreso. Solo se muestran las materias que el docente gestiona en Planilla Asistida.
        </p>
      </div>

      {subjects.length === 0 ? (
        /* Estado vacío si no hay materias en general */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No hay materias disponibles</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Aún no has sido agregado a ninguna planilla asistida o tus docentes no han creado las planillas para este período.
          </p>
        </div>
      ) : (
        <>
          {/* Barra de Filtros por Materia y por Período */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Filtro desplegable de Materia */}
              <div className="relative flex-1">
                <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="all">Todas las materias</option>
                  {availableSubjectNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>

              {/* Filtro desplegable de Período */}
              <div className="relative flex-1 sm:max-w-xs">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="all">Todos los periodos</option>
                  {availablePeriods.map((period) => (
                    <option key={period} value={period}>
                      Periodo: {period}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Botón de Limpiar Filtros cuando hay alguno activo */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/70 rounded-xl transition-all active:scale-[0.98] shrink-0"
                title="Restablecer filtros"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>

          {/* Contador de resultados */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {hasActiveFilters
                ? `Mostrando ${filteredSubjects.length} de ${subjects.length} materias`
                : `${subjects.length} ${subjects.length === 1 ? 'materia registrada' : 'materias registradas'}`}
            </span>
            {hasActiveFilters && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filtros aplicados
              </span>
            )}
          </div>

          {/* Grilla de Materias o estado vacío si no hay coincidencias con los filtros */}
          {filteredSubjects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 text-center shadow-sm">
              <Filter className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No se encontraron materias
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                No hay materias que coincidan con la combinación de filtros seleccionada.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all active:scale-[0.98] shadow-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map((subject) => (
                <Link
                  key={subject.id}
                  href={`/consulta-calificaciones/materia/${subject.id}`}
                  className="block group focus:outline-none"
                >
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-emerald-500 hover:shadow-md transition-all h-full flex flex-col relative overflow-hidden active:scale-[0.99]">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-3 pr-8 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {subject.name}
                    </h3>

                    <div className="space-y-2 mt-auto">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg font-medium text-xs text-slate-700 dark:text-slate-300">
                          {subject.grade}° - {subject.group_number}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                          <Award className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          {subject.achievementsCount} {subject.achievementsCount === 1 ? 'logro' : 'logros'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                        <Calendar className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          Periodo: <strong className="font-semibold text-slate-700 dark:text-slate-200">{subject.period}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-5 right-5 h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
