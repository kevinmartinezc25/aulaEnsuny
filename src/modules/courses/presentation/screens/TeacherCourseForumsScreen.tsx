'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  MessageSquare, 
  Plus, 
  ExternalLink, 
  Settings, 
  Trash2, 
  Calendar, 
  Award, 
  BookOpen, 
  MessageCircle, 
  AlertCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'
import { getForumsByCourseId } from '../../application/forumActions'

interface ForumItem {
  id: string
  lessonId: string
  forumType: 'debate' | 'qa' | 'social'
  isGraded: boolean
  dueDate: string | null
  createdAt: string
  title: string
  description: string
  threadsCount: number
  repliesCount: number
}

export function TeacherCourseForumsScreen({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [forums, setForums] = useState<ForumItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadForums = async () => {
    try {
      setLoading(true)
      const data = await getForumsByCourseId(courseId)
      setForums(data)
    } catch (err) {
      console.error('Error loading course forums:', err)
      toast.error('No se pudieron cargar los foros del curso')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForums()
  }, [courseId])

  const handleDeleteForum = (id: string, lessonId: string) => {
    toast.warning('¿Eliminar foro?', {
      description: 'Esta acción eliminará el foro, todos sus hilos de discusión y respuestas. No se puede deshacer.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
            process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

          if (!isDemoMode) {
            try {
              const supabase = createClient()
              if (lessonId) {
                // Deleting the lesson will cascade delete the forum configuration
                const { error } = await supabase
                  .from('lessons')
                  .delete()
                  .eq('id', lessonId)
                if (error) throw error
              } else {
                const { error } = await supabase
                  .from('forums')
                  .delete()
                  .eq('id', id)
                if (error) throw error
              }
              toast.success('Foro eliminado correctamente')
            } catch (err: any) {
              console.error('Error deleting forum:', err)
              toast.error('No se pudo eliminar el foro de la base de datos')
              return
            }
          } else {
            // Demo mode: local deletion
            toast.success('Foro eliminado correctamente (Modo Demo)')
          }
          setForums(prev => prev.filter(f => f.id !== id))
        }
      }
    })
  }

  const getForumTypeBadge = (type: 'debate' | 'qa' | 'social') => {
    switch (type) {
      case 'debate':
        return (
          <span className="rounded-full bg-pink-50 text-pink-650 dark:bg-pink-950/20 dark:text-pink-400 border border-pink-100 dark:border-pink-900/35 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Debate Evaluativo
          </span>
        )
      case 'qa':
        return (
          <span className="rounded-full bg-blue-50 text-blue-650 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/35 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Dudas y Soporte (Q&A)
          </span>
        )
      case 'social':
        return (
          <span className="rounded-full bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Foro Social
          </span>
        )
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-pink-500" /> Foros de Discusión
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Administra los foros del curso, crea nuevos temas de debate o accede a responder a tus estudiantes.
          </p>
        </div>
        <button
          onClick={() => router.push(`/teacher/courses/${courseId}/resources/new?type=forum`)}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow transition-all active:scale-[0.98] border-none cursor-pointer"
        >
          <Plus size={14} /> Crear Foro
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400 gap-3">
          <BookOpen className="h-10 w-10 animate-pulse text-slate-300" />
          <p className="text-xs">Cargando los foros del curso...</p>
        </div>
      ) : forums.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
          <BookOpen className="h-16 w-16 text-slate-200 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">No hay foros creados en este curso</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
            Los foros permiten a los estudiantes debatir, plantear dudas o interactuar libremente. Crea uno ahora para iniciar la interacción.
          </p>
          <button
            onClick={() => router.push(`/teacher/courses/${courseId}/resources/new?type=forum`)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow border-none cursor-pointer"
          >
            <Plus size={14} /> Crear el primer foro
          </button>
        </div>
      ) : (
        /* Forums Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {forums.map((forum, index) => (
            <motion.div
              key={forum.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col justify-between p-6 bg-white dark:bg-slate-900/65 rounded-2xl border border-slate-100 dark:border-slate-800/65 hover:border-slate-200 dark:hover:border-slate-700/80 hover:shadow-md transition-all duration-350"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {getForumTypeBadge(forum.forumType)}
                  <div className="flex items-center gap-1.5">
                    {forum.isGraded && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/35 px-2 py-0.5 text-[9px] font-bold">
                        <Award size={10} /> Calificable
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{forum.title}</h3>
                  <p className="text-xs text-slate-450 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">{forum.description}</p>
                </div>

                {/* Deadlines and dates */}
                {forum.dueDate && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-500 font-semibold bg-amber-50/40 dark:bg-amber-950/10 rounded-lg p-2 w-fit">
                    <Clock size={12} />
                    <span>Límite: {new Date(forum.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>

              {/* Forum Stats and Actions */}
              <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between gap-4">
                {/* Stats */}
                <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-xs">
                  <div className="flex items-center gap-1" title="Temas / Discusiones">
                    <MessageSquare size={14} className="text-slate-400" />
                    <span className="font-bold">{forum.threadsCount}</span>
                    <span className="text-[10px] text-slate-400">hilos</span>
                  </div>
                  <div className="flex items-center gap-1" title="Aportaciones / Respuestas">
                    <MessageCircle size={14} className="text-slate-400" />
                    <span className="font-bold">{forum.repliesCount}</span>
                    <span className="text-[10px] text-slate-400">respuestas</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDeleteForum(forum.id, forum.lessonId)}
                    className="p-2 rounded-xl border border-slate-100 bg-white hover:bg-red-50 text-slate-400 hover:text-red-650 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-red-950/20 dark:hover:text-red-400 active:scale-95 transition-all cursor-pointer"
                    title="Eliminar foro"
                  >
                    <Trash2 size={13.5} />
                  </button>

                  <button
                    onClick={() => router.push(`/teacher/courses/${courseId}/resources/${forum.id}/edit?type=forum`)}
                    className="p-2 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 active:scale-95 transition-all cursor-pointer"
                    title="Editar configuración"
                  >
                    <Settings size={13.5} />
                  </button>

                  <button
                    onClick={() => router.push(`/teacher/courses/${courseId}/forums/${forum.id}`)}
                    className="inline-flex items-center gap-1 bg-pink-600 hover:bg-pink-700 px-3.5 py-2 rounded-xl text-[10px] font-bold text-white shadow-sm transition-all active:scale-[0.97] border-none cursor-pointer"
                    title="Ingresar al foro (ver tablero)"
                  >
                    Ingresar <ExternalLink size={10} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
