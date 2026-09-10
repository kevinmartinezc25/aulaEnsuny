'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  MessageSquare, 
  MessageCircle, 
  Plus, 
  Pin, 
  Lock, 
  CheckCircle, 
  Clock, 
  Award,
  ChevronRight,
  BookOpen,
  Edit,
  CornerDownRight,
  RotateCw
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'
import { 
  getForumById, 
  getForumThreads, 
  createForumThread, 
  getThreadReplies, 
  createForumReply, 
  togglePinThread, 
  toggleLockThread, 
  verifyForumReply,
  updateForumThread,
  updateForumReply,
  toggleLikeReply,
  deleteForumReply,
  ForumThread,
  ForumReply,
  ForumConfig
} from '../../application/forumActions'

import { MiniForumEditor } from '@/core/components/MiniForumEditor'
import { ForumReplyCard } from '../components/ForumReplyCard'

function fixHtmlSpaces(html: string): string {
  if (!html) return ''
  return html
    .replace(/&nbsp;/gi, ' ')
    .replace(/(<\/(?:span|strong|b|em|i|u|p|div|h[1-6]|li|a)>)([A-Za-z0-9áéíóúÁÉÍÓÚñÑ])/g, '$1 $2')
    .replace(/([a-zA-ZáéíóúÁÉÍÓÚñÑ]):([a-zA-ZáéíóúÁÉÍÓÚñÑ])/g, '$1: $2')
    .replace(/<a(?![^>]*target=)([^>]+)>/gi, '<a$1 target="_blank" rel="noopener noreferrer">')
}

function cleanHtmlPreview(html: string, maxLength: number = 0): string {
  if (!html) return ''
  let clean = fixHtmlSpaces(html)
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (maxLength > 0 && clean.length > maxLength) {
    return clean.substring(0, maxLength) + '...'
  }
  return clean
}

function stripHtml(html: string): string {
  return cleanHtmlPreview(html, 0)
}

function isContentEmpty(content: string): boolean {
  if (!content) return true
  const trimmed = content.trim()
  return trimmed === '' || trimmed === '<p><br></p>' || trimmed === '<p></p>'
}

