'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, MessageSquare, BookOpen, Clock, FileText, CheckCircle2, AlertTriangle, TrendingUp, CalendarCheck, FileOutput, BarChart3, Award } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getCourseSettings, getCourseGradebook, CourseSettings, GradebookEntry } from '../../application/teacherActions'
import { MessageModal } from '../components/MessageModal'

export function TeacherStudentProfileScreen({ courseId, studentId }: { courseId: string, studentId: string }) {
  const [activeTab, setActiveTab] = useState<'rendimiento' | 'asistencia'>('rendimiento')
  const [settings, setSettings] = useState<CourseSettings | null>(null)
  const [student, setStudent] = useState<GradebookEntry | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseSettings = await getCourseSettings(courseId)
        setSettings(courseSettings)
        const gradesData = await getCourseGradebook(courseId, courseSettings.categories)
        const foundStudent = gradesData.find(s => s.studentId === studentId)
        if (foundStudent) setStudent(foundStudent)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [courseId, studentId])

  if (loading || !settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Estudiante no encontrado</h2>
        <Link href={`/teacher/courses/${courseId}/grades`} className="text-indigo-600 hover:underline mt-4 inline-block">Volver a Calificaciones</Link>
      </div>
    )
  }

  // Mocks para Actividad
  const recentActivities = [
    { id: 1, title: 'Taller 1: Cinemática', date: 'Ayer, 18:30', status: 'graded', score: 4.5, type: 'Taller' },
    { id: 2, title: 'Ensayo Final', date: 'Hace 5 horas', status: 'pending', type: 'Ensayo' },
    { id: 3, title: 'Práctica Laboratorio', date: 'Hace 2 días', status: 'late', type: 'Laboratorio' },
    { id: 4, title: 'Examen de Medio Término', date: 'Hace 1 semana', status: 'graded', score: 3.8, type: 'Examen' },
    { id: 5, title: 'Quiz 1: Leyes de Newton', date: 'Hace 2 semanas', status: 'graded', score: 5.0, type: 'Quiz' },
  ]

  // Mocks para Asistencia
  const attendanceData = [
    { date: '29 May 2026', status: 'present' },
    { date: '27 May 2026', status: 'present' },
    { date: '25 May 2026', status: 'absent' },
    { date: '22 May 2026', status: 'late' },
    { date: '20 May 2026', status: 'present' },
  ]

  const getPerformanceData = (grade: number) => {
    if (grade >= 4.6) return { text: 'Desempeño Superior', webClass: 'bg-emerald-500 text-white', pdfClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (grade >= 4.0) return { text: 'Desempeño Alto', webClass: 'bg-blue-500 text-white', pdfClass: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (grade >= 3.0) return { text: 'Desempeño Básico', webClass: 'bg-amber-500 text-white', pdfClass: 'bg-amber-50 text-amber-700 border-amber-200' }
    return { text: 'Desempeño Bajo', webClass: 'bg-red-500 text-white', pdfClass: 'bg-red-50 text-red-700 border-red-200' }
  }

  const perfData = student ? getPerformanceData(student.finalGrade) : null
  const currentDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
      {/* VISTA WEB (Oculta al imprimir) */}
      <div className="space-y-8 pb-12 w-full max-w-7xl mx-auto print:hidden">
        
        {/* Top Header */}
        <div>
          <Link 
            href={`/teacher/courses/${courseId}/grades`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-6 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Calificaciones
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
            <div className="flex items-center gap-6">
              {student.studentAvatar ? (
                <img 
                  src={student.studentAvatar} 
                  alt={student.studentName} 
                  className="h-24 w-24 rounded-full object-cover shadow-md border-4 border-slate-50 dark:border-slate-800"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-2xl font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-4 border-slate-50 dark:border-slate-800 shadow-md">
                  {student.studentName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{student.studentName}</h1>
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    Estudiante Activo
                  </span>
                  <span>•</span>
                  <span>{`${student.studentName.replace(/\s+/g, '').toLowerCase()}@colegio.edu`}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsMessageModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                <MessageSquare className="h-4 w-4" />
                Enviar Mensaje
              </button>
              <button 
                onClick={() => {
                  toast.success('Generando PDF... Selecciona "Guardar como PDF" en el diálogo.')
                  setTimeout(() => window.print(), 500)
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FileOutput className="h-4 w-4" />
                Reporte PDF
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('rendimiento')}
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors relative ${
              activeTab === 'rendimiento' 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rendimiento
            </div>
            {activeTab === 'rendimiento' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('asistencia')}
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors relative ${
              activeTab === 'asistencia' 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Asistencia
            </div>
            {activeTab === 'asistencia' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'rendimiento' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column - Metrics */}
              <div className="space-y-6">
                <div className="bg-indigo-600 text-white rounded-3xl p-8 shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BookOpen className="h-32 w-32" />
                  </div>
                  <p className="text-indigo-100 font-bold uppercase tracking-wider text-sm mb-2 relative z-10">Promedio General</p>
                  <div className="flex items-baseline gap-2 relative z-10 mb-2">
                    <span className="text-7xl font-black">{student.finalGrade.toFixed(1)}</span>
                    <span className="text-indigo-200 font-bold text-xl">/ 5.0</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold relative z-10 shadow-sm ${perfData?.webClass}`}>
                    <Award className="h-3.5 w-3.5" />
                    {perfData?.text}
                  </span>
                </div>

                {/* Progreso del Curso */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/60 shadow-sm text-left">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                    Progreso del Curso
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">Porcentaje de Avance</span>
                      <span className="text-slate-950 dark:text-white text-lg font-black">{student.progress ?? 0}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${student.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/60 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-slate-400" />
                    Desglose por Categoría
                  </h3>
                  <div className="space-y-4">
                    {settings.categories.map(cat => {
                      const grade = student.grades[cat.id]
                      return (
                        <div key={cat.id}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{cat.name} ({cat.weight}%)</span>
                            <span className="font-bold text-slate-900 dark:text-white">{grade ? grade.toFixed(1) : '-'}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                            <div 
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${(grade / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column - Historial */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-slate-400" />
                      Historial de Entregas
                    </h3>
                    <span className="text-sm font-medium text-slate-500">{recentActivities.length} registros</span>
                  </div>
                  
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800/60">
                      <tr>
                        <th className="px-6 py-4">Actividad</th>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4 text-right">Calificación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {recentActivities.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900 dark:text-white">{act.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{act.type}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                            {act.date}
                          </td>
                          <td className="px-6 py-4">
                            {act.status === 'graded' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold dark:bg-emerald-500/10 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Calificada
                              </span>
                            ) : act.status === 'late' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold dark:bg-red-500/10 dark:text-red-400">
                                <AlertTriangle className="h-3.5 w-3.5" /> Atrasada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold dark:bg-amber-500/10 dark:text-amber-400">
                                <Clock className="h-3.5 w-3.5" /> Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {act.score ? (
                              <span className="font-black text-slate-900 dark:text-white text-base">{act.score.toFixed(1)} <span className="text-slate-400 text-xs font-semibold">/ 5.0</span></span>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'asistencia' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden p-8">
              <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-xl">Registro de Asistencia</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Porcentaje</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">92%</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Faltas</p>
                  <p className="text-3xl font-black text-red-600 dark:text-red-400">2</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Retardos</p>
                  <p className="text-3xl font-black text-amber-600 dark:text-amber-400">1</p>
                </div>
              </div>

              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800/60">
                  <tr>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {attendanceData.map((record, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-300">
                        {record.date}
                      </td>
                      <td className="px-6 py-4">
                        {record.status === 'present' && <span className="inline-flex px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold dark:bg-emerald-500/10 dark:text-emerald-400">Presente</span>}
                        {record.status === 'absent' && <span className="inline-flex px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold dark:bg-red-500/10 dark:text-red-400">Falta</span>}
                        {record.status === 'late' && <span className="inline-flex px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold dark:bg-amber-500/10 dark:text-amber-400">Retardo</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <MessageModal 
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          recipient={{ name: student.studentName, email: `${student.studentName.replace(/\s+/g, '').toLowerCase()}@colegio.edu` }}
          onSend={(sub, msg) => { setIsMessageModalOpen(false) }}
        />
      </div>

      {/* VISTA DE IMPRESIÓN (PDF) */}
      <div className="hidden print:block bg-white text-black p-8 w-full font-sans max-w-4xl mx-auto">
        
        {/* Encabezado Institucional */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">aulaEnsuny</h1>
            <p className="text-sm font-semibold text-gray-600 mt-1">Reporte Académico Oficial</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Curso ID: {courseId}</p>
            <p>Fecha de emisión: {currentDate}</p>
          </div>
        </div>

        {/* Datos del Estudiante */}
        <div className="bg-gray-50 border border-gray-200 p-4 mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Datos del Estudiante</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold text-black">{student.studentName}</p>
              <p className="text-sm text-gray-600">{`${student.studentName.replace(/\s+/g, '').toLowerCase()}@colegio.edu`}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Promedio Final</p>
                <div className="flex items-center gap-3 justify-end">
                  <span className={`text-sm font-bold px-2 py-0.5 rounded border ${perfData?.pdfClass}`} style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>{perfData?.text}</span>
                  <p className="text-3xl font-black text-black">{student.finalGrade.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-right mt-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Progreso del Curso</p>
                <p className="text-sm font-bold text-black">{student.progress ?? 0}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Desglose de Notas */}
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider border-b border-gray-300 pb-2 mb-3">Desglose de Calificaciones</h3>
            <table className="w-full text-sm">
              <tbody>
                {settings.categories.map(cat => (
                  <tr key={cat.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{cat.name} ({cat.weight}%)</td>
                    <td className="py-2 text-right font-bold text-black">{student.grades[cat.id] ? student.grades[cat.id].toFixed(1) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen de Asistencia */}
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider border-b border-gray-300 pb-2 mb-3">Resumen de Asistencia</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">Porcentaje General</td>
                  <td className="py-2 text-right font-bold text-black">92%</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">Faltas Injustificadas</td>
                  <td className="py-2 text-right font-bold text-black">2</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">Retardos</td>
                  <td className="py-2 text-right font-bold text-black">1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de Entregas */}
        <div>
          <h3 className="text-sm font-bold text-black uppercase tracking-wider border-b border-gray-300 pb-2 mb-3">Historial de Entregas Recientes</h3>
          <table className="w-full text-sm border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 py-2 px-3 text-left font-semibold">Actividad</th>
                <th className="border border-gray-200 py-2 px-3 text-left font-semibold">Tipo</th>
                <th className="border border-gray-200 py-2 px-3 text-left font-semibold">Fecha</th>
                <th className="border border-gray-200 py-2 px-3 text-left font-semibold">Estado</th>
                <th className="border border-gray-200 py-2 px-3 text-right font-semibold">Nota</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map(act => (
                <tr key={act.id}>
                  <td className="border border-gray-200 py-2 px-3">{act.title}</td>
                  <td className="border border-gray-200 py-2 px-3 text-gray-600">{act.type}</td>
                  <td className="border border-gray-200 py-2 px-3 text-gray-600">{act.date}</td>
                  <td className="border border-gray-200 py-2 px-3">
                    {act.status === 'graded' ? 'Calificada' : act.status === 'late' ? 'Atrasada' : 'Pendiente'}
                  </td>
                  <td className="border border-gray-200 py-2 px-3 text-right font-bold">
                    {act.score ? act.score.toFixed(1) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </>
  )
}
