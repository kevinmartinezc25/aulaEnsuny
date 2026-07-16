'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  LayoutDashboard, 
  FolderOpen, 
  FileText, 
  HelpCircle, 
  BarChart3, 
  Users, 
  Calendar, 
  Settings,
  BookOpen,
  Inbox,
  MessageSquare,
  Megaphone,
  UserPlus
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'

export default function TeacherCourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const params = useParams<{ id: string }>()
  const courseId = params?.id

  const [course, setCourse] = useState<{ title: string; subject: string } | null>(null)
  
  useEffect(() => {
    if (!courseId) return
    const fetchCourse = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('courses')
          .select('title, subject')
          .eq('id', courseId)
          .single()
        if (data) {
          setCourse(data)
        }
      } catch (err) {
        console.error("Error fetching course in layout:", err)
      }
    }
    fetchCourse()
  }, [courseId])

  const basePath = `/teacher/courses/${courseId}`

  const navItems = [
    { name: 'Dashboard', href: basePath, icon: LayoutDashboard },
    { name: 'Novedades', href: `${basePath}/announcements`, icon: Megaphone },
    { name: 'Módulos', href: `${basePath}/modules`, icon: FolderOpen },
    { name: 'Recursos', href: `${basePath}/resources`, icon: FileText },
    { name: 'Quizzes', href: `${basePath}/quizzes`, icon: HelpCircle },
    { name: 'Foros', href: `${basePath}/forums`, icon: MessageSquare },
    { name: 'Entregas', href: `${basePath}/submissions`, icon: Inbox },
    { name: 'Calificaciones', href: `${basePath}/grades`, icon: BarChart3 },
    { name: 'Estudiantes', href: `${basePath}/students`, icon: Users },
    { name: 'Solicitudes', href: `${basePath}/requests`, icon: UserPlus },
    { name: 'Calendario', href: `${basePath}/calendar`, icon: Calendar },
    { name: 'Configuración', href: `${basePath}/settings`, icon: Settings },
  ]

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row gap-0 lg:gap-2 py-8">
      {/* Sidebar Izquierdo */}
      <aside className="w-full lg:w-56 shrink-0 pr-4 print:hidden">
        <div className="sticky top-24 space-y-6">
          {/* Volver a cursos */}
          <Link 
            href="/teacher/dashboard"
            className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Volver a cursos
          </Link>

          {/* Header del Curso en el Sidebar */}
          <div className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800/60 pb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                {course?.title || 'Cargando...'}
              </h2>
              <p className="truncate text-xs font-medium text-slate-400">
                {course?.subject || 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Navegación Interna */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key={pathname} // Para re-animar al cambiar de ruta
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