export function TeacherForumBoardScreen({ 
  courseId, 
  forumId 
}: { 
  courseId: string
  forumId: string 
}) {
  const router = useRouter()
  const [forumConfig, setForumConfig] = useState<ForumConfig | null>(null)
  const [forumThreads, setForumThreads] = useState<ForumThread[]>([])
  const [activeThread, setActiveThread] = useState<ForumThread | null>(null)
  const [threadReplies, setThreadReplies] = useState<ForumReply[]>([])
  
  const [loading, setLoading] = useState(true)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('teacher')
  
  // Forms state
  const [isCreatingThread, setIsCreatingThread] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [newReplyContent, setNewReplyContent] = useState('')

  // States for Editing Threads and Replies
  const [isEditingActiveThread, setIsEditingActiveThread] = useState(false)
  const [editThreadTitle, setEditThreadTitle] = useState('')
  const [editThreadContent, setEditThreadContent] = useState('')
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editReplyContent, setEditReplyContent] = useState('')
  const [replyingToParentId, setReplyingToParentId] = useState<string | null>(null)
  const [inlineReplyContent, setInlineReplyContent] = useState('')

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, roles(name)')
          .eq('id', user.id)
          .maybeSingle()
        if (profile && profile.roles) {
          setUserRole(profile.roles.name)
        }
      } else {
        setUserId('docente-id') // demo fallback
      }

      // Fetch forum config
      const config = await getForumById(forumId)
      if (!config) {
        toast.error('Foro no encontrado')
        router.push(`/teacher/courses/${courseId}/forums`)
        return
      }
      setForumConfig(config)

      // Fetch threads
      const threads = await getForumThreads(forumId)
      setForumThreads(threads)
    } catch (err) {
      console.error('Error loading forum board data:', err)
      toast.error('Error al cargar la información del foro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [courseId, forumId])

  useEffect(() => {
    if (!activeThread) {
      setThreadReplies([])
      return
    }

    const loadReplies = async () => {
      try {
        setLoadingReplies(true)
        const replies = await getThreadReplies(activeThread.id, userId || undefined)

        // Merge with local likes cache so likes persist reliably
        const storageKey = `forum_likes_${userId || 'anon'}`
        let localLikes: Record<string, boolean> = {}
        try {
          localLikes = JSON.parse(localStorage.getItem(storageKey) || '{}')
        } catch {}

        const merged = replies.map(r => {
          const isLikedLocally = !!localLikes[r.id]
          const hasLiked = r.hasLiked || isLikedLocally
          return {
            ...r,
            hasLiked,
            likesCount: Math.max(r.likesCount || 0, isLikedLocally && !r.hasLiked ? (r.likesCount || 0) + 1 : (r.likesCount || 0))
          }
        })
        setThreadReplies(merged)
      } catch (err) {
        console.error('Error loading replies:', err)
      } finally {
        setLoadingReplies(false)
      }
    }

    loadReplies()
  }, [activeThread?.id])

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThreadTitle.trim() || isContentEmpty(newThreadContent) || !forumConfig) {
      toast.error('El título y contenido son requeridos')
      return
    }

    try {
      const authorIdToUse = userId || 'docente-id'
      const result = await createForumThread({
        forumId: forumConfig.id,
        authorId: authorIdToUse,
        title: newThreadTitle.trim(),
        content: newThreadContent.trim()
      })

      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        setForumThreads(prev => [result.data!, ...prev])
        setNewThreadTitle('')
        setNewThreadContent('')
        setIsCreatingThread(false)
        toast.success('Discusión iniciada exitosamente')
      }
    } catch (err) {
      console.error('Error creating thread:', err)
      toast.error('Error al crear el hilo de discusión')
    }
  }

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isContentEmpty(newReplyContent) || !activeThread) {
      toast.error('El contenido de la respuesta es requerido')
      return
    }

    try {
      const authorIdToUse = userId || 'docente-id'
      const result = await createForumReply({
        threadId: activeThread.id,
        authorId: authorIdToUse,
        content: newReplyContent.trim()
      })

      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        setThreadReplies(prev => [...prev, result.data!])
        setNewReplyContent('')
        toast.success('Respuesta agregada exitosamente')
        
        // Update reply count in local list
        setForumThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, repliesCount: t.repliesCount + 1 } : t))
      }
    } catch (err) {
      console.error('Error creating reply:', err)
      toast.error('Error al agregar respuesta')
    }
  }

  const handleCreateInlineReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault()
    if (isContentEmpty(inlineReplyContent) || !activeThread) {
      toast.error('El contenido de la respuesta es requerido')
      return
    }

    try {
      const authorIdToUse = userId || 'docente-id'
      const result = await createForumReply({
        threadId: activeThread.id,
        parentId,
        authorId: authorIdToUse,
        content: inlineReplyContent.trim()
      })

      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        setThreadReplies(prev => [...prev, result.data!])
        setInlineReplyContent('')
        setReplyingToParentId(null)
        toast.success('Respuesta agregada exitosamente')
        setForumThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, repliesCount: t.repliesCount + 1 } : t))
      }
    } catch (err) {
      console.error('Error creating inline reply:', err)
      toast.error('Error al agregar respuesta')
    }
  }

  const canEditStudent = (createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt).getTime()
    return elapsed < 10 * 60 * 1000
  }

  const handleStartEditThread = (thread: ForumThread) => {
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
      const result = await updateForumThread(activeThread.id, editThreadTitle.trim(), editThreadContent.trim())

      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        setActiveThread(prev => prev ? { ...prev, title: result.data!.title, content: result.data!.content } : null)
        setForumThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, title: result.data!.title, content: result.data!.content } : t))
        setIsEditingActiveThread(false)
        toast.success('Tema actualizado exitosamente')
      }
    } catch (err) {
      console.error('Error updating thread:', err)
      toast.error('Error al actualizar el tema')
    }
  }

  const handleStartEditReply = (reply: ForumReply) => {
    setEditingReplyId(reply.id)
    setEditReplyContent(reply.content)
  }

  const handleSaveEditReply = async (replyId: string, contentToSave?: string) => {
    const text = (contentToSave !== undefined ? contentToSave : editReplyContent).trim()
    if (isContentEmpty(text)) {
      toast.error('El contenido de la respuesta es requerido')
      return
    }

    try {
      const result = await updateForumReply(replyId, text)

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

  const handleLikeReply = async (replyId: string) => {
    try {
      const storageKey = `forum_likes_${userId || 'anon'}`
      let localLikes: Record<string, boolean> = {}
      try {
        localLikes = JSON.parse(localStorage.getItem(storageKey) || '{}')
      } catch {}

      const currentReply = threadReplies.find(r => r.id === replyId)
      const wasLiked = currentReply?.hasLiked ?? (!!localLikes[replyId])
      const nextLiked = !wasLiked

      if (nextLiked) {
        localLikes[replyId] = true
      } else {
        delete localLikes[replyId]
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(localLikes))
      } catch {}

      const res = await toggleLikeReply(replyId, userId || undefined, wasLiked)
      setThreadReplies(prev => prev.map(r => r.id === replyId ? {
        ...r,
        likesCount: res.likesCount,
        hasLiked: res.hasLiked
      } : r))
    } catch (err) {
      console.error('Error toggling like:', err)
    }
  }

  const handleDeleteReply = async (replyId: string) => {
    try {
      const success = await deleteForumReply(replyId)
      if (success) {
        setThreadReplies(prev => prev.filter(r => r.id !== replyId && r.parentId !== replyId))
        toast.success('Aportación eliminada exitosamente')
        if (activeThread) {
          setForumThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, repliesCount: Math.max(0, t.repliesCount - 1) } : t))
        }
      } else {
        toast.error('Error al eliminar la aportación')
      }
    } catch (err) {
      console.error('Error deleting reply:', err)
      toast.error('Error al eliminar la aportación')
    }
  }

  const handleCreateInlineReplySubmit = async (parentId: string, content: string) => {
    if (isContentEmpty(content) || !activeThread) {
      toast.error('El contenido de la respuesta es requerido')
      return
    }

    try {
      const authorIdToUse = userId || 'docente-id'
      const result = await createForumReply({
        threadId: activeThread.id,
        parentId,
        authorId: authorIdToUse,
        content: content.trim()
      })

      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        setThreadReplies(prev => [...prev, result.data!])
        setReplyingToParentId(null)
        toast.success('Respuesta agregada exitosamente')
        setForumThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, repliesCount: t.repliesCount + 1 } : t))
      }
    } catch (err) {
      console.error('Error creating inline reply:', err)
      toast.error('Error al agregar respuesta')
    }
  }

  const handleTogglePin = async (thread: ForumThread) => {
    try {
      const success = await togglePinThread(thread.id, !thread.isPinned)
      if (success) {
        setForumThreads(prev => prev.map(t => t.id === thread.id ? { ...t, isPinned: !t.isPinned } : t).sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }))
        if (activeThread?.id === thread.id) {
          setActiveThread(prev => prev ? { ...prev, isPinned: !prev.isPinned } : null)
        }
        toast.success(thread.isPinned ? 'Tema desfijado' : 'Tema fijado exitosamente')
      }
    } catch (err) {
      console.error('Error toggling pin:', err)
    }
  }

  const handleToggleLock = async (thread: ForumThread) => {
    try {
      const success = await toggleLockThread(thread.id, !thread.isLocked)
      if (success) {
        setForumThreads(prev => prev.map(t => t.id === thread.id ? { ...t, isLocked: !t.isLocked } : t))
        if (activeThread?.id === thread.id) {
          setActiveThread(prev => prev ? { ...prev, isLocked: !prev.isLocked } : null)
        }
        toast.success(thread.isLocked ? 'Tema desbloqueado' : 'Tema bloqueado para respuestas')
      }
    } catch (err) {
      console.error('Error toggling lock:', err)
    }
  }

  const handleVerifyReply = async (replyId: string, verified: boolean) => {
    try {
      const success = await verifyForumReply(replyId, verified, verified)
      if (success) {
        setThreadReplies(prev => prev.map(r => r.id === replyId ? { ...r, isTeacherVerified: verified, isHelpful: verified } : r))
        toast.success(verified ? 'Aportación marcada como verificada' : 'Verificación removida')
      }
    } catch (err) {
      console.error('Error verifying reply:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
        <BookOpen className="h-10 w-10 animate-pulse text-slate-300" />
        <p className="text-xs">Cargando tablero del foro...</p>
      </div>
    )
  }

  if (!forumConfig) return null

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Top Header matching reference image */}
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push(`/teacher/courses/${courseId}/forums`)}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
            title="Volver a los foros"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {forumConfig.title.toLowerCase().startsWith('foro:') ? forumConfig.title : `Foro: ${forumConfig.title}`}
            </h1>
            <div className="mt-1">
              <span className="inline-flex items-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold px-3 py-0.5 rounded-full">
                {activeThread ? threadReplies.length : forumThreads.reduce((acc, t) => acc + (t.repliesCount || 0), 0)} {(activeThread ? threadReplies.length : forumThreads.reduce((acc, t) => acc + (t.repliesCount || 0), 0)) === 1 ? 'respuesta' : 'respuestas'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(`/teacher/courses/${courseId}/forums`)}
          className="border border-blue-200 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <RotateCw className="h-4 w-4" />
          <span>Volver al foro</span>
        </button>
      </div>

      {/* Forum Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/60 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 text-blue-650 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {forumConfig.forumType === 'debate' ? 'Debate Evaluativo' : forumConfig.forumType === 'qa' ? 'Dudas y Soporte' : 'Foro Social'}
            </span>
            {forumConfig.isGraded && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/35 px-2 py-0.5 text-[9px] font-bold">
                <Award size={10} /> Calificable
              </span>
            )}
          </div>
          {forumConfig.dueDate && (
            <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-500 font-semibold bg-amber-50/40 dark:bg-amber-950/10 rounded-lg p-2">
              <Clock size={12} />
              <span>Fecha Límite: {new Date(forumConfig.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{forumConfig.description}</p>
      </div>

      {/* Main interactive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Threads list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discusiones ({forumThreads.length})</h3>
            <button
              onClick={() => {
                setActiveThread(null)
                setIsCreatingThread(true)
              }}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow transition-all active:scale-[0.98] border-none cursor-pointer"
            >
              <Plus size={12} /> Iniciar tema
            </button>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {forumThreads.map(thread => {
              const isActive = activeThread?.id === thread.id
              return (
                <div
                  key={thread.id}
                  onClick={() => {
                    setIsCreatingThread(false)
                    setActiveThread(thread)
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-50 border-blue-200 shadow-sm dark:bg-blue-900/10 dark:border-blue-800' 
                      : 'bg-white border-slate-100 hover:bg-slate-50/50 dark:bg-slate-900/40 dark:border-slate-800/60 dark:hover:bg-slate-800/20'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <h4 className={`text-xs font-bold truncate flex items-center gap-1 ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {thread.isPinned && <Pin size={10} className="text-amber-500 fill-amber-500 shrink-0" />}
                      {thread.isLocked && <Lock size={10} className="text-slate-400 shrink-0" />}
                      {thread.title}
                    </h4>
                    <p className="text-[11px] text-slate-450 dark:text-slate-400 line-clamp-1 leading-snug">{stripHtml(thread.content)}</p>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                      <span className="font-semibold truncate">{thread.authorName}</span>
                      <span className="flex items-center gap-0.5 shrink-0"><MessageCircle size={11} /> {thread.repliesCount}</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {forumThreads.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80">
                Aún no hay discusiones en este foro.<br />Haz clic en "Iniciar tema" para abrir el primer debate.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active thread view or Creation form */}
        <div className="lg:col-span-2">
          {isCreatingThread ? (
            /* Create Thread Form */
            <form onSubmit={handleCreateThread} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Iniciar nuevo tema de discusión</h3>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título de la discusión</label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="Ej. Análisis crítico del poema 'Los Heraldos Negros'"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Argumento o pregunta detonante</label>
                <MiniForumEditor
                  value={newThreadContent}
                  onChange={setNewThreadContent}
                  placeholder="Redacta la explicación inicial, duda o postura del debate..."
                  minHeight="180px"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreatingThread(false)}
                  className="rounded-xl border border-slate-250 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow transition-all active:scale-[0.98] border-none cursor-pointer"
                >
                  Iniciar Discusión
                </button>
              </div>
            </form>
          ) : activeThread ? (
            /* Thread Detail & Replies */
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
                {/* Thread Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                      {activeThread.isPinned && <Pin size={12} className="text-amber-500 fill-amber-500" />}
                      {activeThread.isLocked && <Lock size={12} className="text-slate-400" />}
                      {activeThread.title}
                    </h2>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                      <span className="font-bold">{activeThread.authorName}</span>
                      <span>•</span>
                      <span>{new Date(activeThread.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Actions for teacher */}
                  <div className="flex gap-1.5">
                    {userId === activeThread.authorId && (userRole !== 'student' || canEditStudent(activeThread.createdAt)) && !isEditingActiveThread && (
                      <button
                        onClick={() => handleStartEditThread(activeThread)}
                        className="p-2 rounded-xl border bg-white border-slate-100 hover:bg-slate-50 text-slate-400 dark:bg-slate-950 dark:border-slate-800 hover:text-blue-600 active:scale-95 transition-all cursor-pointer"
                        title="Editar Tema"
                      >
                        <Edit size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleTogglePin(activeThread)}
                      className={`p-2 rounded-xl border cursor-pointer active:scale-95 transition-all ${
                        activeThread.isPinned
                          ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40'
                          : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-400 dark:bg-slate-950 dark:border-slate-800'
                      }`}
                      title={activeThread.isPinned ? 'Desfijar del inicio' : 'Fijar al inicio'}
                    >
                      <Pin size={13} className={activeThread.isPinned ? 'fill-amber-500' : ''} />
                    </button>
                    <button
                      onClick={() => handleToggleLock(activeThread)}
                      className={`p-2 rounded-xl border cursor-pointer active:scale-95 transition-all ${
                        activeThread.isLocked
                          ? 'bg-slate-100 border-slate-200 text-slate-655 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                          : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-400 dark:bg-slate-950 dark:border-slate-800'
                      }`}
                      title={activeThread.isLocked ? 'Desbloquear tema' : 'Bloquear tema'}
                    >
                      <Lock size={13} />
                    </button>
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
                    {/* Content */}
                    <div 
                      className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-2 border-t border-slate-50 dark:border-slate-800/60 ql-editor !p-0"
                      dangerouslySetInnerHTML={{ __html: fixHtmlSpaces(activeThread.content) }}
                    />
                  </>
                )}
              </div>

              {/* Replies Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pl-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Aportaciones ({threadReplies.length})
                  </h3>
                </div>
                
                {loadingReplies ? (
                  <div className="text-center py-8 text-xs text-slate-400">Cargando respuestas...</div>
                ) : (
                  <div className="space-y-4">
                    {threadReplies
                      .filter(r => !r.parentId)
                      .map(reply => (
                        <ForumReplyCard
                          key={reply.id}
                          reply={reply}
                          currentUserId={userId}
                          currentUserRole={userRole}
                          allReplies={threadReplies}
                          level={0}
                          onLike={handleLikeReply}
                          onStartEdit={handleStartEditReply}
                          onSaveEdit={handleSaveEditReply}
                          onCancelEdit={() => setEditingReplyId(null)}
                          isEditing={editingReplyId === reply.id}
                          editContent={editReplyContent}
                          setEditContent={setEditReplyContent}
                          onDelete={handleDeleteReply}
                          onVerify={handleVerifyReply}
                          replyingToId={replyingToParentId}
                          setReplyingToId={setReplyingToParentId}
                          onSubmitReply={handleCreateInlineReplySubmit}
                          allowNestedReplies={forumConfig?.allowNestedReplies !== false}
                          isThreadLocked={activeThread.isLocked}
                        />
                      ))}
                    
                    {threadReplies.length === 0 && (
                      <div className="text-center py-10 px-4 text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        Aún no hay aportaciones en este tema. Escribe un comentario para iniciar la conversación.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reply Form */}
              {activeThread.isLocked ? (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-5 border border-dashed text-center text-xs text-slate-500">
                  Este tema de discusión ha sido bloqueado y no admite nuevas aportaciones.
                </div>
              ) : (
                <form onSubmit={handleCreateReply} className="space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 pl-0.5">
                    Escribir aportación en el tema
                  </label>
                  <MiniForumEditor
                    value={newReplyContent}
                    onChange={setNewReplyContent}
                    placeholder="Escribe tu comentario o respuesta al tema..."
                    minHeight="100px"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow transition-all active:scale-[0.98] border-none cursor-pointer"
                    >
                      Publicar respuesta
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* No Active Thread selected empty state */
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-6 bg-slate-50/30 dark:bg-slate-900/20 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Ningún tema seleccionado</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs leading-normal">
                Selecciona una discusión de la lista de la izquierda para ver su contenido y aportaciones de los alumnos, o haz clic en "Iniciar tema".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
