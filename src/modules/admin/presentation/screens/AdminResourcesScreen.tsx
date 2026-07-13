'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Search, Filter, Trash2, Eye, HardDrive, FileArchive, Video, Image,
  FolderOpen, AlertCircle, Loader2, Link2, Download, User
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { deleteResourceAction } from '@/modules/resources/presentation/actions/resourceActions'

interface ResourceFile {
  id: string
  title: string
  description: string
  mimeType: string
  fileSize: number // en bytes
  driveUrl: string
  courseName: string
  uploaderName: string
  createdAt: string
}

export function AdminResourcesScreen() {
  const [resources, setResources] = useState<ResourceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [successMsg, setSuccessMsg] = useState('')

  const mockResources: ResourceFile[] = [
    { id: 'res-1', title: 'Guía: Leyes de Newton.pdf', description: 'Material teórico sobre cinemática y dinámica.', mimeType: 'application/pdf', fileSize: 2450000, driveUrl: 'https://drive.google.com/dummy-pdf', courseName: 'Física I - A', uploaderName: 'Alejandro Giraldo', createdAt: '2026-05-28 10:00' },
    { id: 'res-2', title: 'Video Explicativo: Ecuaciones Cuadráticas.mp4', description: 'Video de apoyo para resolver fórmulas complejas.', mimeType: 'video/mp4', fileSize: 45800000, driveUrl: 'https://drive.google.com/dummy-video', courseName: 'Matemáticas I - A', uploaderName: 'Beatriz Nuñez', createdAt: '2026-05-27 15:30' },
    { id: 'res-3', title: 'Código de Ejemplo: Bucles.py', description: 'Ejercicios de ciclos while y for resueltos en Python.', mimeType: 'text/x-python', fileSize: 12400, driveUrl: 'https://drive.google.com/dummy-code', courseName: 'Programación - A', uploaderName: 'Carlos Mendoza', createdAt: '2026-05-26 11:20' },
    { id: 'res-4', title: 'Lectura Recomendada: English Phrasal Verbs.epub', description: 'Diccionario digital de verbos frasales esenciales.', mimeType: 'application/epub+zip', fileSize: 8500000, driveUrl: 'https://drive.google.com/dummy-book', courseName: 'Inglés I - B', uploaderName: 'Diana Rivas', createdAt: '2026-05-25 09:10' },
    { id: 'res-5', title: 'Infografía: Estructura del Átomo.png', description: 'Infografía de apoyo visual sobre números atómicos.', mimeType: 'image/png', fileSize: 1800000, driveUrl: 'https://drive.google.com/dummy-img', courseName: 'Química I - A', uploaderName: 'Alejandro Giraldo', createdAt: '2026-05-24 16:45' }
  ]

  useEffect(() => {
    async function loadResources() {
      setLoading(true)
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setTimeout(() => {
          setResources(mockResources)
          setLoading(false)
        }, 500)
        return
      }

      try {
        const supabase = createClient()
        const { data: dbResources, error } = await supabase
          .from('resources')
          .select(`
            *,
            courses ( title ),
            profiles:uploaded_by ( first_name, last_name )
          `)
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('Error fetching real resources.')
          setResources([])
        } else {
          const mapped: ResourceFile[] = (dbResources || []).map((r: any) => {
            const uploader = r.profiles || {}
            return {
              id: r.id,
              title: r.title,
              description: r.description || '',
              mimeType: r.mime_type || 'application/octet-stream',
              fileSize: Number(r.file_size || 0),
              driveUrl: r.drive_url || '#',
              courseName: r.courses?.title || 'Curso General',
              uploaderName: uploader.first_name ? `${uploader.first_name} ${uploader.last_name || ''}` : 'Docente',
              createdAt: new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 16)
            }
          })
          setResources(mapped)
        }
      } catch (err) {
        console.error('Error loading resources:', err)
        setResources([])
      } finally {
        setLoading(false)
      }
    }
    loadResources()
  }, [])

  // Filtrados
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      const matchSearch = res.title.toLowerCase().includes(search.toLowerCase()) ||
        res.description.toLowerCase().includes(search.toLowerCase()) ||
        res.uploaderName.toLowerCase().includes(search.toLowerCase())

      let matchType = true
      if (filterType === 'pdf') {
        matchType = res.mimeType.includes('pdf')
      } else if (filterType === 'video') {
        matchType = res.mimeType.includes('video')
      } else if (filterType === 'image') {
        matchType = res.mimeType.includes('image')
      } else if (filterType === 'code') {
        matchType = res.mimeType.includes('python') || res.mimeType.includes('javascript') || res.mimeType.includes('text/')
      } else if (filterType === 'other') {
        matchType = !res.mimeType.includes('pdf') && !res.mimeType.includes('video') && !res.mimeType.includes('image') && !res.mimeType.includes('python')
      }

      return matchSearch && matchType
    })
  }, [resources, search, filterType])

  // KPIs
  const kpis = useMemo(() => {
    const totalCount = resources.length
    const totalBytes = resources.reduce((acc, r) => acc + r.fileSize, 0)
    // Convertir bytes a MB
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1)
    const pdfCount = resources.filter(r => r.mimeType.includes('pdf')).length
    const multimediaCount = resources.filter(r => r.mimeType.includes('video') || r.mimeType.includes('image')).length

    return {
      totalCount,
      totalMB,
      pdfCount,
      multimediaCount
    }
  }, [resources])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar permanentemente este recurso de la biblioteca escolar?')) return

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode) {
      setResources(resources.filter(r => r.id !== id))
      setSuccessMsg('Recurso documental eliminado.')
      setTimeout(() => setSuccessMsg(''), 3000)
      return
    }

    try {
      const result = await deleteResourceAction(id)
      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar recurso')
      }
      setResources(resources.filter(r => r.id !== id))
      setSuccessMsg('Recurso eliminado de la base de datos y de Google Drive.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      alert('Error al eliminar recurso: ' + (err?.message || 'Error desconocido'))
    }
  }

  // Formatear tamaño del archivo
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Icono dinámico según mimeType
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-5.5 w-5.5 text-red-500" />
    if (mimeType.includes('video')) return <Video className="h-5.5 w-5.5 text-blue-500" />
    if (mimeType.includes('image')) return <Image className="h-5.5 w-5.5 text-emerald-500" />
    if (mimeType.includes('python') || mimeType.includes('javascript') || mimeType.includes('code')) return <FolderOpen className="h-5.5 w-5.5 text-purple-500" />
    return <FileArchive className="h-5.5 w-5.5 text-slate-500" />
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Recursos Documentales
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Supervisa y audita las guías, grabaciones y documentos educativos subidos por los docentes.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-55 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: 'Archivos Totales', value: kpis.totalCount, desc: 'En toda la institución', icon: FolderOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
          { title: 'Almacenamiento', value: `${kpis.totalMB} MB`, desc: 'Espacio utilizado', icon: HardDrive, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
          { title: 'Documentos PDF', value: kpis.pdfCount, desc: 'Guías y talleres teóricos', icon: FileText, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
          { title: 'Multimedia', value: kpis.multimediaCount, desc: 'Videos e infografías', icon: Video, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' }
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{stat.value}</p>
                <p className="text-[10px] text-slate-450 dark:text-slate-500">{stat.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Controles de Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título, autor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
          >
            <option value="all">Todos los Formatos</option>
            <option value="pdf">Documentos PDF</option>
            <option value="video">Videos (.mp4, etc.)</option>
            <option value="image">Imágenes</option>
            <option value="code">Código de Programación</option>
            <option value="other">Otros formatos</option>
          </select>
        </div>
      </div>

      {/* Listado de Archivos */}
      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-550 dark:text-slate-455">No se encontraron archivos en la biblioteca escolar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900 shadow-sm">
          <table className="w-full text-sm text-left text-slate-550 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-450 uppercase font-bold border-b border-slate-100 dark:border-slate-800/60">
              <tr>
                <th className="px-6 py-4">Archivo / Título</th>
                <th className="px-6 py-4">Asignatura</th>
                <th className="px-6 py-4">Tamaño</th>
                <th className="px-6 py-4">Subido Por</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {filteredResources.map(res => (
                <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                      {getFileIcon(res.mimeType)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-xs">{res.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{res.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      {res.courseName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono font-medium">
                    {formatSize(res.fileSize)}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400" /> {res.uploaderName}</span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {res.createdAt}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <a
                        href={res.driveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Ver en Google Drive"
                      >
                        <Link2 className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(res.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 transition-colors"
                        title="Eliminar de Biblioteca"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
