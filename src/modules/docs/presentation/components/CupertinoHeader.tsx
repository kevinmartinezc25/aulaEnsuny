'use client'

import React from 'react'
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
  const isGuest = userRole === 'guest'

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Institution Branding & Return Control */}
        <div className="flex items-center gap-3 min-w-0">
          {currentView === 'subject' && onBackToPortal ? (
            <button
              onClick={onBackToPortal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-all active:scale-[0.97] cursor-pointer shrink-0"
              title="Volver al Portal de Conocimiento Escolar"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portal</span>
            </button>
          ) : (
            <Link
              href={
                userRole === 'admin'
                  ? '/admin/dashboard'
                  : userRole === 'teacher'
                    ? '/teacher/dashboard'
                    : userRole === 'student'
                      ? '/student/dashboard'
                      : '/docs'
              }
              className="flex items-center active:scale-[0.98] transition-transform duration-100 ease-out group"
              title={INSTITUTION_INFO.fullName}
            >
              {/* Official aulaEnsuny Icon (Green squircle with book) */}
              <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#10B981] to-[#1F4E31] flex items-center justify-center text-white shadow-sm shadow-[#10B981]/20 shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </Link>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-xs sm:max-w-md" title={INSTITUTION_INFO.fullName}>
              {INSTITUTION_INFO.fullName}
            </span>
          </div>

          {currentView === 'subject' && subjectTitle && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-[#0071e3] dark:text-blue-400 truncate">
                / {subjectTitle}
              </span>
            </div>
          )}
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
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
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Cambiar tema"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

          {/* Login Button or User Profile */}
          {isGuest ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#005bb5] text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.97]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Ingresar</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 pl-1 py-1 pr-2.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60">
              <div className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-[11px] ring-1 ring-white/50 dark:ring-slate-700">
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
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
