'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, UploadCloud, Folder, File, Link as LinkIcon, Image as ImageIcon, MoreVertical, Search, Plus, Edit2, Trash2, Download, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { deleteResourceAction } from '@/modules/resources/presentation/actions/resourceActions'

export interface ResourceConfig {
  id: string
  name: string
  type: 'pdf' | 'doc' | 'presentation' | 'link' | 'image' | 'forum'
  size?: string
  date: string
  url?: string
  downloadUrl?: string
}

import { createClient } from '@/core/config/supabase/client'

export function TeacherCourseResourcesScreen({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [resources, setResources] = useState<ResourceConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    if (openDropdownId) {
      window.addEventListener('click', handleClickOutside)
    }
    return () => window.removeEventListener('click', handleClickOutside)
  }, [openDropdownId])

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

        if (isDemoMode) {
          setResources([
            { id: '1', name: 'Syllabus del Curso.pdf', type: 'pdf', size: '2.4 MB', date: 'Hace 2 días' },
            { id: '2', name: 'Guía de Laboratorio 1.docx', type: 'doc', size: '1.1 MB', date: 'Hace 1 semana' },
            { id: '3', name: 'Presentación Cinemática.pptx', type: 'presentation', size: '5.6 MB', date: 'Hace 2 semanas' },
            { id: '4', name: 'Simulador Leyes de Newton', type: 'link', url: 'https://phet.colorado.edu/...', date: 'Hace 1 mes' },
            { id: 'f1', name: 'Foro: Impacto de la Gravedad en el Espacio', type: 'forum', date: 'Hace 1 día' },
            { id: 'f2', name: 'Dudas y Consultas: Módulo Cinemática', type: 'forum', date: 'Hace 3 horas' },
          ])
          setLoading(false)
          return
        }

        const supabase = createClient()
        const { data: dbResources } = await supabase
          .from('resources')
          .select('*')
          .eq('course_id', courseId)

        let mappedResources: ResourceConfig[] = []
        if (dbResources) {
          mappedResources = dbResources.map(r => {
            let type: ResourceConfig['type'] = 'pdf'
            const mime = r.mime_type?.toLowerCase() || ''
            if (mime.includes('pdf')) type = 'pdf'
            else if (mime.includes('msword') || mime.includes('word') || mime.includes('officedocument.wordprocessingml')) type = 'doc'
            else if (mime.includes('presentation') || mime.includes('powerpoint')) type = 'presentation'
            else if (mime.includes('image')) type = 'image'
            else if (mime === 'url' || r.drive_url) type = 'link'

            return {
              id: r.id,
              name: r.title,
              type,
              size: r.file_size ? `${(r.file_size / 1024 / 1024).toFixed(1)} MB` : undefined,
              date: new Date(r.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
              url: r.drive_url,
              downloadUrl: r.drive_download_url || r.drive_url
            }
          })
        }

        // Fetch forums to show them as resources
        try {
          const { data: modules } = await supabase
            .from('course_modules')
            .select('id')
            .eq('course_id', courseId)
          
          if (modules && modules.length > 0) {
            const moduleIds = modules.map(m => m.id)
            const { data: lessons } = await supabase
              .from('lessons')
              .select('id')
              .in('module_id', moduleIds)
            
            if (lessons && lessons.length > 0) {
              const lessonIds = lessons.map(l => l.id)
              const { data: dbForums } = await supabase
                .from('forums')
                .select('id, created_at, lessons(title)')
                .in('lesson_id', lessonIds)
              
              if (dbForums) {
                const mappedForums = dbForums.map((f: any) => ({
                  id: f.id,
                  name: f.lessons?.title || 'Foro de Discusión',
                  type: 'forum' as const,
                  date: new Date(f.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                }))
                mappedResources = [...mappedResources, ...mappedForums]
              }
            }
          }
        } catch (e) {
          console.error('Error fetching forums for resources list:', e)
        }

        setResources(mappedResources)
      } catch (err) {
        console.error("Error loading resources:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchResources()
  }, [courseId])

  const handleDeleteResource = (id: string, type?: string) => {
    toast.warning('¿Eliminar recurso?', {
      description: 'Esta acción no se puede deshacer.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
            process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

          if (!isDemoMode) {
            try {
              if (type === 'forum') {
                const supabase = createClient()
                const { data: forum } = await supabase
                  .from('forums')
                  .select('lesson_id')
                  .eq('id', id)
                  .maybeSingle()
                
                if (forum && forum.lesson_id) {
                  const { error } = await supabase
                    .from('lessons')
                    .delete()
                    .eq('id', forum.lesson_id)
                  if (error) throw error
                } else {
                  const { error } = await supabase
                    .from('forums')
                    .delete()
                    .eq('id', id)
                  if (error) throw error
                }
              } else {
                const result = await deleteResourceAction(id)
                if (!result.success) {
                  throw new Error(result.error || 'Error al eliminar el recurso')
                }
              }
              toast.success('Elemento eliminado correctamente')
            } catch (err: any) {
              console.error('Error deleting resource:', err)
              toast.error(err?.message || 'No se pudo eliminar el elemento de la base de datos')
              return
            }
          }

          setResources(prev => prev.filter(r => r.id !== id))
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-5 w-5 text-red-500" />
      case 'doc': return <File className="h-5 w-5 text-blue-500" />
      case 'presentation': return <File className="h-5 w-5 text-orange-500" />
      case 'link': return <LinkIcon className="h-5 w-5 text-emerald-500" />
      case 'image': return <ImageIcon className="h-5 w-5 text-purple-500" />
      case 'forum': return <BookOpen className="h-5 w-5 text-pink-500" />
      default: return <File className="h-5 w-5 text-slate-500" />
    }
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Folder className="h-5 w-5" />
            </div>
            Recursos y Archivos
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Sube y organiza material complementario para tus alumnos.
          </p>
        </div>
        <Link 
          href={`/teacher/courses/${courseId}/resources/new`}
          className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all px-4 py-2.5 text-sm font-semibold text-white self-start sm:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Nuevo Recurso</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Zona de Subida */}
        <div className="lg:col-span-1 space-y-4">
          <Link 
            href={`/teacher/courses/${courseId}/resources/new`}
            className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition-all hover:border-blue-500 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">Subir Archivos</h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Carga materiales o crea nuevos enlaces para tus clases.
            </p>
            <div className="inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              Añadir Contenido
            </div>
          </Link>
        </div>

        {/* Lista de Recursos */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800/60">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en recursos..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {resources.length === 0 ? (
                <div className="text-center p-8 text-slate-500 dark:text-slate-400">
                  <Folder className="h-8 w-8 mx-auto mb-2 text-slate-350 dark:text-slate-750" />
                  <p className="text-xs font-semibold">No se han subido recursos aún.</p>
                </div>
              ) : (
                resources.map((resource) => (
                <div key={resource.id} className="group flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors last:rounded-b-2xl">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      {getResourceIcon(resource.type)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {resource.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {resource.size && <span>{resource.size}</span>}
                        {resource.size && <span>•</span>}
                        <span>{resource.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`relative transition-opacity ${openDropdownId === resource.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenDropdownId(openDropdownId === resource.id ? null : resource.id)
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <MoreVertical className="h-4 w-4 pointer-events-none" />
                    </button>
                    
                    {openDropdownId === resource.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-white shadow-lg border border-slate-100 dark:border-slate-800 dark:bg-slate-900 z-10 py-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => { router.push(`/teacher/courses/${courseId}/resources/${resource.id}/edit${resource.type === 'forum' ? '?type=forum' : ''}`); setOpenDropdownId(null); }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="h-4 w-4" />
                          Editar
                        </button>
                        {resource.type !== 'link' && resource.type !== 'forum' && (
                          <button 
                            onClick={() => {
                              if (resource.downloadUrl) {
                                window.open(resource.downloadUrl, '_blank')
                                toast.success('Descarga iniciada...')
                              } else if (resource.url) {
                                window.open(resource.url, '_blank')
                                toast.success('Descarga iniciada...')
                              } else {
                                toast.error('No hay URL de descarga disponible.')
                              }
                              setOpenDropdownId(null)
                            }}
                            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Download className="h-4 w-4" />
                            Descargar
                          </button>
                        )}
                        <button 
                          onClick={() => { handleDeleteResource(resource.id, resource.type); setOpenDropdownId(null); }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )))}
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
