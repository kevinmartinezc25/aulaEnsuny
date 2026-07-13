'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Video, FileText, File, Link as LinkIcon, Image as ImageIcon, CheckCircle, HelpCircle, UploadCloud, ClipboardList } from 'lucide-react'
import { PdfUploadModal } from '@/modules/resources/presentation/components/PdfUploadModal'
import { RichTextEditor } from '@/core/components/RichTextEditor'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'

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
    submissionType: 'file'
  })

  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(!lessonId.startsWith('new'))
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadedPdf, setUploadedPdf] = useState<any>(null)

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
          submissionType: 'file'
        })
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

          setFormData({
            title: data.title || '',
            type: resolvedType,
            status: 'active',
            duration: data.video_url ? '10 min' : '',
            url: data.video_url || '',
            content: data.content || '',
            submissionType: 'file'
          })
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
            video_url: formData.type === 'video' ? formData.url : null,
            sort_order: newOrder,
            type: formData.type === 'text' ? 'reading' : formData.type
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
            video_url: formData.type === 'video' ? formData.url : null,
            type: formData.type === 'text' ? 'reading' : formData.type
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
    </div>
  )
}
