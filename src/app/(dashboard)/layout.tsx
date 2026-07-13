'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Calendar, Settings, Bell, Menu, X, ChevronDown, LogOut, Award, TrendingUp,
  PanelLeftClose, PanelLeftOpen, Moon, Sun, LayoutDashboard, Users, GraduationCap,
  ClipboardList, BarChart2, BellRing, FolderOpen, ShieldCheck, UserCog, Activity, ChevronRight, FileText
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/modules/auth/application/actions'
import { createClient } from '@/core/config/supabase/client'

// ─── Admin Sidebar (grouped sections) ──────────────────────────────────────────
const ADMIN_NAV = [
  {
    section: 'Principal',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Gestión Académica',
    items: [
      { name: 'Usuarios', href: '/admin/users', icon: Users },
      { name: 'Grados', href: '/admin/grade-levels', icon: ClipboardList },
      { name: 'Cursos', href: '/admin/courses', icon: BookOpen },
      { name: 'Docentes', href: '/admin/teachers', icon: UserCog },
      { name: 'Estudiantes', href: '/admin/students', icon: GraduationCap },
      { name: 'Evaluaciones', href: '/admin/evaluations', icon: ClipboardList },
      { name: 'Registro Académico', href: '/admin/academic-registry', icon: ClipboardList },
      { name: 'Reportes Académicos', href: '/admin/academic-reports', icon: BarChart2 },
      { name: 'Elecciones', href: '/admin/elections', icon: Award },
    ],
  },
  {
    section: 'Análisis',
    items: [
      { name: 'Analíticas', href: '/admin/analytics', icon: BarChart2 },
      { name: 'Calendario', href: '/admin/calendar', icon: Calendar },
      { name: 'Agenda', href: '/admin/institutional-agenda', icon: ClipboardList },
      { name: 'Notificaciones', href: '/admin/notifications', icon: BellRing, badge: 3 },
      { name: 'Recursos', href: '/admin/resources', icon: FolderOpen },
      { name: 'Centro de Docs', href: '/admin/docs', icon: FileText },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { name: 'Configuración', href: '/admin/settings', icon: Settings },
      { name: 'Roles y Permisos', href: '/admin/roles', icon: ShieldCheck },
    ],
  },
]

interface UserSessionInfo {
  name: string
  email: string
  role: string
  grade?: string
  avatarUrl?: string
}

function getInitials(name?: string) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return parts[0][0].toUpperCase()
}

