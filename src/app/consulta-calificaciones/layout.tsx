import React from 'react'
import Link from 'next/link'
import { GraduationCap, LogOut, ArrowLeft } from 'lucide-react'
import { getPlanillaStudentSession, logoutPlanillaStudent } from '@/modules/planilla-asistida/application/studentAuthActions'
import { redirect } from 'next/navigation'
import { ThemeToggleClient } from './ThemeToggleClient'

export const metadata = {
  title: 'Portal de Consulta Académica - aulaEnsuny',
  description: 'Consulta oficial de calificaciones y horario escolar para estudiantes de la ENSUNY.',
}

export default async function ConsultaCalificacionesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getPlanillaStudentSession()

  return (
    <div className="min-h-screen bg-[#fbfbfd] dark:bg-slate-950 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-200">
      <header className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-16 relative flex items-center justify-between">
          {/* Izquierda: Botón Volver / Título Minimalista */}
          <div className="flex items-center gap-3 z-10 shrink-0">
            <Link
              href="/"
              className="group inline-flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all active:scale-95 border border-slate-200/60 dark:border-white/5"
              title="Volver al inicio"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-1.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline text-sm font-semibold">Volver al inicio</span>
            </Link>
            
            {/* Solo un pequeño indicador de la app a la izquierda en vez del centro */}
            <div className="hidden sm:flex items-center gap-2 pointer-events-none">
              <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-1.5 rounded-lg text-[#1F4E31] dark:text-emerald-400 border border-emerald-500/20">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                Consulta
              </span>
            </div>
          </div>
          
          {/* Derecha: Acciones (ThemeToggle y Logout) */}
          <div className="flex items-center gap-1 sm:gap-2 z-10 shrink-0">
            <ThemeToggleClient />
            
            {session && (
              <form action={async () => {
                'use server'
                await logoutPlanillaStudent()
                redirect('/consulta-calificaciones/login')
              }}>
                <button 
                  type="submit"
                  className="flex items-center justify-center p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Cerrar sesión</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-20">
        {children}
      </main>
    </div>
  )
}
