'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, Search, Filter, CheckCircle, AlertCircle, Loader2, BookOpen, Clock, Users, X, Eye, FileSpreadsheet
} from 'lucide-react'
import { getAdminEvaluations } from '../../application/actions'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface EvaluationAttempt {
  id: string
  studentName: string
  studentEmail: string
  gradeLevel: string
  courseTitle: string
  subject: string
  quizTitle: string
  score: number
  isPassed: boolean
  durationMinutes: number
  date: string
  status: 'graded' | 'pending'
}

export function AdminEvaluationsScreen() {
  const [attempts, setAttempts] = useState<EvaluationAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedAttempt, setSelectedAttempt] = useState<EvaluationAttempt | null>(null)

  const mockAttempts: EvaluationAttempt[] = [
    { id: 'att-1', studentName: 'Ana María Torres', studentEmail: 'a.torres@estudiante.ensuny.edu.co', gradeLevel: '8°', courseTitle: 'Física I - A', subject: 'Física', quizTitle: 'Leyes de Newton', score: 4.5, isPassed: true, durationMinutes: 12, date: '2026-05-29 14:32', status: 'graded' },
    { id: 'att-2', studentName: 'José Daniel Ramírez', studentEmail: 'j.ramirez@estudiante.ensuny.edu.co', gradeLevel: '8°', courseTitle: 'Física I - A', subject: 'Física', quizTitle: 'Leyes de Newton', score: 2.8, isPassed: false, durationMinutes: 18, date: '2026-05-29 15:10', status: 'graded' },
    { id: 'att-3', studentName: 'Luis Alfredo Sandoval', studentEmail: 'l.sandoval@estudiante.ensuny.edu.co', gradeLevel: '9°', courseTitle: 'Matemáticas I - B', subject: 'Matemáticas', quizTitle: 'Ecuaciones Cuadráticas', score: 3.8, isPassed: true, durationMinutes: 25, date: '2026-05-28 09:15', status: 'graded' },
    { id: 'att-4', studentName: 'María Camila Herrera', studentEmail: 'm.herrera@estudiante.ensuny.edu.co', gradeLevel: '10°', courseTitle: 'Inglés I - A', subject: 'Inglés', quizTitle: 'Present Perfect', score: 5.0, isPassed: true, durationMinutes: 8, date: '2026-05-28 11:45', status: 'graded' },
    { id: 'att-5', studentName: 'Kevin Martinez', studentEmail: 'kevin@estudiante.ensuny.edu.co', gradeLevel: '11°', courseTitle: 'Programación - A', subject: 'Programación', quizTitle: 'Ciclos y Matrices', score: 4.2, isPassed: true, durationMinutes: 15, date: '2026-05-27 16:20', status: 'graded' },
    { id: 'att-6', studentName: 'Sofía Castro', studentEmail: 's.castro@estudiante.ensuny.edu.co', gradeLevel: '10°', courseTitle: 'Química I - A', subject: 'Química', quizTitle: 'Tabla Periódica', score: 1.5, isPassed: false, durationMinutes: 20, date: '2026-05-27 10:05', status: 'graded' }
  ]

  useEffect(() => {
    async function loadEvaluations() {
      setLoading(true)
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setTimeout(() => {
          setAttempts(mockAttempts)
          setLoading(false)
        }, 500)
        return
      }

      try {
        const data = await getAdminEvaluations()
        setAttempts(data || [])
      } catch (err) {
        console.error('Error loading evaluations:', err)
        setAttempts([])
      } finally {
        setLoading(false)
      }
    }
    loadEvaluations()
  }, [])

  // Filtrado
  const filteredAttempts = useMemo(() => {
    return attempts.filter(att => {
      const matchSearch = att.studentName.toLowerCase().includes(search.toLowerCase()) ||
        att.quizTitle.toLowerCase().includes(search.toLowerCase()) ||
        att.courseTitle.toLowerCase().includes(search.toLowerCase())
      const matchGrade = filterGrade === 'all' || att.gradeLevel === filterGrade
      const matchStatus = filterStatus === 'all' ||
        (filterStatus === 'passed' && att.isPassed) ||
        (filterStatus === 'failed' && !att.isPassed)
      return matchSearch && matchGrade && matchStatus
    })
  }, [attempts, search, filterGrade, filterStatus])

  // KPIs calculados
  const kpis = useMemo(() => {
    if (filteredAttempts.length === 0) return { avg: 0.0, passedRate: 0, total: 0 }
    const total = filteredAttempts.length
    const sum = filteredAttempts.reduce((acc, c) => acc + c.score, 0)
    const passed = filteredAttempts.filter(c => c.isPassed).length
    return {
      avg: (sum / total).toFixed(2),
      passedRate: Math.round((passed / total) * 100),
      total
    }
  }, [filteredAttempts])

  // Datos para gráfico por materias
  const chartData = useMemo(() => {
    const subjectsMap: Record<string, { sum: number; count: number }> = {}
    attempts.forEach(att => {
      if (!subjectsMap[att.subject]) {
        subjectsMap[att.subject] = { sum: 0, count: 0 }
      }
      subjectsMap[att.subject].sum += att.score
      subjectsMap[att.subject].count += 1
    })
    return Object.keys(subjectsMap).map(sub => ({
      name: sub,
      Promedio: Number((subjectsMap[sub].sum / subjectsMap[sub].count).toFixed(2))
    }))
  }, [attempts])

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Historial de Evaluaciones
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitorea el progreso, calificaciones y tasas de aprobación de exámenes en tiempo real.
          </p>
        </div>
        <button
          onClick={() => alert('Exportando reporte a CSV/Excel...')}
          className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-3 text-sm font-semibold active:scale-[0.98] transition-all self-start sm:self-center cursor-pointer"
        >
          <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500" />
          <span>Exportar Historial</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-blue-500 bg-blue-50 dark:bg-blue-950/30">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Promedio General</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{kpis.avg} / 5.0</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Tasa de Aprobación</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{kpis.passedRate}%</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-purple-500 bg-purple-50 dark:bg-purple-950/30">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Intentos Registrados</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{kpis.total}</p>
          </div>
        </div>
      </div>

      {/* Gráfico y Buscadores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Rendimiento Promedio por Asignatura</h3>
            <p className="text-xs text-slate-400 mt-0.5">Visualización del desempeño global en exámenes.</p>
          </div>
          <div className="h-60 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 5]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Bar dataKey="Promedio" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel lateral de Filtros rápidos */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900 shadow-sm flex flex-col justify-start space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Filtros Rápidos</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-450 uppercase mb-1.5">Búsqueda</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Estudiante o evaluación..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-450 uppercase mb-1.5">Grado Escolar</label>
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
            >
              <option value="all">Todos los Grados</option>
              <option value="8°">Grado 8°</option>
              <option value="9°">Grado 9°</option>
              <option value="10°">Grado 10°</option>
              <option value="11°">Grado 11°</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-450 uppercase mb-1.5">Resultado</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
            >
              <option value="all">Todos los Resultados</option>
              <option value="passed">Aprobado (3.0 - 5.0)</option>
              <option value="failed">Reprobado (1.0 - 2.9)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Intentos */}
      {loading ? (
        <div className="h-[150px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredAttempts.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-550 dark:text-slate-455">No se registraron intentos con los filtros actuales.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
          <table className="w-full text-sm text-left text-slate-550 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-450 uppercase font-bold border-b border-slate-100 dark:border-slate-800/60">
              <tr>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Evaluación</th>
                <th className="px-6 py-4">Curso / Materia</th>
                <th className="px-6 py-4">Duración</th>
                <th className="px-6 py-4">Calificación</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {filteredAttempts.map(att => (
                <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900 dark:text-white">{att.studentName}</p>
                    <p className="text-[11px] text-slate-400">{att.studentEmail}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                    {att.quizTitle}
                  </td>
                  <td className="px-6 py-4 text-xs space-y-1">
                    <p className="font-medium text-slate-700 dark:text-slate-300">{att.courseTitle}</p>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450">
                      {att.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" /> {att.durationMinutes} min</span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold">
                    <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs ${
                      att.isPassed
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                    }`}>
                      {att.score.toFixed(1)} / 5.0
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {att.date}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedAttempt(att)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detalles */}
      <AnimatePresence>
        {selectedAttempt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAttempt(null)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  Resumen de Evaluación
                </h3>
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl">
                  <div>
                    <p className="text-[10px] font-bold text-slate-450 uppercase">Estudiante</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedAttempt.studentName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-450 uppercase">Curso</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedAttempt.courseTitle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-450 uppercase">Examen</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedAttempt.quizTitle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-450 uppercase">Nota Final</p>
                    <p className={`font-bold ${selectedAttempt.isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {selectedAttempt.score.toFixed(1)} / 5.0
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-slate-450 uppercase">Detalle del Cuestionario (Simulado)</h4>
                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">1. ¿Cómo se le conoce formalmente a la Primera Ley de Newton?</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">✔ Seleccionó: Ley de la Inercia (Correcto)</p>
                    </div>
                    <hr className="border-slate-100 dark:border-slate-800" />
                    <div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">2. Si un bloque de masa 4 kg tiene aceleración de 3 m/s², ¿cuál es la fuerza neta?</p>
                      <p className={`text-xs font-medium mt-1 ${selectedAttempt.score >= 3.5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {selectedAttempt.score >= 3.5 ? '✔ Seleccionó: 12.00 Newtons (Correcto)' : '✘ Seleccionó: 7.00 Newtons (Incorrecto)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200 rounded-xl font-semibold text-xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
