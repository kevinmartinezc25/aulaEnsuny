'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  Users,
  UserCog,
  BookOpen,
  DoorOpen,
  ShieldCheck,
  Settings2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  SunMoon,
  Home,
  UserMinus,
  Briefcase
} from 'lucide-react'

const SIDEBAR_ITEMS = [
  { name: 'Horarios', href: '/admin/schedules', query: null, icon: CalendarDays, color: 'text-blue-500 dark:text-blue-400' },
  { name: 'Grupos', href: '/admin/schedules/groups', query: null, icon: Users, color: 'text-orange-500 dark:text-orange-400' },
  { name: 'Docentes', href: '/admin/schedules/teachers', query: null, icon: UserCog, color: 'text-emerald-500 dark:text-emerald-400' },
  { name: 'Materias', href: '/admin/schedules/subjects', query: null, icon: BookOpen, color: 'text-purple-500 dark:text-purple-400' },
  { name: 'Horario (Novedades)', href: '/admin/schedules/substitutions', query: null, icon: UserMinus, color: 'text-amber-500 dark:text-amber-400' },
  { name: 'Ajustes', href: '/admin/schedules/settings', query: null, icon: Settings2, color: 'text-slate-500 dark:text-slate-400' },
]

function SchedulesLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activePanel = searchParams.get('panel')
  // Controla si el usuario ha decidido anclar el sidebar abierto
  const [isSidebarPinned, setIsSidebarPinned] = useState(false)
  // Controla el estado hover para expandir temporalmente
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // El sidebar está "abierto" si está pineado o si tiene hover
  const isSidebarOpen = isSidebarPinned || isSidebarHovered

  return (
    // Viewport 100vh - Sin scroll global. El fondo se define aquí (patrón de puntos sutil)
    <div className="relative h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#0a0f1c] text-slate-900 dark:text-slate-100 transition-colors duration-300 print:bg-white print:overflow-visible print:h-auto">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-canvas, #printable-canvas * { visibility: visible; }
          #printable-canvas { position: absolute; left: 0; top: 0; width: 100%; height: auto; padding: 0 !important; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* --- PATRÓN DE FONDO (Dot Grid Pattern) --- */}
      <div
        className="absolute inset-0 z-0 opacity-[0.4] dark:opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* --- SIDEBAR FLOTANTE (Glassmorphism) --- Desktop Only */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 240 : 72 }}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className="hidden md:flex absolute left-4 top-4 bottom-4 z-40 flex-col bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-xl overflow-hidden transition-colors"
      >
        {/* Brand */}
        <div className="h-16 flex items-center shrink-0 px-5 border-b border-slate-200/50 dark:border-slate-700/50">
          <CalendarDays className="h-6 w-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <AnimatePresence mode="wait">
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="ml-3 font-bold text-lg tracking-tight whitespace-nowrap overflow-hidden"
              >
                HorarioEnsuny
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Botón para Anclar (altura fija para evitar salto vertical) */}
        <div className="px-3 flex justify-end items-center h-10">
          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarPinned(!isSidebarPinned)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isSidebarPinned ? "Desanclar menú" : "Anclar menú"}
            >
              {isSidebarPinned ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = item.query ? activePanel === item.query : (pathname === item.href && !activePanel)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 relative group ${isActive
                    ? 'text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                title={!isSidebarOpen ? item.name : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl z-0"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={`h-5 w-5 shrink-0 z-10 transition-colors duration-200 ${item.color} ${isActive ? '' : 'opacity-60 group-hover:opacity-100'}`} />
                <AnimatePresence mode="wait">
                  {isSidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="ml-3 text-sm z-10 whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200/50 dark:border-slate-700/50 space-y-1">
          <button onClick={() => {
            const isDark = document.documentElement.classList.contains('dark')
            if (isDark) {
              document.documentElement.classList.remove('dark')
              localStorage.setItem('theme', 'light')
            } else {
              document.documentElement.classList.add('dark')
              localStorage.setItem('theme', 'dark')
            }
          }} className="w-full flex items-center px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors">
            <SunMoon className="h-5 w-5 shrink-0" />
            <AnimatePresence>
              {isSidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-3 text-sm whitespace-nowrap overflow-hidden">Tema</motion.span>}
            </AnimatePresence>
          </button>

          <Link href="/admin/dashboard" className="w-full flex items-center px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors">
            <Home className="h-5 w-5 shrink-0" />
            <AnimatePresence>
              {isSidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-3 text-sm whitespace-nowrap overflow-hidden">Volver</motion.span>}
            </AnimatePresence>
          </Link>
        </div>
      </motion.aside>

      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-14 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="font-bold text-base tracking-tight text-slate-800 dark:text-slate-100">HorarioEnsuny</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      {/* --- MOBILE DRAWER --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black md:hidden" />
             <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 flex flex-col md:hidden shadow-2xl">
                <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200/50 dark:border-slate-700/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-base">HorarioEnsuny</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-slate-500 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
                  {SIDEBAR_ITEMS.map((item) => {
                    const isActive = item.query ? activePanel === item.query : (pathname === item.href && !activePanel)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                      >
                        <Icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? item.color : 'opacity-70'}`} />
                        <span className="ml-3 text-sm">{item.name}</span>
                      </Link>
                    )
                  })}
                </nav>
                <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2 shrink-0">
                  <Link href="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors font-semibold">
                    <Home className="h-5 w-5 shrink-0" />
                    <span className="ml-3 text-sm">Volver a Dashboard</span>
                  </Link>
                </div>
             </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- CANVAS CONTENT --- */}
      <main
        id="printable-canvas"
        className={`absolute inset-0 z-10 transition-all duration-300 overflow-y-auto pt-16 md:pt-6 pr-4 md:pr-6 pb-6 pl-4 custom-scrollbar print:relative print:inset-auto print:p-0 print:overflow-visible ${isSidebarPinned ? 'md:pl-[296px]' : 'md:pl-[116px]'}`}
      >
        {children}
      </main>

    </div>
  )
}

export default function SchedulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-slate-50 dark:bg-[#0a0f1c]" />}>
      <SchedulesLayoutInner>{children}</SchedulesLayoutInner>
    </Suspense>
  )
}
