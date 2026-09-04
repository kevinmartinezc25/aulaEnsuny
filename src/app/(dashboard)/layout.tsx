'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Calendar, Settings, Bell, Menu, X, ChevronDown, LogOut, Award, TrendingUp,
  PanelLeftClose, PanelLeftOpen, Moon, Sun, LayoutDashboard, Users, GraduationCap,
  ClipboardList, BarChart2, BellRing, FolderOpen, ShieldCheck, ShieldAlert, UserCog, Activity, ChevronRight, FileText, CalendarDays, Download,
  Layers, FileCheck2, FileSpreadsheet, Vote, CalendarCheck, SlidersHorizontal, CheckSquare,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/modules/auth/application/actions'
import { createClient } from '@/core/config/supabase/client'
import { PendingPermissionsAlertModal } from '@/modules/permissions/presentation/components/PendingPermissionsAlertModal'

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
      { name: 'Centro de Docs', href: '/admin/docs', icon: FileText },
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

function AdminSidebar({ onClose, user, enabledModules = [], isCollapsed = false }: { onClose?: () => void; user: UserSessionInfo | null; enabledModules?: string[], isCollapsed?: boolean }) {
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
        if (key === 'dashboard') return true
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
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pending_permissions_popup_dismissed')
    }

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
      <div className={`flex h-16 shrink-0 items-center border-b border-slate-100 dark:border-slate-800/60 ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-5'}`}>
        <img src="/logo_1.svg" alt="aulaEnsuny" className="h-8 object-contain" />
        {!isCollapsed && (
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">aulaEnsuny</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
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
                      className={`group flex items-center rounded-xl transition-all duration-150 relative ${
                        isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                      } text-sm font-semibold ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
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
            <div key={group.section} className="rounded-2xl transition-all">
              {/* Encabezado del Grupo (Botón Clicable para Desplegar/Plegar) */}
              <button
                type="button"
                onClick={() => !isCollapsed && toggleSection(group.section)}
                className={`w-full flex items-center rounded-xl transition-all duration-150 ${
                  isCollapsed
                    ? 'justify-center p-2.5 cursor-default'
                    : 'justify-between px-3 py-2 cursor-pointer group select-none'
                } ${
                  hasActiveChild
                    ? 'bg-blue-50/80 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 border border-blue-200/60 dark:border-blue-900/40'
                    : 'text-slate-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={isCollapsed ? group.section : undefined}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <GroupIcon className={`h-4 w-4 shrink-0 ${hasActiveChild ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                  {!isCollapsed && (
                    <span className="text-xs font-bold truncate tracking-tight">
                      {group.section}
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center shrink-0">
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
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            title={isCollapsed ? item.name : undefined}
                            className={`group flex items-center rounded-xl transition-all duration-150 relative ${
                              isCollapsed ? 'justify-center p-2.5 my-0.5' : 'justify-between px-2.5 py-2 my-0.5'
                            } text-xs font-medium ${
                              isActive
                                ? 'bg-blue-600 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                            }`}
                          >
                            <span className={`flex items-center gap-2.5 ${isCollapsed ? '' : 'truncate'}`}>
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              {!isCollapsed && <span className="truncate">{item.name}</span>}
                            </span>
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
              <Link href="/admin/profile" onClick={onClose} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                <Settings className="h-4 w-4" /> Configuración
              </Link>
              <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                <LogOut className="h-4 w-4" /> Cerrar Sesión
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={`flex w-full items-center rounded-2xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center' : 'gap-3'
          }`}
          title={isCollapsed ? user?.name || 'Administrador' : undefined}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white text-sm font-bold dark:from-slate-200 dark:to-white dark:text-slate-900">
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

  const isTeacher = user?.role === 'teacher' || pathname.startsWith('/teacher')

  let menuGroups = [
    {
      label: 'Académico',
      items: [
        { name: 'Mis cursos', href: '/student/dashboard', icon: BookOpen },
        { name: 'Mis solicitudes', href: '/student/requests', icon: ClipboardList },
        { name: 'Calificaciones', href: '/student/grades', icon: TrendingUp },
      ]
    },
    {
      label: 'Gestión',
      items: [
        { name: 'Calendario', href: '/student/calendar', icon: Calendar },
        { name: 'Votaciones', href: '/student/elections', icon: ShieldCheck },
      ]
    },
    {
      label: 'Sistema',
      items: [
        { name: 'Configuración', href: '/student/settings', icon: Settings },
      ]
    }
  ]

  if (isTeacher) {
    menuGroups = [
      {
        label: 'Principal',
        items: [
          { name: 'Panel Docente', href: '/teacher/dashboard', icon: BookOpen },
        ]
      },
      {
        label: 'Académico',
        items: [
          { name: 'Mis Estudiantes', href: '/teacher/students', icon: TrendingUp },
          { name: 'Horario (Docente)', href: '/teacher/schedule', icon: CalendarDays },
          { name: 'Calificaciones', href: '/teacher/grades', icon: ClipboardList },
        ]
      },
      {
        label: 'Gestión de Aula',
        items: [
          { name: 'Convivencia Escolar', href: '/teacher/disciplinary', icon: ShieldAlert },
          { name: 'Agenda', href: '/teacher/institutional-agenda', icon: ClipboardList },
          { name: 'Calendario', href: '/teacher/calendar', icon: Calendar },
        ]
      },
      {
        label: 'Institucional',
        items: [
          { name: 'Permisos', href: '/teacher/permissions', icon: ClipboardList },
          { name: 'Jurado Electoral', href: '/juror/elections', icon: ShieldCheck },
          { name: 'Documentación', href: '/teacher/docs', icon: FileText },
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
      <div className="space-y-8 flex-1 overflow-y-auto pr-1 -mr-1 no-scrollbar">
        {/* Logo */}
        <Link href="/" className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : 'px-2'}`} onClick={onClose}>
          <img src="/logo_1.svg" alt="aulaEnsuny Logo" className="h-10 shrink-0 object-contain" />
          {!isCollapsed && (
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">aulaEnsuny</span>
          )}
        </Link>

        {/* Menu */}
        <nav className="space-y-5">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.label && !isCollapsed && (
                <p className="px-4 text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      title={isCollapsed ? item.name : undefined}
                      className={`group flex items-center rounded-xl transition-colors duration-200 ${
                        isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-2.5'
                      } text-sm font-medium ${
                        isActive
                          ? 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-blue-700 dark:text-blue-400' : ''}`} />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
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
              <Link href={isTeacher ? '/teacher/settings' : '/student/settings'} onClick={onClose} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
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
  const [user, setUser] = useState<UserSessionInfo | null>(null)
  const [enabledModules, setEnabledModules] = useState<string[]>([])
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
  }, [user, pathname])

  // Notificación Pop-up de permisos pendientes para SuperAdmin o Admin (con módulo de permisos) al ingresar
  useEffect(() => {
    async function checkPendingPermissionsAlert() {
      if (!user) return
      if (user.role !== 'superadmin' && user.role !== 'admin') return

      // Si es Admin, validar que tenga habilitado el módulo de permisos
      if (user.role === 'admin') {
        const hasPermsModule = enabledModules.length === 0 || enabledModules.includes('permissions')
        if (!hasPermsModule) return
      }

      // Si el usuario ya está en la vista de permisos, no mostrar el pop-up
      if (pathname.startsWith('/admin/permissions')) return

      // Verificar si ya fue cerrado o atendido durante la sesión actual
      if (typeof window !== 'undefined') {
        const isDismissed = sessionStorage.getItem('pending_permissions_popup_dismissed') === 'true'
        if (isDismissed) return
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

        if (pendingCount > 0) {
          setPendingAlertModal({ isOpen: true, count: pendingCount })
        }
      } catch (err) {
        console.warn('Error al verificar alertas de permisos pendientes:', err)
      }
    }

    checkPendingPermissionsAlert()
  }, [user, enabledModules, pathname])

  const handleReviewPermissions = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pending_permissions_popup_dismissed', 'true')
    }
    setPendingAlertModal({ isOpen: false, count: 0 })
    router.push('/admin/permissions')
  }

  const handleClosePermissionsAlert = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pending_permissions_popup_dismissed', 'true')
    }
    setPendingAlertModal({ isOpen: false, count: 0 })
  }

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
            const demoId = session.id || (
              session.email === 'convivencia@ensuny.edu.co' ? 'demo-admin-disc' :
              session.email === 'secretaria@ensuny.edu.co' ? 'demo-admin-sec' :
              session.email === 'admin_pruebas@ensuny.edu.co' ? 'demo-admin-coord' : 'demo-admin-coord'
            )
            setUser({
              id: demoId,
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
              id: authUser.id,
              name: `${profile.first_name} ${profile.last_name}`,
              email: authUser.email || '',
              role: profile.roles?.name || 'student',
              grade: profile.grade_level || undefined,
              avatarUrl: profile.avatar_url || undefined
            })
          } else {
            setUser({
              id: authUser.id,
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
              const defaultMocks = user?.role === 'teacher' 
                ? TEACHER_MOCK_NOTIFICATIONS 
                : (user?.role === 'admin' || user?.role === 'superadmin' ? ADMIN_MOCK_NOTIFICATIONS : STUDENT_MOCK_NOTIFICATIONS)
              setNotifications(defaultMocks)
            }
          } else {
            const defaultMocks = user?.role === 'teacher' 
              ? TEACHER_MOCK_NOTIFICATIONS 
              : (user?.role === 'admin' || user?.role === 'superadmin' ? ADMIN_MOCK_NOTIFICATIONS : STUDENT_MOCK_NOTIFICATIONS)
            localStorage.setItem('aulaensuny-demo-notifications', JSON.stringify(defaultMocks))
            setNotifications(defaultMocks)
          }
        } else {
          const defaultMocks = user?.role === 'teacher' 
            ? TEACHER_MOCK_NOTIFICATIONS 
            : (user?.role === 'admin' || user?.role === 'superadmin' ? ADMIN_MOCK_NOTIFICATIONS : STUDENT_MOCK_NOTIFICATIONS)
          setNotifications(defaultMocks)
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
        // Si el rol es superadmin, también debe poder ver notificaciones dirigidas al rol admin
        let roleFilter = `target_role.eq.${user.role}`
        if (user.role === 'superadmin') {
          roleFilter = `target_role.eq.superadmin,target_role.eq.admin`
        }

        let query = supabase.from('notifications').select('*')
        if (authUser) {
          query = query.or(`target_role.eq.all,${roleFilter},recipient_id.eq.${authUser.id}`)
        } else {
          query = query.or(`target_role.eq.all,${roleFilter}`)
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
  if (isAdmin) {
    return (
      <div className="flex min-h-screen max-w-full overflow-x-hidden min-w-0 bg-slate-50 dark:bg-slate-950">
        {/* Admin Sidebar Desktop */}
        {!isDocsPage && (
          <aside className={`fixed inset-y-0 left-0 z-20 hidden md:flex flex-col transition-all duration-300 ${isAdminSidebarVisible ? 'w-60' : 'w-20'}`}>
            <AdminSidebar user={user} enabledModules={enabledModules} isCollapsed={!isAdminSidebarVisible} />
          </aside>
        )}

        {/* Admin Main */}
        <div className={`flex flex-1 flex-col transition-all duration-300 min-w-0 max-w-full overflow-hidden ${!isDocsPage ? (isAdminSidebarVisible ? 'md:pl-60' : 'md:pl-20') : 'md:pl-0'}`}>
          {/* Admin Header */}
          {!isDocsPage && (
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
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-pwa-install'))
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                title="Instalar aulaEnsuny en este dispositivo"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Instalar</span>
              </button>
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
              <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-200 transition-all dark:border-red-900/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
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
      {!isCourseSection && !isDocsPage && (
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
      <div className={`flex flex-1 flex-col transition-all duration-300 min-w-0 ${(isCourseSection || isDocsPage) ? 'pl-0' : (isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64')}`}>
        {/* Header */}
        {!isDocsPage && (
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-6 dark:border-slate-800/60 dark:bg-slate-950 print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className={`rounded-lg p-2 hover:bg-slate-55 dark:hover:bg-slate-800/50 ${isCourseSection ? 'block' : 'md:hidden'}`}>
              <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            {isCourseSection && (
              <Link href={pathname.includes('/student') ? '/student/dashboard' : '/teacher/dashboard'} className="hidden md:flex items-center gap-2 px-2 hover:opacity-80 transition-opacity">
                <img src="/logo_1.svg" alt="aulaEnsuny Logo" className="h-8 shrink-0 object-contain" />
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">aulaEnsuny</span>
              </Link>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-pwa-install'))
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
              title="Instalar aulaEnsuny en este dispositivo"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Instalar</span>
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
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 active:scale-[0.98] transition-all dark:border-red-900/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </header>
        )}

        <main className={`flex-1 min-w-0 ${
          isDocsPage ? 'overflow-hidden p-0'
          : isCourseSection ? 'overflow-y-auto p-0 h-[calc(100vh-4rem)]'
          : 'overflow-hidden p-6 md:p-8'
        }`}>{children}</main>
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
