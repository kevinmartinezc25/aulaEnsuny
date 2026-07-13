'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HelpCircle, Plus, Calendar as CalendarIcon, Clock, Users, PlayCircle, MoreHorizontal, Edit2, Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

// Mocks
export interface QuizConfig {
  id: string
  title: string
  status: 'active' | 'scheduled' | 'completed' | 'draft'
  dueDate: string
  startDate?: string
  questions: number
  submissions: number
  total: number
  average?: string
}

import { createClient } from '@/core/config/supabase/client'
import { getCourseStudentsCount } from '../../application/teacherActions'

export function TeacherCourseQuizzesScreen({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<QuizConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    if (openDropdownId) {
      window.addEventListener('click', handleClickOutside)
    }
    return () => window.removeEventListener('click', handleClickOutside)
  }, [openDropdownId])

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

        if (isDemoMode) {
          setQuizzes([
            { id: 'q1', title: 'Quiz Leyes de Newton', status: 'active', dueDate: 'Hoy, 23:59', questions: 10, submissions: 28, total: 35 },
            { id: 'q2', title: 'Taller de Cinemática', status: 'scheduled', dueDate: '15 Sep, 08:00', questions: 5, submissions: 0, total: 35 },
            { id: 'q3', title: 'Evaluación Diagnóstica', status: 'completed', dueDate: '1 Sep, 12:00', questions: 15, submissions: 35, total: 35, average: '4.2/5.0' },
          ])
          setLoading(false)
          return
        }

        const supabase = createClient()
        const totalStudentsCount = await getCourseStudentsCount(courseId)
        
        // 1. Fetch modules for this course
        const { data: dbModules } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', courseId)
          
        if (!dbModules || dbModules.length === 0) {
          setQuizzes([])
          setLoading(false)
          return
        }
        
        const moduleIds = dbModules.map(m => m.id)
        
        // 2. Fetch lessons for these modules
        const { data: dbLessons } = await supabase
          .from('lessons')
          .select('id')
          .in('module_id', moduleIds)
          
        if (!dbLessons || dbLessons.length === 0) {
          setQuizzes([])
          setLoading(false)
          return
        }
        
        const lessonIds = dbLessons.map(l => l.id)
        
        // 3. Fetch quizzes for these lessons
        const { data: dbQuizzes } = await supabase
          .from('quizzes')
          .select('*')
          .in('lesson_id', lessonIds)
          
        if (!dbQuizzes || dbQuizzes.length === 0) {
          setQuizzes([])
          setLoading(false)
          return
        }

        // Map to QuizConfig
        const mappedQuizzes = await Promise.all(dbQuizzes.map(async (q) => {
          // Count questions
          const { count: questionsCount } = await supabase
            .from('quiz_questions')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', q.id)
            
          // Count attempts (submissions)
          const { count: attemptsCount } = await supabase
            .from('quiz_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', q.id)

          // Fetch average score
          const { data: attempts } = await supabase
            .from('quiz_attempts')
            .select('score')
            .eq('quiz_id', q.id)
            
          let average = undefined
          if (attempts && attempts.length > 0) {
            const sum = attempts.reduce((acc, curr) => acc + Number(curr.score), 0)
            average = `${(sum / attempts.length).toFixed(1)}/5.0`
          }

          const totalStudents = totalStudentsCount

          // Helper to format date
          const formatDate = (isoString?: string) => {
            if (!isoString) return null
            const date = new Date(isoString)
            return date.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })
          }

          const formattedStart = formatDate(q.start_date)
          const formattedEnd = formatDate(q.end_date)

          let status: 'active' | 'scheduled' | 'completed' | 'draft' = 'active'
          const now = new Date()
          if (q.start_date && new Date(q.start_date) > now) {
            status = 'scheduled'
          } else if (q.end_date && new Date(q.end_date) < now) {
            status = 'completed'
          }

          return {
            id: q.id,
            title: q.title,
            status,
            dueDate: formattedEnd ? `Cierre: ${formattedEnd}` : 'Sin fecha de cierre',
            startDate: formattedStart ? `Inicio: ${formattedStart}` : undefined,
            questions: questionsCount || 0,
            submissions: attemptsCount || 0,
            total: totalStudents,
            average
          }
        }))
        
        setQuizzes(mappedQuizzes)
      } catch (err) {
        console.error("Error loading quizzes:", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchQuizzes()
  }, [courseId])

  const handleDeleteQuiz = (id: string) => {
    toast.warning('¿Eliminar quiz?', {
      description: 'Esta acción eliminará el quiz y su lección asociada en el módulo.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            const supabase = createClient()
            
            // Obtener el lesson_id asociado al quiz
            const { data: quizObj, error: qErr } = await supabase
              .from('quizzes')
              .select('lesson_id')
              .eq('id', id)
              .single()
            
            if (qErr) throw qErr

            if (quizObj?.lesson_id) {
              // Eliminar la lección (eliminará el quiz y preguntas en cascada)
              const { error: lesErr } = await supabase
                .from('lessons')
                .delete()
                .eq('id', quizObj.lesson_id)
              
              if (lesErr) throw lesErr
            } else {
              // Fallback eliminar quiz directamente
              const { error: quizErr } = await supabase
                .from('quizzes')
                .delete()
                .eq('id', id)
              if (quizErr) throw quizErr
            }

            setQuizzes(prev => prev.filter(q => q.id !== id))
            toast.success('Quiz eliminado correctamente')
            router.refresh()
          } catch (err: any) {
            console.error('Error al eliminar quiz:', err)
            toast.error(err.message || 'No se pudo eliminar el quiz de la base de datos')
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const handleDuplicateQuiz = async (quiz: QuizConfig) => {
    try {
      const supabase = createClient()
      
      // 1. Obtener detalles del quiz original
      const { data: origQuiz, error: qErr } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quiz.id)
        .single()
      if (qErr) throw qErr

      // 2. Obtener lección original para saber el módulo
      const { data: origLesson, error: lErr } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', origQuiz.lesson_id)
        .single()
      if (lErr) throw lErr

      // 3. Obtener preguntas
      const { data: origQuestions, error: qstErr } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
      if (qstErr) throw qstErr

      // 4. Crear nueva lección en el mismo módulo
      const { data: lessonsInModule } = await supabase
        .from('lessons')
        .select('sort_order')
        .eq('module_id', origLesson.module_id)
      
      const nextSortOrder = lessonsInModule && lessonsInModule.length > 0
        ? Math.max(...lessonsInModule.map(l => l.sort_order || 0)) + 1
        : 1

      const { data: newLesson, error: insLErr } = await supabase
        .from('lessons')
        .insert({
          module_id: origLesson.module_id,
          title: `${origLesson.title} (Copia)`,
          sort_order: nextSortOrder
        })
        .select()
        .single()
      if (insLErr) throw insLErr

      // 5. Crear nuevo quiz
      const { data: newQuiz, error: insQErr } = await supabase
        .from('quizzes')
        .insert({
          lesson_id: newLesson.id,
          title: `${origQuiz.title} (Copia)`,
          duration_minutes: origQuiz.duration_minutes,
          max_attempts: origQuiz.max_attempts,
          passing_grade: origQuiz.passing_grade
        })
        .select()
        .single()
      if (insQErr) throw insQErr

      // 6. Copiar preguntas y opciones
      for (const q of (origQuestions || [])) {
        const { data: optionsData } = await supabase
          .from('quiz_options')
          .select('*')
          .eq('question_id', q.id)

        const { data: newQ, error: insQstErr } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: newQuiz.id,
            question_text: q.question_text,
            question_type: q.question_type,
            sort_order: q.sort_order,
            points: q.points ?? 1
          })
          .select()
          .single()
        
        if (insQstErr) throw insQstErr

        if (optionsData && optionsData.length > 0) {
          const optsToInsert = optionsData.map(o => ({
            question_id: newQ.id,
            option_text: o.option_text,
            is_correct: o.is_correct
          }))
          const { error: insOptsErr } = await supabase.from('quiz_options').insert(optsToInsert)
          if (insOptsErr) throw insOptsErr
        }
      }

      const formatDate = (isoString?: string) => {
        if (!isoString) return null
        const date = new Date(isoString)
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      }

      const duplicated: QuizConfig = {
        id: newQuiz.id,
        title: newQuiz.title,
        status: 'draft',
        dueDate: newQuiz.end_date ? `Cierre: ${formatDate(newQuiz.end_date)}` : 'Sin fecha de cierre',
        startDate: newQuiz.start_date ? `Inicio: ${formatDate(newQuiz.start_date)}` : undefined,
        questions: origQuestions.length,
        submissions: 0,
        total: quiz.total,
        average: undefined
      }

      setQuizzes(prev => [duplicated, ...prev])
      toast.success('Quiz duplicado correctamente')
      router.refresh()
    } catch (err: any) {
      console.error('Error al duplicar quiz:', err)
      toast.error(err.message || 'No se pudo duplicar el quiz en la base de datos')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            Gestor de Quizzes
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Crea, programa y revisa las evaluaciones del curso.
          </p>
        </div>
        <Link 
          href={`/teacher/courses/${courseId}/quizzes/new`}
          className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all px-4 py-2.5 text-sm font-semibold text-white self-start sm:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Crear Quiz</span>
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900 shadow-sm">
          <HelpCircle className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No hay quizzes creados</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Crea tu primer cuestionario evaluativo usando el botón de la esquina superior derecha.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
          <div key={quiz.id} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:border-slate-800/60 dark:bg-slate-900">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {quiz.status === 'active' && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase dark:bg-emerald-500/10 dark:text-emerald-400"><PlayCircle className="h-3 w-3" /> Activo</span>}
                  {quiz.status === 'scheduled' && <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase dark:bg-blue-500/10 dark:text-blue-400"><CalendarIcon className="h-3 w-3" /> Programado</span>}
                  {quiz.status === 'completed' && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-400">Finalizado</span>}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{quiz.title}</h3>
              </div>
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenDropdownId(openDropdownId === quiz.id ? null : quiz.id)
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md dark:hover:text-slate-300 dark:hover:bg-slate-800"
                >
                  <MoreHorizontal className="h-5 w-5 pointer-events-none" />
                </button>
                
                {openDropdownId === quiz.id && (
                  <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-white shadow-lg border border-slate-100 dark:border-slate-800 dark:bg-slate-900 z-10 py-1" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => { router.push(`/teacher/courses/${courseId}/quizzes/${quiz.id}/edit`); setOpenDropdownId(null); }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </button>
                    <button 
                      onClick={() => { handleDuplicateQuiz(quiz); setOpenDropdownId(null); }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicar
                    </button>
                    <button 
                      onClick={() => { handleDeleteQuiz(quiz.id); setOpenDropdownId(null); }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-6 flex-1 text-xs">
              {quiz.startDate && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <CalendarIcon className="h-4 w-4 text-slate-400" />
                  <span>{quiz.startDate}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>{quiz.dueDate}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <HelpCircle className="h-4 w-4 text-slate-400" />
                <span>{quiz.questions} preguntas</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{quiz.submissions} <span className="text-slate-400 font-normal">/ {quiz.total} entregas</span></span>
                </div>
                {quiz.average && (
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    Promedio: {quiz.average}
                  </div>
                )}
              </div>
              
              {quiz.status === 'active' && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(quiz.submissions / quiz.total) * 100}%` }}></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
