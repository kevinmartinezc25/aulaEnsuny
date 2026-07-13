'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Plus, GripVertical, ChevronDown, ChevronUp, Video, FileText, HelpCircle, File, Settings2, Trash2, FolderOpen, X, ClipboardList, BookOpen, MessageSquare, Link as LinkIcon } from 'lucide-react'
import { getCourseModules, CourseModule, updateModuleItemsOrder } from '../../application/teacherActions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'

// MOCK Quizzes for linking
const MOCK_QUIZZES = [
  { id: 'q1', title: 'Quiz Leyes de Newton', duration: '15 min', status: 'active' },
  { id: 'q2', title: 'Examen Final Cinemática', duration: '60 min', status: 'draft' },
  { id: 'q3', title: 'Evaluación Diagnóstica', duration: '10 min', status: 'active' }
]

// MOCK Resources for linking
const MOCK_RESOURCES = [
  { id: 'r1', name: 'Guía Práctica de Laboratorio 1.pdf', type: 'pdf', size: '2.4 MB' },
  { id: 'r2', name: 'Lectura Complementaria - Newton.pdf', type: 'pdf', size: '1.1 MB' },
  { id: 'r3', name: 'Tabla de Fórmulas.pdf', type: 'pdf', size: '0.5 MB' }
]

