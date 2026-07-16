'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, BookOpen, Video, FileText, CheckCircle2, ChevronRight, Menu, X, ArrowRight, Play, Download, Award, BrainCircuit, Eye, Clock, AlertCircle, CheckCircle, BarChart3, LineChart as LineChartIcon, Activity, Target, Timer, ClipboardList, UploadCloud, Loader2, MessageSquare, Pin, Lock, Unlock, CornerDownRight, CheckSquare, Undo2, Plus, Edit, Megaphone, Paperclip, AlertTriangle, Bell, Trophy, Calendar } from 'lucide-react'
import Link from 'next/link'
import { PdfViewer } from '@/modules/resources/presentation/components/PdfViewer'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { createClient } from '@/core/config/supabase/client'
import { toast } from 'sonner'
import { MiniForumEditor } from '@/core/components/MiniForumEditor'
import { getAnnouncementsByCourse, markAnnouncementAsRead } from '../../application/announcementActions'

type LessonStatus = 'completed' | 'pending' | 'submitted' | 'graded' | 'late'

interface Lesson {
  id: string
  title: string
  type: 'video' | 'reading' | 'file' | 'quiz' | 'task' | 'forum'
  duration?: string
  videoUrl?: string
  driveUrl?: string
  status?: LessonStatus
  content?: string
  submissionType?: 'file' | 'text'
  submissionText?: string
  quizAttempt?: any
  quiz?: any
  grade?: {
    score: number
    maxGrade: number
    feedback: string
  } | null
  sort_order?: number
}

interface Module {
  id: string
  title: string
  lessons: Lesson[]
}

interface CourseDetails {
  id: string
  title: string
  subject: string
  progress: number
  modules: Module[]
}

// Helper to extract embed URL for YouTube and Vimeo
function getEmbedUrl(url: string): string {
  if (!url) return ''
  
  // YouTube regex
  const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const ytMatch = url.match(ytRegex)
  if (ytMatch && ytMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${ytMatch[2]}`
  }

  // Vimeo regex
  const vimeoRegex = /(?:vimeo)\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/
  const vimeoMatch = url.match(vimeoRegex)
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`
  }

  // Check if it's already an embed link
  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com/video/')) {
    return url
  }

  return url
}

function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}

function isContentEmpty(content: string): boolean {
  if (!content) return true
  const trimmed = content.trim()
  return trimmed === '' || trimmed === '<p><br></p>' || trimmed === '<p></p>'
}

