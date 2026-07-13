'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, TrendingUp, ChevronDown, ChevronUp, Star, ClipboardCheck, Wrench, Zap } from 'lucide-react'
import { getCurrentStudentReport, StudentReportSubject, LessonGradeType } from '../../application/gradesActions'

const TYPE_CONFIG: Record<LessonGradeType, { label: string; icon: React.ReactNode; color: string }> = {
  quiz: { label: 'Quiz', icon: <Zap className="h-3 w-3" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  task: { label: 'Tarea', icon: <ClipboardCheck className="h-3 w-3" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  workshop: { label: 'Taller', icon: <Wrench className="h-3 w-3" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  activity: { label: 'Actividad', icon: <Star className="h-3 w-3" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  forum: { label: 'Foro', icon: <BookOpen className="h-3 w-3" />, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
}

function getLevelBadge(level: string | null) {
  if (!level || level === '-') return 'bg-slate-100 text-slate-500 dark:bg-slate-800'
  if (level === 'Superior') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-bold'
  if (level === 'Alto') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold'
  if (level === 'Básico') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold'
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold'
}

export function GradesScreen() {
  const [report, setReport] = useState<{
    subjects: StudentReportSubject[]
    generalAverage: number
    generalPerformanceLevel: string
  } | null>(null)
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getCurrentStudentReport()
        setReport(data)
        const expanded = data.subjects.reduce((acc, s) => ({ ...acc, [s.courseId]: true }), {})
        setExpandedCourses(expanded)
      } catch (err: any) {
        console.error('Error cargando boletín:', err)
        setError('No se pudo cargar el boletín. Intenta de nuevo más tarde.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleCourse = (id: string) => {
    setExpandedCourses(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Mis Calificaciones
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Desglose de notas por actividad evaluable · Escala 0–5
          </p>
        </div>

        {report && report.subjects.length > 0 && (
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Promedio General</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{report.generalAverage.toFixed(2)}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] ${getLevelBadge(report.generalPerformanceLevel)}`}>
                  {report.generalPerformanceLevel}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/10 p-8">
          <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
        </div>
      ) : !report || report.subjects.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-8">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aún no hay calificaciones</h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            Completa quizzes, entrega tareas y talleres para ver tus notas aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {report.subjects.map((sub, idx) => {
            const isExpanded = expandedCourses[sub.courseId]

            return (
              <motion.div
                key={sub.courseId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden dark:border-slate-800/60 dark:bg-slate-900"
              >
                {/* Course header */}
                <div
                  onClick={() => toggleCourse(sub.courseId)}
                  className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 border-b border-slate-50 dark:border-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <button className="mt-1.5 p-1 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700 transition-colors">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {sub.subject}
                      </span>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white mt-1.5">{sub.courseTitle}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{sub.teacherName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 ml-9 sm:ml-0">
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nota Promedio</p>
                      <span className="text-2xl font-black text-slate-850 dark:text-white mt-1 block">
                        {sub.finalGrade !== null ? sub.finalGrade.toFixed(2) : '—'}
                      </span>
                    </div>
                    <div className="h-10 w-px bg-slate-100 dark:bg-slate-800" />
                    <div className="text-left">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Desempeño</p>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs ${getLevelBadge(sub.performanceLevel)}`}>
                        {sub.performanceLevel || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lesson grades detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {sub.lessonGrades.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          No hay actividades evaluadas en este curso aún.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider dark:bg-slate-950/10 border-b border-slate-50 dark:border-slate-850">
                              <tr>
                                <th className="px-6 py-4">Actividad</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-center w-[100px]">Nota</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                              {sub.lessonGrades.map((g, gIdx) => {
                                const cfg = TYPE_CONFIG[g.gradeType] ?? TYPE_CONFIG.task
                                const normalized = (g.grade / g.maxGrade) * 5
                                return (
                                  <tr key={gIdx} className="hover:bg-slate-50/20 dark:hover:bg-slate-850/10 transition-colors">
                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                                      {g.lessonTitle}
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                                        {cfg.icon}{cfg.label}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className={`inline-flex items-center justify-center h-8 w-11 rounded-lg text-sm font-black ${
                                        normalized >= 3.0
                                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                                          : 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                                      }`}>
                                        {normalized.toFixed(1)}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
