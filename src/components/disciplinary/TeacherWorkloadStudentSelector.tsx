'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Users,
  Search,
  CheckCircle2,
  X,
  User,
  GraduationCap,
  Sparkles,
  Loader2,
  AlertCircle,
  Clock,
  Layers,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { StudentRef } from '@/modules/disciplinary/application/actions'
import {
  getTeacherWorkloadGradesAndGroups,
  getStudentsForTeacherGroup,
  searchStudentsUnified,
  TeacherGradeWorkload,
  TeacherGroupItem
} from '@/modules/disciplinary/application/studentSearchAction'
import { formatCapitalizedWords } from '@/lib/utils'

interface Props {
  value: StudentRef | null
  onChange: (student: StudentRef | null) => void
  error?: string
}

export function TeacherWorkloadStudentSelector({ value, onChange, error }: Props) {
  const shouldReduceMotion = useReducedMotion()

  // ── ESTADOS DE CARGA ACADÉMICA ─────────────────────────────────────────────
  const [workloadLoading, setWorkloadLoading] = useState(true)
  const [gradesWorkload, setGradesWorkload] = useState<TeacherGradeWorkload[]>([])
  const [allGroups, setAllGroups] = useState<TeacherGroupItem[]>([])
  const [isTeacher, setIsTeacher] = useState(true)

  // ── ESTADOS DE SELECCIÓN DE GRADO Y GRUPO ──────────────────────────────────
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [selectedGroup, setSelectedGroup] = useState<string>('')

  // ── ESTADOS DE ESTUDIANTES DEL GRUPO ───────────────────────────────────────
  const [groupStudents, setGroupStudents] = useState<StudentRef[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [inGroupFilter, setInGroupFilter] = useState('')

  // ── MODO DE BÚSQUEDA ALTERNATIVO (DIRECTO) ──────────────────────────────────
  const [mode, setMode] = useState<'roster' | 'direct'>('roster')
  const [directQuery, setDirectQuery] = useState('')
  const [directResults, setDirectResults] = useState<StudentRef[]>([])
  const [loadingDirect, setLoadingDirect] = useState(false)

  // 1. Cargar carga académica del docente desde el módulo horarios
  useEffect(() => {
    async function loadWorkload() {
      setWorkloadLoading(true)
      try {
        const res = await getTeacherWorkloadGradesAndGroups()
        setGradesWorkload(res.grades)
        setAllGroups(res.allGroups)
        setIsTeacher(res.isTeacher)

        // Si solo tiene un grado asignado, auto-seleccionarlo
        if (res.grades.length === 1) {
          const onlyGrade = res.grades[0]
          setSelectedGrade(onlyGrade.gradeLevel)
          if (onlyGrade.groups.length === 1) {
            setSelectedGroup(onlyGrade.groups[0].name)
          }
        }
      } catch (err) {
        console.error('Error cargando carga académica del docente:', err)
      } finally {
        setWorkloadLoading(false)
      }
    }
    loadWorkload()
  }, [])

  // Grupos disponibles para el grado seleccionado
  const availableGroupsForGrade = useMemo(() => {
    if (!selectedGrade) return []
    const gradeObj = gradesWorkload.find((g) => g.gradeLevel === selectedGrade)
    return gradeObj ? gradeObj.groups : []
  }, [selectedGrade, gradesWorkload])

  // 2. Al cambiar de grado, resetear grupo si ya no pertenece a ese grado
  const handleGradeChange = (newGrade: string) => {
    setSelectedGrade(newGrade)
    setInGroupFilter('')
    const gradeObj = gradesWorkload.find((g) => g.gradeLevel === newGrade)
    if (gradeObj && gradeObj.groups.length === 1) {
      setSelectedGroup(gradeObj.groups[0].name)
    } else {
      setSelectedGroup('')
      setGroupStudents([])
    }
  }

  // 3. Función de validación y carga fresca de estudiantes
  const fetchAndValidateStudents = async (grade: string, group: string, showToast = false) => {
    if (!grade || !group) {
      setGroupStudents([])
      return
    }

    if (showToast) {
      setRefreshing(true)
    } else {
      setLoadingStudents(true)
    }

    try {
      const freshStudents = await getStudentsForTeacherGroup(grade, group)

      // Validar si hubo cambios antes de pintar
      setGroupStudents((prev) => {
        if (showToast) {
          const prevIds = new Set(prev.map((s) => s.id))
          const addedCount = freshStudents.filter((s) => !prevIds.has(s.id)).length
          if (addedCount > 0) {
            toast.success(`Se detectaron ${addedCount} estudiante(s) nuevos en el grupo`)
          } else {
            toast.success(`Listado validado y al día (${freshStudents.length} estudiantes)`)
          }
        }
        return freshStudents
      })
    } catch (err) {
      console.error('Error al validar y cargar estudiantes del grupo:', err)
      if (showToast) toast.error('Error al actualizar el listado de estudiantes')
      setGroupStudents([])
    } finally {
      setLoadingStudents(false)
      setRefreshing(false)
    }
  }

  // Cargar estudiantes cada vez que se elija o cambie de grupo
  useEffect(() => {
    if (selectedGrade && selectedGroup) {
      fetchAndValidateStudents(selectedGrade, selectedGroup, false)
    } else {
      setGroupStudents([])
    }
  }, [selectedGrade, selectedGroup])

  // 4. Filtrar estudiantes client-side dentro del grupo seleccionado
  const filteredGroupStudents = useMemo(() => {
    if (!inGroupFilter.trim()) return groupStudents
    const q = inGroupFilter.toLowerCase().trim()
    return groupStudents.filter((s) => {
      const matchName = s.fullName.toLowerCase().includes(q)
      const matchDoc = s.documentId ? s.documentId.toLowerCase().includes(q) : false
      return matchName || matchDoc
    })
  }, [groupStudents, inGroupFilter])

  // 5. Búsqueda directa por texto
  useEffect(() => {
    if (mode !== 'direct' || !directQuery.trim() || directQuery.trim().length < 2) {
      setDirectResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoadingDirect(true)
      try {
        const data = await searchStudentsUnified(directQuery)
        setDirectResults(data)
      } catch (err) {
        console.error('Error en búsqueda directa:', err)
        setDirectResults([])
      } finally {
        setLoadingDirect(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [directQuery, mode])

  // ─────────────────────────────────────────────────────────────────────────
  // SI YA HAY UN ESTUDIANTE SELECCIONADO: MOSTRAR TARJETA ELEGANTE
  // ─────────────────────────────────────────────────────────────────────────
  if (value) {
    const formattedFullName = formatCapitalizedWords(value.fullName)
    const initialLetter = formatCapitalizedWords(value.lastName || value.firstName || 'E').charAt(0).toUpperCase()

    return (
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 shadow-xs backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/20 shrink-0">
              {initialLetter}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-base text-slate-900 dark:text-white truncate">
                  {formattedFullName}
                </p>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                  <CheckCircle2 className="h-3 w-3" />
                  Seleccionado
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Grado: {value.gradeLevel}
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Grupo: {value.groupName}
                </span>
                {value.documentId && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      Doc: {value.documentId}
                    </span>
                  </>
                )}
                <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {value.source === 'profile' ? 'Cuenta Activa' : 'Directorio Escolar'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-white/10 hover:border-red-200 dark:hover:border-red-900/40 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
            title="Cambiar estudiante"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Cambiar estudiante</span>
          </button>
        </div>
      </motion.div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VISTA DE SELECCIÓN CON FILTRO DE CARGA ACADÉMICA (HORARIOS)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Selector de modo y contexto de carga académica */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span>Carga Académica (Módulo Horarios)</span>
          </span>
          {gradesWorkload.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              ({allGroups.length} grupos asignados)
            </span>
          )}
        </div>

        {/* Toggle para alternar entre lista de grupo y búsqueda libre */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-medium border border-slate-200/70 dark:border-white/5">
          <button
            type="button"
            onClick={() => setMode('roster')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'roster'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Filtrar por Grado y Grupo
          </button>
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'direct'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Buscar por Nombre/Doc
          </button>
        </div>
      </div>

      {/* MODO 1: ROSTER POR GRADO Y GRUPO DE SU CARGA ACADÉMICA */}
      {mode === 'roster' && (
        <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/30 p-4 sm:p-5 space-y-4 backdrop-blur-md">
          {/* Controles de Grado y Grupo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Selector de Grado */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                <span>1. Grado Asignado</span>
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => handleGradeChange(e.target.value)}
                disabled={workloadLoading || gradesWorkload.length === 0}
                className="w-full rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="">-- Selecciona un Grado --</option>
                {gradesWorkload.map((g) => (
                  <option key={g.gradeLevel} value={g.gradeLevel}>
                    Grado {g.gradeLevel} ({g.groups.length} {g.groups.length === 1 ? 'grupo' : 'grupos'})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Selector de Grupo */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-500" />
                <span>2. Grupo Asignado</span>
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value)
                  setInGroupFilter('')
                }}
                disabled={workloadLoading || !selectedGrade || availableGroupsForGrade.length === 0}
                className="w-full rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="">
                  {!selectedGrade ? 'Primero selecciona un grado' : '-- Selecciona un Grupo --'}
                </option>
                {availableGroupsForGrade.map((grp) => (
                  <option key={grp.id} value={grp.name}>
                    {grp.displayName} {grp.isDirector ? '⭐ (Director)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Aviso si el docente no tiene carga asignada en horarios */}
          {!workloadLoading && gradesWorkload.length === 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Sin asignaciones en el módulo de horarios</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                  No se encontraron grupos vinculados a tu carga académica actual. Puedes usar la pestaña &quot;Buscar por Nombre/Doc&quot; o solicitar al administrador verificar tus asignaciones en el módulo de horarios.
                </p>
              </div>
            </div>
          )}

          {/* LISTA Y ROSTER DE ESTUDIANTES DEL GRUPO SELECCIONADO */}
          {selectedGrade && selectedGroup && (
            <div className="pt-3 border-t border-slate-200/70 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    <span>
                      Estudiantes de {selectedGroup} ({filteredGroupStudents.length} de {groupStudents.length})
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchAndValidateStudents(selectedGrade, selectedGroup, true)}
                    disabled={refreshing || loadingStudents}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                    title="Validar y actualizar lista con los últimos cambios de estudiantes"
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-blue-500' : 'text-slate-400'}`} />
                    <span>{refreshing ? 'Validando...' : 'Actualizar'}</span>
                  </button>
                </div>

                {/* Filtro rápido dentro del grupo */}
                {groupStudents.length > 5 && (
                  <div className="relative w-full sm:w-64">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={inGroupFilter}
                      onChange={(e) => setInGroupFilter(e.target.value)}
                      placeholder="Filtrar por nombre o doc..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    {inGroupFilter && (
                      <button
                        type="button"
                        onClick={() => setInGroupFilter('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Contenedor del listado con scroll suave estilo Apple */}
              {loadingStudents ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="text-xs">Validando y cargando estudiantes del grupo desde el directorio institucional...</span>
                </div>
              ) : groupStudents.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 text-slate-500 text-xs">
                  No se encontraron estudiantes registrados para el grupo {selectedGroup}.
                </div>
              ) : filteredGroupStudents.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 text-slate-500 text-xs">
                  Ningún estudiante coincide con el filtro &quot;{inGroupFilter}&quot;.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 focus:outline-none scrollbar-thin">
                  {filteredGroupStudents.map((st) => {
                    const formattedName = formatCapitalizedWords(st.fullName)
                    const letter = formatCapitalizedWords(st.lastName || st.firstName || 'E').charAt(0).toUpperCase()

                    return (
                      <motion.button
                        key={`${st.source}-${st.id}`}
                        type="button"
                        onClick={() => onChange(st)}
                        whileHover={{ scale: shouldReduceMotion ? 1 : 1.008 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full text-left p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-xs transition-all flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                            {letter}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {formattedName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              {st.documentId ? (
                                <span>Doc: {st.documentId}</span>
                              ) : (
                                <span className="italic">Sin documento</span>
                              )}
                              <span>•</span>
                              <span>{st.gradeLevel} - {st.groupName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium hidden sm:inline bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-white/5">
                            {st.source === 'profile' ? 'Activo' : 'Directorio'}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            Seleccionar
                          </span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODO 2: BÚSQUEDA DIRECTA POR NOMBRE O DOCUMENTO */}
      {mode === 'direct' && (
        <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/30 p-4 sm:p-5 space-y-3 backdrop-blur-md">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Buscar Estudiante por Nombre o Documento
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              {loadingDirect ? (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              ) : (
                <Search className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <input
              type="text"
              value={directQuery}
              onChange={(e) => setDirectQuery(e.target.value)}
              placeholder="Escribe al menos 2 letras del apellido, nombre o número de documento..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Resultados de búsqueda directa */}
          {directQuery.length >= 2 && (
            <div className="max-h-64 overflow-y-auto space-y-1.5 pt-2">
              {loadingDirect ? (
                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  Buscando en directorio general...
                </div>
              ) : directResults.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  No se encontraron estudiantes para &quot;{directQuery}&quot;.
                </div>
              ) : (
                directResults.map((st) => {
                  const formattedName = formatCapitalizedWords(st.fullName)
                  return (
                    <button
                      key={`${st.source}-${st.id}`}
                      type="button"
                      onClick={() => onChange(st)}
                      className="w-full text-left p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 hover:border-blue-500 hover:shadow-xs transition-all flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                          {formattedName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Grado {st.gradeLevel} • Grupo {st.groupName} {st.documentId ? `• Doc: ${st.documentId}` : ''}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                        Seleccionar
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
}