function AdminSidebar({ onClose, user, enabledModules = [] }: { onClose?: () => void; user: UserSessionInfo | null; enabledModules?: string[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  
  const navItems = ADMIN_NAV.map(group => {
    if (user?.role === 'superadmin') {
      if (group.section === 'Sistema') {
        return {
          ...group,
          items: [
            ...group.items,
            { name: 'Gestión de Módulos', href: '/superadmin/modules', icon: ShieldCheck }
          ]
        }
      }
      return group
    }

    return {
      ...group,
      items: group.items.filter(item => {
        const key = item.href.split('/').pop()!
        if (key === 'dashboard') return true
        return enabledModules.includes(key)
      })
    }
  }).filter(group => group.items.length > 0);

  // Start all sections open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navItems.map(g => [g.section, true]))
  )
  const toggleSection = (section: string) =>
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))

  const handleLogout = async () => {
    if (onClose) onClose()

    try {
      const result = await logout()
      if (result?.success) {
        router.replace('/login')
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      router.replace('/login')
    }
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/60">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-5 border-b border-slate-100 dark:border-slate-800/60">
        <img src="/logo_1.png" alt="aulaEnsuny" className="h-8 object-contain" />
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">aulaEnsuny</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {user?.role === 'superadmin' ? 'SuperAdmin' : 'Admin'}
          </span>
        </div>
      </div>

      {/* Nav Sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {navItems.map((group) => {
          const isOpen = openSections[group.section] ?? true
          return (
            <div key={group.section}>
              {/* Section Header — Clickable Toggle */}
              <button
                onClick={() => toggleSection(group.section)}
                className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 group transition-colors"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-500 transition-colors">
                  {group.section}
                </span>
                <ChevronDown className={`h-3 w-3 text-slate-300 dark:text-slate-700 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
              </button>

              {/* Section Items */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={group.section + '-items'}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 pb-2">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                              isActive
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                            }`}
                          >
                            <span className="flex items-center gap-3">
                              <Icon className="h-4 w-4 shrink-0" />
                              {item.name}
                            </span>
                            {(item as any).badge && !isActive && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                                {(item as any).badge}
                              </span>
                            )}
                            {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                          </Link>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      {/* Profile Footer */}
      <div className="shrink-0 border-t border-slate-100 dark:border-slate-800/60 p-3 relative">
        <AnimatePresence>
          {isProfileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 mb-1">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Sesión activa</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {user?.email || 'admin@ensuny.edu.co'}
                </p>
              </div>
              <Link href="/admin/settings" onClick={onClose} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                <Settings className="h-4 w-4" /> Configuración
              </Link>
              <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors">
                <LogOut className="h-4 w-4" /> Cerrar Sesión
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex w-full items-center gap-3 rounded-2xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white text-sm font-bold dark:from-slate-200 dark:to-white dark:text-slate-900">
            {user?.name ? user.name[0].toUpperCase() : 'A'}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {user?.name || 'Administrador'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
              {user?.email || 'admin@ensuny.edu.co'}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${isProfileOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  )
}

// ─── Regular Sidebar (students / teachers) ──────────────────────────────────────
interface SidebarProps {
  onClose?: () => void
  isCollapsed?: boolean
  user: UserSessionInfo | null
}

function SidebarContent({ onClose, isCollapsed = false, user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  let menuItems = [
    { name: 'Mis cursos', href: '/student/dashboard', icon: BookOpen },
    { name: 'Calificaciones', href: '/student/grades', icon: TrendingUp },
    { name: 'Calendario', href: '/student/calendar', icon: Calendar },
    { name: 'Logros', href: '/student/achievements', icon: Award },
    { name: 'Votaciones', href: '/student/elections', icon: ShieldCheck },
    { name: 'Documentos', href: '/student/docs', icon: FileText },
    { name: 'Configuración', href: '/student/settings', icon: Settings },
  ]

  if (pathname.startsWith('/teacher')) {
    menuItems = [
      { name: 'Panel Docente', href: '/teacher/dashboard', icon: BookOpen },
      { name: 'Calificaciones', href: '/teacher/grades', icon: ClipboardList },
      { name: 'Mis Estudiantes', href: '/teacher/students', icon: TrendingUp },
      { name: 'Calendario', href: '/teacher/calendar', icon: Calendar },
      { name: 'Agenda', href: '/teacher/institutional-agenda', icon: ClipboardList },
      { name: 'Jurado Electoral', href: '/juror/elections', icon: ShieldCheck },
      { name: 'Documentación', href: '/teacher/docs', icon: FileText },
      { name: 'Configuración', href: '/teacher/settings', icon: Settings },
    ]
  }

  const handleLogout = async () => {
    if (onClose) onClose()

    try {
      const result = await logout()
      if (result?.success) {
        router.replace('/login')
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      router.replace('/login')
    }
  }

  return (
    <div className={`flex h-full flex-col justify-between ${isCollapsed ? 'p-4' : 'p-6'}`}>
      <div className="space-y-8">
        {/* Logo */}
        <Link href="/" className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : 'px-2'}`} onClick={onClose}>
          <img src="/logo_1.png" alt="aulaEnsuny Logo" className="h-10 shrink-0 object-contain" />
          {!isCollapsed && (
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">aulaEnsuny</span>
          )}
        </Link>

        {/* Menu */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                title={isCollapsed ? item.name : undefined}
                className={`group flex items-center rounded-xl transition-all duration-200 ${
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                } text-sm font-medium ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Profile Card Bottom */}
      <div className="border-t border-slate-100 pt-4 dark:border-slate-800/60 relative">
        <AnimatePresence>
          {isProfileOpen && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 mb-3 w-full rounded-2xl border border-slate-100 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 mb-1">
                <p className="text-xs text-slate-400">Sesión iniciada como</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user?.email || 'estudiante@ensuny.edu.co'}
                </p>
              </div>
              <Link href={pathname.startsWith('/teacher') ? '/teacher/settings' : '/student/settings'} onClick={onClose} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                <Settings className="h-4 w-4" /> Ajustes
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={`flex items-center rounded-2xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'}`}
          title={isCollapsed ? (user?.name || 'Estudiante') : undefined}
        >
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user?.name || "Estudiante"}
                className="h-10 w-10 shrink-0 rounded-full object-cover border border-slate-100 dark:border-slate-800"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm border border-slate-100 dark:border-slate-800">
                {getInitials(user?.name)}
              </div>
            )}
            {!isCollapsed && (
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {user?.name || 'Estudiante'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {user?.grade 
                    ? `Grado ${user.grade}` 
                    : (user?.role === 'admin' 
                        ? 'Administrador' 
                        : (user?.role === 'teacher' ? 'Docente' : 'Estudiante')
                      )
                  }
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />}
        </div>
      </div>
    </div>
  )
}

// ─── Main Layout ────────────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Tarea Calificada', message: 'Tu ensayo sobre Inercia ha sido calificado con 4.5', time: 'Hace 2 horas', read: false },
  { id: 2, title: 'Nuevo Material', message: 'El profesor subió un nuevo PDF al módulo 2.', time: 'Hace 5 horas', read: false },
  { id: 3, title: 'Recordatorio', message: 'Mañana vence la entrega del Taller Práctico.', time: 'Ayer', read: true },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/superadmin')
  const isCourseSection = pathname.includes('/teacher/courses/') || pathname.includes('/student/courses/')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isAdminSidebarVisible, setIsAdminSidebarVisible] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [user, setUser] = useState<UserSessionInfo | null>(null)
  const [enabledModules, setEnabledModules] = useState<string[]>([])

  useEffect(() => {
    async function loadPermissions() {
      try {
        const { getAdminModulePermissions } = await import('@/modules/admin/application/actions')
        const permissions = await getAdminModulePermissions()
        if (permissions && permissions.length > 0) {
          setEnabledModules(permissions.filter(p => p.is_enabled).map(p => p.module_key))
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadPermissions()
  }, [pathname])

  const [notifications, setNotifications] = useState<any[]>([])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllNotificationsAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
    if (isDemoMode && typeof window !== 'undefined') {
      localStorage.setItem('aulaensuny-demo-notifications', JSON.stringify(updated))
    }
  }

  const markNotificationAsRead = (id: any) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n)
    setNotifications(updated)
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
    if (isDemoMode && typeof window !== 'undefined') {
      localStorage.setItem('aulaensuny-demo-notifications', JSON.stringify(updated))
    }
  }

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (theme === 'dark' || (!theme && prefersDark)) {
      document.documentElement.classList.add('dark')
      setIsDark(true)
    } else {
      document.documentElement.classList.remove('dark')
      setIsDark(false)
    }
  }, [])

  // Cargar perfil del usuario actual de manera reactiva/dinámica
  useEffect(() => {
    async function loadUserSession() {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                         process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      // 1. Verificar si hay sesión demo activa en la cookie (solo en modo demo)
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) return parts.pop()?.split(';').shift()
        return null
      }

      if (isDemoMode) {
        const demoCookie = getCookie('aulaensuny-demo-session')
        if (demoCookie) {
          try {
            const session = JSON.parse(decodeURIComponent(demoCookie))
            setUser({
              name: `${session.first_name} ${session.last_name}`,
              email: session.email || '',
              role: session.role || 'student',
              grade: session.grade_level || undefined,
              avatarUrl: undefined
            })
            return
          } catch (e) {
            console.error(e)
          }
        }
        return
      }

      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*, roles(name)')
            .eq('id', authUser.id)
            .single()

          if (profile) {
            setUser({
              name: `${profile.first_name} ${profile.last_name}`,
              email: authUser.email || '',
              role: profile.roles?.name || 'student',
              grade: profile.grade_level || undefined,
              avatarUrl: profile.avatar_url || undefined
            })
          } else {
            setUser({
              name: `${authUser.user_metadata?.first_name || 'Usuario'} ${authUser.user_metadata?.last_name || ''}`,
              email: authUser.email || '',
              role: authUser.user_metadata?.role_name || 'student',
              grade: authUser.user_metadata?.grade_level || undefined,
              avatarUrl: authUser.user_metadata?.avatar_url || undefined
            })
          }
        }
      } catch (err) {
        console.error('Error al cargar sesión de usuario en layout:', err)
      }
    }
    loadUserSession()
  }, [pathname]) // Se actualiza si cambia la ruta (por si se edita el perfil en Settings)

  // Cargar notificaciones reales en base a la sesión del usuario (bypassea mocks en producción)
  useEffect(() => {
    async function loadNotifications() {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                         process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        if (typeof window !== 'undefined') {
          const localNotifs = localStorage.getItem('aulaensuny-demo-notifications')
          if (localNotifs) {
            try {
              setNotifications(JSON.parse(localNotifs))
            } catch (e) {
              setNotifications(MOCK_NOTIFICATIONS)
            }
          } else {
            localStorage.setItem('aulaensuny-demo-notifications', JSON.stringify(MOCK_NOTIFICATIONS))
            setNotifications(MOCK_NOTIFICATIONS)
          }
        } else {
          setNotifications(MOCK_NOTIFICATIONS)
        }
        return
      }

      if (!user) {
        setNotifications([])
        return
      }

      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        // Buscar notificaciones destinadas al rol del usuario, a todos ('all') o dirigidas específicamente al usuario
        let query = supabase.from('notifications').select('*')
        if (authUser) {
          query = query.or(`target_role.eq.all,target_role.eq.${user.role},recipient_id.eq.${authUser.id}`)
        } else {
          query = query.or(`target_role.eq.all,target_role.eq.${user.role}`)
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.warn('Error fetching layout notifications:', error)
          setNotifications([])
        } else {
          const mapped = (data || []).map((n: any) => {
            const date = new Date(n.created_at)
            const timeStr = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            return {
              id: n.id,
              title: n.title,
              message: n.message,
              time: timeStr,
              read: n.is_read ?? false
            }
          })
          setNotifications(mapped)
        }
      } catch (err) {
        console.error('Error loading layout notifications:', err)
        setNotifications([])
      }
    }

    loadNotifications()
  }, [user])

  const toggleTheme = () => {
    const isDarkNow = document.documentElement.classList.toggle('dark')
    setIsDark(isDarkNow)
    localStorage.setItem('theme', isDarkNow ? 'dark' : 'light')
  }

  const handleLogout = async () => {
    try {
      const result = await logout()
      if (result?.success) {
        router.replace('/login')
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      router.replace('/login')
    }
  }
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed)
  const toggleAdminSidebar = () => setIsAdminSidebarVisible(prev => !prev)
  const handleAdminMenuToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileMenuOpen(true)
      return
    }
    toggleAdminSidebar()
  }

  // Admin layout: fixed 72px sidebar, no collapse button, no header for courses
  if (isAdmin) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Admin Sidebar Desktop */}
        {isAdminSidebarVisible && (
          <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 md:flex flex-col">
            <AdminSidebar user={user} enabledModules={enabledModules} />
          </aside>
        )}

        {/* Admin Main */}
        <div className={`flex flex-1 flex-col ${isAdminSidebarVisible ? 'md:pl-60' : 'md:pl-0'}`}>
          {/* Admin Header */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-6 dark:border-slate-800/60 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              
              <button
                onClick={handleAdminMenuToggle}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                title={isAdminSidebarVisible ? 'Ocultar menú' : 'Mostrar menú'}
                aria-label={isAdminSidebarVisible ? 'Ocultar menú' : 'Mostrar menú'}
              >
                {isAdminSidebarVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="ml-auto flex items-center gap-2">
              <button onClick={toggleTheme} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors" title="Cambiar tema">
                {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>
              <div className="relative">
                <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />}
                </button>
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden z-50">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800/60">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notificaciones</h3>
                        {unreadCount > 0 && (
                          <button onClick={markAllNotificationsAsRead} className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                            Marcar todo leído
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.map(notif => (
                          <div key={notif.id} onClick={() => markNotificationAsRead(notif.id)}
                            className={`flex flex-col gap-1 border-b border-slate-50 px-4 py-3 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:border-slate-800/30 transition-colors ${!notif.read ? 'bg-blue-50/40 dark:bg-blue-900/10' : 'opacity-70'}`}>
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{notif.title}</h4>
                              {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{notif.message}</p>
                            <span className="text-[10px] text-slate-400">{notif.time}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-800/60 p-2 text-center">
                        <button onClick={() => setIsNotificationsOpen(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400">Cerrar</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-red-400">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </header>

          <main className="flex-1 p-6 md:p-8">{children}</main>
        </div>

        {/* Mobile Drawer for Admin */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black md:hidden" />
              <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 z-50 w-60 md:hidden">
                <AdminSidebar user={user} onClose={() => setIsMobileMenuOpen(false)} enabledModules={enabledModules} />
                <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── Regular layout (student / teacher / course) ──────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f9fafb] dark:bg-slate-950 transition-all duration-300">
      {/* Sidebar Desktop */}
      {!isCourseSection && (
        <aside className={`fixed inset-y-0 left-0 z-20 hidden border-r border-slate-100 bg-white/70 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/70 md:block transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <SidebarContent user={user} isCollapsed={isSidebarCollapsed} />
          <button onClick={toggleSidebar}
            className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white z-30"
            title={isSidebarCollapsed ? 'Expandir menú' : 'Ocultar menú'}>
            {isSidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5 ml-0.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
          </button>
        </aside>
      )}

      {/* Main Container */}
      <div className={`flex flex-1 flex-col transition-all duration-300 ${isCourseSection ? 'pl-0' : (isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64')}`}>
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-6 dark:border-slate-800/60 dark:bg-slate-950 print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className={`rounded-lg p-2 hover:bg-slate-55 dark:hover:bg-slate-800/50 ${isCourseSection ? 'block' : 'md:hidden'}`}>
              <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            {isCourseSection && (
              <Link href={pathname.includes('/student') ? '/student/dashboard' : '/teacher/dashboard'} className="hidden md:flex items-center gap-2 px-2 hover:opacity-80 transition-opacity">
                <img src="/logo_1.png" alt="aulaEnsuny Logo" className="h-8 shrink-0 object-contain" />
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">aulaEnsuny</span>
              </Link>
            )}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-red-600 active:scale-[0.98] transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-red-400">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
            <button onClick={toggleTheme} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white transition-colors" title="Cambiar tema">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="relative">
              <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-55 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white transition-colors">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />}
              </button>
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden z-50">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800/60">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notificaciones</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllNotificationsAsRead} className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          Marcar todo leído
                        </button>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.map(notif => (
                        <div key={notif.id} onClick={() => markNotificationAsRead(notif.id)}
                          className={`flex flex-col gap-1 border-b border-slate-50 px-4 py-3 last:border-0 dark:border-slate-800/30 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${notif.read ? 'opacity-70' : 'bg-blue-50/30 dark:bg-blue-900/10'}`}>
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-bold ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>{notif.title}</h4>
                            {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{notif.message}</p>
                          <span className="text-[10px] font-medium text-slate-400 mt-1">{notif.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 p-2 dark:border-slate-800/60 text-center">
                      <button onClick={() => setIsNotificationsOpen(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">Cerrar</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8">{children}</main>
        <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400 dark:border-slate-800/60 dark:text-slate-500">
          <p>© {new Date().getFullYear()} aulaEnsuny. Todos los derechos reservados.</p>
        </footer>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black md:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
              <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 rounded-lg p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <X className="h-5 w-5 text-slate-500" />
              </button>
              <SidebarContent user={user} onClose={() => setIsMobileMenuOpen(false)} isCollapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
