'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen, Calendar, ChevronRight, RotateCcw, Filter, Award, Sparkles, GraduationCap } from 'lucide-react'
import { StudentSubjectView } from '@/modules/planilla-asistida/application/studentQueries'
import { motion, Variants } from 'framer-motion'
import { formatCapitalizedWords } from '@/lib/utils'

interface StudentSubjectsClientViewProps {
  subjects: StudentSubjectView[]
  studentName?: string
}

export function StudentSubjectsClientView({ subjects, studentName }: StudentSubjectsClientViewProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')

  const availableSubjectNames = useMemo(() => {
    const set = new Set<string>()
    subjects.forEach((sub) => {
      if (sub.name && sub.name.trim()) set.add(sub.name.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [subjects])

  const availablePeriods = useMemo(() => {
    const set = new Set<string>()
    subjects.forEach((sub) => {
      if (sub.period && sub.period.trim()) set.add(sub.period.trim())
    })
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10)
      const numB = parseInt(b.replace(/\D/g, ''), 10)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a.localeCompare(b)
    })
  }, [subjects])

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSubject = selectedSubject === 'all' || subject.name.trim().toLowerCase() === selectedSubject.trim().toLowerCase()
      const matchesPeriod = selectedPeriod === 'all' || subject.period.trim().toLowerCase() === selectedPeriod.trim().toLowerCase()
      return matchesSubject && matchesPeriod
    })
  }, [subjects, selectedSubject, selectedPeriod])

  const hasActiveFilters = selectedSubject !== 'all' || selectedPeriod !== 'all'

  const clearFilters = () => {
    setSelectedSubject('all')
    setSelectedPeriod('all')
  }

  const displayFirstName = studentName ? formatCapitalizedWords(studentName.split(' ')[0]) : 'Estudiante'

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Banner Principal con Framer Motion */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative overflow-hidden bg-gradient-to-br from-[#1F4E31] via-[#153a23] to-[#0a1e12] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-[#1F4E31]/20 text-white"
      >
        {/* Decoración de fondo */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-400 opacity-10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-start justify-between gap-3">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur-md text-white text-xs font-semibold mb-2 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span>Portal de Calificaciones</span>
            </motion.div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1 flex items-center gap-2 text-white drop-shadow-md">
              ¡Hola, {displayFirstName}!

            </h1>
            <p className="text-white text-sm md:text-base max-w-2xl leading-snug mt-1 font-medium drop-shadow-sm">
              Aquí está tu progreso académico. Explora tus materias y mantente al día con tus calificaciones.
            </p>
          </div>
        </div>
      </motion.div>

      {subjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center"
        >
          <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No hay materias disponibles</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Aún no has sido agregado a ninguna planilla asistida o tus docentes no han publicado las planillas para este período.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Barra de Filtros */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1">
                <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">Todas las materias</option>
                  {availableSubjectNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>

              <div className="relative flex-1 sm:max-w-xs">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">Todos los periodos</option>
                  {availablePeriods.map((period) => (
                    <option key={period} value={period}>Periodo: {period}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-white bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 dark:hover:bg-emerald-600 rounded-xl transition-all active:scale-95 shrink-0"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Limpiar filtros</span>
              </button>
            )}
          </div>

          {/* Grilla de Materias */}
          {filteredSubjects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
              <Filter className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No se encontraron materias</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">No hay materias que coincidan con la combinación de filtros seleccionada.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
              >
                <RotateCcw className="h-4 w-4" />
                Mostrar todas las materias
              </button>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5"
            >
              {filteredSubjects.map((subject, index) => {
                const cardColors = [
                  'bg-blue-50/70 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/50 hover:border-blue-400/60 hover:shadow-blue-500/10 group-hover:text-blue-700 dark:group-hover:text-blue-400',
                  'bg-emerald-50/70 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/50 hover:border-emerald-400/60 hover:shadow-emerald-500/10 group-hover:text-emerald-700 dark:group-hover:text-emerald-400',
                  'bg-violet-50/70 dark:bg-violet-900/20 border-violet-200/60 dark:border-violet-800/50 hover:border-violet-400/60 hover:shadow-violet-500/10 group-hover:text-violet-700 dark:group-hover:text-violet-400',
                  'bg-amber-50/70 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/50 hover:border-amber-400/60 hover:shadow-amber-500/10 group-hover:text-amber-700 dark:group-hover:text-amber-400',
                  'bg-rose-50/70 dark:bg-rose-900/20 border-rose-200/60 dark:border-rose-800/50 hover:border-rose-400/60 hover:shadow-rose-500/10 group-hover:text-rose-700 dark:group-hover:text-rose-400',
                  'bg-cyan-50/70 dark:bg-cyan-900/20 border-cyan-200/60 dark:border-cyan-800/50 hover:border-cyan-400/60 hover:shadow-cyan-500/10 group-hover:text-cyan-700 dark:group-hover:text-cyan-400',
                ]
                
                const hoverTexts = [
                  'group-hover:text-blue-700 dark:group-hover:text-blue-400',
                  'group-hover:text-emerald-700 dark:group-hover:text-emerald-400',
                  'group-hover:text-violet-700 dark:group-hover:text-violet-400',
                  'group-hover:text-amber-700 dark:group-hover:text-amber-400',
                  'group-hover:text-rose-700 dark:group-hover:text-rose-400',
                  'group-hover:text-cyan-700 dark:group-hover:text-cyan-400',
                ]
                
                const bgColors = [
                  'group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 text-blue-500',
                  'group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 text-emerald-500',
                  'group-hover:bg-violet-100 dark:group-hover:bg-violet-900/50 text-violet-500',
                  'group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 text-amber-500',
                  'group-hover:bg-rose-100 dark:group-hover:bg-rose-900/50 text-rose-500',
                  'group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/50 text-cyan-500',
                ]

                const themeColor = cardColors[index % cardColors.length]
                const textHover = hoverTexts[index % hoverTexts.length]
                const iconBg = bgColors[index % bgColors.length]

                return (
                  <motion.div key={subject.id} variants={cardVariants}>
                    <Link
                      href={`/consulta-calificaciones/materia/${subject.id}`}
                      className="block group focus:outline-none h-full"
                    >
                      <div className={`${themeColor} rounded-2xl sm:rounded-3xl border p-3.5 sm:p-5 md:p-6 hover:shadow-xl transition-all duration-300 h-full flex flex-col justify-between relative overflow-hidden active:scale-[0.98]`}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/40 dark:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div>
                          <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                            <h3 className={`font-bold text-xs sm:text-base md:text-lg lg:text-xl text-slate-900 dark:text-white leading-tight transition-colors line-clamp-2 ${textHover}`}>
                              {subject.name}
                            </h3>
                            <div className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center transition-colors shrink-0 ${iconBg}`}>
                              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 sm:space-y-3 mt-auto pt-1 sm:pt-2">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <span className="bg-white/70 dark:bg-black/30 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-full font-semibold text-[10px] sm:text-xs text-slate-700 dark:text-slate-300 shrink-0">
                              {subject.grade === 0 ? 'Nivelatorio' : subject.grade === 12 ? 'PFC-12' : subject.grade === 13 ? 'PFC-13' : `${subject.grade}°`}{subject.group_number ? ` - ${subject.group_number}` : ''}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-white/70 dark:bg-black/30 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-full text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                              <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                              <span>{subject.achievementsCount} {subject.achievementsCount === 1 ? 'logro' : 'logros'}</span>
                            </span>
                          </div>
                          <div className="flex items-center text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 pl-0.5">
                            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 opacity-70 shrink-0" />
                            <span className="truncate">Periodo: <strong className="text-slate-700 dark:text-slate-300">{subject.period}</strong></span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
