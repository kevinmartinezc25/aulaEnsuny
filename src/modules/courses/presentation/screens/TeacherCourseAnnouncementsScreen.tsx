'use client'

import React, { useState, useEffect } from 'react'
import { 
  Megaphone, Plus, Search, MoreVertical, Edit, Trash2, Pin, PinOff, Calendar, 
  Clock, CheckCircle, FileText, Link as LinkIcon, Paperclip, X, AlertTriangle, 
  Bell, BookOpen, Trophy, ArrowRight, Eye, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  getAnnouncementsByCourse, saveAnnouncement, deleteAnnouncement, 
  getAnnouncementReadStats, CourseAnnouncement 
} from '../../application/announcementActions'
import { createClient } from '@/core/config/supabase/client'

export function TeacherCourseAnnouncementsScreen({ courseId }: { courseId: string }) {
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([])
  const [readStats, setReadStats] = useState<Record<string, { readCount: number; totalStudents: number }>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<CourseAnnouncement | null>(null)
  
  // Form State
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState<CourseAnnouncement['type']>('announcement')
  const [formContent, setFormContent] = useState('')
  const [formIsPinned, setFormIsPinned] = useState(false)
  const [publishOption, setPublishOption] = useState<'now' | 'schedule'>('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [formAttachments, setFormAttachments] = useState<{ name: string; url: string; type: string }[]>([])
  const [newAttachmentName, setNewAttachmentName] = useState('')
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('')
  const [newAttachmentType, setNewAttachmentType] = useState<'pdf' | 'link' | 'image' | 'doc'>('pdf')

  // Auth Info
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('teacher')

  useEffect(() => {
    const fetchUser = async () => {
      try {
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
          setUserId('docente-id') // fallback
        }
      } catch (err) {
        console.error(err)
        setUserId('docente-id')
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const loadAnnouncements = async () => {
      if (!userId) return
      setLoading(true)
      try {
        const data = await getAnnouncementsByCourse(courseId, userId, userRole)
        setAnnouncements(data)
        
        // Load stats for each announcement
        const statsMap: Record<string, { readCount: number; totalStudents: number }> = {}
        for (const a of data) {
          const stats = await getAnnouncementReadStats(a.id, courseId)
          statsMap[a.id] = stats
        }
        setReadStats(statsMap)
      } catch (err) {
        console.error(err)
        toast.error('Error al cargar novedades')
      } finally {
        setLoading(false)
      }
    }
    loadAnnouncements()
  }, [courseId, userId, userRole])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    if (openDropdownId) {
      window.addEventListener('click', handleClickOutside)
    }
    return () => window.removeEventListener('click', handleClickOutside)
  }, [openDropdownId])

  const handleOpenCreateModal = () => {
    setEditingAnnouncement(null)
    setFormTitle('')
    setFormType('announcement')
    setFormContent('')
    setFormIsPinned(false)
    setPublishOption('now')
    
    // Set default schedule values to tomorrow 8 AM
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setScheduleDate(tomorrow.toISOString().split('T')[0])
    setScheduleTime('08:00')
    
    setFormAttachments([])
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (ann: CourseAnnouncement) => {
    setEditingAnnouncement(ann)
    setFormTitle(ann.title)
    setFormType(ann.type)
    
    // Strip simple paragraph tags if present for editing
    let displayContent = ann.content
    if (displayContent.startsWith('<p>') && displayContent.endsWith('</p>')) {
      displayContent = displayContent.substring(3, displayContent.length - 4)
    }
    setFormContent(displayContent)
    
    setFormIsPinned(ann.isPinned)
    
    const isFuture = new Date(ann.publishAt).getTime() > Date.now()
    if (isFuture) {
      setPublishOption('schedule')
      const pDate = new Date(ann.publishAt)
      setScheduleDate(pDate.toISOString().split('T')[0])
      
      const hours = String(pDate.getHours()).padStart(2, '0')
      const mins = String(pDate.getMinutes()).padStart(2, '0')
      setScheduleTime(`${hours}:${mins}`)
    } else {
      setPublishOption('now')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setScheduleDate(tomorrow.toISOString().split('T')[0])
      setScheduleTime('08:00')
    }
    
    setFormAttachments(ann.attachments || [])
    setIsModalOpen(true)
    setOpenDropdownId(null)
  }

  const handleDelete = async (id: string) => {
    toast.warning('¿Eliminar novedad?', {
      description: 'Esta publicación se eliminará definitivamente.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            const success = await deleteAnnouncement(id)
            if (success) {
              setAnnouncements(prev => prev.filter(a => a.id !== id))
              toast.success('Publicación eliminada correctamente')
            } else {
              toast.error('No se pudo eliminar el anuncio')
            }
          } catch (err) {
            console.error(err)
            toast.error('Error al intentar eliminar')
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const handleTogglePin = async (ann: CourseAnnouncement) => {
    setOpenDropdownId(null)
    const newPinned = !ann.isPinned
    toast.loading(newPinned ? 'Fijando publicación...' : 'Desfijando...', { id: 'pin' })
    try {
      const result = await saveAnnouncement({
        ...ann,
        isPinned: newPinned
      })
      if (result.error) {
        toast.error(result.error, { id: 'pin' })
      } else if (result.data) {
        setAnnouncements(prev => prev.map(a => a.id === ann.id ? result.data! : a).sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()
        }))
        toast.success(newPinned ? 'Publicación fijada al inicio' : 'Publicación desfijada', { id: 'pin' })
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al cambiar fijación', { id: 'pin' })
    }
  }

  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAttachmentName.trim()) return
    
    const url = newAttachmentUrl.trim() || '#'
    setFormAttachments(prev => [...prev, {
      name: newAttachmentName.trim(),
      url,
      type: newAttachmentType
    }])
    setNewAttachmentName('')
    setNewAttachmentUrl('')
  }

  const handleRemoveAttachment = (idx: number) => {
    setFormAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('Título y mensaje son obligatorios')
      return
    }

    // Process publish_at
    let publishAt = new Date().toISOString()
    if (publishOption === 'schedule') {
      if (!scheduleDate || !scheduleTime) {
        toast.error('Debe completar la fecha y hora de programación')
        return
      }
      publishAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
    }

    // Wrap in standard HTML paragraph if it doesn't already have HTML tags
    let formattedContent = formContent
    if (!formattedContent.startsWith('<')) {
      formattedContent = `<p>${formattedContent.replace(/\n/g, '<br />')}</p>`
    }

    toast.loading('Guardando publicación...', { id: 'save' })
    try {
      const result = await saveAnnouncement({
        id: editingAnnouncement?.id,
        courseId,
        authorId: userId || 'docente-id',
        title: formTitle.trim(),
        content: formattedContent,
        type: formType,
        isPinned: formIsPinned,
        publishAt,
        attachments: formAttachments
      })

      if (result.error) {
        toast.error(result.error, { id: 'save' })
      } else if (result.data) {
        const saved = result.data
        if (editingAnnouncement) {
          setAnnouncements(prev => prev.map(a => a.id === saved.id ? saved : a).sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()
          }))
          toast.success('Publicación actualizada', { id: 'save' })
        } else {
          setAnnouncements(prev => [saved, ...prev].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()
          }))
          toast.success('Publicación creada correctamente', { id: 'save' })

          // Add to demo notifications
          const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                         process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
          if (isDemo && typeof window !== 'undefined') {
            const localNotifs = localStorage.getItem('aulaensuny-demo-notifications')
            const currentNotifs = localNotifs ? JSON.parse(localNotifs) : [
              { id: 1, title: 'Tarea Calificada', message: 'Tu ensayo sobre Inercia ha sido calificado con 4.5', time: 'Hace 2 horas', read: false },
              { id: 2, title: 'Nuevo Material', message: 'El profesor subió un nuevo PDF al módulo 2.', time: 'Hace 5 horas', read: false },
              { id: 3, title: 'Recordatorio', message: 'Mañana vence la entrega del Taller Práctico.', time: 'Ayer', read: true },
            ]
            const newNotif = {
              id: Date.now(),
              title: `Nueva novedad publicada`,
              message: `El docente ha publicado: "${saved.title}"`,
              time: 'Hace un momento',
              read: false
            }
            localStorage.setItem('aulaensuny-demo-notifications', JSON.stringify([newNotif, ...currentNotifs]))
          }
        }
        
        // Refresh stats for the saved announcement
        const stats = await getAnnouncementReadStats(saved.id, courseId)
        setReadStats(prev => ({ ...prev, [saved.id]: stats }))
        
        setIsModalOpen(false)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar la publicación', { id: 'save' })
    }
  }

  // Type Details mapping
  const getTypeInfo = (type: CourseAnnouncement['type']) => {
    switch (type) {
      case 'urgent':
        return { label: 'Urgente', icon: AlertTriangle, bg: 'bg-red-550/10 text-red-600 dark:bg-red-500/20 dark:text-red-400', border: 'border-red-100 dark:border-red-900/30' }
      case 'reminder':
        return { label: 'Recordatorio', icon: Bell, bg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' }
      case 'new_material':
        return { label: 'Material Nuevo', icon: BookOpen, bg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/30' }
      case 'date_change':
        return { label: 'Cambio de Fecha', icon: Calendar, bg: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-900/30' }
      case 'congratulation':
        return { label: 'Felicitación', icon: Trophy, bg: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30' }
      case 'announcement':
      default:
        return { label: 'Anuncio', icon: Megaphone, bg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30' }
    }
  }

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && announcements.length === 0) {
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Megaphone className="h-5 w-5" />
            </div>
            📢 Novedades
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Publica anuncios oficiales, recordatorios y comunicados académicos para tus estudiantes.
          </p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all px-4 py-2.5 text-sm font-semibold text-white self-start sm:self-center border-none shadow cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Crear Publicación</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar novedades..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-xs outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
          />
        </div>
      </div>

      {/* Listado de Anuncios */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm max-w-lg mx-auto">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-slate-350 dark:text-slate-650" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">No hay novedades publicadas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Crea tu primera publicación para mantener a tus estudiantes informados sobre el curso.
            </p>
            <button 
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all px-4 py-2 text-xs font-semibold text-white border-none cursor-pointer"
            >
              Crear primera novedad
            </button>
          </div>
        ) : (
          filteredAnnouncements.map((ann) => {
            const typeInfo = getTypeInfo(ann.type)
            const TypeIcon = typeInfo.icon
            const isFuture = new Date(ann.publishAt).getTime() > Date.now()
            const stats = readStats[ann.id] || { readCount: 0, totalStudents: 0 }
            
            return (
              <div 
                key={ann.id} 
                className={`relative rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_4px_25px_rgb(0,0,0,0.01)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900/50 ${ann.isPinned ? 'ring-2 ring-blue-500/20 dark:ring-blue-400/20' : ''}`}
              >
                {/* Header Card */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${typeInfo.bg}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">
                          {ann.title}
                        </h3>
                        {ann.isPinned && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                            <Pin className="h-2.5 w-2.5 fill-current" /> Fijado
                          </span>
                        )}
                        {isFuture && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse">
                            <Clock className="h-2.5 w-2.5" /> Programado
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

                  {/* Dropdown Options */}
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenDropdownId(openDropdownId === ann.id ? null : ann.id)
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800 dark:hover:text-slate-300 border-none cursor-pointer bg-transparent"
                    >
                      <MoreVertical className="h-4.5 w-4.5" />
                    </button>
                    
                    {openDropdownId === ann.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white shadow-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-950 z-10 py-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleTogglePin(ann)}
                          className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 border-none bg-transparent cursor-pointer"
                        >
                          {ann.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          {ann.isPinned ? 'Desfijar' : 'Destacar'}
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(ann)}
                          className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 border-none bg-transparent cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(ann.id)}
                          className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800 border-none bg-transparent cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                <div className="mt-4 pl-0 sm:pl-13 text-slate-650 dark:text-slate-350 text-sm leading-relaxed max-w-3xl">
                  <div dangerouslySetInnerHTML={{ __html: ann.content }} />
                </div>

                {/* Attachments rendering */}
                {ann.attachments && ann.attachments.length > 0 && (
                  <div className="mt-4 pl-0 sm:pl-13 flex flex-wrap gap-2">
                    {ann.attachments.map((att, attIdx) => (
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

                {/* Footer stats: Read by x of y */}
                <div className="mt-6 pl-0 sm:pl-13 pt-4 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between text-xs text-slate-450 dark:text-slate-550 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Leído por {stats.readCount} de {stats.totalStudents} estudiantes</span>
                  </div>
                  {isFuture && (
                    <div className="flex items-center gap-1 bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold">
                      Publicación programada
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Creación/Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {editingAnnouncement ? 'Editar Novedad' : 'Publicar Nueva Novedad'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              
              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Título de la publicación</label>
                <input 
                  type="text" 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej. Quiz de Leyes de Newton o Recordatorio de Taller"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                  required
                />
              </div>

              {/* Type Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tipo de Novedad</label>
                <select 
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                >
                  <option value="announcement">📢 Anuncio</option>
                  <option value="reminder">⏰ Recordatorio</option>
                  <option value="new_material">📚 Material Nuevo</option>
                  <option value="date_change">📅 Cambio de Fecha</option>
                  <option value="congratulation">🎉 Felicitación</option>
                  <option value="urgent">🚨 Urgente</option>
                </select>
              </div>

              {/* Content Textarea */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Mensaje / Contenido</label>
                <textarea 
                  rows={6}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Escribe el cuerpo del mensaje. Puedes usar saltos de línea para dar estructura..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-850 dark:text-white resize-none"
                  required
                />
              </div>

              {/* Pin Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-850/50">
                <div className="text-left space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">📌 Destacar publicación</span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block">Las publicaciones fijadas aparecen siempre al inicio del feed del estudiante.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="h-4 w-4 accent-blue-650 cursor-pointer"
                />
              </div>

              {/* Publish Schedule Option */}
              <div className="space-y-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-850/50">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Programación de Publicación</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer">
                    <input 
                      type="radio" 
                      name="publishOption" 
                      value="now"
                      checked={publishOption === 'now'}
                      onChange={() => setPublishOption('now')}
                      className="accent-blue-650"
                    />
                    Publicar ahora
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer">
                    <input 
                      type="radio" 
                      name="publishOption" 
                      value="schedule"
                      checked={publishOption === 'schedule'}
                      onChange={() => setPublishOption('schedule')}
                      className="accent-blue-650"
                    />
                    Programar publicación
                  </label>
                </div>

                {publishOption === 'schedule' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Fecha</label>
                      <input 
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Hora</label>
                      <input 
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              <div className="space-y-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-850/50 text-left">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Adjuntar Archivos / Enlaces</label>
                
                {/* List of current attachments in form */}
                {formAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formAttachments.map((att, idx) => (
                      <div 
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-slate-100 text-xs font-semibold text-slate-650 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 shadow-sm"
                      >
                        <Paperclip className="h-3 w-3 text-slate-400" />
                        <span className="truncate max-w-[120px]">{att.name}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAttachment(idx)}
                          className="p-0.5 rounded text-red-500 hover:bg-slate-50 border-none bg-transparent cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new attachment mini form */}
                <div className="space-y-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-750">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      placeholder="Nombre del archivo (ej. Guía_MRU.pdf)"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] outline-none dark:border-slate-750 dark:bg-slate-900 dark:text-white"
                    />
                    <input 
                      type="text" 
                      value={newAttachmentUrl}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      placeholder="URL opcional (ej. https://drive.google.com/...)"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] outline-none dark:border-slate-750 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <select 
                      value={newAttachmentType}
                      onChange={(e) => setNewAttachmentType(e.target.value as any)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none dark:border-slate-750 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="pdf">PDF</option>
                      <option value="doc">Documento (Word/Txt)</option>
                      <option value="image">Imagen</option>
                      <option value="link">Enlace Web</option>
                    </select>
                    <button 
                      type="button" 
                      onClick={handleAddAttachment}
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1 text-[11px] font-bold text-white border-none cursor-pointer"
                    >
                      Añadir adjunto
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 border-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-extrabold text-white border-none shadow active:scale-[0.98] transition-all cursor-pointer"
                >
                  {editingAnnouncement ? 'Guardar Cambios' : 'Publicar Novedad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
