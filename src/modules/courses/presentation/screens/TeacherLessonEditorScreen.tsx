'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Save, Video, FileText, File, Link as LinkIcon, Image as ImageIcon, 
  CheckCircle, HelpCircle, UploadCloud, ClipboardList, Paperclip, Eye, Download, 
  Trash2, X, Plus, FolderOpen, Loader2, ExternalLink, Calendar, Clock 
} from 'lucide-react'
import { PdfUploadModal } from '@/modules/resources/presentation/components/PdfUploadModal'
import { uploadPdfAction } from '@/modules/resources/presentation/actions/resourceActions'
import { RichTextEditor } from '@/core/components/RichTextEditor'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'

export interface TaskAttachment {
  name: string
  url: string
  downloadUrl?: string
  size?: string
  type?: string
}

// Helper to extract embed URL for YouTube and Vimeo
function getEmbedUrl(url: string): { type: 'youtube' | 'vimeo' | 'direct' | null; embedUrl: string | null } {
  if (!url) return { type: null, embedUrl: null }
  
  // YouTube regex
  const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const ytMatch = url.match(ytRegex)
  if (ytMatch && ytMatch[2].length === 11) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[2]}`
    }
  }

  // Vimeo regex
  const vimeoRegex = /(?:vimeo)\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/
  const vimeoMatch = url.match(vimeoRegex)
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}`
    }
  }

  // Check if it's already an embed link or a direct mp4, etc.
  if (url.includes('youtube.com/embed/')) {
    return { type: 'youtube', embedUrl: url }
  }
  if (url.includes('player.vimeo.com/video/')) {
    return { type: 'vimeo', embedUrl: url }
  }

  // Direct video link (e.g. mp4)
  if (url.match(/\.(mp4|webm|ogg)$/i) || url.includes('drive.google.com')) {
    return { type: 'direct', embedUrl: url }
  }

  return { type: null, embedUrl: null }
}

