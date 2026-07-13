'use client'

import React, { useState, useEffect } from 'react'
import { Save, HelpCircle, Calendar as CalendarIcon, FileText, ChevronLeft, GripVertical, Trash2, Plus, ChevronDown, ChevronUp, AlignLeft, CheckSquare, CheckCircle, SplitSquareHorizontal, Type, Loader2 } from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'

export type QuestionType = 'multiple_choice' | 'true_false' | 'open_text' | 'matching'

export interface Question {
  id: string
  type: QuestionType
  text: string
  points: number
  // For multiple choice
  options?: string[]
  correctAnswer?: string
  // For true/false
  isTrue?: boolean
  // For matching
  pairs?: { premise: string; response: string }[]
}

export function TeacherCreateQuizScreen({ courseId, quizId }: { courseId: string; quizId?: string }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    status: 'draft',
    duration_minutes: '' as string | number,
    max_attempts: 3,
    passing_grade: 3.0,
    start_date: '',
    end_date: '',
  })
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [expandedQId, setExpandedQId] = useState<string | null>(null)
  
  const [modules, setModules] = useState<{ id: string; title: string }[]>([])
  const [selectedModuleId, setSelectedModuleId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(!!quizId)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch course modules
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('course_modules')
          .select('id, title')
          .eq('course_id', courseId)
          .order('sort_order', { ascending: true })
        
        if (error) throw error
        if (data) setModules(data)
      } catch (err) {
        console.error('Error fetching modules:', err)
      }
    }
    fetchModules()
  }, [courseId])

  // Load existing quiz for editing
  useEffect(() => {
    if (!quizId) return
    const loadQuizData = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()
        
        // Helper to format ISO to datetime-local (YYYY-MM-DDTHH:MM)
        const formatForInput = (isoString?: string) => {
          if (!isoString) return ''
          try {
            const date = new Date(isoString)
            const offset = date.getTimezoneOffset()
            const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000))
            return adjustedDate.toISOString().slice(0, 16)
          } catch (err) {
            return ''
          }
        }

        // 1. Fetch quiz
        const { data: quiz, error: qErr } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single()
        if (qErr) throw qErr
        
        // 2. Fetch lesson to get the module_id
        const { data: lesson } = await supabase
          .from('lessons')
          .select('module_id')
          .eq('id', quiz.lesson_id)
          .single()
        
        if (lesson) {
          setSelectedModuleId(lesson.module_id)
        }

        setFormData({
          title: quiz.title || '',
          status: 'active',
          duration_minutes: quiz.duration_minutes ?? '',
          max_attempts: quiz.max_attempts ?? 3,
          passing_grade: Number(quiz.passing_grade) ?? 3.0,
          start_date: formatForInput(quiz.start_date),
          end_date: formatForInput(quiz.end_date),
        })

        // 3. Fetch questions
        const { data: questionsData, error: qstErr } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('sort_order', { ascending: true })
        if (qstErr) throw qstErr

        // 4. Fetch options for each question
        const mappedQuestions: Question[] = []
        for (const dbQ of (questionsData || [])) {
          const { data: optionsData } = await supabase
            .from('quiz_options')
            .select('*')
            .eq('question_id', dbQ.id)

          const typeMap: Record<string, QuestionType> = {
            'single_choice': 'multiple_choice',
            'boolean': 'true_false',
            'open_text': 'open_text',
            'matching': 'matching'
          }
          const type: QuestionType = typeMap[dbQ.question_type] || 'multiple_choice'
          
          const qItem: Question = {
            id: dbQ.id,
            type,
            text: dbQ.question_text,
            points: dbQ.points ?? 1,
          }

          if (type === 'multiple_choice') {
            qItem.options = optionsData?.map(o => o.option_text) || []
            qItem.correctAnswer = optionsData?.find(o => o.is_correct)?.option_text || ''
          } else if (type === 'true_false') {
            const isTrueOpt = optionsData?.find(o => o.option_text === 'Verdadero')
            qItem.isTrue = isTrueOpt ? isTrueOpt.is_correct : true
          } else if (type === 'matching') {
            qItem.pairs = optionsData?.map(o => {
              const [premise, response] = o.option_text.split(' ||| ')
              return { premise: premise || '', response: response || '' }
            }) || []
          }

          mappedQuestions.push(qItem)
        }

        setQuestions(mappedQuestions)
      } catch (err: any) {
        console.error('Error loading quiz:', err)
        toast.error('No se pudo cargar el quiz')
      } finally {
        setIsLoading(false)
      }
    }
    loadQuizData()
  }, [quizId])

  const handleAddQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: `q_${Date.now()}`,
      type,
      text: '',
      points: 1,
    }
    
    if (type === 'multiple_choice') {
      newQ.options = ['Opción 1', 'Opción 2']
      newQ.correctAnswer = 'Opción 1'
    } else if (type === 'true_false') {
      newQ.isTrue = true
    } else if (type === 'matching') {
      newQ.pairs = [{ premise: '', response: '' }]
    }

    setQuestions(prev => [...prev, newQ])
    setExpandedQId(newQ.id)
  }

  const handleDeleteQuestion = (id: string) => {
    toast.warning('¿Eliminar pregunta?', {
      description: 'Esta acción no se puede deshacer.',
      action: {
        label: 'Eliminar',
        onClick: () => {
          setQuestions(prev => prev.filter(q => q.id !== id))
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q))
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Por favor, ingresa el título de la evaluación')
      return
    }
    if (!selectedModuleId) {
      toast.error('Por favor, selecciona un módulo para vincular el quiz')
      return
    }
    if (questions.length === 0) {
      toast.error('Por favor, añade al menos una pregunta')
      return
    }

    // Validar preguntas
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        toast.error(`La pregunta ${i + 1} está vacía`)
        return
      }
      if (q.type === 'multiple_choice') {
        if (!q.options || q.options.length < 2) {
          toast.error(`La pregunta ${i + 1} requiere al menos 2 opciones`)
          return
        }
        if (q.options.some(o => !o.trim())) {
          toast.error(`Hay opciones vacías en la pregunta ${i + 1}`)
          return
        }
        if (!q.correctAnswer) {
          toast.error(`Selecciona la respuesta correcta para la pregunta ${i + 1}`)
          return
        }
      } else if (q.type === 'matching') {
        if (!q.pairs || q.pairs.length < 1) {
          toast.error(`La pregunta ${i + 1} requiere al menos 1 par de emparejamiento`)
          return
        }
        if (q.pairs.some(p => !p.premise.trim() || !p.response.trim())) {
          toast.error(`Hay pares incompletos en la pregunta ${i + 1}`)
          return
        }
      }
    }

    try {
      setIsSaving(true)
      const supabase = createClient()
      
      const duration = formData.duration_minutes !== '' ? Number(formData.duration_minutes) : null
      const maxAttempts = Number(formData.max_attempts)
      const passingGrade = Number(formData.passing_grade)

      if (quizId) {
        // --- MODO EDICIÓN ---
        // 1. Obtener la lección vinculada
        const { data: quizObj, error: qErr } = await supabase
          .from('quizzes')
          .select('lesson_id')
          .eq('id', quizId)
          .single()
        if (qErr) throw qErr

        // 2. Actualizar lección
        const { error: lesErr } = await supabase
          .from('lessons')
          .update({
            title: formData.title,
            module_id: selectedModuleId
          })
          .eq('id', quizObj.lesson_id)
        if (lesErr) throw lesErr

        // 3. Actualizar quiz
        const startDate = formData.start_date ? new Date(formData.start_date).toISOString() : null
        const endDate = formData.end_date ? new Date(formData.end_date).toISOString() : null

        const { error: quizUpdErr } = await supabase
          .from('quizzes')
          .update({
            title: formData.title,
            duration_minutes: duration,
            max_attempts: maxAttempts,
            passing_grade: passingGrade,
            start_date: startDate,
            end_date: endDate,
          })
          .eq('id', quizId)
        if (quizUpdErr) throw quizUpdErr

        // 4. Eliminar preguntas existentes (cascada eliminará opciones)
        const { error: delErr } = await supabase
          .from('quiz_questions')
          .delete()
          .eq('quiz_id', quizId)
        if (delErr) throw delErr

        // 5. Insertar preguntas y opciones
        for (let idx = 0; idx < questions.length; idx++) {
          const q = questions[idx]
          
          const typeMap: Record<QuestionType, string> = {
            'multiple_choice': 'single_choice',
            'true_false': 'boolean',
            'open_text': 'open_text',
            'matching': 'matching'
          }

          const { data: newQ, error: insQErr } = await supabase
            .from('quiz_questions')
            .insert({
              quiz_id: quizId,
              question_text: q.text,
              question_type: typeMap[q.type],
              sort_order: idx + 1,
              points: q.points ?? 1
            })
            .select()
            .single()
          
          if (insQErr) throw insQErr

          if (q.type === 'multiple_choice' && q.options) {
            const optsToInsert = q.options.map(opt => ({
              question_id: newQ.id,
              option_text: opt,
              is_correct: opt === q.correctAnswer
            }))
            const { error: optsErr } = await supabase.from('quiz_options').insert(optsToInsert)
            if (optsErr) throw optsErr
          } else if (q.type === 'true_false') {
            const optsToInsert = [
              { question_id: newQ.id, option_text: 'Verdadero', is_correct: q.isTrue === true },
              { question_id: newQ.id, option_text: 'Falso', is_correct: q.isTrue === false }
            ]
            const { error: optsErr } = await supabase.from('quiz_options').insert(optsToInsert)
            if (optsErr) throw optsErr
          } else if (q.type === 'matching' && q.pairs) {
            const optsToInsert = q.pairs.map(pair => ({
              question_id: newQ.id,
              option_text: `${pair.premise} ||| ${pair.response}`,
              is_correct: true
            }))
            const { error: optsErr } = await supabase.from('quiz_options').insert(optsToInsert)
            if (optsErr) throw optsErr
          }
        }

        toast.success('Quiz actualizado correctamente')
      } else {
        // --- MODO CREAR ---
        // 1. Obtener orden de lección
        const { data: lessonsInModule } = await supabase
          .from('lessons')
          .select('sort_order')
          .eq('module_id', selectedModuleId)
        
        const nextSortOrder = lessonsInModule && lessonsInModule.length > 0
          ? Math.max(...lessonsInModule.map(l => l.sort_order || 0)) + 1
          : 1

        // 2. Crear lección
        const { data: newLesson, error: lesErr } = await supabase
          .from('lessons')
          .insert({
            module_id: selectedModuleId,
            title: formData.title,
            sort_order: nextSortOrder
          })
          .select()
          .single()
        
        if (lesErr) throw lesErr

        // 3. Crear quiz
        const startDate = formData.start_date ? new Date(formData.start_date).toISOString() : null
        const endDate = formData.end_date ? new Date(formData.end_date).toISOString() : null

        const { data: newQuiz, error: qErr } = await supabase
          .from('quizzes')
          .insert({
            lesson_id: newLesson.id,
            title: formData.title,
            duration_minutes: duration,
            max_attempts: maxAttempts,
            passing_grade: passingGrade,
            start_date: startDate,
            end_date: endDate
          })
          .select()
          .single()
        
        if (qErr) throw qErr

        // 4. Crear preguntas y opciones
        for (let idx = 0; idx < questions.length; idx++) {
          const q = questions[idx]

          const typeMap: Record<QuestionType, string> = {
            'multiple_choice': 'single_choice',
            'true_false': 'boolean',
            'open_text': 'open_text',
            'matching': 'matching'
          }

          const { data: newQ, error: insQErr } = await supabase
            .from('quiz_questions')
            .insert({
              quiz_id: newQuiz.id,
              question_text: q.text,
              question_type: typeMap[q.type],
              sort_order: idx + 1,
              points: q.points ?? 1
            })
            .select()
            .single()
          
          if (insQErr) throw insQErr

          if (q.type === 'multiple_choice' && q.options) {
            const optsToInsert = q.options.map(opt => ({
              question_id: newQ.id,
              option_text: opt,
              is_correct: opt === q.correctAnswer
            }))
            const { error: optsErr } = await supabase.from('quiz_options').insert(optsToInsert)
            if (optsErr) throw optsErr
          } else if (q.type === 'true_false') {
            const optsToInsert = [
              { question_id: newQ.id, option_text: 'Verdadero', is_correct: q.isTrue === true },
              { question_id: newQ.id, option_text: 'Falso', is_correct: q.isTrue === false }
            ]
            const { error: optsErr } = await supabase.from('quiz_options').insert(optsToInsert)
            if (optsErr) throw optsErr
          } else if (q.type === 'matching' && q.pairs) {
            const optsToInsert = q.pairs.map(pair => ({
              question_id: newQ.id,
              option_text: `${pair.premise} ||| ${pair.response}`,
              is_correct: true
            }))
            const { error: optsErr } = await supabase.from('quiz_options').insert(optsToInsert)
            if (optsErr) throw optsErr
          }
        }

        toast.success('Quiz creado y vinculado correctamente')
      }

      router.push(`/teacher/courses/${courseId}/quizzes`)
      router.refresh()
    } catch (err: any) {
      console.error('Error guardando quiz:', err?.message || err?.code || JSON.stringify(err) || err)
      toast.error(err.message || 'Error al guardar el quiz')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-sm text-slate-500">Cargando datos de la evaluación...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      {/* Cabecera */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-6 dark:border-slate-800/60">
        <div className="flex items-center gap-4">
          <Link 
            href={`/teacher/courses/${courseId}/quizzes`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              {quizId ? 'Editar Quiz' : 'Crear Nuevo Quiz'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {quizId ? 'Modifica los detalles y preguntas de la evaluación.' : 'Configura los detalles de la evaluación antes de agregar preguntas.'}
            </p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Guardar Quiz</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Form */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 space-y-8">
        
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Estado del Quiz</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Activa si los alumnos ya pueden resolverlo.</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={formData.status === 'active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'active' : 'draft' })}
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-slate-700 dark:after:border-slate-600 dark:peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Título de la Evaluación *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej. Examen Parcial de Matemáticas"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Módulo del Curso *</label>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-purple-500"
              >
                <option value="">Selecciona un módulo...</option>
                {modules.map(mod => (
                  <option key={mod.id} value={mod.id}>{mod.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha de Inicio</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha de Cierre (Límite)</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Duración (minutos)</label>
              <input
                type="number"
                min={1}
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                placeholder="Ilimitado"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Intentos Máximos</label>
              <input
                type="number"
                min={1}
                value={formData.max_attempts}
                onChange={(e) => setFormData({ ...formData, max_attempts: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Aprobación (1.0 - 5.0)</label>
              <input
                type="number"
                min={1.0}
                max={5.0}
                step={0.1}
                value={formData.passing_grade}
                onChange={(e) => setFormData({ ...formData, passing_grade: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total de Puntos</label>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {questions.reduce((acc, q) => acc + (q.points || 0), 0)} pts ({questions.length} preguntas)
              </div>
            </div>
          </div>
        </div>

        {/* Constructor de Preguntas */}
        <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-purple-500" />
              Preguntas de la Evaluación
            </h3>
          </div>

          <div className="space-y-4 mb-8">
            <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-4">
              {questions.map((q, idx) => {
                const isExpanded = expandedQId === q.id
                return (
                  <Reorder.Item 
                    key={q.id} 
                    value={q}
                    className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800"
                  >
                    {/* Encabezado */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                      onClick={() => setExpandedQId(isExpanded ? null : q.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="cursor-grab text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" onClick={e => e.stopPropagation()}>
                          <GripVertical className="h-5 w-5 pointer-events-none" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Pregunta {idx + 1}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase dark:bg-slate-700 dark:text-slate-400">
                              {q.type === 'multiple_choice' && 'Opción Múltiple'}
                              {q.type === 'true_false' && 'Verdadero / Falso'}
                              {q.type === 'open_text' && 'Abierta'}
                              {q.type === 'matching' && 'Emparejamiento'}
                            </span>
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                            {q.text || 'Nueva pregunta sin enunciado...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-lg">
                          {q.points} pts
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors dark:hover:bg-slate-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="p-1 text-slate-400">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo (Formulario) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-5 space-y-5"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-2">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Enunciado</label>
                              <textarea 
                                value={q.text}
                                onChange={e => updateQuestion(q.id, { text: e.target.value })}
                                placeholder="Escribe la pregunta aquí..."
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white resize-none"
                              />
                            </div>
                            <div className="w-24 space-y-2 shrink-0">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Puntos</label>
                              <input 
                                type="number"
                                min={0}
                                value={q.points}
                                onChange={e => updateQuestion(q.id, { points: Number(e.target.value) })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Tipo: Opción Múltiple */}
                          {q.type === 'multiple_choice' && (
                            <div className="space-y-3 pt-2">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Opciones (Marca la correcta)</label>
                              {q.options?.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-3">
                                  <input 
                                    type="radio" 
                                    name={`correct_${q.id}`}
                                    checked={q.correctAnswer === opt}
                                    onChange={() => updateQuestion(q.id, { correctAnswer: opt })}
                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                  />
                                  <input 
                                    type="text"
                                    value={opt}
                                    onChange={e => {
                                      const newOpts = [...(q.options || [])];
                                      const oldOpt = newOpts[oIdx];
                                      newOpts[oIdx] = e.target.value;
                                      
                                      // If the changed option was the correct one, update the correct one too
                                      if (q.correctAnswer === oldOpt) {
                                        updateQuestion(q.id, { options: newOpts, correctAnswer: e.target.value });
                                      } else {
                                        updateQuestion(q.id, { options: newOpts });
                                      }
                                    }}
                                    className={`flex-1 rounded-xl border px-4 py-2 text-sm outline-none transition-all dark:bg-slate-800 dark:text-white ${q.correctAnswer === opt ? 'border-emerald-500 bg-emerald-50/30 dark:border-emerald-500/50' : 'border-slate-200 bg-white dark:border-slate-600 focus:border-purple-500'}`}
                                  />
                                  <button 
                                    onClick={() => updateQuestion(q.id, { options: q.options?.filter((_, i) => i !== oIdx) })}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-slate-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                              <button 
                                onClick={() => updateQuestion(q.id, { options: [...(q.options || []), `Opción ${(q.options?.length || 0) + 1}`] })}
                                className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 mt-2 px-1 dark:text-purple-400"
                              >
                                <Plus className="h-4 w-4" /> Añadir Opción
                              </button>
                            </div>
                          )}

                          {/* Tipo: Verdadero / Falso */}
                          {q.type === 'true_false' && (
                            <div className="space-y-3 pt-2">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Respuesta Correcta</label>
                              <div className="flex items-center gap-4">
                                <label className={`flex items-center gap-3 rounded-xl border px-6 py-3 cursor-pointer transition-all flex-1 ${q.isTrue === true ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10' : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800'}`}>
                                  <input 
                                    type="radio" 
                                    name={`tf_${q.id}`} 
                                    checked={q.isTrue === true}
                                    onChange={() => updateQuestion(q.id, { isTrue: true })}
                                    className="h-4 w-4 text-emerald-600"
                                  />
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">Verdadero</span>
                                </label>
                                <label className={`flex items-center gap-3 rounded-xl border px-6 py-3 cursor-pointer transition-all flex-1 ${q.isTrue === false ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10' : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800'}`}>
                                  <input 
                                    type="radio" 
                                    name={`tf_${q.id}`} 
                                    checked={q.isTrue === false}
                                    onChange={() => updateQuestion(q.id, { isTrue: false })}
                                    className="h-4 w-4 text-emerald-600"
                                  />
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">Falso</span>
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Tipo: Abierta */}
                          {q.type === 'open_text' && (
                            <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-4 flex items-start gap-3 mt-4 dark:bg-blue-900/10 dark:border-blue-900/30">
                              <HelpCircle className="h-5 w-5 text-blue-500 shrink-0" />
                              <p className="text-sm text-blue-800 dark:text-blue-300">
                                Las preguntas abiertas requerirán revisión y calificación manual por parte del profesor una vez que el alumno envíe el quiz.
                              </p>
                            </div>
                          )}

                          {/* Tipo: Emparejamiento */}
                          {q.type === 'matching' && (
                            <div className="space-y-3 pt-2">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pares Correctos (El sistema los mezclará al alumno)</label>
                              {q.pairs?.map((pair, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-3">
                                  <input 
                                    type="text"
                                    value={pair.premise}
                                    placeholder="Premisa (Ej. Gravedad)"
                                    onChange={e => {
                                      const newPairs = [...(q.pairs || [])];
                                      newPairs[pIdx].premise = e.target.value;
                                      updateQuestion(q.id, { pairs: newPairs });
                                    }}
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-purple-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                  />
                                  <span className="text-slate-400">→</span>
                                  <input 
                                    type="text"
                                    value={pair.response}
                                    placeholder="Respuesta (Ej. 9.8 m/s²)"
                                    onChange={e => {
                                      const newPairs = [...(q.pairs || [])];
                                      newPairs[pIdx].response = e.target.value;
                                      updateQuestion(q.id, { pairs: newPairs });
                                    }}
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-purple-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                  />
                                  <button 
                                    onClick={() => updateQuestion(q.id, { pairs: q.pairs?.filter((_, i) => i !== pIdx) })}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-slate-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                              <button 
                                onClick={() => updateQuestion(q.id, { pairs: [...(q.pairs || []), { premise: '', response: '' }] })}
                                className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 mt-2 px-1 dark:text-purple-400"
                              >
                                <Plus className="h-4 w-4" /> Añadir Par
                              </button>
                            </div>
                          )}

                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Reorder.Item>
                )
              })}
            </Reorder.Group>

            {questions.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/20">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No hay preguntas todavía. Añade la primera abajo.</p>
              </div>
            )}
          </div>

          {/* Botones para añadir */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button 
              onClick={() => handleAddQuestion('multiple_choice')}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-purple-500 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Opción Múltiple</span>
            </button>
            <button 
              onClick={() => handleAddQuestion('true_false')}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-purple-500 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
            >
              <SplitSquareHorizontal className="h-5 w-5" />
              <span>Verdadero/Falso</span>
            </button>
            <button 
              onClick={() => handleAddQuestion('open_text')}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-purple-500 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
            >
              <Type className="h-5 w-5" />
              <span>Pregunta Abierta</span>
            </button>
            <button 
              onClick={() => handleAddQuestion('matching')}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-purple-500 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
            >
              <AlignLeft className="h-5 w-5" />
              <span>Emparejamiento</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
