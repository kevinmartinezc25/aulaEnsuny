'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Search, Mail, Filter, MoreHorizontal, ShieldAlert, CheckCircle2, UserCircle, Trash2 } from 'lucide-react'
import { MessageModal } from '../components/MessageModal'
import { toast } from 'sonner'

import { createClient } from '@/core/config/supabase/client'
import { getCourseStudents } from '../../application/teacherActions'

function getInitials(name: string) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return parts[0][0].toUpperCase()
}

export function TeacherCourseStudentsScreen({ courseId }: { courseId: string }) {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [activeRecipient, setActiveRecipient] = useState<{ name: string; email: string } | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    if (openDropdownId) {
      window.addEventListener('click', handleClickOutside)
    }
    return () => window.removeEventListener('click', handleClickOutside)
  }, [openDropdownId])

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

        if (isDemoMode) {
          setStudents([
            { id: 's1', name: 'Ana García', email: 'ana.garcia@colegio.edu', status: 'active', attendance: '95%', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100' },
            { id: 's2', name: 'Carlos López', email: 'carlos.lopez@colegio.edu', status: 'at_risk', attendance: '70%', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' },
            { id: 's3', name: 'Laura Martínez', email: 'laura.m@colegio.edu', status: 'active', attendance: '100%', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100' },
            { id: 's4', name: 'Diego Fernández', email: 'diego.f@colegio.edu', status: 'at_risk', attendance: '60%', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' },
            { id: 's5', name: 'Sofía Castro', email: 'sofia.c@colegio.edu', status: 'active', attendance: '90%', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100' },
          ])
          setLoading(false)
          return
        }

        const mappedStudents = await getCourseStudents(courseId)
        setStudents(mappedStudents)
      } catch (err) {
        console.error("Error fetching course students:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [courseId])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleRemoveStudent = (id: string) => {
    toast.warning('¿Remover estudiante?', {
      description: 'El estudiante será removido del curso.',
      action: {
        label: 'Remover',
        onClick: () => {
          setStudents(prev => prev.filter(s => s.id !== id))
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const handleOpenMessage = (student?: { name: string; email: string }) => {
    setActiveRecipient(student || null)
    setIsMessageModalOpen(true)
  }

  const handleSendMessage = (subject: string, message: string) => {
    // Aquí iría la lógica de envío real a Supabase
    console.log(`Sending message to ${activeRecipient?.email || 'all'}`, { subject, message })
    setIsMessageModalOpen(false)
    setActiveRecipient(null)
  }

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            Estudiantes
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gestiona la nómina del curso y monitorea su progreso.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtrar</span>
          </button>
          <button 
            onClick={() => handleOpenMessage()}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Mensaje Masivo</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden dark:border-slate-800/60 dark:bg-slate-900">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800/60">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tabla Minimalista */}
        <div className="overflow-x-auto min-h-[240px]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-800/20">
                <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Estudiante</th>
                <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Correo Electrónico</th>
                <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-center">Asistencia</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      {student.avatar ? (
                        <img src={student.avatar} alt={student.name} className="h-9 w-9 rounded-full object-cover border border-slate-100 dark:border-slate-700" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs border border-slate-100 dark:border-slate-700">
                          {getInitials(student.name)}
                        </div>
                      )}
                      <span className="font-semibold text-slate-900 dark:text-white">{student.name}</span>
                    </div>
                  </td>
                  
                  <td className="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-400">
                    {student.email}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    {student.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Al día
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        En Riesgo
                      </span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-center font-medium text-slate-700 dark:text-slate-300">
                    {student.attendance}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenMessage({ name: student.name, email: student.email })}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors dark:hover:text-blue-400 dark:hover:bg-slate-800" 
                        title="Enviar Mensaje Directo"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenDropdownId(openDropdownId === student.id ? null : student.id)
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors dark:hover:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <MoreHorizontal className="h-4 w-4 pointer-events-none" />
                        </button>
                        
                        {openDropdownId === student.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-white shadow-lg border border-slate-100 dark:border-slate-800 dark:bg-slate-900 z-50 py-1" onClick={e => e.stopPropagation()}>
                            <Link 
                              href={`/teacher/courses/${courseId}/students/${student.id}`}
                              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <UserCircle className="h-4 w-4" />
                              Ver Perfil
                            </Link>
                            <button 
                              onClick={() => { handleRemoveStudent(student.id); setOpenDropdownId(null); }}
                              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron estudiantes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MessageModal 
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        recipient={activeRecipient}
        onSend={handleSendMessage}
      />
    </div>
  )
}
