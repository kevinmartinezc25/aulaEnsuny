'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, Mail, Filter, AlertCircle, CheckCircle2,
  BookOpen, TrendingUp, Send, X, MessageSquare, Loader2,
  ChevronRight, Award, User
} from 'lucide-react'
import { getTeacherStudents, sendStudentMessage, TeacherStudent } from '../../application/actions'
import { getTeacherCourses } from '@/modules/grades/application/achievementsActions'
import { toast } from 'sonner'

export function TeacherStudentsScreen() {
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [courses, setCourses] = useState<{ id: string; title: string; subject: string; gradeLevel: string; groupName: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('all')
  const [selectedGradeGroup, setSelectedGradeGroup] = useState('all')
  
  // Modal de mensajería
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false)
  const [msgRecipient, setMsgRecipient] = useState<{ id: string | 'all'; name: string } | null>(null)
  const [msgSubject, setMsgSubject] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  // Cargar datos
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [studentsData, coursesData] = await Promise.all([
          getTeacherStudents(),
          getTeacherCourses()
        ])
        setStudents(studentsData)
        setCourses(coursesData)
      } catch (err) {
        console.error('Error al cargar datos de Mis Estudiantes:', err)
        toast.error('Ocurrió un error al cargar la información.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Lista única de combinaciones Grado-Grupo para el filtro
  const uniqueGradeGroups = useMemo(() => {
    const pairs = courses.map(c => `${c.gradeLevel}-${c.groupName}`)
    return Array.from(new Set(pairs)).sort()
  }, [courses])

  // Filtrar estudiantes
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            s.email.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCourse = selectedCourse === 'all' || 
                            s.courses.some(c => c.id === selectedCourse)
      
      const matchesGradeGroup = selectedGradeGroup === 'all' || 
                                `${s.gradeLevel}-${s.groupName}` === selectedGradeGroup
      
      return matchesSearch && matchesCourse && matchesGradeGroup
    })
  }, [students, searchQuery, selectedCourse, selectedGradeGroup])

  // Estadísticas calculadas sobre los estudiantes filtrados
  const stats = useMemo(() => {
    const total = filteredStudents.length
    const active = filteredStudents.filter(s => s.status === 'active').length
    const atRisk = filteredStudents.filter(s => s.status === 'at_risk').length
    
    // Calcular promedio general de notas válidas
    const gradedStudents = filteredStudents.filter(s => s.averageGrade !== null)
    const avg = gradedStudents.length > 0
      ? Math.round((gradedStudents.reduce((acc, curr) => acc + (curr.averageGrade || 0), 0) / gradedStudents.length) * 100) / 100
      : null

    return { total, active, atRisk, avg }
  }, [filteredStudents])

  // Abrir modal de mensaje
  const openMsgModal = (recipientId: string | 'all', recipientName: string) => {
    setMsgRecipient({ id: recipientId, name: recipientName })
    setMsgSubject(recipientId === 'all' ? 'Comunicado grupal docente' : 'Seguimiento Académico')
    setMsgBody('')
    setIsMsgModalOpen(true)
  }

  // Enviar mensaje
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msgSubject.trim() || !msgBody.trim() || !msgRecipient) {
      toast.error('Por favor complete todos los campos.')
      return
    }

    setSendingMsg(true)
    try {
      const res = await sendStudentMessage(msgRecipient.id, msgSubject, msgBody)
      if (res.success) {
        toast.success(
          msgRecipient.id === 'all' 
            ? 'Mensaje masivo enviado con éxito' 
            : `Mensaje enviado a ${msgRecipient.name}`
        )
        setIsMsgModalOpen(false)
        setMsgSubject('')
        setMsgBody('')
      } else {
        toast.error('Error al enviar el mensaje.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error de red al enviar el mensaje.')
    } finally {
      setSendingMsg(false)
    }
  }

  // Retornar color de gradiente basado en el nombre para avatares limpios
  const getAvatarGradient = (name: string) => {
    const colors = [
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-rose-500 to-pink-500',
      'from-amber-500 to-orange-500'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Obtener iniciales
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  // Obtener badge de desempeño
  const getPerformanceBadge = (avg: number | null) => {
    if (avg === null) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Sin Notas
        </span>
      )
    }
    if (avg >= 4.60) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/30">
          Superior
        </span>
      )
    }
    if (avg >= 4.00) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/30">
          Alto
        </span>
      )
    }
    if (avg >= 3.00) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/30">
          Básico
        </span>
      )
    }
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/30">
        Bajo
      </span>
    )
  }

  return (
    <div className="space-y-8 pb-12 text-left">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 shadow-sm">
              <Users className="h-5.5 w-5.5" />
            </div>
            Mis Estudiantes
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Monitorea el progreso, rendimiento académico y comunícate con tus alumnos asignados.
          </p>
        </div>
        
        <div>
          <button
            onClick={() => openMsgModal('all', searchQuery || selectedCourse !== 'all' || selectedGradeGroup !== 'all' ? 'Alumnos Filtrados' : 'Todos mis Estudiantes')}
            disabled={filteredStudents.length === 0}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm"
          >
            <Mail className="h-4 w-4" />
            <span>Enviar Mensaje Masivo</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600 dark:text-purple-400" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cargando nómina de estudiantes...</p>
        </div>
      ) : (
        <>
          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-450 uppercase tracking-wider">Total Estudiantes</p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 flex items-center justify-center">
                <Users className="h-5.5 w-5.5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-450 uppercase tracking-wider">Al día Académicamente</p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.active}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-5.5 w-5.5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-450 uppercase tracking-wider">En Riesgo de Reprobación</p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.atRisk}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="h-5.5 w-5.5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-450 uppercase tracking-wider">Promedio General</p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {stats.avg !== null ? stats.avg.toFixed(2) : '--'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp className="h-5.5 w-5.5" />
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 p-4.5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar estudiante por nombre o correo..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10.5 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white text-sm"
                />
              </div>

              <div className="relative">
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  className="w-full sm:w-48 pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white text-sm cursor-pointer appearance-none"
                >
                  <option value="all">Todos los Cursos</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedGradeGroup}
                  onChange={e => setSelectedGradeGroup(e.target.value)}
                  className="w-full sm:w-44 pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white text-sm cursor-pointer appearance-none"
                >
                  <option value="all">Grado y Grupo</option>
                  {uniqueGradeGroups.map(gg => (
                    <option key={gg} value={gg}>{gg.replace('-', ' - Grupo ')}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tabla de Estudiantes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-850/20">
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider text-xs">Estudiante</th>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider text-xs">Grado y Grupo</th>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider text-xs">Cursos Dictados</th>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider text-xs text-center">Promedio General</th>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider text-xs text-center">Desempeño</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(student.name)} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                            {getInitials(student.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white leading-none mb-1">{student.name}</p>
                            <p className="text-xs text-slate-450 dark:text-slate-500 font-mono">{student.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-700 dark:bg-slate-850 dark:text-slate-350 border border-slate-100/50">
                          {student.gradeLevel} - {student.groupName}
                        </span>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {student.courses.map(c => (
                            <span 
                              key={c.id} 
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/30"
                              title={`${c.subject} - Progreso: ${c.progress ?? 0}%`}
                            >
                              {c.title} ({c.progress ?? 0}%)
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-300">
                        {student.averageGrade !== null ? (
                          <span className={student.averageGrade < 3.0 ? 'text-rose-600 dark:text-rose-400' : ''}>
                            {student.averageGrade.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {getPerformanceBadge(student.averageGrade)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => openMsgModal(student.id, student.name)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-95 cursor-pointer"
                            title="Enviar Mensaje"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          
                          {student.courses.length > 0 ? (
                            <Link
                              href={`/teacher/courses/${student.courses[0].id}/students/${student.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:bg-slate-850 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                              <span>Ficha</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          ) : (
                            <button
                              disabled
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-350 dark:text-slate-600 bg-slate-100/50 dark:bg-slate-900 rounded-xl cursor-not-allowed"
                            >
                              <span>Sin Ficha</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <Users className="h-8 w-8 text-slate-350 dark:text-slate-600 mx-auto mb-2.5" />
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No se encontraron estudiantes matriculados</p>
                        <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Intente cambiar los filtros o el buscador de estudiantes.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Redactar Mensaje */}
      <AnimatePresence>
        {isMsgModalOpen && msgRecipient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMsgModalOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Mail className="h-4.5 w-4.5 text-purple-500" />
                  <span>Enviar Comunicado</span>
                </h3>
                <button
                  onClick={() => setIsMsgModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Destinatario</label>
                  <input
                    type="text"
                    disabled
                    value={msgRecipient.name}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Asunto</label>
                  <input
                    type="text"
                    required
                    value={msgSubject}
                    onChange={e => setMsgSubject(e.target.value)}
                    placeholder="Ej: Seguimiento académico - Física I"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Mensaje</label>
                  <textarea
                    required
                    rows={5}
                    value={msgBody}
                    onChange={e => setMsgBody(e.target.value)}
                    placeholder="Escriba el cuerpo del comunicado aquí..."
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white text-sm resize-none"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsMsgModalOpen(false)}
                    className="px-4 py-2 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-850 font-semibold text-xs active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sendingMsg}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-750 text-white rounded-xl font-semibold text-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {sendingMsg ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <Send className="h-4.5 w-4.5" />
                    )}
                    <span>Enviar Mensaje</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
