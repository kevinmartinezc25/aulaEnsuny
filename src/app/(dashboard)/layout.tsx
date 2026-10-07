'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Calendar, Settings, Bell, Menu, X, ChevronDown, LogOut, Award, TrendingUp,
  PanelLeftClose, PanelLeftOpen, Moon, Sun, LayoutDashboard, Users, GraduationCap,
  ClipboardList, BarChart2, BellRing, FolderOpen, ShieldCheck, ShieldAlert, UserCog, Activity, ChevronRight, FileText, CalendarDays, Download,
  Layers, FileCheck2, FileSpreadsheet, Vote, CalendarCheck, SlidersHorizontal, CheckSquare,
  Building2, UserCircle, BarChart, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/modules/auth/application/actions'
import { createClient } from '@/core/config/supabase/client'
import { PendingPermissionsAlertModal } from '@/modules/permissions/presentation/components/PendingPermissionsAlertModal'
import { useUserSessionStore } from '@/store/useUserSessionStore'

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
      { name: 'Docentes', href: '/admin/teachers', icon: UserCog },
      { name: 'Estudiantes', href: '/admin/students', icon: GraduationCap },
      { name: 'Usuarios', href: '/admin/users', icon: Users },
      { name: 'Grados y Niveles', href: '/admin/grade-levels', icon: Layers },
      { name: 'Cursos y Materias', href: '/admin/courses', icon: BookOpen },
      { name: 'Horarios', href: '/admin/schedules', icon: CalendarDays },
      { name: 'Evaluaciones', href: '/admin/evaluations', icon: CheckSquare },
      { name: 'Registro Académico', href: '/admin/academic-registry', icon: FileSpreadsheet },
    ],
  },
  {
    section: 'Gestión Institucional',
    items: [
      { name: 'Permisos Docentes', href: '/admin/permissions', icon: FileCheck2 },
      { name: 'Alertas Tempranas', href: '/admin/early-alerts', icon: AlertTriangle },
      { name: 'Convivencia', href: '/admin/disciplinary', icon: ShieldAlert },
      { name: 'Elecciones', href: '/admin/elections', icon: Vote },
    ],
  },
  {
    section: 'Planificación y Recursos',
    items: [
      { name: 'Agenda', href: '/admin/institutional-agenda', icon: CalendarCheck },
      { name: 'Calendario', href: '/admin/calendar', icon: Calendar },
      { name: 'Notificaciones', href: '/admin/notifications', icon: BellRing },
      { name: 'Portal de Conocimiento', href: '/admin/docs', icon: FileText },
      { name: 'Recursos', href: '/admin/resources', icon: FolderOpen },
    ],
  },
  {
    section: 'Reportes y Analíticas',
    items: [
      { name: 'Analíticas', href: '/admin/analytics', icon: TrendingUp },
      { name: 'Reportes Académicos', href: '/admin/academic-reports', icon: BarChart2 },
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

const SECTION_ICONS: Record<string, any> = {
  'Gestión Académica': GraduationCap,
  'Gestión Institucional': Building2,
  'Planificación y Recursos': CalendarDays,
  'Reportes y Analíticas': BarChart2,
  'Sistema': Settings,
}

interface UserSessionInfo {
  id?: string
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

function isStudentVirtualCampusRoute(pathname: string): boolean {
  return (
    pathname === '/student/courses' ||
    pathname.startsWith('/student/courses/') ||
    pathname.startsWith('/student/requests') ||
    pathname.startsWith('/student/virtual-grades') ||
    pathname.startsWith('/student/join-course') ||
    pathname.startsWith('/student/calendar')
  )
}

function AdminSidebar({ onClose, user, enabledModules = [], isCollapsed = false, onLogout, pendingPermissionsCount = 0 }: { onClose?: () => void; user: UserSessionInfo | null; enabledModules?: string[], isCollapsed?: boolean, onLogout?: () => void, pendingPermissionsCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  
  const navItems = ADMIN_NAV.map(group => {
    let items = group.items

    if (user?.role === 'superadmin') {
      if (group.section === 'Sistema') {
        items = [
          ...items,
          { name: 'Gestión de Módulos', href: '/superadmin/modules', icon: SlidersHorizontal }
        ]
      }
    } else {
      items = items.filter(item => {
        const key = item.href.split('/').pop()!
        if (key === 'dashboard' || key === 'notifications') return true
        return enabledModules.includes(key)
      })
    }

    return {
      ...group,
      items
    }
  }).filter(group => group.items.length > 0);

  // Iniciar colapsados los grupos de submódulos; solo abrir el que contenga la ruta actual
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navItems.forEach(g => {
      const hasActive = g.items.some(
        item => pathname === item.href || pathname.startsWith(item.href + '/')
      )
      initial[g.section] = hasActive
    })
    return initial
  })

  // Sincronizar automáticamente si la ruta cambia a un módulo de otra sección
  useEffect(() => {
    navItems.forEach(g => {
      const hasActive = g.items.some(
        item => pathname === item.href || pathname.startsWith(item.href + '/')
      )
      if (hasActive) {
        setOpenSections(prev => ({ ...prev, [g.section]: true }))
      }
    })
  }, [pathname])

  const toggleSection = (section: string) =>
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))

  const handleLogout = async () => {
    if (onClose) onClose()
    // Si se recibe un manejador externo (del layout padre), usarlo directamente
    if (onLogout) {
      onLogout()
      return
    }
    useUserSessionStore.getState().clearSession()
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pending_permissions_popup_dismissed')
      sessionStorage.removeItem('pending_permissions_profile_dismissed')
    }
    try {
      await logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      // Siempre redirigir + forzar revalidación del middleware de sesión
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/60">
      {/* Logo */}
      <div className={`flex h-16 shrink-0 items-center border-b border-slate-100 dark:border-slate-800/60 ${isCollapsed ? 'justify-center px-1 gap-1.5' : 'gap-2.5 px-4'}`}>
        <img src="/escudo_ensuny.png" alt="Escudo ENSUNY" className={`${isCollapsed ? 'h-7 w-7' : 'h-8 w-auto'} shrink-0 object-contain`} />
        {isCollapsed ? (
          <img src="/logo_1.svg" alt="aulaEnsuny" className="h-6 w-6 shrink-0 object-contain" />
        ) : (
          <div className="flex flex-col justify-center">
            <div className="relative w-[175px] h-9 flex items-center justify-start">
              <img
                src="/logo.svg?v=2"
                alt="aulaEnsuny Logo"
                className="object-contain object-left w-full h-full dark:hidden"
              />
              <img
                src="/logo_dark.svg?v=2"
                alt="aulaEnsuny Logo Dark"
                className="object-contain object-left w-full h-full hidden dark:block"
              />
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {user?.role === 'superadmin' ? 'SuperAdmin' : 'Admin'}
            </span>
          </div>
        )}
      </div>

      {/* Nav Sections */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-2 custom-scrollbar">
        {navItems.map((group) => {
          // Sección "Principal" (Dashboard): enlace directo sin acordeón
          if (group.section === 'Principal') {
            return (
              <div key={group.section} className="space-y-1 pb-1">
                {group.items.map(item => {
                  const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href + '/'))
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      title={isCollapsed ? item.name : undefined}
                      className={`group flex items-center rounded-3xl transition-all duration-150 relative ${
                        isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                      } text-sm font-semibold ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                      }`}
                    >
                      <span className={`flex items-center gap-3 ${isCollapsed ? '' : 'truncate'}`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )
          }

          // Secciones de submódulos agrupados
          const isOpen = openSections[group.section] ?? false
          const hasActiveChild = group.items.some(
            item => pathname === item.href || pathname.startsWith(item.href + '/')
          )
          const GroupIcon = SECTION_ICONS[group.section] || Layers

          return (
            <div key={group.section} className="rounded-3xl transition-all">
              {/* Encabezado del Grupo (Botón Clicable para Desplegar/Plegar) */}
              <button
                type="button"
                onClick={() => !isCollapsed && toggleSection(group.section)}
                className={`w-full flex items-center rounded-3xl transition-all duration-150 ${
                  isCollapsed
                    ? 'justify-center p-2.5 cursor-default'
                    : 'justify-between px-3 py-2 cursor-pointer group select-none'
                } ${
                  hasActiveChild
                    ? 'bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-900/40'
                    : 'text-slate-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={isCollapsed ? (group.section === 'Gestión Institucional' && pendingPermissionsCount > 0 ? `${group.section} (${pendingPermissionsCount} pendientes)` : group.section) : undefined}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="relative shrink-0 flex items-center justify-center">
                    <GroupIcon className={`h-4 w-4 shrink-0 ${hasActiveChild ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                    {isCollapsed && group.section === 'Gestión Institucional' && pendingPermissionsCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="text-xs font-bold truncate tracking-tight">
                      {group.section}
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isOpen && group.section === 'Gestión Institucional' && pendingPermissionsCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-amber-500 text-[10px] font-black text-white shadow-xs">
                        {pendingPermissionsCount > 99 ? '99+' : pendingPermissionsCount}
                      </span>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-0 text-slate-600 dark:text-slate-300' : '-rotate-90 text-slate-400 dark:text-slate-500'}`} />
                  </div>
                )}
              </button>

              {/* Submódulos Desplegables */}
              <AnimatePresence initial={false}>
                {(isOpen || isCollapsed) && (
                  <motion.div
                    key={group.section + '-items'}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className={`space-y-0.5 py-1 ${!isCollapsed ? 'ml-3.5 pl-2.5 border-l-2 border-slate-150 dark:border-slate-800/90' : ''}`}>
                      {group.items.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        const Icon = item.icon
                        const isPermissionsItem = item.href === '/admin/permissions'
                        const showPermissionsBadge = isPermissionsItem && pendingPermissionsCount > 0

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => {
                              // Asegurar que el acordeón del grupo padre permanezca abierto al navegar
                              setOpenSections(prev => ({ ...prev, [group.section]: true }))
                              if (onClose) onClose()
                            }}
                            title={isCollapsed ? (showPermissionsBadge ? `${item.name} (${pendingPermissionsCount} pendientes)` : item.name) : undefined}
                            className={`group flex items-center rounded-3xl transition-all duration-150 relative ${
                              isCollapsed ? 'justify-center p-2.5 my-0.5' : 'justify-between px-2.5 py-2 my-0.5'
                            } text-xs font-medium ${
                              isActive
                                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                            }`}
                          >
                            <span className={`flex items-center gap-2.5 ${isCollapsed ? 'relative' : 'truncate flex-1 min-w-0 pr-1'}`}>
                              <div className="relative shrink-0 flex items-center justify-center">
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                {isCollapsed && showPermissionsBadge && (
                                  <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-black rounded-full bg-amber-500 text-white shadow-xs ring-2 ring-white dark:ring-slate-900 animate-pulse">
                                    {pendingPermissionsCount > 9 ? '9+' : pendingPermissionsCount}
                                  </span>
                                )}
                              </div>
                              {!isCollapsed && <span className="truncate">{item.name}</span>}
                            </span>

                            {!isCollapsed && showPermissionsBadge && (
                              <span
                                className={`ml-auto shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-black rounded-full shadow-xs ${
                                  isActive
                                    ? 'bg-amber-400 text-amber-950 ring-1 ring-white/50'
                                    : 'bg-amber-500 text-white'
                                }`}
                                title={`${pendingPermissionsCount} solicitudes pendientes de revisión`}
                              >
                                {pendingPermissionsCount > 99 ? '99+' : pendingPermissionsCount}
                              </span>
                            )}
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
              className="absolute bottom-full left-3 right-3 mb-2 rounded-3xl border border-slate-100 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 mb-1">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Sesión activa</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {user?.email || 'admin@ensuny.edu.co'}
                </p>
              </div>
              <Link href="/admin/profile" onClick={onClose} className="flex items-center gap-2 rounded-3xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                <Settings className="h-4 w-4" /> Configuración
              </Link>
              <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-3xl px-3 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                <LogOut className="h-4 w-4" /> Cerrar Sesión
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={`flex w-full items-center rounded-3xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center' : 'gap-3'
          }`}
          title={isCollapsed ? user?.name || 'Administrador' : undefined}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 text-white text-sm font-bold dark:from-slate-200 dark:to-white dark:text-slate-900">
            {user?.name ? user.name[0].toUpperCase() : 'A'}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name || 'Administrador'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                  {user?.email || 'admin@ensuny.edu.co'}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </>
          )}
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
  const [hasVirtualCourses, setHasVirtualCourses] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }))
  }

  const isTeacher = user?.role === 'teacher' || pathname.startsWith('/teacher')

  useEffect(() => {
    async function checkCourses() {
      if (user?.id) {
        const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
        if (isDemoMode) {
          setHasVirtualCourses(true)
          return
        }
        try {
          const supabase = createClient()
          if (isTeacher) {
            const { data } = await supabase.from('courses').select('id').eq('teacher_id', user.id).limit(1)
            setHasVirtualCourses(data !== null && data.length > 0)
          } else {
            const { data } = await supabase.from('student_courses').select('id').eq('student_id', user.id).limit(1)
            setHasVirtualCourses(data !== null && data.length > 0)
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
    checkCourses()
  }, [isTeacher, user?.id])

  const isStudentVirtualCourses = isStudentVirtualCampusRoute(pathname)

  let menuGroups = [
    {
      label: 'ACADÉMICO',
      items: [
        { name: 'Portal Académico', href: '/student/dashboard', icon: LayoutDashboard },
        ...(hasVirtualCourses ? [{ name: 'Mis cursos', href: '/student/courses', icon: BookOpen }] : []),
        { name: 'Horario', href: '/student/schedule', icon: CalendarDays },
        ...(hasVirtualCourses ? [{ name: 'Mis solicitudes', href: '/student/requests', icon: ClipboardList }] : []),
        { name: 'Calificaciones', href: '/student/grades', icon: TrendingUp },
        { name: 'Convivencia', href: '/student/disciplinary', icon: ShieldAlert },
        { name: 'Asistencia Escolar', href: '/student/attendance', icon: Activity },
      ]
    },
    {
      label: 'GESTIÓN',
      items: [
        { name: 'Calendario', href: '/student/calendar', icon: Calendar },
        { name: 'Votaciones', href: '/student/elections', icon: ShieldCheck },
      ]
    },
    {
      label: 'SISTEMA',
      items: [
        { name: 'Configuración', href: '/student/settings', icon: Settings },
      ]
    }
  ]

  // Si estamos en el Campus Virtual, mostramos un menú exclusivo
  if (!isTeacher && isStudentVirtualCourses) {
    menuGroups = [
      {
        label: 'ACADÉMICO',
        items: [
          { name: 'Portal Académico', href: '/student/dashboard', icon: LayoutDashboard },
          { name: 'Mis cursos', href: '/student/courses', icon: BookOpen },
          { name: 'Horario', href: '/student/schedule', icon: CalendarDays },
          { name: 'Mis solicitudes', href: '/student/requests', icon: ClipboardList },
          { name: 'Calificaciones', href: '/student/virtual-grades', icon: TrendingUp },
        ]
      },
      {
        label: 'GESTIÓN',
        items: [
          { name: 'Calendario', href: '/student/calendar', icon: Calendar },
          { name: 'Votaciones', href: '/student/elections', icon: ShieldCheck },
        ]
      },
      {
        label: 'SISTEMA',
        items: [
          { name: 'Configuración', href: '/student/settings', icon: Settings },
        ]
      }
    ]
  }

  if (isTeacher) {
    menuGroups = [
      {
        label: 'Principal',
        items: [
          { name: 'Panel Docente', href: '/teacher/dashboard', icon: BookOpen },
        ]
      },
      ...(hasVirtualCourses ? [{
        label: 'AULA VIRTUAL',
        items: [
          { name: 'Mis Cursos', href: '/teacher/courses', icon: BookOpen },
          { name: 'Mis Estudiantes', href: '/teacher/students', icon: Users },
          { name: 'Calificaciones', href: '/teacher/grades', icon: ClipboardList },
          { name: 'Calendario', href: '/teacher/calendar', icon: Calendar },
        ]
      }] : []),
      {
        label: 'GESTIÓN ACADÉMICA',
        items: [
          { name: 'Planilla Asistida', href: '/teacher/planilla-asistida', icon: FileSpreadsheet },
          { name: 'Horario (Docente)', href: '/teacher/schedule', icon: CalendarDays },
        ]
      },
      {
        label: 'GESTIÓN Y CONVIVENCIA',
        items: [
          { name: 'Convivencia Escolar', href: '/teacher/disciplinary', icon: ShieldAlert },
          { name: 'Agenda', href: '/teacher/institutional-agenda', icon: ClipboardList },
        ]
      },
      {
        label: 'INSTITUCIONAL',
        items: [
          { name: 'Permisos', href: '/teacher/permissions', icon: ClipboardList },
          { name: 'Jurado Electoral', href: '/juror/elections', icon: ShieldCheck },
          { name: 'Portal de Conocimiento', href: '/teacher/docs', icon: FileText },
        ]
      },
      {
        label: 'Sistema',
        items: [
          { name: 'Configuración', href: '/teacher/settings', icon: Settings },
        ]
      }
    ]
  }

  const handleLogout = async () => {
    if (onClose) onClose()

    useUserSessionStore.getState().clearSession()
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
    <div className="flex h-full flex-col justify-between">
      {/* Brand Header */}
      <div className={`h-16 shrink-0 flex items-center border-b border-slate-100 dark:border-slate-800/60 ${isCollapsed ? 'justify-center px-1' : 'px-4 pr-6'}`}>
        <Link href="/" className={`flex items-center ${isCollapsed ? 'justify-center gap-1.5' : 'gap-2.5'}`} onClick={onClose}>
          <img
            src="/escudo_ensuny.png"
            alt="Escudo ENSUNY"
            className={`${isCollapsed ? 'h-7 w-7' : 'h-8 w-auto'} shrink-0 object-contain`}
          />
          {isCollapsed ? (
            <img
              src="/logo_1.svg"
              alt="aulaEnsuny Logo"
              className="h-6 w-6 shrink-0 object-contain"
            />
          ) : (
            <div className="relative w-[155px] h-9 flex items-center justify-start">
              <img
                src="/logo.svg?v=2"
                alt="aulaEnsuny Logo"
                className="object-contain object-left w-full h-full dark:hidden"
              />
              <img
                src="/logo_dark.svg?v=2"
                alt="aulaEnsuny Logo Dark"
                className="object-contain object-left w-full h-full hidden dark:block"
              />
            </div>
          )}
        </Link>
      </div>

      {/* Menu scrollable */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-3' : 'p-4'} space-y-6 custom-scrollbar`}>
        <nav className="space-y-5">
          {menuGroups.map((group, groupIdx) => {
            const isGroupCollapsed = collapsedGroups[group.label || String(groupIdx)]
            return (
            <div key={group.label || String(groupIdx)} className="space-y-1">
              {group.label && !isCollapsed && (
                <div 
                  className="px-4 mb-2 flex items-center justify-between cursor-pointer group/label"
                  onClick={() => toggleGroup(group.label || String(groupIdx))}
                >
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase transition-colors group-hover/label:text-slate-600 dark:group-hover/label:text-slate-300">
                    {group.label}
                  </p>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`} />
                </div>
              )}
              <AnimatePresence initial={false}>
                {(!isGroupCollapsed || isCollapsed) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-0.5 overflow-hidden"
                  >
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={onClose}
                          title={isCollapsed ? item.name : undefined}
                          className={`group flex items-center rounded-3xl transition-colors duration-200 ${
                            isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-2.5'
                          } text-sm font-medium ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                          }`}
                        >
                          <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : ''}`} />
                          {!isCollapsed && <span className="truncate">{item.name}</span>}
                        </Link>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )})}
        </nav>
      </div>

      {/* Profile Card Bottom */}
      <div className={`border-t border-slate-100 dark:border-slate-800/60 relative ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <AnimatePresence>
          {isProfileOpen && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 mb-3 w-full rounded-3xl border border-slate-100 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 mb-1">
                <p className="text-xs text-slate-400">Sesión iniciada como</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user?.email || 'estudiante@ensuny.edu.co'}
                </p>
              </div>
              <Link href={isTeacher ? '/teacher/settings' : '/student/settings'} onClick={onClose} className="flex w-full items-center gap-2 rounded-3xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                <Settings className="h-4 w-4" /> Ajustes
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={`flex items-center rounded-3xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'}`}
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
const STUDENT_MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Tarea Calificada', message: 'Tu ensayo sobre Inercia ha sido calificado con 4.5', time: 'Hace 2 horas', read: false },
  { id: 2, title: 'Nuevo Material', message: 'El profesor subió un nuevo PDF al módulo 2.', time: 'Hace 5 horas', read: false },
  { id: 3, title: 'Recordatorio', message: 'Mañana vence la entrega del Taller Práctico.', time: 'Ayer', read: true },
]

const TEACHER_MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Nueva Entrega', message: 'Ana García entregó la Tarea 1.', time: 'Hace 30 min', read: false },
  { id: 2, title: 'Mensaje de Foro', message: 'Carlos López publicó una duda en el Foro General.', time: 'Hace 2 horas', read: false },
  { id: 3, title: 'Solicitud de Ingreso', message: 'Diego Fernández solicitó unirse a Física General.', time: 'Ayer', read: true },
]

const ADMIN_MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Reporte de Sistema', message: 'Se completó la copia de seguridad diaria con éxito.', time: 'Hace 15 min', read: false },
  { id: 2, title: 'Nueva Solicitud Académica', message: 'Un docente solicitó la creación de un nuevo curso.', time: 'Hace 3 horas', read: false },
  { id: 3, title: 'Registro de Auditoría', message: 'Se detectó un cambio de configuración en el módulo de grados.', time: 'Ayer', read: true },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/superadmin')
  const isCourseSection = pathname.includes('/teacher/courses/') || pathname.includes('/student/courses/')
  const isDocsPage = pathname.endsWith('/docs')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isAdminSidebarVisible, setIsAdminSidebarVisible] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const sessionUser = useUserSessionStore(state => state.user)
  const initSession = useUserSessionStore(state => state.initSession)

  useEffect(() => {
    initSession()
  }, [initSession])

  // Usar useMemo para evitar que `user` sea un objeto nuevo en cada render
  // (causaba loops infinitos en los useEffect que lo usaban como dependencia)
  const user: UserSessionInfo | null = React.useMemo(() => {
    if (!sessionUser) return null
    return {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      role: sessionUser.role,
      grade: sessionUser.grade,
      avatarUrl: sessionUser.avatarUrl
    }
  }, [sessionUser?.id, sessionUser?.role, sessionUser?.name, sessionUser?.email, sessionUser?.grade, sessionUser?.avatarUrl])

  const isStudent = user?.role === 'student' || pathname.startsWith('/student')
  const isStudentVirtualCourses = isStudentVirtualCampusRoute(pathname)
  const isStudentPortal = isStudent && !isStudentVirtualCourses
  const [enabledModules, setEnabledModules] = useState<string[]>([])
  const [pendingPermissionsCount, setPendingPermissionsCount] = useState<number>(0)
  const [pendingAlertModal, setPendingAlertModal] = useState<{ isOpen: boolean; count: number }>({
    isOpen: false,
    count: 0
  })

  useEffect(() => {
    async function loadPermissions() {
      try {
        const { getUserModulePermissions } = await import('@/modules/admin/application/actions')
        const adminUserId = user?.id || (user?.email ? (
          user.email === 'convivencia@ensuny.edu.co' ? 'demo-admin-disc' :
          user.email === 'secretaria@ensuny.edu.co' ? 'demo-admin-sec' :
          user.email === 'admin_pruebas@ensuny.edu.co' ? 'demo-admin-coord' : undefined
        ) : undefined)

        // En modo cliente, verificar si hay permisos en localStorage
        if (adminUserId && typeof window !== 'undefined') {
          const localStored = localStorage.getItem(`aulaensuny-module-perms-${adminUserId}`) || localStorage.getItem('aulaensuny-module-perms-global')
          if (localStored) {
            try {
              const parsed = JSON.parse(localStored)
              if (Array.isArray(parsed) && parsed.length > 0) {
                setEnabledModules(parsed.filter((p: any) => p.is_enabled).map((p: any) => p.module_key))
                return
              }
            } catch (e) {}
          }
        }

        const permissions = await getUserModulePermissions(adminUserId)
        if (permissions && permissions.length > 0) {
          setEnabledModules(permissions.filter(p => p.is_enabled).map(p => p.module_key))
        }
      } catch (e) {
        console.error('Error al cargar permisos dinámicos en layout:', e)
      }
    }

    if (user?.role === 'admin') {
      loadPermissions()
    } else if (user?.role === 'superadmin') {
      // SuperAdmin siempre tiene todos los módulos habilitados
      setEnabledModules([])
    }

    const handlePermsUpdated = () => {
      loadPermissions()
    }
    window.addEventListener('module-permissions-updated', handlePermsUpdated)
    return () => window.removeEventListener('module-permissions-updated', handlePermsUpdated)
  }, [user?.id, user?.role, pathname])

  // Clave estable para enabledModules — evita que una nueva referencia de array
  // dispare el useEffect aunque el contenido sea idéntico
  const enabledModulesKey = enabledModules.join(',')

  // Notificación Pop-up de permisos pendientes para SuperAdmin o Admin (con módulo de permisos) al ingresar
  useEffect(() => {
    async function checkPendingPermissionsAlert() {
      if (!user) return
      if (user.role !== 'superadmin' && user.role !== 'admin') return

      // Si es Admin, validar que tenga habilitado el módulo de permisos
      if (user.role === 'admin') {
        const hasPermsModule = enabledModules.length === 0 || enabledModules.includes('permissions')
        if (!hasPermsModule) {
          setPendingPermissionsCount(0)
          return
        }
      }

      try {
        const { getPendingPermissionsCount } = await import('@/modules/permissions/application/adminActions')
        const counts = await getPendingPermissionsCount()

        let pendingCount = 0
        if (user.role === 'superadmin') {
          // Rectoría: solicitudes radicadas pendientes de su decisión institucional
          pendingCount = counts.rectorPending > 0 ? counts.rectorPending : counts.totalPending
        } else {
          // Coordinación: solicitudes en trámite o cobertura
          pendingCount = counts.coordinatorPending > 0 ? counts.coordinatorPending : counts.totalPending
        }

        // Siempre actualizar el conteo para el badge ámbar en el menú del sidebar
        setPendingPermissionsCount(pendingCount)

        // Si no hay pendientes o ya está en la vista de permisos, no abrir modal
        if (pendingCount === 0 || pathname.startsWith('/admin/permissions')) {
          setPendingAlertModal({ isOpen: false, count: 0 })
          return
        }

        // Verificar si ya fue cerrado o atendido durante la sesión actual
        if (typeof window !== 'undefined') {
          const isDismissed = sessionStorage.getItem('pending_permissions_popup_dismissed') === 'true'
          const isProfileDismissed = sessionStorage.getItem('pending_permissions_profile_dismissed') === 'true'

          // Si el usuario entra al perfil del SuperAdmin o Admin (/admin/profile),
          // abrir el modal a menos que ya lo haya cerrado en la pantalla de perfil
          if (pathname.startsWith('/admin/profile')) {
            if (isProfileDismissed) return
          } else if (isDismissed) {
            return
          }
        }

        setPendingAlertModal({ isOpen: true, count: pendingCount })
      } catch (err) {
        console.warn('Error al verificar alertas de permisos pendientes:', err)
      }
    }

    checkPendingPermissionsAlert()

    // Escuchar evento personalizado en caso de que se creen o actualicen permisos en tiempo real
    const handlePermissionsRefresh = () => {
      checkPendingPermissionsAlert()
    }
    window.addEventListener('permissions-updated', handlePermissionsRefresh)
    return () => window.removeEventListener('permissions-updated', handlePermissionsRefresh)
  }, [user?.id, user?.role, enabledModulesKey, pathname])

  const handleReviewPermissions = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pending_permissions_popup_dismissed', 'true')
      sessionStorage.setItem('pending_permissions_profile_dismissed', 'true')
    }
    setPendingAlertModal({ isOpen: false, count: 0 })
    router.push('/admin/permissions')
  }

  const handleClosePermissionsAlert = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pending_permissions_popup_dismissed', 'true')
      if (pathname.startsWith('/admin/profile')) {
        sessionStorage.setItem('pending_permissions_profile_dismissed', 'true')
      }
    }
    setPendingAlertModal(prev => ({ ...prev, isOpen: false }))
  }

  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    async function loadInAppNotifications() {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/notifications/inbox?userId=${user.id}`);
        if (!response.ok) throw new Error('Network error');
        
        const { data, error } = await response.json();
        
        if (error) {
          console.error('Error fetching in-app notifications:', error);
          return;
        }

        if (data) {
          const formatted = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            message: d.message,
            time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: !!d.read_at,
            type: d.type,
          }));
          setNotifications(formatted);
        }
      } catch (err) {
        // Ignoramos silenciosamente o usamos warn para evitar el overlay de Next.js en errores de red
        console.warn('Fetch notification warning:', err);
      }
    }

    loadInAppNotifications();
    
    // Configurar recarga periódica de notificaciones
    const interval = setInterval(loadInAppNotifications, 30000); // 30s
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllNotificationsAsRead = async () => {
    if (!user?.id) return;
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    
    const supabase = createClient();
    await supabase.from('push_notification_deliveries')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
    if (isDemoMode && typeof window !== 'undefined') {
      localStorage.setItem('aulaensuny-demo-notifications', JSON.stringify(updated))
    }
  }

  const markNotificationAsRead = async (id: any) => {
    if (!user?.id) return;
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n)
    setNotifications(updated)
    
    const supabase = createClient();
    await supabase.from('push_notification_deliveries')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
    if (isDemoMode && typeof window !== 'undefined') {
      localStorage.setItem('aulaensuny-demo-notifications', JSON.stringify(updated))
    }
  }

  const deleteNotification = async (id: any) => {
    if (!user?.id) return;
    const updated = notifications.filter(n => n.id !== id)
    setNotifications(updated)
    const supabase = createClient();
    await supabase.from('push_notification_deliveries').delete().eq('id', id);
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
    if (isDemoMode && typeof window !== 'undefined') {
      localStorage.setItem('aulaensuny-demo-notifications', JSON.stringify(updated))
    }
  }

  const clearAllNotifications = async () => {
    if (!user?.id) return;
    setNotifications([])
    const supabase = createClient();
    await supabase.from('push_notification_deliveries').delete().eq('user_id', user.id);
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
    if (isDemoMode && typeof window !== 'undefined') {
      localStorage.setItem('aulaensuny-demo-notifications', JSON.stringify([]))
    }
  }

  useEffect(() => {
    const syncTheme = () => {
      const theme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (theme === 'dark' || (!theme && prefersDark)) {
        document.documentElement.classList.add('dark')
        setIsDark(true)
      } else {
        document.documentElement.classList.remove('dark')
        setIsDark(false)
      }
    }

    syncTheme()
    window.addEventListener('theme-changed', syncTheme)
    return () => window.removeEventListener('theme-changed', syncTheme)
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])



  const toggleTheme = () => {
    const isDarkNow = document.documentElement.classList.toggle('dark')
    setIsDark(isDarkNow)
    localStorage.setItem('theme', isDarkNow ? 'dark' : 'light')
  }

  const handleLogout = async () => {
    useUserSessionStore.getState().clearSession()
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pending_permissions_popup_dismissed')
      sessionStorage.removeItem('pending_permissions_profile_dismissed')
    }
    try {
      await logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      // Siempre redirigir + forzar revalidación del middleware de sesión
      router.push('/login')
      router.refresh()
    }
  }
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed)
  const toggleAdminSidebar = () => setIsAdminSidebarVisible(prev => !prev)
  const handleAdminMenuToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileMenuOpen(true)
      return
    }
    toggleAdminSidebar()
  }
  if (isAdmin) {
    return (
      <div className="flex min-h-screen max-w-full overflow-x-hidden min-w-0 bg-slate-50 dark:bg-slate-950">
        {/* Admin Sidebar Desktop */}
        {!isDocsPage && (
          <aside className={`fixed inset-y-0 left-0 z-20 hidden lg:flex flex-col transition-all duration-300 ${isAdminSidebarVisible ? 'w-60' : 'w-20'}`}>
            <AdminSidebar user={user} enabledModules={enabledModules} isCollapsed={!isAdminSidebarVisible} onLogout={handleLogout} pendingPermissionsCount={pendingPermissionsCount} />
          </aside>
        )}

        {/* Admin Main */}
        <div className={`flex flex-1 flex-col transition-all duration-300 min-w-0 max-w-full overflow-hidden ${!isDocsPage ? (isAdminSidebarVisible ? 'lg:pl-60' : 'lg:pl-20') : 'lg:pl-0'}`}>
          {/* Admin Header */}
          {!isDocsPage && (
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-6 dark:border-slate-800/60 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              
              <button
                onClick={handleAdminMenuToggle}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors lg:hidden"
                title="Mostrar menú"
                aria-label="Mostrar menú"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                onClick={handleAdminMenuToggle}
                className="hidden lg:block rounded-full border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                title={isAdminSidebarVisible ? 'Ocultar menú' : 'Mostrar menú'}
                aria-label={isAdminSidebarVisible ? 'Ocultar menú' : 'Mostrar menú'}
              >
                {isAdminSidebarVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-pwa-install'))
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                title="Instalar aulaEnsuny en este dispositivo"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Instalar</span>
              </button>
              <button onClick={toggleTheme} className="rounded-3xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors" title="Cambiar tema">
                {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>
              <div className="relative hidden sm:block">
                <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative rounded-3xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />}
                </button>
                <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] sm:bg-transparent"
                      onClick={() => setIsNotificationsOpen(false)}
                    />
                    {/* Panel dropdown */}
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className={`z-50 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${
                        isMobile
                          ? 'fixed top-14 right-2 w-[calc(100vw-1rem)] max-w-[360px]'
                          : 'absolute right-0 top-full mt-2 w-80 shadow-xl'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800/60">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notificaciones</h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button onClick={markAllNotificationsAsRead} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                              Marcar leídas
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button onClick={clearAllNotifications} className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400">
                              Limpiar todo
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                            <Bell className="h-8 w-8 mb-2 opacity-30" />
                            <p className="text-xs">Sin notificaciones</p>
                          </div>
                        ) : notifications.map(notif => (
                          <div key={notif.id}
                            className={`group flex items-start gap-2 px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!notif.read ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : 'opacity-70'}`}>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => markNotificationAsRead(notif.id)}>
                              <div className="flex items-center gap-1.5">
                                {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{notif.title}</h4>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                              <span className="text-[10px] text-slate-400">{notif.time}</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                              className="shrink-0 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-800/60 p-2 text-center">
                        <button onClick={() => setIsNotificationsOpen(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400">Cerrar</button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 rounded-3xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-200 transition-all dark:border-red-900/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </header>
          )}

          <main className={`flex-1 min-w-0 max-w-full overflow-hidden ${isDocsPage ? 'p-0 h-full' : 'p-6 md:p-8'}`}>{children}</main>
        </div>

        {/* Mobile Drawer for Admin */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black lg:hidden" />
              <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl">
                <AdminSidebar user={user} onClose={() => setIsMobileMenuOpen(false)} enabledModules={enabledModules} isCollapsed={false} onLogout={handleLogout} pendingPermissionsCount={pendingPermissionsCount} />
                <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 rounded-lg p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 shadow-sm z-50 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Pop-up de Alerta de Solicitudes Pendientes para SuperAdmin y Admin */}
        <PendingPermissionsAlertModal
          isOpen={pendingAlertModal.isOpen}
          count={pendingAlertModal.count}
          role={(user?.role === 'superadmin' ? 'superadmin' : 'admin')}
          onClose={handleClosePermissionsAlert}
          onReview={handleReviewPermissions}
        />
      </div>
    )
  }

  // ── Regular layout (student / teacher / course) ──────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f9fafb] dark:bg-slate-950 transition-all duration-300">
      {/* Sidebar Desktop */}
      {!isStudentPortal && !isCourseSection && !isDocsPage && (
        <aside className={`fixed inset-y-0 left-0 z-[45] hidden border-r border-slate-100 bg-white/70 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/70 md:block transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <SidebarContent user={user} isCollapsed={isSidebarCollapsed} />
          <button onClick={toggleSidebar}
            className="absolute -right-4 top-8 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 shadow-md hover:shadow-lg transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white z-50 cursor-pointer"
            title={isSidebarCollapsed ? 'Expandir menú' : 'Ocultar menú'}>
            {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4 ml-0.5" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </aside>
      )}

      {/* Main Container */}
      <div className={`flex flex-1 flex-col transition-all duration-300 min-w-0 ${(isStudentPortal || isCourseSection || isDocsPage) ? 'pl-0' : (isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64')}`}>
        {/* Header */}
        {!isDocsPage && (
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-3 sm:px-6 print:hidden transition-colors">
            <div className={`flex w-full items-center justify-between ${isStudentPortal ? 'max-w-5xl mx-auto' : ''}`}>
              <div className="flex items-center gap-3 sm:gap-4">
                <button onClick={() => setIsMobileMenuOpen(true)} className={`rounded-full p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors ${(isStudentPortal || isCourseSection) ? 'hidden' : 'md:hidden'}`}>
                  <Menu className="h-5 w-5" />
                </button>
                {(isStudentPortal || isCourseSection) && (
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Link
                      href={isStudent ? '/student/dashboard' : '/teacher/dashboard'}
                      className="group flex items-center gap-2.5 sm:gap-3 hover:opacity-90 active:scale-[0.99] transition-all duration-150 shrink-0"
                    >
                      {/* Escudo Institucional ENSUNY */}
                      <img
                        src="/escudo_ensuny.png"
                        alt="Escudo ENSUNY"
                        className="h-8.5 sm:h-10 w-auto object-contain shrink-0 drop-shadow-xs"
                      />
                      {/* Logotipo oficial aulaEnsuny con proporción exacta */}
                      <div className="relative h-8 sm:h-9.5 aspect-[416/145] flex items-center justify-start shrink-0">
                        <img
                          src="/logo.svg?v=2"
                          alt="aulaEnsuny Logo"
                          className="object-contain object-left w-full h-full dark:hidden"
                        />
                        <img
                          src="/logo_dark.svg?v=2"
                          alt="aulaEnsuny Logo Dark"
                          className="object-contain object-left w-full h-full hidden dark:block"
                        />
                      </div>
                    </Link>


                  </div>
                )}
              </div>

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
                {isStudent && (
                  <a
                    href="https://www.ensuny.edu.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all active:scale-95 duration-100 ease-out"
                  >
                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Sitio Web</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('open-pwa-install'))
                    }
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/60 transition-all active:scale-95 duration-100 ease-out cursor-pointer"
                  title="Instalar aulaEnsuny en este dispositivo"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Instalar</span>
                </button>

                <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

                <button
                  onClick={toggleTheme}
                  type="button"
                  className="rounded-full p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-white/10 active:scale-90 duration-100 ease-out cursor-pointer shrink-0"
                  title="Cambiar tema"
                  aria-label="Cambiar tema"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                {isStudent && (
                  <Link
                    href="/student/settings"
                    className="rounded-full p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-white/10 active:scale-90 duration-100 ease-out cursor-pointer shrink-0"
                    title="Configuración"
                    aria-label="Configuración"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                )}

                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    type="button"
                    className="rounded-full p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-white/10 active:scale-90 duration-100 ease-out cursor-pointer shrink-0 relative"
                    title="Notificaciones"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />}
                  </button>
                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] sm:bg-transparent"
                          onClick={() => setIsNotificationsOpen(false)}
                        />
                        {/* Panel dropdown */}
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className={`z-50 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${
                            isMobile
                              ? 'fixed top-16 right-2 w-[calc(100vw-1rem)] max-w-[360px]'
                              : 'absolute right-0 top-full mt-2 w-80 shadow-xl'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800/60">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notificaciones</h3>
                            <div className="flex items-center gap-2">
                              {unreadCount > 0 && (
                                <button onClick={markAllNotificationsAsRead} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  Marcar leídas
                                </button>
                              )}
                              {notifications.length > 0 && (
                                <button onClick={clearAllNotifications} className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400">
                                  Limpiar todo
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-[60vh] sm:max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
                            {notifications.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <Bell className="h-9 w-9 mb-2 opacity-30" />
                                <p className="text-xs">Sin notificaciones</p>
                              </div>
                            ) : notifications.map(notif => (
                              <div key={notif.id}
                                className={`group flex items-start gap-2 px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${notif.read ? 'opacity-70' : 'bg-emerald-50/30 dark:bg-emerald-900/10'}`}>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => markNotificationAsRead(notif.id)}>
                                  <div className="flex items-center gap-1.5">
                                    {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                    <h4 className={`text-sm font-bold truncate ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>{notif.title}</h4>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                                  <span className="text-[10px] font-medium text-slate-400 mt-1 block">{notif.time}</span>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                  className="shrink-0 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-slate-100 p-3 dark:border-slate-800/60 text-center">
                            <button onClick={() => setIsNotificationsOpen(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">Cerrar</button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/60 active:scale-95 duration-100 ease-out cursor-pointer shadow-xs"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 min-w-0 ${
          isDocsPage ? 'overflow-hidden p-0'
          : isCourseSection ? 'overflow-y-auto p-0 h-[calc(100vh-4rem)]'
          : isStudentPortal ? 'overflow-x-hidden p-0 portal-student-bg'
          : 'overflow-y-auto p-4 sm:p-5 md:p-6 lg:p-8'
        }`}>
          <div className={`h-full ${
            isDocsPage ? '' 
            : isCourseSection ? 'w-full'
            : isStudentPortal ? 'w-full'
            : 'w-full max-w-[1600px] mx-auto'
          }`}>
            {children}
          </div>
        </main>
        {!isDocsPage && !isCourseSection && (
          <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400 dark:border-slate-800/60 dark:text-slate-500">
            <p>© {new Date().getFullYear()} aulaEnsuny. Todos los derechos reservados.</p>
          </footer>
        )}
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
      {/* Pop-up de Alerta de Nuevas Solicitudes Pendientes para SuperAdmin y Admin autorizados */}
      <PendingPermissionsAlertModal
        isOpen={pendingAlertModal.isOpen}
        count={pendingAlertModal.count}
        role={(user?.role === 'superadmin' ? 'superadmin' : 'admin')}
        onClose={handleClosePermissionsAlert}
        onReview={handleReviewPermissions}
      />
    </div>
  )
}

