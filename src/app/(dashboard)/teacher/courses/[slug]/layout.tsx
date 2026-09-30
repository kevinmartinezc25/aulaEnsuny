'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  UserPlus,
  Menu,
  X
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'

export default function TeacherCourseLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const pathname = usePathname()
  const routeParams = useParams()
  
  // En Next.js 15, en Client Components de layout la fuente fiable es useParams()
  const slugFromParams = routeParams?.slug as string | undefined
  const slugFromPath = pathname.startsWith('/teacher/courses/') 
    ? pathname.split('/teacher/courses/')[1]?.split('/')[0] 
    : undefined

  const rawSlug = slugFromParams || slugFromPath || ''
  const courseSlug = rawSlug ? decodeURIComponent(rawSlug) : ''

  const [course, setCourse] = useState<{ title: string; subject: string } | null>(null)
  
  useEffect(() => {
    if (!courseSlug) return
    const fetchCourse = async () => {
      try {
        const supabase = createClient()
        let query = supabase.from('courses').select('title, subject')
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(courseSlug)) {
          query = query.eq('id', courseSlug)
        } else {
          query = query.eq('slug', courseSlug)
        }
        const { data } = await query.maybeSingle()
        if (data) {
          setCourse(data)
        }
      } catch (err) {
        console.error("Error fetching course in layout:", err)
      }
    }
    fetchCourse()
  }, [courseSlug])

  const basePath = `/teacher/courses/${courseSlug}`

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

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  // Cierra el menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [pathname])

  const sidebarContent = (
    <div className="space-y-6">
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
          <h2 className="truncate text-base font-bold text-slate-900 dark:text-white" title={course?.title}>
            {course?.title || 'Cargando...'}
          </h2>
          <p className="truncate text-xs font-medium text-slate-400" title={course?.subject}>
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
  )

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row gap-0 lg:gap-4 px-4 md:px-8 py-4 md:py-8 relative">
      {/* Mobile Header / Hamburger */}
      <div className="lg:hidden flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60 mb-4 sticky top-4 z-30 shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <BookOpen className="h-4 w-4" />
          </div>
          <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {course?.title || 'Cargando...'}
          </h1>
        </div>
        <button 
          onClick={() => setIsMobileNavOpen(true)}
          className="p-2 shrink-0 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Sidebar Izquierdo (Desktop) */}
      <aside className="hidden lg:block w-56 shrink-0 pr-4 print:hidden">
        <div className="sticky top-24">
          {sidebarContent}
        </div>
      </aside>

      {/* Cajón Móvil de Navegación (Mobile Sidebar) */}
      {/* Importamos AnimatePresence de framer-motion en layout (ya importado arriba) */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 z-[100] bg-black lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[110] w-72 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden overflow-y-auto"
            >
              <div className="p-6 h-full flex flex-col relative">
                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                {sidebarContent}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