export function TeacherCourseModulesScreen({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [modules, setModules] = useState<CourseModule[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  
  // State for Add Menu popup
  const [addMenuModuleId, setAddMenuModuleId] = useState<string | null>(null)
  
  // State for Quiz Modal
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false)
  const [quizModalModuleId, setQuizModalModuleId] = useState<string | null>(null)

  // State for Resource Modal
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false)
  const [resourceModalModuleId, setResourceModalModuleId] = useState<string | null>(null)

  // State for Forum Modal
  const [isForumModalOpen, setIsForumModalOpen] = useState(false)
  const [forumModalModuleId, setForumModalModuleId] = useState<string | null>(null)

  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([])
  const [availableResources, setAvailableResources] = useState<any[]>([])
  const [availableForums, setAvailableForums] = useState<any[]>([])
  
  // States for Editing and Dropdowns
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // Close dropdown when clicking outside (simple effect)
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    if (openDropdownId) {
      window.addEventListener('click', handleClickOutside)
    }
    return () => window.removeEventListener('click', handleClickOutside)
  }, [openDropdownId])

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

        const data = await getCourseModules(courseId)
        setModules(data)
        
        // Expand first module by default
        if (data.length > 0) {
          setExpandedModules({ [data[0].id]: true })
        }

        if (!isDemoMode) {
          const supabase = createClient()
          
          // Fetch quizzes
          const { data: dbModules } = await supabase
            .from('course_modules')
            .select('id')
            .eq('course_id', courseId)
          
          if (dbModules && dbModules.length > 0) {
            const mIds = dbModules.map(m => m.id)
            const { data: dbLessons } = await supabase
              .from('lessons')
              .select('id')
              .in('module_id', mIds)
            
            if (dbLessons && dbLessons.length > 0) {
              const lIds = dbLessons.map(l => l.id)
              const { data: dbQuizzes } = await supabase
                .from('quizzes')
                .select('id, title, duration_minutes')
                .in('lesson_id', lIds)
              
              if (dbQuizzes) {
                setAvailableQuizzes(dbQuizzes.map(q => ({
                  id: q.id,
                  title: q.title,
                  duration: q.duration_minutes ? `${q.duration_minutes} min` : 'Sin límite',
                  status: 'active'
                })))
              }
            }
          }

          // Fetch resources
          const { data: dbResources } = await supabase
            .from('resources')
            .select('id, title, file_size, mime_type')
            .eq('course_id', courseId)
          
          if (dbResources) {
            setAvailableResources(dbResources.map(r => {
              let resourceType: 'pdf' | 'doc' | 'link' = 'doc'
              const mime = r.mime_type?.toLowerCase() || ''
              if (mime.includes('pdf')) {
                resourceType = 'pdf'
              } else if (mime === 'url' || mime === 'link') {
                resourceType = 'link'
              }

              return {
                id: r.id,
                name: r.title,
                type: resourceType,
                size: r.file_size ? `${(r.file_size / 1024 / 1024).toFixed(1)} MB` : 'Enlace Web'
              }
            }))
          }

          // Fetch forums
          try {
            const { data: dbForums } = await supabase
              .from('forums')
              .select('id, lessons(title)')
            
            if (dbForums) {
              setAvailableForums(dbForums.map((f: any) => ({
                id: f.id,
                name: f.lessons?.title || 'Foro de Discusión',
                type: 'forum'
              })))
            }
          } catch (e) {
            console.error('Error fetching forums for linking:', e)
          }
        } else {
          setAvailableQuizzes(MOCK_QUIZZES)
          setAvailableResources(MOCK_RESOURCES)
          setAvailableForums([
            { id: 'f1', name: 'Foro: Impacto de la Gravedad en el Espacio', type: 'forum' },
            { id: 'f2', name: 'Dudas y Consultas: Módulo Cinemática', type: 'forum' }
          ])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchModules()
  }, [courseId])

  const toggleModule = (id: string) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const saveTimeoutsRef = React.useRef<Record<string, NodeJS.Timeout>>({})

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(saveTimeoutsRef.current).forEach(clearTimeout)
    }
  }, [])

  const handleReorderLessons = (moduleId: string, newLessons: any[]) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, lessons: newLessons } : m))

    if (saveTimeoutsRef.current[moduleId]) {
      clearTimeout(saveTimeoutsRef.current[moduleId])
    }

    saveTimeoutsRef.current[moduleId] = setTimeout(async () => {
      try {
        const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
        
        if (!isDemoMode) {
          await updateModuleItemsOrder(moduleId, newLessons.map(l => ({ id: l.id })))
        }
      } catch (err) {
        console.error('Error saving reordered lessons:', err)
        toast.error('No se pudo guardar el orden de los recursos')
      }
    }, 1000)
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4 text-rose-500" />
      case 'pdf': return <FileText className="h-4 w-4 text-blue-500" />
      case 'link': return <LinkIcon className="h-4 w-4 text-emerald-500" />
      case 'quiz': return <HelpCircle className="h-4 w-4 text-purple-500" />
      case 'text': return <File className="h-4 w-4 text-emerald-500" />
      case 'task': return <ClipboardList className="h-4 w-4 text-orange-500" />
      case 'forum': return <BookOpen className="h-4 w-4 text-pink-500" />
      default: return <File className="h-4 w-4 text-slate-500" />
    }
  }

  // --- Handlers for Lesson Config ---
  const handleOpenConfig = async (moduleId: string, lesson: any) => {
    if (lesson.type === 'quiz') {
      try {
        const supabase = createClient()
        const { data: quiz, error } = await supabase
          .from('quizzes')
          .select('id')
          .eq('lesson_id', lesson.id)
          .maybeSingle()
        
        if (quiz) {
          router.push(`/teacher/courses/${courseId}/quizzes/${quiz.id}/edit`)
          return
        }
      } catch (err) {
        console.error('Error fetching quiz for lesson:', err)
      }
      router.push(`/teacher/courses/${courseId}/quizzes`)
      return
    }
    if (lesson.type === 'forum') {
      try {
        const supabase = createClient()
        const { data: forum } = await supabase
          .from('forums')
          .select('id')
          .eq('lesson_id', lesson.id)
          .maybeSingle()
        
        if (forum) {
          router.push(`/teacher/courses/${courseId}/resources/${forum.id}/edit?type=forum`)
          return
        }
      } catch (err) {
        console.error('Error fetching forum for lesson:', err)
      }
      router.push(`/teacher/courses/${courseId}/resources`)
      return
    }
    if (lesson.type === 'pdf' || lesson.type === 'link') {
      router.push(`/teacher/courses/${courseId}/resources/${lesson.id}/edit`)
      return
    }
    router.push(`/teacher/courses/${courseId}/modules/lesson/${lesson.id}?type=${lesson.type}&moduleId=${moduleId}`)
  }

  const handleGoToForumBoard = async (lessonId: string) => {
    try {
      const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
      if (isDemo) {
        // In demo mode, fetch using mock store
        const { getForumByLessonId } = await import('../../application/forumActions')
        const forum = await getForumByLessonId(lessonId)
        if (forum) {
          router.push(`/teacher/courses/${courseId}/forums/${forum.id}`)
          return
        }
      } else {
        const supabase = createClient()
        const { data: forum } = await supabase
          .from('forums')
          .select('id')
          .eq('lesson_id', lessonId)
          .maybeSingle()
        if (forum) {
          router.push(`/teacher/courses/${courseId}/forums/${forum.id}`)
          return
        }
      }
    } catch (err) {
      console.error('Error navigating to forum board:', err)
    }
    toast.error('No se pudo abrir el foro de discusión')
  }

  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    toast.warning('¿Estás seguro de que deseas eliminar este elemento?', {
      description: 'Esta acción no se puede deshacer.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
            process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

          if (!isDemoMode && !lessonId.startsWith('new_') && !lessonId.startsWith('quiz_') && !lessonId.startsWith('res_')) {
            try {
              const supabase = createClient()
              
              // Verify if it is in lessons table
              const { data: lesson } = await supabase
                .from('lessons')
                .select('id')
                .eq('id', lessonId)
                .maybeSingle()

              if (lesson) {
                const { error } = await supabase
                  .from('lessons')
                  .delete()
                  .eq('id', lessonId)
                if (error) throw error
                toast.success('Lección eliminada de la base de datos')
              } else {
                // If it's not a lesson, it's a resource. We just unlink it by setting module_id to null
                const { error } = await supabase
                  .from('resources')
                  .update({ module_id: null })
                  .eq('id', lessonId)
                if (error) throw error
                toast.success('Recurso desvinculado del módulo')
              }
            } catch (err: any) {
              console.error('Error al eliminar/desvincular elemento:', err)
              toast.error('No se pudo procesar la solicitud en la base de datos')
              return
            }
          }

          setModules(prev => prev.map(m => 
            m.id === moduleId 
              ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId), lessonsCount: m.lessonsCount - 1 } 
              : m
          ))
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const handleQuickAddLesson = (moduleId: string, type: 'video' | 'pdf' | 'quiz' | 'text' | 'task' | 'forum') => {
    if (type === 'quiz') {
      setAddMenuModuleId(null)
      setQuizModalModuleId(moduleId)
      setIsQuizModalOpen(true)
      return
    }

    if (type === 'pdf') {
      setAddMenuModuleId(null)
      setResourceModalModuleId(moduleId)
      setIsResourceModalOpen(true)
      return
    }

    if (type === 'forum') {
      setAddMenuModuleId(null)
      setForumModalModuleId(moduleId)
      setIsForumModalOpen(true)
      return
    }

    const newLessonId = `new_${Date.now()}`
    setAddMenuModuleId(null)
    router.push(`/teacher/courses/${courseId}/modules/lesson/${newLessonId}?type=${type}&moduleId=${moduleId}`)
  }

  const handleLinkQuiz = async (quizId: string) => {
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
    const list = isDemoMode ? MOCK_QUIZZES : availableQuizzes
    const quiz = list.find(q => q.id === quizId)
    if (!quiz) return
    
    let lessonId = `quiz_${Date.now()}`

    let nextSortOrder = 1
    const targetModule = modules.find(m => m.id === quizModalModuleId)
    if (targetModule && targetModule.lessons.length > 0) {
      nextSortOrder = Math.max(...targetModule.lessons.map(l => (l as any).sort_order || 0)) + 1
    }

    if (!isDemoMode && quizModalModuleId) {
      try {
        const supabase = createClient()
        const { data: dbQuiz } = await supabase
          .from('quizzes')
          .select('lesson_id')
          .eq('id', quizId)
          .maybeSingle()
        
        if (dbQuiz && dbQuiz.lesson_id) {
          lessonId = dbQuiz.lesson_id
          const { error } = await supabase
            .from('lessons')
            .update({ 
              module_id: quizModalModuleId,
              sort_order: nextSortOrder
            })
            .eq('id', lessonId)
          if (error) throw error
        } else {
          const { data: newLesson, error: lErr } = await supabase
            .from('lessons')
            .insert({
              module_id: quizModalModuleId,
              title: quiz.title,
              type: 'quiz',
              sort_order: nextSortOrder
            })
            .select()
            .single()
          if (lErr) throw lErr
          lessonId = newLesson.id

          const { error: qErr } = await supabase
            .from('quizzes')
            .update({ lesson_id: lessonId })
            .eq('id', quizId)
          if (qErr) throw qErr
        }
      } catch (err: any) {
        console.error('Error linking quiz:', err)
        toast.error('No se pudo vincular el quiz en la base de datos')
        return
      }
    }

    const newLesson = {
      id: lessonId,
      title: quiz.title,
      type: 'quiz' as const,
      duration: quiz.duration,
      sort_order: nextSortOrder
    }

    setModules(prev => prev.map(m => 
      m.id === quizModalModuleId
        ? { ...m, lessons: [...m.lessons, newLesson], lessonsCount: m.lessonsCount + 1 }
        : m
    ))
    
    setIsQuizModalOpen(false)
    setQuizModalModuleId(null)
    toast.success('Quiz vinculado correctamente')
  }

  const handleLinkResource = async (resourceId: string) => {
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
    const list = isDemoMode ? MOCK_RESOURCES : availableResources
    const resource = list.find(r => r.id === resourceId)
    if (!resource) return

    let nextSortOrder = 1
    const targetModule = modules.find(m => m.id === resourceModalModuleId)
    if (targetModule && targetModule.lessons.length > 0) {
      nextSortOrder = Math.max(...targetModule.lessons.map(l => (l as any).sort_order || 0)) + 1
    }

    if (!isDemoMode && resourceModalModuleId) {
      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('resources')
          .update({ 
            module_id: resourceModalModuleId,
            sort_order: nextSortOrder
          })
          .eq('id', resourceId)

        if (error) throw error
      } catch (err: any) {
        console.error('Error al vincular recurso:', err)
        toast.error('No se pudo vincular el recurso en la base de datos')
        return
      }
    }
    
    const newLesson = {
      id: resource.id,
      title: resource.name,
      type: resource.type,
      duration: resource.size,
      sort_order: nextSortOrder
    }

    setModules(prev => prev.map(m => 
      m.id === resourceModalModuleId
        ? { ...m, lessons: [...m.lessons, newLesson], lessonsCount: m.lessonsCount + 1 }
        : m
    ))
    
    setIsResourceModalOpen(false)
    setResourceModalModuleId(null)
    toast.success('Recurso vinculado correctamente')
  }

  const handleLinkForum = async (forumId: string) => {
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
    const list = isDemoMode ? [
      { id: 'f1', name: 'Foro: Impacto de la Gravedad en el Espacio' },
      { id: 'f2', name: 'Dudas y Consultas: Módulo Cinemática' }
    ] : availableForums
    const forum = list.find(f => f.id === forumId)
    if (!forum) return

    let lessonId = `forum_${Date.now()}`

    let nextSortOrder = 1
    const targetModule = modules.find(m => m.id === forumModalModuleId)
    if (targetModule && targetModule.lessons.length > 0) {
      nextSortOrder = Math.max(...targetModule.lessons.map(l => (l as any).sort_order || 0)) + 1
    }

    if (!isDemoMode && forumModalModuleId) {
      try {
        const supabase = createClient()
        const { data: dbForum } = await supabase
          .from('forums')
          .select('lesson_id')
          .eq('id', forumId)
          .maybeSingle()
        
        if (dbForum && dbForum.lesson_id) {
          lessonId = dbForum.lesson_id
          const { error } = await supabase
            .from('lessons')
            .update({ 
              module_id: forumModalModuleId,
              sort_order: nextSortOrder
            })
            .eq('id', lessonId)
          if (error) throw error
        } else {
          const { data: newLesson, error: lErr } = await supabase
            .from('lessons')
            .insert({
              module_id: forumModalModuleId,
              title: forum.name,
              type: 'forum',
              sort_order: nextSortOrder
            })
            .select()
            .single()
          if (lErr) throw lErr
          lessonId = newLesson.id

          const { error: fErr } = await supabase
            .from('forums')
            .update({ lesson_id: lessonId })
            .eq('id', forumId)
          if (fErr) throw fErr
        }
      } catch (err: any) {
        console.error('Error linking forum:', err)
        toast.error('No se pudo vincular el foro en la base de datos')
        return
      }
    }

    const newLesson = {
      id: lessonId,
      title: forum.name,
      type: 'forum' as const,
      duration: 'Foro de debate',
      sort_order: nextSortOrder
    }

    setModules(prev => prev.map(m =>
      m.id === forumModalModuleId
        ? { ...m, lessons: [...m.lessons, newLesson], lessonsCount: m.lessonsCount + 1 }
        : m
    ))

    setIsForumModalOpen(false)
    setForumModalModuleId(null)
    toast.success('Foro vinculado correctamente')
  }

  // --- Handlers for Module Config ---
  const handleCreateModule = async () => {
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    const newOrder = modules.length + 1
    const newTitle = 'Nuevo Módulo'

    if (!isDemoMode) {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('course_modules')
          .insert({ course_id: courseId, title: newTitle, sort_order: newOrder })
          .select()
          .single()

        if (error) throw error

        const newMod: CourseModule = {
          id: data.id,
          title: data.title,
          order: data.sort_order,
          lessonsCount: 0,
          lessons: []
        }
        setModules(prev => [...prev, newMod])
        setExpandedModules(prev => ({ ...prev, [newMod.id]: true }))
        setEditingModuleId(newMod.id)
        setEditingTitle(newMod.title)
        return
      } catch (err: any) {
        console.error('Error creando módulo:', err?.message || err?.code || JSON.stringify(err))
        toast.error('No se pudo crear el módulo')
        return
      }
    }

    // Demo mode — solo estado local
    const newMod: CourseModule = {
      id: `mod_${Date.now()}`,
      title: newTitle,
      order: newOrder,
      lessonsCount: 0,
      lessons: []
    }
    setModules(prev => [...prev, newMod])
    setExpandedModules(prev => ({ ...prev, [newMod.id]: true }))
    setEditingModuleId(newMod.id)
    setEditingTitle(newMod.title)
  }

  const handleDeleteModule = (moduleId: string) => {
    toast.warning('¿Estás seguro de que deseas eliminar este módulo completo?', {
      description: 'Se eliminarán todos sus recursos.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
            process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

          if (!isDemoMode) {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('course_modules')
                .delete()
                .eq('id', moduleId)
              if (error) throw error
            } catch (err: any) {
              console.error('Error eliminando módulo:', err?.message || err?.code || JSON.stringify(err))
              toast.error('No se pudo eliminar el módulo')
              return
            }
          }

          setModules(prev => {
            const filtered = prev.filter(m => m.id !== moduleId)
            return filtered.map((m, idx) => ({ ...m, order: idx + 1 }))
          })
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const handleStartRename = (mod: CourseModule) => {
    setEditingModuleId(mod.id)
    setEditingTitle(mod.title)
  }

  const handleSaveRename = async (moduleId: string) => {
    const trimmed = editingTitle.trim() || 'Nuevo Módulo'
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (!isDemoMode && !moduleId.startsWith('mod_')) {
      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('course_modules')
          .update({ title: trimmed })
          .eq('id', moduleId)
        if (error) throw error
      } catch (err: any) {
        console.error('Error renombrando módulo:', err?.message || err?.code || JSON.stringify(err))
        toast.error('No se pudo guardar el nombre del módulo')
      }
    }

    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, title: trimmed } : m))
    setEditingModuleId(null)
    setEditingTitle('')
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Estructura del Curso
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gestiona los módulos, sube material y organiza el temario.
          </p>
        </div>
        <button 
          onClick={handleCreateModule}
          className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all px-4 py-2.5 text-sm font-semibold text-white self-start sm:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Nuevo Módulo</span>
        </button>
      </div>

      {/* Lista de Módulos (Acordeones) */}
      <div className="space-y-4">
        {modules.map((mod, idx) => {
          const isExpanded = expandedModules[mod.id]
          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden dark:border-slate-800/60 dark:bg-slate-900"
            >
              {/* Header Módulo */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                onClick={() => toggleModule(mod.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="cursor-grab text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400" onClick={(e) => e.stopPropagation()}>
                    <GripVertical className="h-5 w-5 pointer-events-none" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center min-h-[44px]">
                    {editingModuleId === mod.id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <FolderOpen className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                        <span className="text-base font-bold text-slate-900 dark:text-white shrink-0">Módulo {mod.order}:</span>
                        <input 
                          autoFocus
                          type="text"
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveRename(mod.id)
                            if (e.key === 'Escape') setEditingModuleId(null)
                          }}
                          onBlur={() => handleSaveRename(mod.id)}
                          className="px-2 py-1 bg-white border border-blue-500 rounded-md outline-none text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white w-full max-w-[200px]"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <FolderOpen className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                          Módulo {mod.order}: {mod.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{mod.lessonsCount} recursos</p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setOpenDropdownId(openDropdownId === mod.id ? null : mod.id); 
                      }}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <Settings2 className="h-4 w-4 pointer-events-none" />
                    </button>
                    {openDropdownId === mod.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-white shadow-lg border border-slate-100 dark:border-slate-800 dark:bg-slate-900 z-10 py-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => { handleStartRename(mod); setOpenDropdownId(null); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Renombrar
                        </button>
                        <button 
                          onClick={() => { handleDeleteModule(mod.id); setOpenDropdownId(null); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800"
                        >
                          Eliminar Módulo
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-1.5 rounded-full bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                    {isExpanded ? <ChevronUp className="h-4 w-4 pointer-events-none" /> : <ChevronDown className="h-4 w-4 pointer-events-none" />}
                  </div>
                </div>
              </div>

              {/* Contenido (Lecciones) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-50 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-900/50 p-4"
                  >
                    <Reorder.Group
                      axis="y"
                      values={mod.lessons}
                      onReorder={(newOrder) => handleReorderLessons(mod.id, newOrder)}
                      className="space-y-2"
                    >
                      {mod.lessons.map((lesson) => (
                        <Reorder.Item 
                          key={lesson.id}
                          value={lesson}
                          className="group flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 hover:border-blue-100 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 transition-all cursor-grab active:cursor-grabbing relative"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-slate-200 hover:text-slate-400 dark:text-slate-700 dark:hover:text-slate-500">
                              <GripVertical className="h-4 w-4 pointer-events-none" />
                            </div>
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-900">
                              {getLessonIcon(lesson.type)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                {lesson.title}
                                {lesson.status === 'draft' && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase dark:bg-slate-800 dark:text-slate-400">
                                    Borrador
                                  </span>
                                )}
                              </p>
                              {lesson.duration && (
                                <p className="text-[10px] font-medium text-slate-400">{lesson.duration}</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Acciones de Lección (solo on hover en desktop) */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {lesson.type === 'forum' && (
                              <button 
                                onClick={() => handleGoToForumBoard(lesson.id)}
                                className="p-1.5 rounded text-slate-400 hover:bg-pink-50 hover:text-pink-650 dark:hover:bg-slate-800 dark:hover:text-pink-400"
                                title="Ir al foro (iniciar/ver discusiones)"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleOpenConfig(mod.id, lesson)}
                              className="p-1.5 rounded text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                              title="Configuración del recurso"
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteLesson(mod.id, lesson.id)}
                              className="p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400"
                              title="Eliminar recurso"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>

                    {/* Botón Añadir Lección Rápido */}
                    <div className="pt-2 mt-2 relative">
                      {addMenuModuleId === mod.id ? (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-wrap gap-2 p-3 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10"
                        >
                          <button onClick={() => handleQuickAddLesson(mod.id, 'video')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white shadow-sm border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-rose-400 transition-all">
                            <Video className="h-3.5 w-3.5" /> Video
                          </button>
                          <button onClick={() => handleQuickAddLesson(mod.id, 'pdf')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white shadow-sm border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-blue-400 transition-all">
                            <FileText className="h-3.5 w-3.5" /> Archivo
                          </button>
                          <button onClick={() => handleQuickAddLesson(mod.id, 'text')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white shadow-sm border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-emerald-400 transition-all">
                            <File className="h-3.5 w-3.5" /> Texto
                          </button>
                          <button onClick={() => handleQuickAddLesson(mod.id, 'quiz')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white shadow-sm border border-slate-200 text-slate-700 hover:text-purple-600 hover:border-purple-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-purple-400 transition-all">
                            <HelpCircle className="h-3.5 w-3.5" /> Evaluación
                          </button>
                          <button onClick={() => handleQuickAddLesson(mod.id, 'task')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white shadow-sm border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-orange-400 transition-all">
                            <ClipboardList className="h-3.5 w-3.5" /> Tarea
                          </button>
                          <button onClick={() => handleQuickAddLesson(mod.id, 'forum')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white shadow-sm border border-slate-200 text-slate-700 hover:text-pink-600 hover:border-pink-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-pink-400 transition-all">
                            <BookOpen className="h-3.5 w-3.5" /> Foro
                          </button>
                          
                          <button onClick={() => setAddMenuModuleId(null)} className="ml-auto flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            Cerrar
                          </button>
                        </motion.div>
                      ) : (
                        <button 
                          onClick={() => setAddMenuModuleId(mod.id)}
                          className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 w-full p-3 text-sm font-medium text-slate-500 hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-600 transition-all dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                        >
                          <Plus className="h-4 w-4" />
                          Añadir recurso al módulo
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

          )
        })}
      </div>

      {/* Modal para Vincular Quiz */}
      <AnimatePresence>
        {isQuizModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuizModalOpen(false)}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 m-auto h-fit max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vincular Quiz</h2>
                  <button onClick={() => setIsQuizModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-6">Selecciona un quiz de tu banco para añadirlo a este módulo.</p>
                
                <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-2">
                  {availableQuizzes.map(quiz => (
                    <div 
                      key={quiz.id} 
                      onClick={() => handleLinkQuiz(quiz.id)}
                      className="group flex items-center justify-between rounded-xl border border-slate-100 p-4 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 cursor-pointer transition-all" 
                    >
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{quiz.title}</h4>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5"/> {quiz.duration}</span>
                          <span>•</span>
                          <span className={`${quiz.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {quiz.status === 'active' ? 'Activo' : 'Borrador'}
                          </span>
                        </div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors dark:bg-slate-800 dark:group-hover:bg-blue-900/40">
                        <Plus className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                  {availableQuizzes.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                      No hay quizzes disponibles para vincular.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal para Vincular Archivo/Recurso */}
      <AnimatePresence>
        {isResourceModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResourceModalOpen(false)}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 m-auto h-fit max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vincular Archivo</h2>
                  <button onClick={() => setIsResourceModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-6">Selecciona un archivo de tu Biblioteca de Recursos para añadirlo a este módulo.</p>
                
                <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-2">
                  {availableResources.map(resource => (
                    <div 
                      key={resource.id} 
                      onClick={() => handleLinkResource(resource.id)}
                      className="group flex items-center justify-between rounded-xl border border-slate-100 p-4 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 cursor-pointer transition-all" 
                    >
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{resource.name}</h4>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5"/> {resource.type.toUpperCase()}</span>
                          <span>•</span>
                          <span>{resource.size}</span>
                        </div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors dark:bg-slate-800 dark:group-hover:bg-blue-900/40">
                        <Plus className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                  {availableResources.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                      No hay archivos disponibles para vincular.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal para Vincular Foro */}
      <AnimatePresence>
        {isForumModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsForumModalOpen(false)}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 m-auto h-fit max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vincular Foro</h2>
                  <button onClick={() => setIsForumModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-6">Selecciona un foro de tu biblioteca para añadirlo a este módulo.</p>
                
                <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-2">
                  {availableForums.map(forum => (
                    <div 
                      key={forum.id} 
                      onClick={() => handleLinkForum(forum.id)}
                      className="group flex items-center justify-between rounded-xl border border-slate-100 p-4 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 cursor-pointer transition-all" 
                    >
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{forum.name}</h4>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-pink-500"/> Foro</span>
                        </div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors dark:bg-slate-800 dark:group-hover:bg-blue-900/40">
                        <Plus className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                  {availableForums.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                      No hay foros disponibles para vincular. Puedes crearlos en la sección de Recursos.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