export function CourseDetailScreen({ courseId }: { courseId: string }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'announcements' | 'content' | 'grades' | 'reports'>('announcements')
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)

  const [courseData, setCourseData] = useState<CourseDetails | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [taskResponse, setTaskResponse] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grades, setGrades] = useState<any[]>([])
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [timeData, setTimeData] = useState<any[]>([])
  const [stats, setStats] = useState({
    progress: 0,
    averageGrade: 0,
    timeSpent: '0h',
    lessonsCompleted: 0,
    totalLessons: 0
  })
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<any[]>([])
  const [loadingQuizDetails, setLoadingQuizDetails] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('student')

  // States for Forums
  const [forumConfig, setForumConfig] = useState<any>(null)
  const [forumThreads, setForumThreads] = useState<any[]>([])
  const [activeThread, setActiveThread] = useState<any | null>(null)
  const [threadReplies, setThreadReplies] = useState<any[]>([])
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [newReplyContent, setNewReplyContent] = useState('')
  const [isCreatingThread, setIsCreatingThread] = useState(false)
  const [forumLoading, setForumLoading] = useState(false)

  // States for Editing Threads and Replies
  const [isEditingActiveThread, setIsEditingActiveThread] = useState(false)
  const [editThreadTitle, setEditThreadTitle] = useState('')
  const [editThreadContent, setEditThreadContent] = useState('')
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editReplyContent, setEditReplyContent] = useState('')

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (courseData?.modules) {
      setExpandedModules(prev => {
        const next = { ...prev }
        courseData.modules.forEach(mod => {
          if (next[mod.id] === undefined) {
            next[mod.id] = true
          }
        })
        return next
      })
    }
  }, [courseData])

  useEffect(() => {
    if (activeLesson?.type !== 'forum') {
      setForumConfig(null)
      setForumThreads([])
      setActiveThread(null)
      setThreadReplies([])
      setIsCreatingThread(false)
      return
    }

    const loadForumData = async () => {
      setForumLoading(true)
      try {
        const { getForumByLessonId, getForumThreads } = await import('../../application/forumActions')
        const config = await getForumByLessonId(activeLesson.id)
        if (config) {
          setForumConfig(config)
          const threads = await getForumThreads(config.id)
          setForumThreads(threads)
        } else {
          const mockConfig = {
            id: `f_${activeLesson.id}`,
            lessonId: activeLesson.id,
            title: activeLesson.title,
            description: activeLesson.content || 'Foro de debate sobre la lección.',
            forumType: 'debate' as const,
            isGraded: false,
            createdAt: new Date().toISOString()
          }
          setForumConfig(mockConfig)
        }
      } catch (err) {
        console.error('Error loading forum data:', err)
      } finally {
        setForumLoading(false)
      }
    }

    loadForumData()
  }, [activeLesson?.id])

  useEffect(() => {
    if (!activeThread) {
      setThreadReplies([])
      return
    }

    const loadReplies = async () => {
      try {
        const { getThreadReplies } = await import('../../application/forumActions')
        const replies = await getThreadReplies(activeThread.id)
        setThreadReplies(replies)
      } catch (err) {
        console.error('Error loading replies:', err)
      }
    }

    loadReplies()
  }, [activeThread?.id])

  // Actualizar el estado de leído para el tema activo
  useEffect(() => {
    if (activeThread && userId) {
      localStorage.setItem(`forum_thread_read_${userId}_${activeThread.id}`, activeThread.repliesCount.toString())
    }
  }, [activeThread?.id, activeThread?.repliesCount, userId])

  const getUnreadStatus = (threadId: string, currentRepliesCount: number) => {
    if (typeof window === 'undefined' || !userId) return false
    const lastReadCountStr = localStorage.getItem(`forum_thread_read_${userId}_${threadId}`)
    if (lastReadCountStr === null) {
      return currentRepliesCount > 0
    }
    const lastReadCount = parseInt(lastReadCountStr, 10)
    return currentRepliesCount > lastReadCount
  }

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThreadTitle.trim() || isContentEmpty(newThreadContent) || !forumConfig) {
      toast.error('El título y contenido del hilo son requeridos')
      return
    }

    try {
      const { createForumThread } = await import('../../application/forumActions')
      const authorIdToUse = userId || 'stu1'
      const result = await createForumThread({
        forumId: forumConfig.id,
        authorId: authorIdToUse,
        title: newThreadTitle.trim(),
        content: newThreadContent.trim()
      })

      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        setForumThreads(prev => [result.data, ...prev])
        setNewThreadTitle('')
        setNewThreadContent('')
        setIsCreatingThread(false)
        toast.success('Hilo de discusión creado exitosamente')

        // Automatic progress complete for student!
        if (userRole === 'student' && activeLesson && activeLesson.status !== 'completed' && activeLesson.status !== 'graded') {
          await handleMarkAsCompleted(activeLesson.id)
        }
      }
    } catch (err) {
      console.error('Error creating thread:', err)
      toast.error('Error al crear el hilo de discusión')
    }
  }

  const handleCreateReply = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault()
    if (isContentEmpty(newReplyContent) || !activeThread) {
      toast.error('El contenido de la respuesta es requerido')
      return
    }

    try {
      const { createForumReply } = await import('../../application/forumActions')
      const authorIdToUse = userId || 'stu1'
      const result = await createForumReply({
        threadId: activeThread.id,
        parentId,
        authorId: authorIdToUse,
        content: newReplyContent.trim()
      })

      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        setThreadReplies(prev => [...prev, result.data])
        setNewReplyContent('')
        toast.success('Respuesta agregada exitosamente')
        
        // Update reply count in local list
        setForumThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, repliesCount: t.repliesCount + 1 } : t))
        if (userId && activeThread) {
          localStorage.setItem(`forum_thread_read_${userId}_${activeThread.id}`, (activeThread.repliesCount + 1).toString())
        }

        // Automatic progress complete for student!
        if (userRole === 'student' && activeLesson && activeLesson.status !== 'completed' && activeLesson.status !== 'graded') {
          await handleMarkAsCompleted(activeLesson.id)
        }
      }
    } catch (err) {
      console.error('Error creating reply:', err)
      toast.error('Error al agregar respuesta')
    }
  }

  const canEditStudent = (createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt).getTime()
    return elapsed < 10 * 60 * 1000
  }

  const handleStartEditThread = (thread: any) => {
    setEditThreadTitle(thread.title)
    setEditThreadContent(thread.content)
    setIsEditingActiveThread(true)
  }

  const handleSaveEditThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editThreadTitle.trim() || isContentEmpty(editThreadContent) || !activeThread) {
      toast.error('El título y contenido del hilo son requeridos')
      return
    }

    try {
      const { updateForumThread } = await import('../../application/forumActions')
      const result = await updateForumThread(activeThread.id, editThreadTitle.trim(), editThreadContent.trim())

      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        setActiveThread((prev: any) => prev ? { ...prev, title: result.data!.title, content: result.data!.content } : null)
        setForumThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, title: result.data!.title, content: result.data!.content } : t))
        setIsEditingActiveThread(false)
        toast.success('Tema actualizado exitosamente')
      }
    } catch (err) {
      console.error('Error updating thread:', err)
      toast.error('Error al actualizar el tema')
    }
  }

  const handleStartEditReply = (reply: any) => {
    setEditingReplyId(reply.id)
    setEditReplyContent(reply.content)
  }

  const handleSaveEditReply = async (e: React.FormEvent, replyId: string) => {
    e.preventDefault()
    if (isContentEmpty(editReplyContent)) {
      toast.error('El contenido de la respuesta es requerido')
      return
    }

    try {
      const { updateForumReply } = await import('../../application/forumActions')
      const result = await updateForumReply(replyId, editReplyContent.trim())

      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        setThreadReplies(prev => prev.map(r => r.id === replyId ? { ...r, content: result.data!.content } : r))
        setEditingReplyId(null)
        toast.success('Respuesta actualizada exitosamente')
      }
    } catch (err) {
      console.error('Error updating reply:', err)
      toast.error('Error al actualizar la respuesta')
    }
  }

  const handleTogglePin = async (thread: any) => {
    try {
      const { togglePinThread } = await import('../../application/forumActions')
      const success = await togglePinThread(thread.id, !thread.isPinned)
      if (success) {
        setForumThreads(prev => prev.map(t => t.id === thread.id ? { ...t, isPinned: !t.isPinned } : t))
        if (activeThread?.id === thread.id) {
          setActiveThread((prev: any) => prev ? { ...prev, isPinned: !prev.isPinned } : null)
        }
        toast.success(thread.isPinned ? 'Hilo de discusión desfijado' : 'Hilo de discusión fijado exitosamente')
      }
    } catch (err) {
      console.error('Error toggling pin:', err)
    }
  }

  const handleToggleLock = async (thread: any) => {
    try {
      const { toggleLockThread } = await import('../../application/forumActions')
      const success = await toggleLockThread(thread.id, !thread.isLocked)
      if (success) {
        setForumThreads(prev => prev.map(t => t.id === thread.id ? { ...t, isLocked: !t.isLocked } : t))
        if (activeThread?.id === thread.id) {
          setActiveThread((prev: any) => prev ? { ...prev, isLocked: !prev.isLocked } : null)
        }
        toast.success(thread.isLocked ? 'Hilo desbloqueado' : 'Hilo bloqueado exitosamente')
      }
    } catch (err) {
      console.error('Error toggling lock:', err)
    }
  }

  const handleVerifyReply = async (replyId: string, verified: boolean) => {
    try {
      const { verifyForumReply } = await import('../../application/forumActions')
      const success = await verifyForumReply(replyId, verified, verified)
      if (success) {
        setThreadReplies(prev => prev.map(r => r.id === replyId ? { ...r, isTeacherVerified: verified, isHelpful: verified } : r))
        toast.success(verified ? 'Respuesta verificada por el docente' : 'Verificación removida')
      }
    } catch (err) {
      console.error('Error verifying reply:', err)
    }
  }

  // Helper functions

  const handleLessonClick = (lesson: Lesson) => {
    setActiveLesson(lesson)
    setTaskResponse(lesson.submissionText || '')
    setIsMobileNavOpen(false)

    // Auto-mark file resources as completed when student opens them
    if (lesson.type === 'file' && userRole === 'student' && lesson.status !== 'completed' && lesson.status !== 'graded') {
      handleMarkAsCompleted(lesson.id)
    }
  }

  const getIcon = (type: Lesson['type']) => {
    switch (type) {
      case 'video':
        return <Video className="h-4.5 w-4.5" />
      case 'reading':
        return <BookOpen className="h-4.5 w-4.5" />
      case 'file':
        return <FileText className="h-4.5 w-4.5" />
      case 'quiz':
        return <ClipboardList className="h-4.5 w-4.5" />
      case 'task':
        return <UploadCloud className="h-4.5 w-4.5" />
      case 'forum':
        return <BookOpen className="h-4.5 w-4.5 text-pink-500" />
      default:
        return <BookOpen className="h-4.5 w-4.5" />
    }
  }

  const getStatusColor = (status?: LessonStatus) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-600 dark:text-emerald-400'
      case 'submitted':
        return 'text-blue-600 dark:text-blue-400'
      case 'graded':
        return 'text-purple-600 dark:text-purple-400'
      case 'late':
        return 'text-red-600 dark:text-red-400'
      case 'pending':
      default:
        return 'text-slate-400 dark:text-slate-500'
    }
  }

  const renderStatusIcon = (status?: LessonStatus, className = "h-3.5 w-3.5") => {
    switch (status) {
      case 'completed':
        return <CheckCircle className={className} />
      case 'submitted':
        return <Clock className={className} />
      case 'graded':
        return <Award className={className} />
      case 'late':
        return <AlertCircle className={className} />
      case 'pending':
      default:
        return <div className={`rounded-full border border-current ${className}`} style={{ borderWidth: '1.5px' }} />
    }
  }

  const getStatusText = (status?: LessonStatus, type?: Lesson['type']) => {
    switch (status) {
      case 'completed':
        return 'Completado'
      case 'submitted':
        return 'Entregado'
      case 'graded':
        return 'Calificado'
      case 'late':
        return 'Retrasado'
      case 'pending':
      default:
        if (type === 'quiz') return 'Pendiente'
        if (type === 'task') return 'Por entregar'
        return 'Pendiente'
    }
  }

  const getPerformanceLevel = (score: number) => {
    if (score >= 4.6) return 'Superior'
    if (score >= 4.0) return 'Alto'
    if (score >= 3.0) return 'Básico'
    return 'Bajo'
  }

  // Helper to determine type of lesson
  const getLessonType = (l: any, isQuiz: boolean): Lesson['type'] => {
    if (isQuiz) return 'quiz'
    if (l.type) return l.type as Lesson['type']
    if (l.video_url) return 'video'
    const titleLower = (l.title || '').toLowerCase()
    if (titleLower.includes('tarea') || titleLower.includes('taller') || titleLower.includes('proyecto') || titleLower.includes('ensayo') || titleLower.includes('entrega')) {
      return 'task'
    }
    return 'reading'
  }

  const loadCourseData = async () => {
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode) {
      setUserId('stu-demo-id')
      setUserRole('student')

      const mockGradesList = [
        { lesson_id: 'l3', grade: 4.2, max_grade: 5.0, feedback: 'Excelente trabajo aplicando las leyes de Newton.' },
        { lesson_id: 'l-forum-1', grade: 4.5, max_grade: 5.0, feedback: 'Muy buenas intervenciones en el foro de debate.' }
      ]

      const mappedMockModules = mockCourseDetails.modules.map(m => ({
        ...m,
        lessons: m.lessons.map(l => {
          const gradeEntry = mockGradesList.find(lg => lg.lesson_id === l.id)
          let status = l.status
          if (gradeEntry) {
            status = 'graded'
          }
          return {
            ...l,
            status,
            grade: gradeEntry ? {
              score: gradeEntry.grade,
              maxGrade: gradeEntry.max_grade,
              feedback: gradeEntry.feedback
            } : null
          }
        })
      }))

      const updatedMockCourseDetails = {
        ...mockCourseDetails,
        modules: mappedMockModules
      }

      setCourseData(updatedMockCourseDetails)
      
      // Keep the active lesson synced with the mapped one
      const defaultActive = mappedMockModules[1].lessons[0]
      setActiveLesson(defaultActive)

      setGrades([
        { id: 'l3', activityName: 'Taller de Aplicación de Dinámica', moduleName: 'Módulo 2', score: 4.2, feedback: 'Excelente trabajo aplicando las leyes de Newton.', gradeType: 'task' },
        { id: 'l4', activityName: 'Evaluación del Módulo: Leyes de Newton', moduleName: 'Módulo 2', score: 4.8, feedback: 'Examen aprobado.', gradeType: 'quiz' },
        { id: 'l-forum-1', activityName: 'Foro: Impacto de la Gravedad en el Espacio', moduleName: 'Módulo 1', score: 4.5, feedback: 'Muy buenas intervenciones en el foro de debate.', gradeType: 'workshop' }
      ])
      setPerformanceData(mockPerformanceData)
      setTimeData(mockTimeData)
      setStats({
        progress: mockCourseDetails.progress,
        averageGrade: 4.5,
        timeSpent: '40h',
        lessonsCompleted: 5,
        totalLessons: 7
      })
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuario no autenticado')
        setLoading(false)
        return
      }
      setUserId(user.id)
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, roles(name)')
        .eq('id', user.id)
        .maybeSingle()
      if (profile && profile.roles) {
        setUserRole(profile.roles.name)
      }

      // 1. Fetch course details
      const { data: course, error: courseErr } = await supabase
        .from('courses')
        .select('id, title, subject')
        .eq('id', courseId)
        .single()

      if (courseErr || !course) {
        setError('Curso no encontrado')
        setLoading(false)
        return
      }

      // 2. Fetch modules
      const { data: modules, error: modulesErr } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true })

      if (modulesErr || !modules) {
        setError('Error al cargar módulos del curso')
        setLoading(false)
        return
      }

      const moduleIds = modules.map(m => m.id)
      
      // 3. Fetch lessons and resources for these modules
      let lessons: any[] = []
      if (moduleIds.length > 0) {
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds)
          .order('sort_order', { ascending: true })
        lessons = lessonsData || []
      }

      let resources: any[] = []
      if (moduleIds.length > 0) {
        const { data: resourcesData } = await supabase
          .from('resources')
          .select('*')
          .in('module_id', moduleIds)
        resources = resourcesData || []
      }

      // 4. Fetch quizzes for all lessons
      const lessonIds = lessons.map(l => l.id)
      let quizzes: any[] = []
      if (lessonIds.length > 0) {
        const { data: quizzesData } = await supabase
          .from('quizzes')
          .select('*')
          .in('lesson_id', lessonIds)
        quizzes = quizzesData || []
      }

      // 5. Fetch student progress
      let progress: any[] = []
      if (lessonIds.length > 0) {
        const { data: progressData, error: progressErr } = await supabase
          .from('student_progress')
          .select('lesson_id, completed, submission_text')
          .eq('student_id', user.id)
          .in('lesson_id', lessonIds)
        
        if (progressErr) {
          console.warn('Could not select submission_text, falling back:', progressErr.message)
          const { data: progressDataFallback } = await supabase
            .from('student_progress')
            .select('lesson_id, completed')
            .eq('student_id', user.id)
            .in('lesson_id', lessonIds)
          progress = progressDataFallback || []
        } else {
          progress = progressData || []
        }
      }
      const completedLessonIds = new Set(progress.filter(p => p.completed).map(p => p.lesson_id))

      // 5b. Fetch student resource progress
      let resourceProgress: any[] = []
      const resourceIds = resources.map(r => r.id)
      if (resourceIds.length > 0) {
        try {
          const { data: rpData } = await supabase
            .from('student_resource_progress')
            .select('resource_id, completed')
            .eq('student_id', user.id)
            .in('resource_id', resourceIds)
          resourceProgress = rpData || []
        } catch (e) {
          console.warn('Could not select student_resource_progress:', e)
        }
      }
      const completedResourceIds = new Set(resourceProgress.filter(p => p.completed).map(p => p.resource_id))



      // 6. Fetch lesson grades (teacher-graded tasks/workshops) and quiz attempts
      let lessonGrades: any[] = []
      if (lessonIds.length > 0) {
        const { data: lgData } = await supabase
          .from('student_lesson_grades')
          .select('lesson_id, grade, max_grade, grade_type, feedback, graded_at')
          .eq('student_id', user.id)
          .eq('course_id', courseId)
        lessonGrades = lgData || []
      }

      // 7. Fetch quiz attempts for this student
      const quizIds = quizzes.map(q => q.id)
      let attempts: any[] = []
      if (quizIds.length > 0) {
        const { data: attemptsData } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('student_id', user.id)
          .in('quiz_id', quizIds)
        attempts = attemptsData || []
      }

      // 7b. Fetch student forum interactions to auto-complete forums they participated in
      let courseForums: any[] = []
      const studentThreadForumIds = new Set<string>()
      const studentReplyForumIds = new Set<string>()
      
      if (lessonIds.length > 0) {
        const { data: forumsData } = await supabase
          .from('forums')
          .select('id, lesson_id, is_graded')
          .in('lesson_id', lessonIds)
        courseForums = forumsData || []
        
        const forumIds = courseForums.map(f => f.id)
        if (forumIds.length > 0) {
          // Get threads created by this student
          const { data: studentThreads } = await supabase
            .from('forum_threads')
            .select('forum_id')
            .eq('author_id', user.id)
            .in('forum_id', forumIds)
          
          if (studentThreads) {
            studentThreads.forEach(t => studentThreadForumIds.add(t.forum_id))
          }

          // Get all thread IDs in these forums to check for replies
          const { data: allThreads } = await supabase
            .from('forum_threads')
            .select('id, forum_id')
            .in('forum_id', forumIds)
          
          const threadIds = allThreads?.map(t => t.id) || []
          if (threadIds.length > 0) {
            const { data: studentReplies } = await supabase
              .from('forum_replies')
              .select('thread_id')
              .eq('author_id', user.id)
              .in('thread_id', threadIds)
            
            if (studentReplies) {
              studentReplies.forEach(r => {
                const thread = allThreads?.find(t => t.id === r.thread_id)
                if (thread) {
                  studentReplyForumIds.add(thread.forum_id)
                }
              })
            }
          }
        }
      }

      // 8. Reconstruct CourseDetails structure
      const mappedModules = modules.map(m => {
        // Lessons in this module
        const modLessons = lessons
          .filter(l => l.module_id === m.id)
          .map(l => {
            const quiz = quizzes.find(q => q.lesson_id === l.id)
            const isQuiz = !!quiz
            const isCompleted = completedLessonIds.has(l.id)
            
            const forumObj = courseForums.find(f => f.lesson_id === l.id)
            const hasForumInteraction = forumObj && (studentThreadForumIds.has(forumObj.id) || studentReplyForumIds.has(forumObj.id))

            // Map status
            const gradeEntry = lessonGrades.find(lg => lg.lesson_id === l.id)
            let status: LessonStatus = 'pending'
            if (isCompleted || hasForumInteraction) {
              status = 'completed'
            }
            if (gradeEntry) {
              status = 'graded'
            }
            let quizAttempt = null
            if (isQuiz) {
              const quizAttempts = attempts
                .filter(a => a.quiz_id === quiz.id)
                .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
              quizAttempt = quizAttempts[0] || null
              if (quizAttempt) {
                status = quizAttempt.is_passed || quizAttempt.score >= 3.0 ? 'graded' : 'pending'
              }
            }

            // Determine lesson type
            const type = getLessonType(l, isQuiz)

            const progEntry = progress.find(p => p.lesson_id === l.id)
            let submissionText = progEntry?.submission_text || ''

            // LocalStorage Fallback for student text submissions
            if (!submissionText && typeof window !== 'undefined' && user) {
              const localText = localStorage.getItem(`submission_text_${user.id}_${l.id}`)
              if (localText) {
                submissionText = localText
              }
            }

            return {
              id: l.id,
              title: l.title,
              type,
              duration: l.video_url ? '10 min' : 'Lectura',
              videoUrl: l.video_url || undefined,
              status,
              content: l.content || '',
              submissionText,
              quizAttempt,
              quiz: quiz || null,
              grade: gradeEntry ? {
                score: Number(gradeEntry.grade),
                maxGrade: Number(gradeEntry.max_grade || 5.0),
                feedback: gradeEntry.feedback || ''
              } : null,
              sort_order: l.sort_order || 0
            }
          })

        // Resources (PDFs/Links) in this module
        const modResources = resources
          .filter(r => r.module_id === m.id)
          .map(r => {
            // Map resource as a file lesson
            let resourceType: 'pdf' | 'link' | 'text' = 'pdf'
            const mime = r.mime_type?.toLowerCase() || ''
            if (mime.includes('pdf')) {
              resourceType = 'pdf'
            } else if (mime === 'url' || r.drive_url) {
              resourceType = 'link'
            } else {
              resourceType = 'text'
            }

            return {
              id: r.id,
              title: r.title,
              type: 'file' as const,
              duration: r.file_size ? `${(r.file_size / 1024 / 1024).toFixed(1)} MB` : 'Enlace Web',
              videoUrl: r.drive_url || undefined,
              driveUrl: r.drive_url || undefined,
              status: completedResourceIds.has(r.id) ? 'completed' as const : 'pending' as const,
              content: r.description || 'Archivo adjunto del módulo.',
              sort_order: r.sort_order || 0
            }
          })

        const combined = [...modLessons, ...modResources].sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
        )

        return {
          id: m.id,
          title: m.title,
          lessons: combined,
        }
      })

      // Compute total progress (lessons AND file resources)
      const totalItems = mappedModules.reduce((acc, m) => acc + m.lessons.length, 0)
      const completedItems = mappedModules.reduce((acc, m) => {
        return acc + m.lessons.filter(l => l.status === 'completed' || l.status === 'graded').length
      }, 0)
      const progressPercentage = totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0

      const resolvedCourseDetails: CourseDetails = {
        id: course.id,
        title: course.title,
        subject: course.subject,
        progress: progressPercentage,
        modules: mappedModules,
      }

      setCourseData(resolvedCourseDetails)

      // Find the updated version of the currently active lesson
      let updatedActiveLesson: Lesson | null = null
      
      // Try to load lessonId from URL first
      let urlLessonId = null
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        urlLessonId = params.get('lessonId')
      }

      if (urlLessonId) {
        for (const m of mappedModules) {
          const found = m.lessons.find(l => l.id === urlLessonId)
          if (found) {
            updatedActiveLesson = found
            break
          }
        }
      }

      if (!updatedActiveLesson && activeLesson) {
        for (const m of mappedModules) {
          const found = m.lessons.find(l => l.id === activeLesson.id)
          if (found) {
            updatedActiveLesson = found
            break
          }
        }
      }

      // Fallback to first lesson if activeLesson is not set or not found
      if (!updatedActiveLesson) {
        for (const m of mappedModules) {
          if (m.lessons.length > 0) {
            updatedActiveLesson = m.lessons[0]
            break
          }
        }
      }

      setActiveLesson(updatedActiveLesson)
      setTaskResponse(updatedActiveLesson?.submissionText || '')

      // Build grade entries from lesson grades + quiz attempts
      const gradedLessonMap = new Map<string, { grade: number; maxGrade: number; feedback: string | null }>()
      lessonGrades.forEach((g: any) => {
        gradedLessonMap.set(g.lesson_id, {
          grade: Number(g.grade),
          maxGrade: Number(g.max_grade ?? 5),
          feedback: g.feedback || null
        })
      })

      const mappedGrades: { id: string; activityName: string; moduleName: string; score: number | null; feedback: string | null; gradeType: string }[] = []

      // Add quiz attempt scores
      quizzes.forEach((q: any) => {
        const lessonForQuiz = lessons.find((l: any) => l.id === q.lesson_id)
        const moduleForLesson = modules.find((m: any) => m.id === lessonForQuiz?.module_id)
        const att = attempts
          .filter((a: any) => a.quiz_id === q.id)
          .sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
        if (att) {
          mappedGrades.push({
            id: q.id,
            activityName: q.title || lessonForQuiz?.title || 'Quiz',
            moduleName: moduleForLesson?.title || 'Quiz',
            score: Number(att.score ?? 0),
            feedback: att.score >= 3.0 ? 'Aprobado' : 'No aprobado',
            gradeType: 'quiz'
          })
        }
      })

      // Add teacher-graded lesson scores
      lessonGrades.forEach((g: any) => {
        const lessonForGrade = lessons.find((l: any) => l.id === g.lesson_id)
        const moduleForLesson = modules.find((m: any) => m.id === lessonForGrade?.module_id)
        if (lessonForGrade) {
          // If it is a forum, check if it's graded/evaluative
          if (g.grade_type === 'forum') {
            const forumObj = courseForums.find(f => f.lesson_id === g.lesson_id)
            if (forumObj && !forumObj.is_graded) {
              return // skip
            }
          }

          mappedGrades.push({
            id: g.lesson_id,
            activityName: lessonForGrade.title || 'Lección evaluada',
            moduleName: moduleForLesson?.title || 'Módulo',
            score: Number(g.grade),
            feedback: g.feedback || 'Calificación asignada por el docente.',
            gradeType: g.grade_type || 'task'
          })
        }
      })

      setGrades(mappedGrades)

      // Calculate average grade
      const gradedScores = mappedGrades.filter(g => g.score !== null) as { score: number }[]
      const avg = gradedScores.length > 0
        ? Number((gradedScores.reduce((acc, curr) => acc + curr.score, 0) / gradedScores.length).toFixed(2))
        : 0.0

      // Set stats
      setStats({
        progress: progressPercentage,
        averageGrade: avg,
        timeSpent: `${completedItems * 2 + 1}h`,
        lessonsCompleted: completedItems,
        totalLessons: totalItems
      })

      // Set performance chart data
      const performanceChart = mappedGrades.map((g, idx) => ({
        name: g.activityName?.length > 14 ? g.activityName.substring(0, 14) + '…' : (g.activityName || `Nota ${idx + 1}`),
        nota: g.score
      }))
      setPerformanceData(performanceChart.length > 0 ? performanceChart : [
        { name: 'Inicio', nota: 0.0 }
      ])

      // Set study hours per module data
      const hoursChart = mappedModules.map((m) => {
        const completedCount = m.lessons.filter(l => l.status === 'completed' || l.status === 'graded').length
        return {
          name: m.title.length > 10 ? `${m.title.substring(0, 10)}...` : m.title,
          horas: completedCount * 2 + 1
        }
      })
      setTimeData(hoursChart)

    } catch (err: any) {
      console.error('Error al cargar datos del curso:', err)
      setError(err.message || 'Error desconocido al cargar el curso')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!courseId) return
      setAnnouncementsLoading(true)
      try {
        const uId = userId || 'stu-demo-id'
        const uRole = userRole || 'student'
        const data = await getAnnouncementsByCourse(courseId, uId, uRole)
        setAnnouncements(data)
        
        // Auto mark as read if the tab is active
        if (activeTab === 'announcements' && data.length > 0 && userId) {
          for (const a of data) {
            if (!a.isReadByMe) {
              await markAnnouncementAsRead(a.id, userId)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching announcements:', err)
      } finally {
        setAnnouncementsLoading(false)
      }
    }
    fetchAnnouncements()
  }, [courseId, userId, userRole, activeTab])

  useEffect(() => {
    if (activeLesson?.type === 'quiz' && activeLesson.quizAttempt && activeLesson.quiz?.id) {
      const fetchQuizQuestions = async () => {
        setLoadingQuizDetails(true)
        try {
          const supabase = createClient()
          
          // 1. Fetch questions for the quiz
          const { data: questionsData, error: qstErr } = await supabase
            .from('quiz_questions')
            .select('id, question_text, question_type')
            .eq('quiz_id', activeLesson.quiz.id)
            .order('sort_order', { ascending: true })
          
          if (qstErr) throw qstErr
          
          // 2. Fetch options for these questions
          const questionIds = (questionsData || []).map(q => q.id)
          let allOptions: any[] = []
          if (questionIds.length > 0) {
            const { data: optionsData, error: optErr } = await supabase
              .from('quiz_options')
              .select('id, question_id, option_text, is_correct')
              .in('question_id', questionIds)
            if (optErr) throw optErr
            allOptions = optionsData || []
          }

          // Combine questions and options
          const combined = (questionsData || []).map(q => {
            const opts = allOptions.filter(o => o.question_id === q.id)
            return {
              ...q,
              options: opts.map(o => ({
                id: o.id,
                text: o.option_text,
                isCorrect: o.is_correct
              }))
            }
          })
          
          setActiveQuizQuestions(combined)
        } catch (err) {
          console.error('Error fetching quiz review questions:', err)
          toast.error('No se pudieron cargar los detalles de la evaluación para revisión.')
        } finally {
          setLoadingQuizDetails(false)
        }
      }
      
      fetchQuizQuestions()
    } else {
      setActiveQuizQuestions([])
    }
  }, [activeLesson?.id])

  const handleMarkAsCompleted = async (lessonId: string, submissionText?: string) => {
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    // Check if this is a resource (PDF)
    const isResource = activeLesson?.type === 'file' && activeLesson?.id === lessonId

    if (isResource && !isDemoMode) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { error } = await supabase
            .from('student_resource_progress')
            .upsert({
              student_id: user.id,
              resource_id: lessonId,
              completed: true,
              completed_at: new Date().toISOString()
            }, { onConflict: 'student_id,resource_id' })
          if (error) throw error
        }
      } catch (e) {
        console.error('Error saving resource completion to Supabase:', e)
      }
    }

    if (isDemoMode || isResource) {
      toast.success('Lección completada' + (isDemoMode ? ' (Modo Demo)' : ''))
      setCourseData(prev => {
        if (!prev) return prev
        const updatedModules = prev.modules.map(m => ({
          ...m,
          lessons: m.lessons.map(l => l.id === lessonId ? { ...l, status: 'completed' as const, submissionText } : l)
        }))
        const totalItems = updatedModules.reduce((acc, m) => acc + m.lessons.length, 0)
        const completedItems = updatedModules.reduce((acc, m) => {
          return acc + m.lessons.filter(l => l.status === 'completed' || l.status === 'graded').length
        }, 0)
        const progressPercentage = totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0

        return { ...prev, modules: updatedModules, progress: progressPercentage }
      })
      if (activeLesson && activeLesson.id === lessonId) {
        setActiveLesson(prev => prev ? { ...prev, status: 'completed' as const, submissionText } : null)
      }
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Try updating with submission_text. If it fails (e.g. column doesn't exist), fall back to standard update
      const { error } = await supabase
        .from('student_progress')
        .upsert({
          student_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
          submission_text: submissionText || null
        }, { onConflict: 'student_id,lesson_id' })

      if (error) {
        console.warn('Upsert with submission_text failed, trying fallback:', error.message)
        const { error: fallbackErr } = await supabase
          .from('student_progress')
          .upsert({
            student_id: user.id,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString()
          }, { onConflict: 'student_id,lesson_id' })
        if (fallbackErr) throw fallbackErr
      }

      // Save to localStorage as fallback
      if (submissionText && typeof window !== 'undefined') {
        localStorage.setItem(`submission_text_${user.id}_${lessonId}`, submissionText)
      }

      toast.success('¡Lección completada!')
      
      // Update local state status
      setCourseData(prev => {
        if (!prev) return prev
        const updatedModules = prev.modules.map(m => ({
          ...m,
          lessons: m.lessons.map(l => l.id === lessonId ? { ...l, status: 'completed' as const, submissionText } : l)
        }))
        const totalItems = updatedModules.reduce((acc, m) => acc + m.lessons.length, 0)
        const completedItems = updatedModules.reduce((acc, m) => {
          return acc + m.lessons.filter(l => l.status === 'completed' || l.status === 'graded').length
        }, 0)
        const progressPercentage = totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0

        return { ...prev, modules: updatedModules, progress: progressPercentage }
      })

      if (activeLesson && activeLesson.id === lessonId) {
        setActiveLesson(prev => prev ? { ...prev, status: 'completed' as const, submissionText } : null)
      }

      // Reload all course data for statistics refresh
      loadCourseData()
    } catch (e) {
      console.error(e)
      toast.error('No se pudo marcar la lección como completada')
    }
  }



  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f9fafb] dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Cargando detalles del curso...</p>
        </div>
      </div>
    )
  }

  if (error || !courseData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#f9fafb] dark:bg-slate-950 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Error al cargar el curso</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">{error || 'El curso no existe o no tienes acceso a él.'}</p>
        <Link href="/student/dashboard" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          Volver al Panel
        </Link>
      </div>
    )
  }

  const sidebarContent = (
    <div className="flex h-full flex-col p-5 bg-white dark:bg-slate-900">
      {/* Progreso del Curso */}
      <div className="pb-5 border-b border-slate-100 dark:border-slate-800 text-left space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-400 dark:text-slate-505">Progreso del curso</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">{courseData.progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            style={{ width: `${courseData.progress}%` }}
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
          />
        </div>
      </div>

      {/* Módulos */}
      <div className="flex-1 overflow-y-auto py-5 space-y-6">
        {courseData.modules.map((mod) => {
          const isExpanded = !!expandedModules[mod.id]
          return (
            <div key={mod.id} className="space-y-2.5 text-left">
              <button
                onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                className="flex w-full items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-650 dark:hover:text-slate-350 transition-colors py-1 cursor-pointer bg-transparent border-none outline-none"
              >
                <span>{mod.title}</span>
                <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 shrink-0 ml-2 ${isExpanded ? 'rotate-90' : 'rotate-0'}`} />
              </button>
              {isExpanded && (
                <div className="space-y-1">
                  {mod.lessons.map((lesson) => {
                    const isActive = activeLesson ? lesson.id === activeLesson.id : false
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonClick(lesson)}
                        className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                            : 'text-slate-600 hover:bg-slate-55 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">{getIcon(lesson.type)}</span>
                        <div className="flex-1 min-w-0 text-left space-y-1">
                          <p className="truncate">{lesson.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">{lesson.duration}</span>
                            <div className={`flex items-center gap-1 text-[10px] font-bold ${getStatusColor(lesson.status)}`}>
                              {renderStatusIcon(lesson.status, "h-3 w-3 shrink-0")}
                              <span>{getStatusText(lesson.status, lesson.type)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f9fafb] dark:bg-slate-950 text-left flex flex-col">
      {/* Barra superior de navegación interna */}
      <div className="sticky top-16 z-20 flex flex-col bg-white/80 backdrop-blur-md dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800/60 shadow-sm">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/student/dashboard"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 text-slate-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="text-left">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {courseData.subject}
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {courseData.title}
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 md:hidden"
          >
            <Menu className="h-4 w-4" />
            <span>Menú</span>
          </button>
        </div>

        {/* Tab Navigation Banner */}
        <div className="px-6 flex gap-6 overflow-x-auto hide-scrollbar border-t border-slate-100 dark:border-slate-800/60 pt-1">
          <button 
            onClick={() => setActiveTab('announcements')}
            className={`pb-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'announcements' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <div className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Novedades</div>
          </button>
          <button 
            onClick={() => setActiveTab('content')}
            className={`pb-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'content' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Contenido</div>
          </button>
          <button 
            onClick={() => setActiveTab('grades')}
            className={`pb-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'grades' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <div className="flex items-center gap-2"><Award className="h-4 w-4" /> Calificaciones</div>
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`pb-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'reports' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Reporte General</div>
          </button>
        </div>
      </div>

      {activeTab === 'announcements' ? (
        <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto space-y-8 w-full animate-in fade-in duration-300">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Novedades del Curso
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Canal oficial de comunicación del docente para anuncios, recordatorios y alertas académicas.
            </p>
          </div>

          <div className="space-y-6">
            {announcementsLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm max-w-lg mx-auto">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-slate-350 dark:text-slate-655" />
                <h3 className="font-bold text-slate-800 dark:text-slate-205 text-sm">No hay novedades en este curso</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  El docente no ha publicado anuncios oficiales todavía. Vuelve más tarde.
                </p>
              </div>
            ) : (
              announcements.map((ann) => {
                let typeLabel = 'Anuncio'
                let TypeIcon = Megaphone
                let typeClass = 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                
                switch (ann.type) {
                  case 'urgent':
                    typeLabel = 'Urgente'
                    TypeIcon = AlertTriangle
                    typeClass = 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    break
                  case 'reminder':
                    typeLabel = 'Recordatorio'
                    TypeIcon = Bell
                    typeClass = 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                    break
                  case 'new_material':
                    typeLabel = 'Material Nuevo'
                    TypeIcon = BookOpen
                    typeClass = 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    break
                  case 'date_change':
                    typeLabel = 'Cambio de Fecha'
                    TypeIcon = Calendar
                    typeClass = 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                    break
                  case 'congratulation':
                    typeLabel = 'Felicitación'
                    TypeIcon = Trophy
                    typeClass = 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'
                    break
                }

                return (
                  <div 
                    key={ann.id} 
                    className={`relative rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_4px_25px_rgb(0,0,0,0.01)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900/50 ${ann.isPinned ? 'ring-2 ring-blue-500/20 dark:ring-blue-400/20' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${typeClass}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-snug">
                              {ann.title}
                            </h3>
                            {ann.isPinned && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                <Pin className="h-2.5 w-2.5 fill-current" /> Fijado
                              </span>
                            )}
                            {!ann.isReadByMe && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-pink-500 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                Nuevo
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-450 dark:text-slate-500 flex-wrap">
                            <span className="font-semibold">{ann.authorName}</span>
                            <span>•</span>
                            <span>
                              {new Date(ann.publishAt).toLocaleDateString('es-ES', { 
                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pl-0 sm:pl-13 text-slate-650 dark:text-slate-350 text-sm leading-relaxed max-w-3xl">
                      <div dangerouslySetInnerHTML={{ __html: ann.content }} />
                    </div>

                    {ann.attachments && ann.attachments.length > 0 && (
                      <div className="mt-4 pl-0 sm:pl-13 flex flex-wrap gap-2">
                        {ann.attachments.map((att: any, attIdx: number) => (
                          <a 
                            key={attIdx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors decoration-none"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[150px]">{att.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : activeTab === 'content' ? (
        <div className="relative flex flex-1 min-h-[calc(100vh-160px)]">
          {/* Sidebar Izquierdo (Fijo en desktop) */}
          <aside className="hidden md:block w-72 border-r border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900">
            {sidebarContent}
          </aside>

          {/* Contenido Principal */}
          <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto space-y-8">
            {activeLesson ? (
              <>
                {/* 1. Reproductor de Video */}
                {activeLesson.type === 'video' && activeLesson.videoUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="aspect-video w-full overflow-hidden rounded-3xl border border-slate-100 bg-slate-950 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:border-slate-800"
                  >
                    <iframe
                      src={getEmbedUrl(activeLesson.videoUrl)}
                      title={activeLesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  </motion.div>
                )}

                {/* 2. Cabecera del Contenido */}
                <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      {getIcon(activeLesson.type)}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Lección Activa ({activeLesson.type === 'video' ? 'Video' : activeLesson.type === 'reading' ? 'Lectura' : activeLesson.type === 'file' ? 'Archivo' : activeLesson.type === 'quiz' ? 'Quiz' : activeLesson.type === 'forum' ? 'Foro' : 'Tarea'})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {activeLesson.title}
                    </h1>
                    {/* Visual Status Indicator on Header */}
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      {renderStatusIcon(activeLesson.status, "h-4 w-4 shrink-0")}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">
                        {getStatusText(activeLesson.status, activeLesson.type)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Contenido Escrito */}
                <article className="prose prose-slate max-w-none dark:prose-invert">
                  <div 
                    className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base"
                    dangerouslySetInnerHTML={{ __html: activeLesson.content || '' }}
                  />
                </article>

                {/* Botón para marcar como completado (Lecturas y Videos) */}
                {(activeLesson.type === 'reading' || activeLesson.type === 'video') && (
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    {activeLesson.status === 'completed' ? (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                        <CheckCircle className="h-5 w-5" />
                        <span>¡Lección Completada!</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleMarkAsCompleted(activeLesson.id)}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Marcar como Completado</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 4. Entrega de Tareas (Nuevo) */}
                {activeLesson.type === 'task' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 rounded-3xl border border-orange-100 bg-orange-50/20 p-6 sm:p-8 dark:border-orange-900/30 dark:bg-orange-950/10"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Zona de Entrega</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {activeLesson.submissionType === 'file' ? 'Sube tu documento para que el profesor lo evalúe.' : 'Escribe tu respuesta a continuación.'}
                        </p>
                      </div>
                    </div>

                    {(activeLesson.status === 'submitted' || activeLesson.status === 'completed' || activeLesson.status === 'graded') && (activeLesson.submissionType === 'file' || activeLesson.submissionText) ? (
                      <div className="space-y-4">
                        {activeLesson.status === 'graded' && activeLesson.grade ? (
                          <div className="flex flex-col gap-3 rounded-2xl bg-purple-50 dark:bg-purple-950/10 p-5 border border-purple-100/40 dark:border-purple-900/30 text-sm text-purple-700 dark:text-purple-350">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400 animate-pulse" />
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">¡Actividad Calificada!</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">El docente ha registrado tu nota para esta entrega.</p>
                                </div>
                              </div>
                              <div className="flex items-baseline gap-1 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
                                <span className="text-xl font-black text-purple-700 dark:text-purple-400">{activeLesson.grade.score.toFixed(1)}</span>
                                <span className="text-[10px] text-slate-450 dark:text-slate-505">/ {activeLesson.grade.maxGrade.toFixed(1)}</span>
                              </div>
                            </div>
                            {activeLesson.grade.feedback && (
                              <div className="mt-2 text-xs bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl text-slate-700 dark:text-slate-350">
                                <span className="font-bold block text-slate-450 dark:text-slate-500 uppercase tracking-wider text-[9px] mb-1">Retroalimentación del docente:</span>
                                <p className="italic">"{activeLesson.grade.feedback}"</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <CheckCircle className="h-5 w-5 shrink-0" />
                            <div>
                              <p className="font-bold">¡Buen trabajo! Tu tarea fue entregada y está a la espera de ser calificada.</p>
                            </div>
                          </div>
                        )}
                        {activeLesson.submissionText && (
                          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Tu Respuesta</h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{activeLesson.submissionText}</p>
                          </div>
                        )}
                      </div>
                    ) : activeLesson.submissionType === 'file' ? (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center transition-colors hover:border-orange-300 dark:border-slate-700 dark:bg-slate-900/50">
                        <UploadCloud className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Haz clic o arrastra tu archivo aquí</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Soporta PDF, Word, Excel, PPT, o imágenes (Max 10MB)</p>
                        <button
                          onClick={() => handleMarkAsCompleted(activeLesson.id)}
                          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-all"
                        >
                          Seleccionar Archivo
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <textarea
                          rows={6}
                          className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 outline-none transition-all resize-none"
                          placeholder="Escribe tu respuesta o ensayo aquí..."
                          value={taskResponse}
                          onChange={(e) => setTaskResponse(e.target.value)}
                        ></textarea>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleMarkAsCompleted(activeLesson.id, taskResponse)}
                            className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-all"
                          >
                            Enviar Respuesta
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 5. Tarjetas Especiales */}
                {activeLesson.type === 'file' && (
                  <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-3xl border border-blue-100 bg-blue-50/30 p-6 space-y-4 dark:border-blue-900/30 dark:bg-blue-950/10"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20">
                        <FileText className="h-5.5 w-5.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {activeLesson.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Recurso adjunto de tipo Archivo • {activeLesson.duration || 'Enlace'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setIsPdfModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-[0.98] transition-all px-4 py-2.5 text-sm font-semibold"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Visualizar</span>
                      </button>
                      {activeLesson.status === 'completed' || activeLesson.status === 'graded' ? (
                        <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          <span>Completado</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMarkAsCompleted(activeLesson.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all px-4 py-2.5 text-sm font-semibold text-white"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Marcar como Completado</span>
                        </button>
                      )}
                      {activeLesson.driveUrl ? (
                        <a
                          href={activeLesson.driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all px-4 py-2.5 text-sm font-semibold text-white"
                        >
                          <Download className="h-4 w-4" />
                          <span>Descargar</span>
                        </a>
                      ) : (
                        <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all px-4 py-2.5 text-sm font-semibold text-white">
                          <Download className="h-4 w-4" />
                          <span>Descargar</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeLesson.type === 'quiz' && (
                  activeLesson.quizAttempt ? (
                    <motion.div
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-6"
                    >
                      {/* Tarjeta de resultados estilo Apple/Premium */}
                      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                              activeLesson.quizAttempt.is_passed
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                            }`}>
                              {activeLesson.quizAttempt.is_passed ? (
                                <CheckCircle className="h-6 w-6" />
                              ) : (
                                <AlertCircle className="h-6 w-6" />
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                Evaluación Realizada
                              </span>
                              <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                                {activeLesson.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl px-4 py-2.5 border border-slate-100 dark:border-slate-800 self-start sm:self-auto">
                            <div className="text-right">
                              <p className="text-[10px] font-semibold text-slate-400">Calificación obtenida</p>
                              <p className={`text-xl font-black ${
                                activeLesson.quizAttempt.is_passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {Number(activeLesson.quizAttempt.score).toFixed(1)}
                                <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">/ 5.0</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Barra de estado y fecha */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-50 dark:border-slate-800/40 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Completado el {new Date(activeLesson.quizAttempt.completed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[9px] ${
                            activeLesson.quizAttempt.is_passed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                          }`}>
                            {activeLesson.quizAttempt.is_passed ? 'Aprobado' : 'No Aprobado'}
                          </div>
                        </div>
                      </div>

                      {/* Panel de revisión de preguntas */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h5 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                            Revisión de la Evaluación
                          </h5>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Retroalimentación
                          </span>
                        </div>

                        {loadingQuizDetails ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <p className="text-xs font-semibold">Cargando preguntas...</p>
                          </div>
                        ) : activeQuizQuestions.length > 0 ? (
                          <div className="space-y-3">
                            {(() => {
                              let studentAnswers: any[] = []
                              if (activeLesson.submissionText) {
                                try {
                                  studentAnswers = JSON.parse(activeLesson.submissionText)
                                } catch (e) {
                                  console.warn("Could not parse answers JSON:", e)
                                }
                              }

                              return activeQuizQuestions.map((q, qIdx) => {
                                const userAns = studentAnswers.find(sa => sa.questionId === q.id)
                                const selectedOptionId = userAns?.selectedOptionId
                                
                                return (
                                  <div
                                    key={q.id}
                                    className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-[0_4px_20px_rgb(0,0,0,0.01)] space-y-4"
                                  >
                                    <div className="flex gap-2 items-start">
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                        {qIdx + 1}
                                      </span>
                                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                        {q.question_text}
                                      </p>
                                    </div>

                                    <div className="space-y-2">
                                      {q.options.map((opt: any) => {
                                        const isSelected = selectedOptionId === opt.id
                                        const isCorrect = opt.isCorrect
                                        
                                        let optionStyle = "border-slate-100 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/20"
                                        let badge = null

                                        if (selectedOptionId) {
                                          if (isSelected && isCorrect) {
                                            optionStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                            badge = (
                                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle className="h-3.5 w-3.5" /> Tu respuesta (Correcta)
                                              </span>
                                            )
                                          } else if (isSelected && !isCorrect) {
                                            optionStyle = "bg-rose-500/10 border-rose-500 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                                            badge = (
                                              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                                <AlertCircle className="h-3.5 w-3.5" /> Tu respuesta (Incorrecta)
                                              </span>
                                            )
                                          } else if (isCorrect) {
                                            optionStyle = "border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5"
                                            badge = (
                                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle className="h-3.5 w-3.5" /> Respuesta Correcta
                                              </span>
                                            )
                                          }
                                        } else {
                                          if (isCorrect) {
                                            optionStyle = "border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5"
                                            badge = (
                                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle className="h-3.5 w-3.5" /> Respuesta Correcta
                                              </span>
                                            )
                                          }
                                        }

                                        return (
                                          <div
                                            key={opt.id}
                                            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-semibold ${optionStyle}`}
                                          >
                                            <span>{opt.text}</span>
                                            {badge}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        ) : (
                          <div className="p-6 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60">
                            No se encontraron detalles para esta evaluación.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-3xl border border-purple-100 bg-purple-50/30 p-6 text-center space-y-4 dark:border-purple-900/30 dark:bg-purple-950/10"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 mx-auto">
                        <Award className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          ¿Listo para evaluar tus conocimientos?
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                          Este examen evaluará los conceptos teóricos aprendidos en este módulo. Asegúrate de haber revisado los videos y las lecturas previas.
                        </p>
                      </div>
                      <Link href={`/student/quizzes/${activeLesson.id}`} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition-all px-6 py-3.5 text-sm font-semibold text-white">
                        <span>Presentar Evaluación del Módulo</span>
                        <ArrowRight className="h-4.5 w-4.5" />
                      </Link>
                    </motion.div>
                  )
                )}

                {activeLesson.type === 'forum' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    {/* Header Foro info */}
                    {forumConfig && (
                      <div className="rounded-xl bg-pink-50/50 dark:bg-pink-950/10 p-4 border border-pink-100/40 dark:border-pink-950/20">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-pink-700 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/35 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {forumConfig.forumType === 'debate' ? 'Debate Evaluativo' : forumConfig.forumType === 'qa' ? 'Dudas y Soporte (Q&A)' : 'Foro Libre'}
                          </span>
                          {forumConfig.dueDate && (
                            <span className="text-xs font-medium text-slate-550 flex items-center gap-1">
                              <Clock size={12} /> Límite: {new Date(forumConfig.dueDate).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-slate-650 dark:text-slate-350 leading-relaxed">{forumConfig.description}</p>
                      </div>
                    )}

                    {/* Forum Grade Banner */}
                    {activeLesson.status === 'graded' && activeLesson.grade && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-purple-50 dark:bg-purple-950/10 p-4 border border-purple-100/40 dark:border-purple-900/30 text-sm text-purple-700 dark:text-purple-350 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-start gap-3 text-left">
                          <Award className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5 animate-pulse" />
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 dark:text-white">Este foro ha sido calificado</p>
                            {activeLesson.grade.feedback && (
                              <p className="text-xs text-slate-600 dark:text-slate-450 italic">"{activeLesson.grade.feedback}"</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm shrink-0 self-end sm:self-center">
                          <span className="text-xl font-black text-purple-700 dark:text-purple-400">{activeLesson.grade.score.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-455 dark:text-slate-505">/ {activeLesson.grade.maxGrade.toFixed(1)}</span>
                        </div>
                      </div>
                    )}

                    {forumLoading ? (
                      <div className="flex h-40 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                      </div>
                    ) : activeThread ? (
                      /* Thread Details View */
                      <div className="space-y-6">
                        <button
                          onClick={() => setActiveThread(null)}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border-none"
                        >
                          <Undo2 size={12} /> Volver a los temas
                        </button>

                        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center font-bold text-white text-sm">
                                {activeThread.authorName.charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  {activeThread.authorName}
                                  {activeThread.authorRole === 'teacher' && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md dark:bg-blue-900/30 dark:text-blue-400">Docente</span>
                                  )}
                                </h4>
                                <span className="text-[10px] text-slate-400">{new Date(activeThread.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {activeThread.isPinned && <Pin size={14} className="text-amber-500 fill-amber-500" />}
                              {activeThread.isLocked && <Lock size={14} className="text-slate-400" />}
                              
                              {/* Edit Action for thread author */}
                              {userId === activeThread.authorId && (userRole !== 'student' || canEditStudent(activeThread.createdAt)) && !isEditingActiveThread && (
                                <button
                                  onClick={() => handleStartEditThread(activeThread)}
                                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded text-[11px] font-semibold transition-all border-none cursor-pointer"
                                  title="Editar Tema"
                                >
                                  <Edit size={10} /> Editar
                                </button>
                              )}

                              {/* Pin/Lock actions for Teacher */}
                              {userRole === 'teacher' && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleTogglePin(activeThread)}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-600 border-none"
                                    title="Fijar Hilo"
                                  >
                                    <Pin size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleToggleLock(activeThread)}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 border-none"
                                    title="Bloquear Hilo"
                                  >
                                    {activeThread.isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {isEditingActiveThread ? (
                            <form onSubmit={handleSaveEditThread} className="space-y-4 pt-2 border-t border-slate-50 dark:border-slate-800/40">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título de la discusión</label>
                                <input
                                  type="text"
                                  value={editThreadTitle}
                                  onChange={(e) => setEditThreadTitle(e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contenido de la discusión</label>
                                <MiniForumEditor
                                  value={editThreadContent}
                                  onChange={setEditThreadContent}
                                  placeholder="Redacta la explicación inicial, duda o postura del debate..."
                                  minHeight="180px"
                                />
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingActiveThread(false)}
                                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow border-none cursor-pointer"
                                >
                                  Guardar cambios
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeThread.title}</h3>
                              <div 
                                className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed ql-editor !p-0"
                                dangerouslySetInnerHTML={{ __html: activeThread.content }}
                              />
                            </>
                          )}
                        </div>

                        {/* Replies List */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Respuestas ({threadReplies.length})</h4>
                          <div className="space-y-3">
                            {threadReplies.map(reply => (
                              <div key={reply.id} className={`rounded-xl border p-4 shadow-sm transition-all ${
                                reply.authorRole === 'teacher' 
                                  ? 'bg-blue-50/20 border-blue-100/40 dark:bg-blue-950/5 dark:border-blue-900/10' 
                                  : 'bg-white border-slate-100 dark:bg-slate-950/30 dark:border-slate-800'
                              }`}>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                                      reply.authorRole === 'teacher' ? 'bg-blue-600' : 'bg-slate-450'
                                    }`}>
                                      {reply.authorName.charAt(0)}
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        {reply.authorName}
                                        {reply.authorRole === 'teacher' && (
                                          <span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-700 px-1 py-0.2 rounded dark:bg-blue-900/30 dark:text-blue-400">Docente</span>
                                        )}
                                      </h5>
                                      <span className="text-[9px] text-slate-400">{new Date(reply.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {reply.isTeacherVerified && (
                                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <CheckSquare size={10} /> Respuesta Verificada
                                      </span>
                                    )}
                                    
                                    {/* Verification action for Teacher */}
                                    {userRole === 'teacher' && reply.authorRole !== 'teacher' && (
                                      <button
                                        onClick={() => handleVerifyReply(reply.id, !reply.isTeacherVerified)}
                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors border-none bg-transparent ${
                                          reply.isTeacherVerified
                                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/10'
                                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/10'
                                        }`}
                                      >
                                        {reply.isTeacherVerified ? 'Quitar verificación' : 'Verificar respuesta'}
                                      </button>
                                    )}

                                    {/* Edit Action for reply author */}
                                    {userId === reply.authorId && (userRole !== 'student' || canEditStudent(reply.createdAt)) && editingReplyId !== reply.id && (
                                      <button
                                        onClick={() => handleStartEditReply(reply)}
                                        className="text-[10px] font-semibold text-blue-650 hover:text-blue-750 bg-blue-50 dark:bg-blue-950/35 px-2 py-0.5 rounded border-none cursor-pointer flex items-center gap-0.5"
                                        title="Editar Comentario"
                                      >
                                        <Edit size={10} /> Editar
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                {editingReplyId === reply.id ? (
                                  <form onSubmit={(e) => handleSaveEditReply(e, reply.id)} className="space-y-3 pl-10 mt-3">
                                    <MiniForumEditor
                                      value={editReplyContent}
                                      onChange={setEditReplyContent}
                                      placeholder="Edita tu respuesta..."
                                      minHeight="100px"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditingReplyId(null)}
                                        className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="submit"
                                        className="rounded-xl bg-pink-600 hover:bg-pink-700 px-3 py-1 text-xs font-bold text-white shadow border-none cursor-pointer"
                                      >
                                        Guardar
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <div 
                                    className="mt-3 pl-10 text-xs text-slate-700 dark:text-slate-350 leading-relaxed ql-editor !p-0"
                                    dangerouslySetInnerHTML={{ __html: reply.content }}
                                  />
                                )}
                              </div>
                            ))}
                            {threadReplies.length === 0 && (
                              <div className="text-center py-6 text-xs text-slate-400">No hay respuestas en este tema. ¡Sé el primero en responder!</div>
                            )}
                          </div>
                        </div>

                        {/* Reply Form */}
                        {activeThread.isLocked ? (
                          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 border border-dashed text-center text-xs text-slate-550">
                            Este tema de discusión ha sido bloqueado por el docente y no admite nuevas respuestas.
                          </div>
                        ) : (
                          <form onSubmit={(e) => handleCreateReply(e)} className="space-y-3">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Escribe tu aportación</label>
                            <MiniForumEditor
                              value={newReplyContent}
                              onChange={setNewReplyContent}
                              placeholder="Escribe tu comentario o respuesta al tema..."
                              minHeight="100px"
                            />
                            <button
                              type="submit"
                              className="rounded-xl bg-pink-600 hover:bg-pink-700 px-4 py-2 text-xs font-bold text-white shadow transition-all active:scale-[0.98] border-none cursor-pointer"
                            >
                              Publicar respuesta
                            </button>
                          </form>
                        )}
                      </div>
                    ) : isCreatingThread ? (
                      /* New Thread Form */
                      <form onSubmit={handleCreateThread} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Nuevo tema de discusión</h3>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título de la pregunta/tema</label>
                          <input
                            type="text"
                            value={newThreadTitle}
                            onChange={(e) => setNewThreadTitle(e.target.value)}
                            placeholder="Ej. ¿Cuál es el significado físico de la tercera ley de Newton?"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Explicación o argumento inicial</label>
                          <MiniForumEditor
                            value={newThreadContent}
                            onChange={setNewThreadContent}
                            placeholder="Describe detalladamente tu punto de partida, duda o argumento para debatir..."
                            minHeight="180px"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsCreatingThread(false)}
                            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-655 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="rounded-xl bg-blue-600 hover:bg-blue-750 px-4 py-2 text-xs font-semibold text-white shadow active:scale-[0.98] transition-all border-none cursor-pointer"
                          >
                            Iniciar Discusión
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Thread List View */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Temas abiertos ({forumThreads.length})</h4>
                          {forumConfig && (userRole === 'teacher' || userRole === 'admin' || forumConfig.forumType !== 'debate') && (
                            <button
                              onClick={() => setIsCreatingThread(true)}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow transition-all active:scale-[0.98] border-none cursor-pointer"
                            >
                              <Plus size={12} /> Iniciar discusión
                            </button>
                          )}
                        </div>

                        {forumThreads.length > 0 && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-550 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-800/60">
                            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] flex items-center gap-1">
                              <AlertCircle size={10} className="text-slate-400" /> Leyenda:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded bg-pink-500 text-white animate-pulse">
                                Nuevo
                              </span>
                              <span className="text-slate-600 dark:text-slate-350">Mensajes o respuestas sin leer</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Con interacciones
                              </span>
                              <span className="text-slate-600 dark:text-slate-350">Respuestas leídas</span>
                            </div>
                          </div>
                        )}

                        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm dark:divide-slate-800/60 dark:border-slate-800 dark:bg-slate-950/60">
                          {forumThreads.map(thread => (
                            <div
                              key={thread.id}
                              onClick={() => {
                                setActiveThread(thread)
                                if (userId) {
                                  localStorage.setItem(`forum_thread_read_${userId}_${thread.id}`, thread.repliesCount.toString())
                                }
                              }}
                              className="group flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 cursor-pointer transition-colors"
                            >
                              <div className="flex items-start gap-3 min-w-0 flex-1 pr-4">
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400 shrink-0">
                                  {thread.authorName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5 flex-wrap">
                                    {thread.isPinned && <Pin size={10} className="text-amber-500 fill-amber-500" />}
                                    {thread.isLocked && <Lock size={10} className="text-slate-450" />}
                                    {thread.title}
                                    {getUnreadStatus(thread.id, thread.repliesCount) ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded bg-pink-500 text-white animate-pulse">
                                        Nuevo
                                      </span>
                                    ) : thread.repliesCount > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                        Con interacciones
                                      </span>
                                    ) : null}
                                  </h4>
                                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{stripHtml(thread.content)}</p>
                                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-450 dark:text-slate-500">
                                    <span className="font-semibold">{thread.authorName}</span>
                                    <span>•</span>
                                    <span>{new Date(thread.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-450 dark:text-slate-500 border border-slate-100 rounded-lg px-2.5 py-1 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                                <MessageSquare size={12} /> {thread.repliesCount}
                              </div>
                            </div>
                          ))}
                          {forumThreads.length === 0 && (
                            <div className="text-center py-10 text-xs text-slate-450 dark:text-slate-500">
                              {(userRole === 'teacher' || userRole === 'admin') ? (
                                <div className="space-y-3">
                                  <p className="font-semibold text-slate-655 dark:text-slate-400">Este foro está vacío. Crea el primer tema de discusión para que los estudiantes puedan ingresar y participar.</p>
                                  <button
                                    type="button"
                                    onClick={() => setIsCreatingThread(true)}
                                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-xs font-bold text-white shadow border-none cursor-pointer"
                                  >
                                    <Plus size={12} /> Iniciar la primera discusión
                                  </button>
                                </div>
                              ) : forumConfig && forumConfig.forumType !== 'debate' ? (
                                <div className="space-y-3">
                                  <p className="font-semibold text-slate-655 dark:text-slate-400">Este foro está vacío. ¡Sé el primero en iniciar un tema de discusión!</p>
                                  <button
                                    type="button"
                                    onClick={() => setIsCreatingThread(true)}
                                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-xs font-bold text-white shadow border-none cursor-pointer"
                                  >
                                    <Plus size={12} /> Iniciar discusión
                                  </button>
                                </div>
                              ) : (
                                'No hay discusiones creadas en este foro. Espera a que el docente inicie la primera discusión para poder participar.'
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
                <BookOpen className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4 animate-pulse" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Este curso no tiene lecciones publicadas aún</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Vuelve más tarde o comunícate con tu docente si crees que esto es un error.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'grades' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-5xl mx-auto space-y-8 w-full">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-6 w-6 text-blue-500" /> Mis Calificaciones en {courseData.title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona y revisa todas tus entregas, talleres y exámenes de este curso.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Promedio General</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {stats.averageGrade.toFixed(1)} <span className="text-base text-slate-400 font-normal">/ 5.0</span>
              </h3>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Lecciones Completadas</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {stats.lessonsCompleted} <span className="text-base text-slate-400 font-normal">/ {stats.totalLessons}</span>
              </h3>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Estado de Desempeño</p>
              <h3 className={`text-3xl font-black mt-2 ${stats.averageGrade >= 3.0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {getPerformanceLevel(stats.averageGrade)}
              </h3>
            </div>
          </div>
          
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white">
                <tr>
                  <th className="px-6 py-4 font-bold">Actividad</th>
                  <th className="px-6 py-4 font-bold">Tipo</th>
                  <th className="px-6 py-4 font-bold">Realimentación</th>
                  <th className="px-6 py-4 font-bold text-right">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {grades.length > 0 ? (
                  grades.map((grade) => {
                    const typeLabels: Record<string, { label: string; color: string }> = {
                      quiz: { label: 'Quiz', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
                      task: { label: 'Tarea', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                      workshop: { label: 'Taller', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                      activity: { label: 'Actividad', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
                    }
                    const typeInfo = typeLabels[grade.gradeType] || typeLabels.task
                    const score = grade.score
                    const scoreColor = score === null ? 'text-slate-400' : score >= 4.5 ? 'text-emerald-600 dark:text-emerald-400' : score >= 3.0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'

                    return (
                      <tr key={grade.id}>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{grade.activityName}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs">
                          {grade.feedback || (score !== null ? 'Calificado por el docente.' : 'Pendiente de calificación.')}
                        </td>
                        <td className={`px-6 py-4 text-right font-black text-lg ${scoreColor}`}>
                          {score !== null ? score.toFixed(1) : '—'}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      No hay calificaciones registradas aún. Completa quizzes y entrega tareas para ver tus notas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-6xl mx-auto space-y-8 w-full">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-indigo-500" /> Reporte General y Analíticas
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Analíticas de tu desempeño, evolución de calificaciones y tiempo de estudio en {courseData.title}.</p>
          </div>
          
          {/* Tarjetas de Resumen KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><Activity className="h-5 w-5" /></div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Progreso Total</p>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{courseData.progress}%</h3>
              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div style={{ width: `${courseData.progress}%` }} className="h-full rounded-full bg-indigo-500" />
              </div>
            </div>
            
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"><Target className="h-5 w-5" /></div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Puntaje Promedio</p>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.averageGrade.toFixed(1)} <span className="text-sm text-slate-400 font-normal">/ 5.0</span>
              </h3>
              <p className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">Rendimiento: {getPerformanceLevel(stats.averageGrade)}</p>
            </div>
            
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"><Timer className="h-5 w-5" /></div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Tiempo Invertido</p>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.timeSpent}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Promedio estimado de estudio</p>
            </div>
            
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-5 w-5" /></div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Lecciones Completadas</p>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.lessonsCompleted} <span className="text-sm text-slate-400 font-normal">/ {stats.totalLessons}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {stats.totalLessons > stats.lessonsCompleted ? `Te faltan ${stats.totalLessons - stats.lessonsCompleted} para terminar` : '¡Curso completado!'}
              </p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Evolución de Notas */}
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:bg-slate-900 dark:border-slate-800 flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">Evolución de Calificaciones</h3>
              <div className="flex-1 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="nota" name="Calificación" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de Tiempo Invertido */}
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:bg-slate-900 dark:border-slate-800 flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">Horas de Estudio por Módulo</h3>
              <div className="flex-1 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="horas" name="Horas" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cajón Móvil de Lecciones (AnimatePresence) */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 z-40 bg-black md:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-72 border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden"
            >
              <button
                onClick={() => setIsMobileNavOpen(false)}
                className="absolute top-4 left-4 rounded-lg p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
              <div className="h-full pt-14">
                {sidebarContent}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* PDF Viewer Modal */}
      {isPdfModalOpen && activeLesson && activeLesson.type === 'file' && (
        <PdfViewer
          title={activeLesson.title}
          driveUrl={activeLesson.driveUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}
          driveDownloadUrl={activeLesson.driveUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}
          isModal={true}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}
    </div>
  )
}

// Fallback Mock Data for Demo Mode
const mockCourseDetails: CourseDetails = {
  id: 'fisica-1',
  title: 'Física Avanzada',
  subject: 'Ciencias Exactas',
  progress: 70,
  modules: [
    {
      id: 'm1',
      title: 'Módulo 1: Introducción a la Dinámica',
      lessons: [
        {
          id: 'l1',
          title: 'Concepto de Fuerza',
          type: 'reading',
          duration: '10 min',
          status: 'completed',
          content: 'La fuerza es una magnitud vectorial que mide la intensidad del intercambio de momento lineal entre dos cuerpos...',
        },
        {
          id: 'l2',
          title: 'Las Leyes de Newton',
          type: 'video',
          duration: '15 min',
          status: 'completed',
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          content: 'Video explicativo sobre las tres leyes fundamentales del movimiento según Sir Isaac Newton.',
        },
        {
          id: 'l-forum-1',
          title: 'Foro: Impacto de la Gravedad en el Espacio',
          type: 'forum',
          duration: 'Foro',
          status: 'pending',
          content: 'En este foro debatiremos sobre cómo la relatividad de Einstein cambió nuestra comprensión de la gravedad y del espacio-tiempo. Participen con al menos 2 aportaciones bien fundamentadas.',
        }
      ]
    },
    {
      id: 'm2',
      title: 'Módulo 2: Aplicaciones Prácticas',
      lessons: [
        {
          id: 'l3',
          title: 'Taller de Aplicación de Dinámica',
          type: 'task',
          duration: '45 min',
          status: 'pending',
          submissionType: 'file',
          content: 'Descarga el taller, resuelve los ejercicios propuestos y sube la solución en formato PDF.',
        },
        {
          id: 'l4',
          title: 'Evaluación del Módulo: Leyes de Newton',
          type: 'quiz',
          duration: '20 min',
          status: 'pending',
          content: 'Examen de opción múltiple para evaluar la comprensión de las Leyes de Newton.',
        },
        {
          id: 'l-forum-2',
          title: 'Dudas y Consultas: Módulo Cinemática',
          type: 'forum',
          duration: 'Foro',
          status: 'pending',
          content: 'Espacio para publicar dudas referentes a las leyes del movimiento rectilíneo uniforme (MRU) y uniformemente acelerado (MRUA).',
        }
      ]
    }
  ]
}

const mockPerformanceData = [
  { name: 'Actividad 1', nota: 4.2 },
  { name: 'Actividad 2', nota: 4.8 },
  { name: 'Actividad 3', nota: 1.0 }
]

const mockTimeData = [
  { name: 'Módulo 1', horas: 5 },
  { name: 'Módulo 2', horas: 8 }
]


