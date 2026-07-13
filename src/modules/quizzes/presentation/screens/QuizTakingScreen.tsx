'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Clock, AlertCircle, CheckCircle, BrainCircuit, Sparkles, Rocket, ArrowRight, Award, Loader2 } from 'lucide-react'
import { submitQuiz, QuizSubmissionResult } from '@/modules/quizzes/application/actions'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/config/supabase/client'

interface Question {
  id: string
  text: string
  options: { id: string; text: string }[]
}

export function QuizTakingScreen({ quizId }: { quizId: string }) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(300)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<QuizSubmissionResult | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [quizTitle, setQuizTitle] = useState('Evaluación')
  const [actualQuizId, setActualQuizId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // Cargar información del quiz y preguntas
  useEffect(() => {
    const loadQuizData = async () => {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                         process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setQuestions([
          {
            id: 'q-1',
            text: '¿Cómo se le conoce formalmente a la Primera Ley de Newton?',
            options: [
              { id: 'q1-o1', text: 'Ley de la Dinámica de Cuerpos' },
              { id: 'q1-o2-correct', text: 'Ley de la Inercia' },
              { id: 'q1-o3', text: 'Ley de Acción y Reacción' },
              { id: 'q1-o4', text: 'Ley de Gravitación Clásica' },
            ],
          },
          {
            id: 'q-2',
            text: 'Si un bloque de masa 4 kg experimenta una aceleración constante de 3 m/s², ¿cuál es la magnitud de la fuerza neta resultante aplicada sobre él?',
            options: [
              { id: 'q2-o1', text: '1.33 Newtons (N)' },
              { id: 'q2-o2', text: '7.00 Newtons (N)' },
              { id: 'q2-o3-correct', text: '12.00 Newtons (N)' },
              { id: 'q2-o4', text: '0.75 Newtons (N)' },
            ],
          },
          {
            id: 'q-3',
            text: 'De acuerdo con la Tercera Ley de Newton, las fuerzas de acción y reacción actúan en el mismo cuerpo y por lo tanto siempre se anulan mutuamente.',
            options: [
              { id: 'q3-o1', text: 'Verdadero' },
              { id: 'q3-o2-correct', text: 'Falso' },
            ],
          },
        ])
        setQuizTitle('Leyes del Movimiento')
        setActualQuizId('demo-quiz-id')
        setTimeLeft(300)
        setIsLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        // 1. Obtener detalles del quiz usando lesson_id
        const { data: quiz, error: qErr } = await supabase
          .from('quizzes')
          .select('id, title, duration_minutes')
          .eq('lesson_id', quizId) // quizId es realmente el ID de la lección proveniente de la URL
          .single()
        
        if (qErr) throw qErr
        if (quiz) {
          setActualQuizId(quiz.id)
          setQuizTitle(quiz.title)
          setTimeLeft(quiz.duration_minutes ? quiz.duration_minutes * 60 : 999999)

          // 2. Obtener preguntas
          const { data: questionsData, error: qstErr } = await supabase
            .from('quiz_questions')
            .select('id, question_text, question_type')
            .eq('quiz_id', quiz.id)
            .order('sort_order', { ascending: true })
          if (qstErr) throw qstErr

          // 3. Obtener opciones de cada pregunta
          const loadedQuestions: Question[] = []
          for (const dbQ of (questionsData || [])) {
            const { data: optionsData } = await supabase
              .from('quiz_options')
              .select('id, option_text')
              .eq('question_id', dbQ.id)

            let opts = (optionsData || []).map(o => ({
              id: o.id,
              text: o.option_text
            }))

            if (dbQ.question_type === 'matching') {
              opts = (optionsData || []).map(o => {
                const [premise, response] = o.option_text.split(' ||| ')
                return {
                  id: o.id,
                  text: `${premise} ➔ ${response}`
                }
              })
            }

            loadedQuestions.push({
              id: dbQ.id,
              text: dbQ.question_text,
              options: opts
            })
          }

          setQuestions(loadedQuestions)
        } else {
          throw new Error('No se encontró la evaluación vinculada a esta lección.')
        }
      } catch (err) {
        console.error('Error al cargar quiz para responder:', err)
        toast.error('No se pudieron cargar las preguntas de la evaluación.')
      } finally {
        setIsLoading(false)
      }
    }
    loadQuizData()
  }, [quizId])

  // Temporizador regresivo
  useEffect(() => {
    if (isLoading || questions.length === 0) return
    if (timeLeft > 10000) return // Sin límite de tiempo, no descontar
    if (timeLeft <= 0) {
      handleAutoSubmit()
      return
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, isLoading, questions.length])

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))
  }

  const formatTime = (seconds: number) => {
    if (seconds > 10000) return 'Sin límite'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true)
    
    // Transformar respuestas seleccionadas al formato esperado por el backend
    const answersPayload = questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: selectedAnswers[q.id] || '',
    }))

    try {
      const response = await submitQuiz(actualQuizId, answersPayload)
      if (response.data) {
        setResult(response.data)
        setIsModalOpen(true)
      } else if (response.error) {
        toast.error(response.error)
        return
      }
    } catch (e) {
      toast.error('Error de conexión al calificar el examen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAutoSubmit = () => {
    if (result) return // Evitar envíos duplicados si ya finalizó
    handleSubmitQuiz()
  }

  // Comprobar si se respondieron todas las preguntas
  const isAllAnswered = questions.every((q) => !!selectedAnswers[q.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 dark:bg-slate-950 flex flex-col items-center justify-center gap-2 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-500">Cargando evaluación...</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 dark:bg-slate-950 flex flex-col items-center justify-center gap-2 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-semibold text-slate-500">Esta evaluación no tiene preguntas configuradas.</p>
        <button 
          onClick={() => router.back()} 
          className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
        >
          Volver atrás
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 dark:bg-slate-950 flex items-center justify-center text-left">
      <div className="w-full max-w-2xl relative">
        {/* Temporizador flotante de alta fidelidad */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Evaluación del Módulo
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {quizTitle}
            </h2>
          </div>

          <div
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold shadow-sm transition-colors ${
              timeLeft < 60
                ? 'bg-red-50 text-red-600 border-red-200 animate-pulse dark:bg-red-950/20 dark:text-red-400'
                : 'bg-white text-slate-700 border-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Cuestionario */}
        <Card className="border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl dark:border-slate-800/60 dark:bg-slate-900 overflow-hidden">
          {/* Barra de progreso */}
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          <CardHeader className="p-6 pb-4">
            <CardDescription className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Pregunta {currentQuestionIdx + 1} de {questions.length}
            </CardDescription>
            <CardTitle className="text-lg sm:text-xl font-bold leading-snug mt-1.5 text-slate-900 dark:text-white">
              {questions[currentQuestionIdx].text}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 pt-0 space-y-3.5">
            {questions[currentQuestionIdx].options.map((opt) => {
              const isSelected = selectedAnswers[questions[currentQuestionIdx].id] === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(questions[currentQuestionIdx].id, opt.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-sm font-semibold transition-all duration-150 ${
                    isSelected
                      ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                      : 'border-slate-100 hover:border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  <span>{opt.text}</span>
                  <div
                    className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              )
            })}
          </CardContent>

          <CardFooter className="p-6 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between border-t border-slate-50 dark:border-slate-800/40">
            <button
              disabled={currentQuestionIdx === 0}
              onClick={() => setCurrentQuestionIdx((p) => p - 1)}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 disabled:opacity-40 disabled:hover:text-slate-400 dark:hover:text-slate-200"
            >
              Anterior
            </button>

            {currentQuestionIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Siguiente
              </button>
            ) : (
              <button
                disabled={!isAllAnswered || isSubmitting}
                onClick={handleSubmitQuiz}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 px-5 py-2.5 text-xs font-bold text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Calificando...</span>
                  </>
                ) : (
                  <span>Enviar Examen</span>
                )}
              </button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Modal de Resultados (Gamificación y Nota) */}
      <AnimatePresence>
        {isModalOpen && result && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black backdrop-blur-sm"
            />
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center space-y-6">
                
                {/* Icono de Estado */}
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                  result.isPassed
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                }`}>
                  {result.isPassed ? <CheckCircle className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
                </div>

                {/* Título de Resultados */}
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {result.isPassed ? '¡Examen Aprobado!' : 'Examen No Aprobado'}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Respondiste correctamente {result.correctCount} de {result.totalQuestions} preguntas
                  </p>
                </div>

                {/* Nota Flotante estilo Apple */}
                <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex justify-between items-center max-w-xs mx-auto">
                  <span className="text-xs font-semibold text-slate-400">Calificación obtenida</span>
                  <span className={`text-2xl font-black ${
                    result.isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {result.score.toFixed(1)} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">/ 5.0</span>
                  </span>
                </div>

                {/* Logro Desbloqueado */}
                {result.unlockedAchievement && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 dark:border-amber-900/30 dark:bg-amber-950/20 text-left flex gap-3.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                      {result.unlockedAchievement.badgeIcon === 'rocket' ? (
                        <Rocket className="h-5.5 w-5.5" />
                      ) : (
                        <Sparkles className="h-5.5 w-5.5" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" />
                        ¡Logro Desbloqueado!
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {result.unlockedAchievement.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                        {result.unlockedAchievement.description}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Acciones */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsModalOpen(false)
                      router.push('/student/dashboard')
                    }}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] py-3 text-sm font-semibold text-white"
                  >
                    <span>Volver al Dashboard</span>
                    <ArrowRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