export function TeacherLessonEditorScreen({ 
  courseId, 
  lessonId, 
  initialType,
  moduleId
}: { 
  courseId: string, 
  lessonId: string, 
  initialType?: string,
  moduleId?: string
}) {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    title: lessonId.startsWith('new') ? 'Nuevo Recurso' : 'Cargando...',
    type: initialType || 'video', // Valor por defecto basado en la selección
    status: 'draft',
    duration: '',
    url: '',
    content: '',
    submissionType: 'file',
    dueDate: ''
  })

  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(!lessonId.startsWith('new'))
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadedPdf, setUploadedPdf] = useState<any>(null)

  // Attachment state for 'task' (Guías, Talleres a resolver)
  const [taskAttachment, setTaskAttachment] = useState<TaskAttachment | null>(null)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [isResourcePickerOpen, setIsResourcePickerOpen] = useState(false)
  const [courseResources, setCourseResources] = useState<any[]>([])
  const [isLoadingResources, setIsLoadingResources] = useState(false)
  const [manualLinkMode, setManualLinkMode] = useState(false)
  const [manualLinkUrl, setManualLinkUrl] = useState('')
  const [manualLinkName, setManualLinkName] = useState('')
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const attachmentFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (lessonId.startsWith('new')) return

    const loadLesson = async () => {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setFormData({
          title: 'Recurso de Ejemplo (Demo)',
          type: initialType || 'video',
          status: 'draft',
          duration: '10 min',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          content: 'Contenido de ejemplo para la versión de demostración.',
          submissionType: 'file',
          dueDate: ''
        })
        if (initialType === 'task') {
          setTaskAttachment({
            name: 'Documento_Adjunto.pdf',
            url: 'https://drive.google.com/file/d/demo/preview',
            downloadUrl: 'https://drive.google.com/file/d/demo/preview',
            size: '1.2 MB',
            type: 'pdf'
          })
        }
        setCreatedAt(new Date().toISOString())
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', lessonId)
          .single()

        if (error) throw error

        if (data) {
          const resolvedType = initialType || (data.type === 'reading' ? 'text' : (data.type || (data.video_url ? 'video' : 'text')))

          let loadedAttachment: TaskAttachment | null = null
          if (data.video_url && resolvedType === 'task') {
            try {
              if (data.video_url.startsWith('{')) {
                loadedAttachment = JSON.parse(data.video_url)
              } else if (data.video_url.startsWith('http')) {
                loadedAttachment = {
                  name: 'Guía o Taller Adjunto',
                  url: data.video_url,
                  downloadUrl: data.video_url,
                  type: data.video_url.includes('.pdf') ? 'pdf' : 'doc'
                }
              }
            } catch {
              loadedAttachment = {
                name: 'Guía o Taller Adjunto',
                url: data.video_url,
                downloadUrl: data.video_url,
                type: 'pdf'
              }
            }
          }
          setTaskAttachment(loadedAttachment)

          setFormData({
            title: data.title || '',
            type: resolvedType,
            status: 'active',
            duration: data.video_url ? '10 min' : '',
            url: (resolvedType === 'video' || resolvedType === 'pdf') ? (data.video_url || '') : '',
            content: data.content || '',
            submissionType: 'file',
            dueDate: data.due_date ? new Date(new Date(data.due_date).getTime() - (new Date(data.due_date).getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''
          })
          setCreatedAt(data.created_at || null)
        }
      } catch (err: any) {
        console.error('Error cargando recurso:', err)
        toast.error('No se pudo cargar la información del recurso')
      } finally {
        setLoading(false)
      }
    }

    loadLesson()
  }, [lessonId, initialType])

  const handleUploadTaskFile = async (file: File) => {
    if (!file) return
    setIsUploadingAttachment(true)
    const toastId = toast.loading('Subiendo guía o taller a Google Drive...')

    try {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setTimeout(() => {
          setTaskAttachment({
            name: file.name,
            url: 'https://drive.google.com/file/d/demo-guia/view',
            downloadUrl: 'https://drive.google.com/uc?export=download&id=demo-guia',
            size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            type: file.name.endsWith('.pdf') ? 'pdf' : file.name.match(/\.(doc|docx)$/i) ? 'doc' : 'file'
          })
          toast.success('Documento adjuntado (Demo)', { id: toastId })
          setIsUploadingAttachment(false)
        }, 800)
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const { data: courseData } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .maybeSingle()

      const courseName = courseData?.title || 'Curso'

      const uploadData = new FormData()
      uploadData.append('file', file)
      uploadData.append('title', file.name)
      uploadData.append('description', 'Documento adjunto a la tarea')
      uploadData.append('courseId', courseId)
      uploadData.append('courseName', courseName)
      if (moduleId) uploadData.append('moduleId', moduleId)
      uploadData.append('uploadedBy', user.id)

      const result = await uploadPdfAction(uploadData)

      if (result.success && result.resource) {
        setTaskAttachment({
          name: result.resource.title || file.name,
          url: result.resource.driveUrl,
          downloadUrl: result.resource.driveDownloadUrl || result.resource.driveUrl,
          size: file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : undefined,
          type: file.name.endsWith('.pdf') ? 'pdf' : file.name.match(/\.(doc|docx)$/i) ? 'doc' : 'file'
        })
        toast.success('Documento adjuntado exitosamente', { id: toastId })
      } else {
        throw new Error(result.error || 'No se pudo subir el archivo a Google Drive')
      }
    } catch (err: any) {
      console.error('Error uploading task attachment:', err)
      toast.error(err?.message || 'Error al subir el documento', { id: toastId })
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  const handleOpenResourcePicker = async () => {
    setIsResourcePickerOpen(true)
    setIsLoadingResources(true)
    try {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
      if (isDemoMode) {
        setCourseResources([
          { id: 'res-1', title: 'Taller 1: Cinemática y Movimiento.pdf', drive_url: 'https://drive.google.com/...', file_size: 1500000, mime_type: 'application/pdf' },
          { id: 'res-2', title: 'Guía de Ejercicios Prácticos.docx', drive_url: 'https://drive.google.com/...', file_size: 900000, mime_type: 'application/msword' },
        ])
      } else {
        const supabase = createClient()
        const { data } = await supabase
          .from('resources')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })
        setCourseResources(data || [])
      }
    } catch (err) {
      console.error('Error fetching course resources:', err)
      toast.error('No se pudieron cargar los recursos del curso')
    } finally {
      setIsLoadingResources(false)
    }
  }

  const handleSelectResourceAsAttachment = (res: any) => {
    setTaskAttachment({
      name: res.title,
      url: res.drive_url,
      downloadUrl: res.drive_download_url || res.drive_url,
      size: res.file_size ? `${(res.file_size / 1024 / 1024).toFixed(1)} MB` : undefined,
      type: (res.mime_type || '').includes('pdf') ? 'pdf' : (res.mime_type || '').includes('word') ? 'doc' : 'file'
    })
    setIsResourcePickerOpen(false)
    toast.success('Documento adjuntado exitosamente')
  }

  const handleSaveManualLink = () => {
    if (!manualLinkUrl.trim()) {
      toast.error('La URL es requerida')
      return
    }
    const finalName = manualLinkName.trim() || 'Documento Adjunto'
    setTaskAttachment({
      name: finalName,
      url: manualLinkUrl.trim(),
      downloadUrl: manualLinkUrl.trim(),
      type: manualLinkUrl.includes('.pdf') ? 'pdf' : 'link'
    })
    setManualLinkMode(false)
    setManualLinkUrl('')
    setManualLinkName('')
    toast.success('Enlace adjuntado a la tarea')
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('El título es requerido')
      return
    }

    setIsSaving(true)

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode) {
      setTimeout(() => {
        setIsSaving(false)
        toast.success('Cambios guardados localmente')
        router.push(`/teacher/courses/${courseId}/modules`)
      }, 600)
      return
    }

    try {
      const supabase = createClient()
      
      let resolvedVideoUrl: string | null = null
      if (formData.type === 'video') {
        resolvedVideoUrl = formData.url || null
      } else if (formData.type === 'task') {
        resolvedVideoUrl = taskAttachment ? JSON.stringify(taskAttachment) : null
      } else if (formData.type === 'pdf') {
        resolvedVideoUrl = formData.url || null
      }

      if (lessonId.startsWith('new')) {
        // We are creating a new lesson. We need moduleId!
        const resolvedModuleId = moduleId || new URLSearchParams(window.location.search).get('moduleId')
        
        if (!resolvedModuleId) {
          throw new Error('ID del módulo no especificado')
        }

        // Get current order of lessons in the module
        const { data: existingLessons, error: countErr } = await supabase
          .from('lessons')
          .select('id')
          .eq('module_id', resolvedModuleId)

        if (countErr) throw countErr

        const newOrder = (existingLessons?.length || 0) + 1

        const { error: insertErr } = await supabase
          .from('lessons')
          .insert({
            module_id: resolvedModuleId,
            title: formData.title.trim(),
            content: formData.type === 'video' ? '' : formData.content,
            video_url: resolvedVideoUrl,
            sort_order: newOrder,
            type: formData.type === 'text' ? 'reading' : formData.type,
            due_date: formData.type === 'task' && formData.dueDate ? new Date(formData.dueDate).toISOString() : null
          })

        if (insertErr) throw insertErr
        toast.success('Recurso creado correctamente')
      } else {
        // We are updating an existing lesson
        const { error: updateErr } = await supabase
          .from('lessons')
          .update({
            title: formData.title.trim(),
            content: formData.type === 'video' ? '' : formData.content,
            video_url: resolvedVideoUrl,
            type: formData.type === 'text' ? 'reading' : formData.type,
            due_date: formData.type === 'task' && formData.dueDate ? new Date(formData.dueDate).toISOString() : null
          })
          .eq('id', lessonId)

        if (updateErr) throw updateErr
        toast.success('Recurso actualizado correctamente')
      }

      router.push(`/teacher/courses/${courseId}/modules`)
      router.refresh()
    } catch (err: any) {
      console.error('Error al guardar el recurso:', err)
      toast.error(err.message || 'No se pudieron guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  const getTypeIcon = () => {
    switch (formData.type) {
      case 'video': return <Video className="h-6 w-6 text-rose-500" />
      case 'pdf': return <FileText className="h-6 w-6 text-blue-500" />
      case 'quiz': return <HelpCircle className="h-6 w-6 text-purple-500" />
      case 'text': return <File className="h-6 w-6 text-emerald-500" />
      default: return <File className="h-6 w-6 text-slate-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center min-h-[300px]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header Fijo / Pegajoso para fácil guardado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md p-4 -mx-4 sm:mx-0 sm:p-0 sm:bg-transparent rounded-2xl dark:bg-slate-950/80 sm:dark:bg-transparent">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/teacher/courses/${courseId}/modules`)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title="Regresar a Módulos"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Editor de Recurso
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Configura los detalles y el contenido
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Estado:</span>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="draft">Borrador</option>
              <option value="active">Activo (Visible)</option>
            </select>
          </div>
          
          <button 
            onClick={() => router.push(`/teacher/courses/${courseId}/modules`)}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-70"
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Principal - Contenido */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Información General</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Título del recurso</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej. Introducción a la Cinemática"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                />
              </div>

              {formData.type === 'video' && (
                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Video className="h-5 w-5 text-rose-500" /> Configuración de Video
                  </h3>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">URL del Video (YouTube, Vimeo, etc.)</label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-500">Pega el enlace directo de la plataforma de streaming.</p>
                  </div>
                  
                  {formData.url && (() => {
                    const { type, embedUrl } = getEmbedUrl(formData.url)
                    if (embedUrl) {
                      return (
                        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video dark:border-slate-700 dark:bg-slate-800">
                          {type === 'direct' ? (
                            <video src={embedUrl} controls className="w-full h-full object-cover" />
                          ) : (
                            <iframe
                              src={embedUrl}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Video Preview"
                            />
                          )}
                        </div>
                      )
                    }
                    return (
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video flex flex-col items-center justify-center p-4 text-center dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm text-slate-500 font-medium text-rose-500">Enlace no válido o no soportado</p>
                        <p className="text-xs text-slate-400 mt-1">Por favor ingresa un enlace de YouTube o Vimeo válido</p>
                      </div>
                    )
                  })()}
                </div>
              )}

              {formData.type === 'text' && (
                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-500" /> Contenido de Texto
                  </h3>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Editor Enriquecido</label>
                    <RichTextEditor
                      value={formData.content}
                      onChange={(value) => setFormData({ ...formData, content: value })}
                      placeholder="Escribe el contenido principal del recurso aquí..."
                    />
                  </div>
                </div>
              )}

              {formData.type === 'pdf' && (
                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" /> Archivo PDF (Google Drive)
                  </h3>
                  <div className="space-y-4">
                    {!uploadedPdf ? (
                      <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 transition-colors hover:border-blue-300">
                        <UploadCloud className="h-8 w-8 mx-auto text-slate-400 mb-3" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Sube un PDF para este recurso</p>
                        <button
                          onClick={() => setIsUploadModalOpen(true)}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                        >
                          Seleccionar o Arrastrar PDF
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg dark:bg-slate-800">
                            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{uploadedPdf.title}</p>
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Sincronizado con Google Drive</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsUploadModalOpen(true)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:text-white transition-colors"
                        >
                          Reemplazar
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <PdfUploadModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    courseId={courseId}
                    courseName="Curso Actual"
                    moduleId="modulo-actual"
                    moduleName="Módulo Actual"
                    uploadedBy="teacher-id-mock"
                    onSuccess={(resource) => {
                      setUploadedPdf(resource)
                      setFormData({ ...formData, url: resource.driveUrl })
                    }}
                  />
                </div>
              )}

              {formData.type === 'task' && (
                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-orange-500" /> Configuración de Tarea
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Instrucciones de la Tarea</label>
                    <RichTextEditor
                      value={formData.content}
                      onChange={(value) => setFormData({ ...formData, content: value })}
                      placeholder="Describe qué debe hacer el estudiante detalladamente..."
                    />
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha y Hora Límite</label>
                    <input
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                    />
                  </div>

                  {/* Documento Adjunto */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-orange-500" />
                          Documento Adjunto
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Adjunta un archivo de apoyo o complementario (PDF, Word, etc.) para esta tarea.
                        </p>
                      </div>
                    </div>

                    {/* Input invisible para subida de archivo */}
                    <input
                      ref={attachmentFileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleUploadTaskFile(f)
                      }}
                    />

                    {taskAttachment ? (
                      <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/50 dark:bg-orange-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800 text-orange-600 dark:text-orange-400">
                            {taskAttachment.type === 'pdf' ? (
                              <FileText className="h-6 w-6 text-red-500" />
                            ) : taskAttachment.type === 'doc' ? (
                              <FileText className="h-6 w-6 text-blue-500" />
                            ) : (
                              <File className="h-6 w-6 text-orange-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {taskAttachment.name}
                              </p>
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 uppercase">
                                Documento Adjunto
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {taskAttachment.size ? `${taskAttachment.size} • ` : ''}Sincronizado con Google Drive
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {taskAttachment.url && (
                            <a
                              href={taskAttachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white shadow-sm border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-colors"
                              title="Ver documento"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-500" />
                              Ver
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => attachmentFileInputRef.current?.click()}
                            disabled={isUploadingAttachment}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white shadow-sm border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-colors"
                          >
                            Reemplazar
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskAttachment(null)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            title="Quitar archivo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div 
                          onClick={() => !isUploadingAttachment && attachmentFileInputRef.current?.click()}
                          className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                            isUploadingAttachment
                              ? 'border-orange-400 bg-orange-50/40 dark:border-orange-600 dark:bg-orange-950/20'
                              : 'border-slate-200 bg-slate-50/60 hover:border-orange-400 hover:bg-orange-50/30 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-orange-500'
                          }`}
                        >
                          {isUploadingAttachment ? (
                            <div className="flex flex-col items-center justify-center py-2">
                              <Loader2 className="h-8 w-8 text-orange-600 animate-spin mb-2" />
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Subiendo documento a Google Drive...</p>
                              <p className="text-xs text-slate-500 mt-0.5">Por favor espera un momento</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-1">
                              <UploadCloud className="h-8 w-8 text-orange-500 mb-2" />
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Haz clic aquí para adjuntar un documento
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Formatos soportados: PDF, Word (.docx), Excel, PowerPoint, imágenes · Máx. 50 MB
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleOpenResourcePicker}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 shadow-sm transition-all"
                          >
                            <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
                            Seleccionar de Biblioteca de Recursos
                          </button>

                          <button
                            type="button"
                            onClick={() => setManualLinkMode(!manualLinkMode)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 shadow-sm transition-all"
                          >
                            <LinkIcon className="h-3.5 w-3.5 text-emerald-500" />
                            Vincular por Enlace Web / Drive
                          </button>
                        </div>

                        {manualLinkMode && (
                          <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 space-y-3 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Vincular documento por URL</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input
                                type="text"
                                placeholder="Nombre del documento (ej. Archivo complementario.pdf)"
                                value={manualLinkName}
                                onChange={(e) => setManualLinkName(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                              <input
                                type="url"
                                placeholder="URL pública o de Google Drive"
                                value={manualLinkUrl}
                                onChange={(e) => setManualLinkUrl(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setManualLinkMode(false)}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveManualLink}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                              >
                                Adjuntar Enlace
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Formato de Entrega del Estudiante</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setFormData({ ...formData, submissionType: 'file' })}
                        className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                          formData.submissionType === 'file'
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                      >
                        <UploadCloud className={`h-5 w-5 shrink-0 ${formData.submissionType === 'file' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`} />
                        <div>
                          <p className={`text-sm font-bold ${formData.submissionType === 'file' ? 'text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300'}`}>Adjuntar Archivo</p>
                          <p className="text-xs text-slate-500 mt-1">El estudiante deberá subir un documento (PDF, imagen, etc.).</p>
                        </div>
                      </button>

                      <button
                        onClick={() => setFormData({ ...formData, submissionType: 'text' })}
                        className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                          formData.submissionType === 'text'
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                      >
                        <FileText className={`h-5 w-5 shrink-0 ${formData.submissionType === 'text' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`} />
                        <div>
                          <p className={`text-sm font-bold ${formData.submissionType === 'text' ? 'text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300'}`}>Escribir Texto en Línea</p>
                          <p className="text-xs text-slate-500 mt-1">El estudiante responderá directamente en un editor de texto.</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Aquí irían las configuraciones de Quiz, etc. expansibles de la misma forma */}
            </div>
          </div>
        </div>

        {/* Columna Secundaria - Configuración de la Lección */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Configuración de la Lección</h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de Recurso</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'video', label: 'Video', icon: Video },
                    { id: 'pdf', label: 'PDF', icon: FileText },
                    { id: 'text', label: 'Texto', icon: File },
                    { id: 'task', label: 'Tarea', icon: ClipboardList },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setFormData({ ...formData, type: t.id })}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                        formData.type === t.id 
                          ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50'
                      }`}
                    >
                      <t.icon className="h-5 w-5" />
                      <span className="text-xs font-bold">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formData.type === 'video' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Duración estimada</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="Ej. 15 min"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha de Publicación</label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                  <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>
                    {createdAt 
                      ? `Publicado: ${new Date(createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                      : 'Se registrará automáticamente al guardar'
                    }
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
                  <CheckCircle className="h-5 w-5 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    Recuerda hacer clic en "Guardar Cambios" para no perder tu progreso.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Resource Picker Modal */}
      {isResourcePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Recursos del Curso</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Selecciona un archivo ya existente para vincularlo a la tarea</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResourcePickerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
              {isLoadingResources ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                  <p className="text-sm">Buscando documentos del curso...</p>
                </div>
              ) : courseResources.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No hay documentos registrados</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Aún no se han subido materiales en la biblioteca de este curso. Puedes subir uno directamente desde tu computadora.
                  </p>
                </div>
              ) : (
                courseResources.map((res: any) => {
                  const isPdf = (res.mime_type || '').includes('pdf') || res.title?.endsWith('.pdf')
                  const isDoc = (res.mime_type || '').includes('word') || res.title?.match(/\.(doc|docx)$/i)
                  return (
                    <div
                      key={res.id}
                      onClick={() => handleSelectResourceAsAttachment(res)}
                      className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isPdf 
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                            : isDoc 
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {res.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {res.file_size ? `${(res.file_size / 1024 / 1024).toFixed(1)} MB` : 'Documento'}
                            {res.created_at && ` • ${new Date(res.created_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-300 transition-all shrink-0"
                      >
                        Vincular
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsResourcePickerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

