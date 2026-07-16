'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Inbox, Search, FileText, X, Save, Eye, Check, AlertTriangle, Filter, Minus, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { getCourseSettings, CourseSettings, getCourseStudents, getTeacherSubmissionsData } from '../../application/teacherActions'
import { createClient } from '@/core/config/supabase/client'
import { saveLessonGrade } from '@/modules/grades/application/gradesActions'

// Mocks Data
const MOCK_ASSIGNMENTS = [
  { id: 'a1', categoryId: 'cat_1', name: 'Taller 1: Cinemática' },
  { id: 'a2', categoryId: 'cat_1', name: 'Práctica Laboratorio' },
  { id: 'a3', categoryId: 'cat_2', name: 'Ensayo Final' },
  { id: 'a4', categoryId: 'cat_3', name: 'Examen Final' },
]

const MOCK_STUDENTS = [
  { id: 's1', name: 'Ana García', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100' },
  { id: 's2', name: 'Carlos López', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' },
  { id: 's3', name: 'Laura Martínez', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100' },
  { id: 's4', name: 'Diego Fernández', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' },
  { id: 's5', name: 'Sofía Castro', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100' },
]

const MOCK_SUBMISSIONS = [
  { id: '1', studentId: 's1', assignmentId: 'a1', date: 'Hace 2 horas', status: 'pending', fileType: 'pdf', fileName: 'Taller1_AnaGarcia.pdf', isLate: false },
  { id: '2', studentId: 's2', assignmentId: 'a1', date: 'Ayer, 18:30', status: 'graded', grade: 4.5, fileType: 'pdf', fileName: 'Taller_Carlos.pdf', isLate: true },
  { id: '3', studentId: 's3', assignmentId: 'a3', date: 'Hace 5 horas', status: 'draft', grade: 3.5, fileType: 'doc', fileName: 'Ensayo_Laura.docx', isLate: false },
  { id: '4', studentId: 's4', assignmentId: 'a2', date: 'Hace 1 día', status: 'pending', fileType: 'pdf', fileName: 'Lab3_Diego.pdf', isLate: true },
  { id: '5', studentId: 's5', assignmentId: 'a4', date: 'Hace 2 días', status: 'graded', grade: 5.0, fileType: 'pdf', fileName: 'EnsayoFinal_Sofia.pdf', isLate: false },
]

type Submission = {
  id: string
  studentId: string
  assignmentId: string
  lessonId?: string   // lesson_id for task/workshop/activity
  date: string
  status: 'pending' | 'graded' | 'draft'
  grade?: number
  fileType: 'pdf' | 'doc' | 'quiz'
  fileName: string
  submissionText?: string
  isLate: boolean
  gradeType?: 'quiz' | 'task' | 'workshop' | 'activity'
}

export function TeacherCourseSubmissionsScreen({ courseId }: { courseId: string }) {
  const [settings, setSettings] = useState<CourseSettings | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [students, setStudents] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  
  // SpeedGrader State
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null)
  const [tempGrade, setTempGrade] = useState<string>('')
  const [tempFeedback, setTempFeedback] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

        if (isDemoMode) {
          const courseSettings = await getCourseSettings(courseId)
          setSettings(courseSettings)
          setStudents(MOCK_STUDENTS)
          setAssignments(MOCK_ASSIGNMENTS)
          setSubmissions(MOCK_SUBMISSIONS as Submission[])
          setLoading(false)
          return
        }

        // 1. Fetch course settings/categories
        const courseSettings = await getCourseSettings(courseId)
        setSettings(courseSettings)

        // 2. Fetch enrolled students
        const mappedStudents = await getCourseStudents(courseId)
        setStudents(mappedStudents)

        // 3. Fetch submissions data from server action (bypasses RLS)
        const { quizzes, taskLessons, quizAttempts, progressData, gradesData } = await getTeacherSubmissionsData(courseId)

        const defaultCategoryId = courseSettings.categories[0]?.id || 'default_cat'

        // Map quizzes as assignments
        const quizzesAsAssignments = (quizzes || []).map(q => ({
          id: q.id,
          categoryId: defaultCategoryId,
          name: q.title
        }))

        // Map task lessons as assignments
        const tasksAsAssignments = (taskLessons || []).map(t => ({
          id: t.id,
          categoryId: defaultCategoryId,
          name: t.title
        }))

        const allAssignments = [...quizzesAsAssignments, ...tasksAsAssignments]
        setAssignments(allAssignments)

        // Map submissions
        let allSubmissions: Submission[] = []

        // Quiz attempts
        const mappedQuizSubs = (quizAttempts || []).map(att => ({
          id: att.id,
          studentId: att.student_id,
          assignmentId: att.quiz_id,
          date: new Date(att.completed_at || att.started_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          status: 'graded' as const,
          grade: Number(att.score),
          fileType: 'quiz' as const,
          fileName: 'Intento de Quiz',
          isLate: false
        }))
        allSubmissions = [...allSubmissions, ...mappedQuizSubs]

        // Task progress entries — check student_lesson_grades for existing grades
        const supabaseClient = createClient()
        const { data: lessonGradesData } = await supabaseClient
          .from('student_lesson_grades')
          .select('student_id, lesson_id, grade')
          .eq('course_id', courseId)

        const lessonGradesMap = new Map<string, number>();
        (lessonGradesData || []).forEach((g: any) => {
          lessonGradesMap.set(`${g.student_id}_${g.lesson_id}`, Number(g.grade))
        })

        const mappedTaskSubs = (progressData || []).map(prog => {
          const lesson = taskLessons.find(t => t.id === prog.lesson_id)
          const existingGrade = lessonGradesMap.get(`${prog.student_id}_${prog.lesson_id}`)
          const titleLower = (lesson?.title || '').toLowerCase()
          let gradeType: 'task' | 'workshop' | 'activity' = 'task'
          if (titleLower.includes('taller')) gradeType = 'workshop'
          else if (titleLower.includes('actividad')) gradeType = 'activity'

          return {
            id: prog.id,
            studentId: prog.student_id,
            assignmentId: prog.lesson_id,
            lessonId: prog.lesson_id,
            date: new Date(prog.completed_at || prog.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            status: existingGrade !== undefined ? ('graded' as const) : ('pending' as const),
            grade: existingGrade,
            fileType: 'doc' as const,
            fileName: prog.submission_text ? 'Texto en Línea' : 'Archivo de Entrega',
            submissionText: prog.submission_text || '',
            isLate: false,
            gradeType
          }
        })
        allSubmissions = [...allSubmissions, ...mappedTaskSubs]

        setSubmissions(allSubmissions)

      } catch (err) {
        console.error("Error loading submissions data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [courseId])

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => selectedCategory === 'all' || a.categoryId === selectedCategory)
  }, [assignments, selectedCategory])

  const filteredStudents = useMemo(() => {
    const result = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return result.sort((a, b) => {
      const getLastName = (name: string) => name.split(' ').slice(1).join(' ') || name
      return getLastName(a.name).localeCompare(getLastName(b.name))
    })
  }, [students, searchTerm])

  const activeSubmission = useMemo(() => {
    if (!activeSubmissionId) return null
    const sub = submissions.find(s => s.id === activeSubmissionId)
    if (!sub) return null
    const student = students.find(s => s.id === sub.studentId)
    const assignment = assignments.find(a => a.id === sub.assignmentId)
    return { ...sub, studentName: student?.name, studentAvatar: student?.avatar, assignmentName: assignment?.name }
  }, [activeSubmissionId, submissions, students, assignments])

  const handleOpenGrader = (submissionId: string) => {
    const sub = submissions.find(s => s.id === submissionId)
    if (sub) {
      setActiveSubmissionId(sub.id)
      setTempGrade(sub.grade ? sub.grade.toString() : '')
      setTempFeedback('')
    }
  }

  const handleCreateEmptyAndGrade = (studentId: string, assignmentId: string) => {
    const newId = `temp_${Date.now()}`
    const newSub: Submission = {
      id: newId,
      studentId,
      assignmentId,
      date: 'No enviado',
      status: 'pending',
      fileType: 'pdf',
      fileName: 'Sin_Archivo',
      isLate: true
    }
    setSubmissions(prev => [...prev, newSub])
    
    // Abrir grader inmediatamente en el siguiente ciclo
    setTimeout(() => {
      setActiveSubmissionId(newId)
      setTempGrade('')
      setTempFeedback('')
    }, 0)
  }

  const handleSaveGrade = async (isDraft: boolean) => {
    if (!activeSubmissionId) return
    if (!tempGrade) {
      toast.error('Debes ingresar una calificación')
      return
    }

    const gradeValue = parseFloat(tempGrade)
    if (isNaN(gradeValue) || gradeValue < 1.0 || gradeValue > 5.0) {
      toast.error('La calificación debe estar entre 1.0 y 5.0')
      return
    }

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (!isDemoMode) {
      try {
        const supabase = createClient()
        const sub = submissions.find(s => s.id === activeSubmissionId)
        
        if (sub) {
          if (sub.fileType === 'quiz') {
            if (activeSubmissionId.startsWith('temp_')) {
              const { error } = await supabase
                .from('quiz_attempts')
                .insert({
                  student_id: sub.studentId,
                  quiz_id: sub.assignmentId,
                  score: gradeValue,
                  is_passed: gradeValue >= 3.0,
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString()
                })
              if (error) throw error
            } else {
              const { error } = await supabase
                .from('quiz_attempts')
                .update({
                  score: gradeValue,
                  is_passed: gradeValue >= 3.0
                })
                .eq('id', activeSubmissionId)
              if (error) throw error
            }
          } else {
            // Write to student_lesson_grades (new schema)
            const result = await saveLessonGrade({
              studentId: sub.studentId,
              lessonId: sub.lessonId || sub.assignmentId,
              courseId,
              grade: gradeValue,
              maxGrade: 5,
              feedback: tempFeedback || undefined,
              gradeType: sub.gradeType || 'task'
            })
            if (result.error) throw new Error(result.error)
          }
        }
      } catch (err: any) {
        console.error("Error saving grade to DB:", err)
        toast.error(`Error al guardar: ${err?.message || 'Error desconocido'}`)
        return
      }
    }

    setSubmissions(prev => prev.map(s => 
      s.id === activeSubmissionId 
        ? { ...s, status: isDraft ? 'draft' : 'graded', grade: gradeValue }
        : s
    ))
    
    if (isDraft) {
      toast.success('Borrador guardado correctamente')
    } else {
      toast.success('Calificación enviada al estudiante')
    }
    
    setActiveSubmissionId(null)
  }

  const handleExportExcel = () => {
    const headers = ['Estudiante', ...filteredAssignments.map(a => `"${a.name}"`)]
    
    const rows = filteredStudents.map(student => {
      const studentData = [`"${student.name}"`]
      
      filteredAssignments.forEach(assignment => {
        const submission = submissions.find(s => s.studentId === student.id && s.assignmentId === assignment.id)
        if (!submission) {
          studentData.push('"Sin entrega"')
        } else if (submission.status === 'graded') {
          studentData.push(`"${submission.grade?.toFixed(1)}"`)
        } else if (submission.status === 'draft') {
          studentData.push(`"Borrador (${submission.grade?.toFixed(1)})"`)
        } else {
          studentData.push('"Por calificar"')
        }
      })
      
      return studentData.join(',')
    })
    
    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Reporte_Entregas_${settings?.categories[0]?.id || 'Curso'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Reporte exportado correctamente')
  }

  if (loading || !settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <Inbox className="h-5 w-5" />
            </div>
            Matriz de Entregas
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Vista general de todas las tareas y entregas de tus estudiantes.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden dark:border-slate-800/60 dark:bg-slate-900 flex flex-col">
        
        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 p-4 gap-4 dark:border-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-indigo-500"
            >
              <option value="all">Todas las Categorías</option>
              {settings.categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-indigo-500"
              />
            </div>
            
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 font-semibold rounded-xl text-sm border border-emerald-100 hover:bg-emerald-100 transition-colors shrink-0 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Matriz (Table) Wrapper */}
        <div className="overflow-x-auto pb-8">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-800/20">
                <th className="sticky left-0 z-10 bg-slate-50 dark:bg-[#151b2b] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60 w-64 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  Estudiante
                </th>
                
                {filteredAssignments.map((assignment) => {
                  const categoryName = settings.categories.find(c => c.id === assignment.categoryId)?.name
                  return (
                    <th key={assignment.id} className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-center min-w-[160px] max-w-[200px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md dark:bg-indigo-500/10 dark:text-indigo-400">
                          {categoryName}
                        </span>
                        <span className="truncate w-full text-center" title={assignment.name}>{assignment.name}</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[#0f172a] px-6 py-4 border-r border-slate-100 dark:border-slate-800/60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.02)] group-hover:bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        {student.avatar ? (
                          <img src={student.avatar} alt={student.name} className="h-8 w-8 rounded-full object-cover border border-slate-100 dark:border-slate-700" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100/20">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-slate-900 dark:text-white truncate">{student.name}</span>
                      </div>
                    </td>
                    
                    {filteredAssignments.map((assignment) => {
                      const submission = submissions.find(s => s.studentId === student.id && s.assignmentId === assignment.id)
                      
                      return (
                        <td key={assignment.id} className="px-6 py-4 text-center">
                          {!submission ? (
                            <button 
                              onClick={() => handleCreateEmptyAndGrade(student.id, assignment.id)}
                              className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors dark:border-slate-700 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                            >
                              Evaluar (Sin envío)
                            </button>
                          ) : submission.status === 'graded' ? (
                            <button 
                              onClick={() => handleOpenGrader(submission.id)}
                              className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                            >
                              {submission.grade?.toFixed(1)} / 5.0
                            </button>
                          ) : submission.status === 'draft' ? (
                            <button 
                              onClick={() => handleOpenGrader(submission.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 dark:hover:bg-amber-500/20"
                            >
                              Borrador ({submission.grade?.toFixed(1)})
                            </button>
                          ) : (
                            <button  
                              onClick={() => handleOpenGrader(submission.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 dark:hover:bg-indigo-500/20"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Revisar
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={filteredAssignments.length + 1} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron estudiantes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SpeedGrader Full Screen Modal */}
      <AnimatePresence>
        {activeSubmission && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[100] flex flex-col bg-slate-100 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800 shrink-0 shadow-sm">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveSubmissionId(null)}
                  className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors dark:hover:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X className="h-6 w-6" />
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex items-center gap-3">
                  {activeSubmission.studentAvatar ? (
                    <img src={activeSubmission.studentAvatar} alt={activeSubmission.studentName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100/20">
                      {activeSubmission.studentName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{activeSubmission.studentName}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{activeSubmission.assignmentName}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">Entregado: {activeSubmission.date}</span>
                {activeSubmission.isLate && (
                  <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-md text-xs font-bold dark:bg-red-500/10 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Atrasado
                  </span>
                )}
                {activeSubmission.status === 'graded' && (
                  <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold dark:bg-emerald-500/10 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Calificada
                  </span>
                )}
                {activeSubmission.status === 'draft' && (
                  <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold dark:bg-amber-500/10 dark:text-amber-400">
                    Borrador
                  </span>
                )}
              </div>
            </div>

            {/* Content Split */}
            <div className="flex flex-1 overflow-hidden">
              {/* Document Preview (Left) */}
              <div className="flex-1 bg-slate-200/50 dark:bg-black/20 p-4 sm:p-8 overflow-y-auto flex items-center justify-center">
                <div className="w-full max-w-4xl h-full bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-start p-8 overflow-y-auto">
                  {activeSubmission.submissionText ? (
                    <div className="w-full text-left space-y-4">
                      <div className="border-b pb-4 border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Respuesta Escrita por el Estudiante</h3>
                        <p className="text-xs text-slate-500 mt-1">El estudiante respondió a esta tarea escribiendo el siguiente texto:</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed shadow-inner">
                        {activeSubmission.submissionText}
                      </div>
                    </div>
                  ) : (
                    <div className="m-auto flex flex-col items-center justify-center">
                      <FileText className="h-24 w-24 text-slate-200 dark:text-slate-600 mb-4" />
                      <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">{activeSubmission.fileName}</h3>
                      <p className="text-slate-500 text-sm text-center max-w-md">
                        {activeSubmission.fileName === 'Sin_Archivo' 
                          ? 'El estudiante no ha subido ningún archivo para esta actividad.'
                          : 'En producción, aquí se incrustaría el visor de documentos (PDF, imágenes, Word) para que el profesor pueda leer la entrega directamente sin descargarla.'}
                      </p>
                      {activeSubmission.fileName !== 'Sin_Archivo' && (
                        <button className="mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-semibold rounded-lg text-sm hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400">
                          <Eye className="h-4 w-4" />
                          Abrir en nueva pestaña
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Grading Sidebar (Right) */}
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Calificación</h3>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      placeholder="0.0"
                      value={tempGrade}
                      onChange={(e) => setTempGrade(e.target.value)}
                      className="w-24 text-3xl font-black text-center py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                    <span className="text-xl font-bold text-slate-400">/ 5.0</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Comentarios (Opcional)</label>
                    <textarea
                      placeholder="Escribe una retroalimentación para el estudiante..."
                      value={tempFeedback}
                      onChange={(e) => setTempFeedback(e.target.value)}
                      className="w-full h-32 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white resize-none transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="p-6 mt-auto space-y-3">
                  <button
                    onClick={() => handleSaveGrade(true)}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl shadow-sm border border-slate-200 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Guardar Borrador
                  </button>
                  <button
                    onClick={() => handleSaveGrade(false)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors"
                  >
                    <Save className="h-5 w-5" />
                    Enviar Definitiva
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
