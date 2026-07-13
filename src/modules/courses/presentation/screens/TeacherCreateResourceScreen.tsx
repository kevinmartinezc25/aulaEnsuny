'use client'

import React, { useState, useEffect, useRef } from 'react'
import { UploadCloud, FileText, File, Link as LinkIcon, Image as ImageIcon, ChevronLeft, Save, X, Loader2, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'
import { uploadPdfAction } from '@/modules/resources/presentation/actions/resourceActions'

export function TeacherCreateResourceScreen({ courseId, resourceId, courseName = 'Curso' }: { courseId: string, resourceId?: string, courseName?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [type, setType] = useState<'pdf' | 'doc' | 'presentation' | 'link' | 'image' | 'forum'>('pdf')
  const [url, setUrl] = useState('')
  const [forumType, setForumType] = useState<'debate' | 'qa' | 'social'>('debate')
  const [isGraded, setIsGraded] = useState(false)
  const [dueDate, setDueDate] = useState('')
  
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(!!resourceId)
  const [file, setFile] = useState<File | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const isForumParam = searchParams.get('type') === 'forum'
    if (isForumParam) {
      setType('forum')
    }

    if (!resourceId) return

    const loadResource = async () => {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        if (isForumParam) {
          setName('Foro: Impacto de la Gravedad en el Espacio')
          setType('forum')
          setForumType('debate')
          setIsGraded(true)
          setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16))
        } else {
          setName('Syllabus del Curso.pdf')
          setType('pdf')
        }
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        if (isForumParam) {
          const { data, error } = await supabase
            .from('forums')
            .select('*, lessons(title, content)')
            .eq('id', resourceId)
            .single()

          if (error) throw error

          if (data) {
            setName(data.lessons?.title || data.title || '')
            setUrl('')
            setType('forum')
            setForumType(data.forum_type as any)
            setIsGraded(data.is_graded)
            if (data.due_date) {
              setDueDate(new Date(data.due_date).toISOString().substring(0, 16))
            }
          }
        } else {
          const { data, error } = await supabase
            .from('resources')
            .select('*')
            .eq('id', resourceId)
            .single()

          if (error) throw error

          if (data) {
            setName(data.title || '')
            setUrl(data.drive_url || '')

            let resolvedType: 'pdf' | 'doc' | 'presentation' | 'link' | 'image' = 'pdf'
            const mime = data.mime_type?.toLowerCase() || ''
            if (mime.includes('pdf')) resolvedType = 'pdf'
            else if (mime.includes('msword') || mime.includes('word') || mime.includes('officedocument.wordprocessingml')) resolvedType = 'doc'
            else if (mime.includes('presentation') || mime.includes('powerpoint')) resolvedType = 'presentation'
            else if (mime.includes('image')) resolvedType = 'image'
            else if (mime === 'url' || data.drive_url) resolvedType = 'link'

            setType(resolvedType)
          }
        }
      } catch (err: any) {
        console.error('Error cargando recurso:', err)
        toast.error('No se pudo cargar la información del recurso')
      } finally {
        setLoading(false)
      }
    }

    loadResource()
  }, [resourceId, searchParams])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile)
    if (!name) {
      // Auto-fill resource name with file name without extension
      const dotIndex = selectedFile.name.lastIndexOf('.')
      const fallbackName = dotIndex !== -1 ? selectedFile.name.substring(0, dotIndex) : selectedFile.name
      setName(fallbackName)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre del recurso es requerido')
      return
    }

    if (type === 'forum') {
      setIsSaving(true)
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setTimeout(() => {
          setIsSaving(false)
          toast.success('Foro guardado correctamente (Demo)')
          router.push(`/teacher/courses/${courseId}/resources`)
        }, 600)
        return
      }

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuario no autenticado')

        const { data: modules } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', courseId)
          .order('sort_order', { ascending: true })
          .limit(1)

        let moduleId = null
        if (modules && modules.length > 0) {
          moduleId = modules[0].id
        } else {
          const { data: newMod } = await supabase
            .from('course_modules')
            .insert({ course_id: courseId, title: 'General', sort_order: 1 })
            .select()
            .single()
          if (newMod) moduleId = newMod.id
        }

        if (!moduleId) {
          throw new Error('Debe existir al menos un módulo en el curso para crear un foro')
        }

        let lessonId = null

        if (resourceId) {
          const { data: forumData } = await supabase
            .from('forums')
            .select('lesson_id')
            .eq('id', resourceId)
            .single()
          
          if (forumData && forumData.lesson_id) {
            lessonId = forumData.lesson_id
            await supabase
              .from('lessons')
              .update({
                title: name.trim(),
                content: ''
              })
              .eq('id', lessonId)
          }
        } else {
          const { data: lesson, error: lErr } = await supabase
            .from('lessons')
            .insert({
              module_id: moduleId,
              title: name.trim(),
              content: '',
              type: 'forum'
            })
            .select()
            .single()
          if (lErr) throw lErr
          lessonId = lesson.id
        }

        if (resourceId) {
          const { error } = await supabase
            .from('forums')
            .update({
              forum_type: forumType,
              is_graded: isGraded,
              due_date: dueDate ? new Date(dueDate).toISOString() : null
            })
            .eq('id', resourceId)
          if (error) throw error
          toast.success('Foro actualizado correctamente')
        } else {
          const { error } = await supabase
            .from('forums')
            .insert({
              lesson_id: lessonId,
              forum_type: forumType,
              is_graded: isGraded,
              due_date: dueDate ? new Date(dueDate).toISOString() : null
            })
          if (error) throw error
          toast.success('Foro creado correctamente')
        }

        router.push(`/teacher/courses/${courseId}/resources`)
        router.refresh()
      } catch (err: any) {
        console.error('Error al guardar el foro:', err)
        toast.error(err.message || 'Error al guardar el foro')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (type === 'link' && !url.trim()) {
      toast.error('La URL del enlace es requerida')
      return
    }

    if (type !== 'link' && !file && !resourceId) {
      toast.error('Por favor selecciona un archivo para subir')
      return
    }

    setIsSaving(true)

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode) {
      setTimeout(() => {
        setIsSaving(false)
        toast.success('Recurso guardado correctamente (Demo)')
        router.push(`/teacher/courses/${courseId}/resources`)
      }, 600)
      return
    }

    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      let driveFileId = 'link'
      let driveUrl = url
      let mimeType = 'url'
      let fileSize = null

      // --- SUBIDA REAL A GOOGLE DRIVE VÍA APPS SCRIPT ---
      if (type !== 'link') {
        if (file) {
          // Usar uploadPdfAction para subir el archivo a Google Drive
          toast.loading('Subiendo archivo a Google Drive...')
          const formData = new FormData()
          formData.append('file', file)
          formData.append('title', name.trim())
          formData.append('description', '')
          formData.append('courseId', courseId)
          formData.append('courseName', courseName)
          formData.append('uploadedBy', user.id)

          const result = await uploadPdfAction(formData)
          toast.dismiss()

          if (!result.success) {
            throw new Error(result.error || 'Error al subir el archivo a Google Drive')
          }

          // El UseCase ya guardó el recurso en Supabase — redirigir directamente
          toast.success('Recurso subido a Google Drive y guardado correctamente ✅')
          router.push(`/teacher/courses/${courseId}/resources`)
          router.refresh()
          return
        }
      }

      if (resourceId) {
        const updateData: any = {
          title: name.trim(),
        }
        if (type === 'link') {
          updateData.drive_url = url
          updateData.mime_type = 'url'
        } else if (file) {
          updateData.drive_file_id = driveFileId
          updateData.drive_url = driveUrl
          updateData.drive_download_url = driveUrl
          updateData.mime_type = mimeType
          updateData.file_size = fileSize
        }

        const { error } = await supabase
          .from('resources')
          .update(updateData)
          .eq('id', resourceId)

        if (error) throw error
        toast.success('Recurso actualizado correctamente')
      } else {
        const { error } = await supabase
          .from('resources')
          .insert({
            title: name.trim(),
            description: '',
            drive_file_id: driveFileId,
            drive_url: driveUrl,
            drive_download_url: driveUrl,
            mime_type: mimeType,
            file_size: fileSize,
            course_id: courseId,
            uploaded_by: user.id
          })

        if (error) throw error
        toast.success('Recurso creado correctamente')
      }

      router.push(`/teacher/courses/${courseId}/resources`)
      router.refresh()
    } catch (err: any) {
      console.error('Error al guardar el recurso:', err?.message || err?.code || JSON.stringify(err) || err)
      toast.error(err?.message || 'Error al guardar el recurso')
    } finally {
      setIsSaving(false)
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
    <div className="mx-auto max-w-4xl pb-12">
      {/* Cabecera */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-6 dark:border-slate-800/60">
        <div className="flex items-center gap-4">
          <Link 
            href={`/teacher/courses/${courseId}/resources`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {resourceId ? 'Editar Recurso' : 'Subir Recurso'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Añade archivos o enlaces para tus estudiantes.
            </p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-75"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Guardar Recurso</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 space-y-8">
        
        <div className="space-y-4">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de Recurso</label>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            {[
              { id: 'pdf', icon: FileText, label: 'PDF' },
              { id: 'doc', icon: File, label: 'Documento' },
              { id: 'presentation', icon: File, label: 'Presentación' },
              { id: 'link', icon: LinkIcon, label: 'Enlace Web' },
              { id: 'image', icon: ImageIcon, label: 'Imagen' },
              { id: 'forum', icon: BookOpen, label: 'Foro' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setType(t.id as any)}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border p-4 transition-all ${
                  type === t.id 
                    ? 'border-blue-500 bg-blue-50 text-blue-600 ring-4 ring-blue-500/10 dark:bg-blue-900/20 dark:text-blue-400' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50'
                }`}
              >
                <t.icon className={`h-6 w-6 ${type === t.id ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                <span className="text-xs font-bold uppercase tracking-wider">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre del Recurso</label>
          <input
            key="name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Guía Práctica de Laboratorio 1"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
          />
        </div>

        {type === 'link' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">URL del Enlace</label>
            <input
              key="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
            />
          </div>
        )}

        {type === 'forum' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de Foro</label>
              <select
                value={forumType}
                onChange={(e) => setForumType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
              >
                <option value="debate">Foro de Debate (Evaluativo)</option>
                <option value="qa">Foro de Consultas (Dudas y Preguntas)</option>
                <option value="social">Foro Social o Libre</option>
              </select>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <input
                id="is-graded-checkbox"
                type="checkbox"
                checked={isGraded}
                onChange={(e) => setIsGraded(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="is-graded-checkbox" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Foro Calificable
                </label>
                <p className="text-xs text-slate-500">
                  Si se activa, esta actividad aparecerá en la matriz de calificaciones y podrá ser puntuada.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha Límite de Entrega</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {type !== 'link' && type !== 'forum' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Archivo</label>
            <input
              key="file-input"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {!file ? (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-900/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-blue-450 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-blue-500 dark:hover:bg-slate-800'
                }`}
              >
                <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Haz clic para seleccionar el archivo</h3>
                <p className="text-xs text-slate-500">O arrástralo y suéltalo aquí (Máx. 50MB)</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button 
                  onClick={() => setFile(null)}
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
