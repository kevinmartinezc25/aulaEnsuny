'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, FileSpreadsheet, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react'
import { getAssistedSubjects, deleteAssistedSubject, AssistedSubject } from '../../application/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { toast } from 'sonner'
import { CreateSubjectModal } from '../components/CreateSubjectModal'

export function PlanillaAsistidaListScreen() {
  const [subjects, setSubjects] = useState<AssistedSubject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<AssistedSubject | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadSubjects = async () => {
    try {
      setIsLoading(true)
      const data = await getAssistedSubjects()
      setSubjects(data)
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar las materias')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSubjects()
    
    // Cerrar dropdown globalmente
    const handleGlobalClick = () => setOpenDropdownId(null)
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenDropdownId(prev => prev === id ? null : id)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenDropdownId(null)
    
    toast.error('¿Estás seguro de eliminar esta planilla?', {
      description: 'Todos los estudiantes y notas asociadas se perderán permanentemente.',
      duration: 10000,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            setDeletingId(id)
            await deleteAssistedSubject(id)
            toast.success('Planilla eliminada exitosamente')
            loadSubjects()
          } catch (error) {
            toast.error('Error al eliminar la planilla')
          } finally {
            setDeletingId(null)
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const filteredSubjects = subjects.filter(subject => 
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (subject.grade && subject.grade.toString().includes(searchQuery)) ||
    subject.period?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            Planilla Asistida
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registra y calcula las calificaciones de tus estudiantes de forma rápida y sencilla, independiente de los cursos oficiales.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Crear materia
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar materia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-10 rounded-xl"
          />
        </div>
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {filteredSubjects.length} {filteredSubjects.length === 1 ? 'materia' : 'materias'}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-100 dark:border-slate-800"></div>
          ))}
        </div>
      ) : filteredSubjects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject, index) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all duration-200 relative"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {subject.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {subject.grade && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
                          Grado: {subject.grade}{subject.group_number ? ` - Grupo: ${subject.group_number}` : ''}
                        </span>
                      )}
                      {subject.period && (
                        <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5">
                          {subject.period}
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-0.5">
                        {subject.students_count || 0} estudiante{(subject.students_count || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={(e) => toggleDropdown(subject.id, e)}
                      disabled={deletingId === subject.id}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 -mr-2 rounded-lg transition-colors"
                    >
                      {deletingId === subject.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <MoreVertical className="h-5 w-5" />}
                    </button>
                    {openDropdownId === subject.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => { 
                            e.preventDefault()
                            setOpenDropdownId(null)
                            setEditingSubject(subject)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-2"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button 
                          onClick={(e) => handleDelete(subject.id, e)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {subject.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {subject.description}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={`/teacher/planilla-asistida/${subject.id}`}
                  className="flex w-full items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  Abrir Planilla
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-16 px-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
            <FileSpreadsheet className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
            No tienes materias creadas
          </h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Comienza creando tu primera materia en Planilla Asistida. Recuerda que estos datos son independientes de los cursos virtuales.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Crear materia
          </Button>
        </div>
      )}

      <CreateSubjectModal 
        isOpen={isCreateModalOpen || editingSubject !== null}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingSubject(null)
        }}
        initialData={editingSubject}
        existingSubjects={subjects}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          setEditingSubject(null)
          loadSubjects()
        }}
      />
    </div>
  )
}
