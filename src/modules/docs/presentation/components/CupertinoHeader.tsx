'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  GraduationCap, Bell, Sun, Moon, LogIn, LogOut, ArrowLeft, BookOpen
} from 'lucide-react'
import { INSTITUTION_INFO } from '../../domain/constants/knowledgeCatalog'

interface CupertinoHeaderProps {
  userRole: 'admin' | 'superadmin' | 'teacher' | 'student' | 'guest'
  isDark: boolean
  onToggleTheme: () => void
  onLogout?: () => void
  userName?: string
  userSubtext?: string
  avatarUrl?: string | null
  currentView?: 'portal' | 'subject' | 'reader'
  onBackToPortal?: () => void
  subjectTitle?: string
}

export function CupertinoHeader({
  userRole,
  isDark,
  onToggleTheme,
  onLogout,
  userName = 'Valeria Restrepo',
  userSubtext = 'Estudiante • Grado 11°',
  avatarUrl,
  currentView = 'portal',
  onBackToPortal,
  subjectTitle,
}: CupertinoHeaderProps) {
  const [mounted, setMounted] = useState(false)
  const isGuest = userRole === 'guest'

  useEffect(() => {
    setMounted(true)
  }, [])

  const getHomeHref = () => {
    if (userRole === 'admin' || userRole === 'superadmin') {
      return '/admin/dashboard'
    }
    if (userRole === 'teacher') {
      return '/teacher/dashboard'
    }
    if (userRole === 'student') {
      return '/student/dashboard'
    }
    return '/'
  }

  const getHomeTitle = () => {
    if (userRole === 'guest') {
      return 'Ir a la página principal'
    }
    if (userRole === 'teacher') {
      return 'Ir al Dashboard del Docente'
    }
    if (userRole === 'student') {
      return 'Ir al Dashboard del Estudiante'
    }
    return 'Ir al Dashboard de Administración'
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Institution Branding & Return Control */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Official aulaEnsuny Icon and Institutional Shield */}
          <Link
            href={getHomeHref()}
            className="flex items-center gap-1.5 sm:gap-2 active:scale-[0.98] transition-transform duration-100 ease-out group shrink-0"
            title={getHomeTitle()}
          >
            {/* Escudo Institucional ENSUNY */}
            <img
              src="/escudo_ensuny.png"
              alt="Escudo ENSUNY"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
            />
            {/* Official aulaEnsuny Icon (Green squircle with book) */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] sm:rounded-[11px] bg-gradient-to-br from-[#10B981] to-[#1F4E31] flex items-center justify-center text-white shadow-sm shadow-[#10B981]/20 shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
            </div>
          </Link>

          {currentView === 'subject' && onBackToPortal && (
            <button
              onClick={onBackToPortal}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-all active:scale-[0.97] cursor-pointer shrink-0"
              title="Volver al Portal de Conocimiento Escolar"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Portal</span>
            </button>
          )}

          {/* Institutional / Portal Title (Responsive) */}
          <div className="flex flex-col justify-center pl-2 sm:pl-2.5 border-l border-slate-200 dark:border-slate-800 min-w-0">
            <span
              className="text-xs font-bold sm:font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight"
              title={INSTITUTION_INFO.fullName}
            >
              <span className="sm:hidden">
                {currentView === 'subject' && subjectTitle ? subjectTitle : 'Portal de Conocimiento'}
              </span>
              <span className="hidden sm:inline">
                {INSTITUTION_INFO.fullName}
              </span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate leading-tight mt-0.5">
              <span className="sm:hidden">
                {currentView === 'subject' ? 'Portal Escolar • ENSUNY' : 'ENSUNY • Yolombó'}
              </span>
              <span className="hidden sm:inline">
                Portal de Conocimiento Escolar
              </span>
            </span>
          </div>

          {currentView === 'subject' && subjectTitle && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 shrink min-w-0">
              <span className="text-xs font-semibold text-[#0071e3] dark:text-blue-400 truncate max-w-[200px]">
                / {subjectTitle}
              </span>
            </div>
          )}
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 shrink-0">
          <a
            href="#academico"
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#0071e3] dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 transition-all"
          >
            Académico
          </a>
          <a
            href="#institucional"
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all"
          >
            Institucional
          </a>
        </nav>

        {/* Right: Trailing Action Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Cambiar tema"
            title="Cambiar tema"
            className="w-8 h-8 rounded-full sm:rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all shrink-0 cursor-pointer"
          >
            {mounted && isDark ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 shrink-0" />
            )}
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

          {/* Login Button or User Profile */}
          {isGuest ? (
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#005bb5] text-white text-xs font-semibold shadow-xs shadow-blue-500/20 active:scale-[0.96] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Ingresar</span>
            </Link>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 py-1 pr-1.5 sm:pr-2.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-[11px] ring-1 ring-white/50 dark:ring-slate-700 shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[120px] truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                  {userSubtext}
                </span>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Cerrar sesión"
                  title="Cerrar sesión"
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
