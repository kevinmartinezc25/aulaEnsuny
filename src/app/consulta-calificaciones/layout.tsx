import React from 'react'
import Link from 'next/link'
import { GraduationCap, LogOut, ArrowLeft, Home } from 'lucide-react'
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
          {/* Izquierda: Identidad del Portal o Enlace a Landing según estado de sesión */}
          <div className="flex items-center gap-3 z-10 shrink-0">
            {session ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/consulta-calificaciones"
                  className="flex items-center gap-2.5 group"
                  title="Ir al inicio del Portal Académico"
                >
                  <div className="bg-[#1F4E31] dark:bg-emerald-600 text-white p-1.5 sm:p-2 rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight leading-tight group-hover:text-[#1F4E31] dark:group-hover:text-emerald-400 transition-colors">
                      aulaEnsuny
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Portal Académico
                    </span>
                  </div>
                </Link>

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

                <Link
                  href="/"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/60 dark:border-white/5"
                  title="Visitar la página institucional pública"
                >
                  <Home className="h-3.5 w-3.5 text-slate-400" />
                  <span>Sitio Web</span>
                </Link>
              </div>
            ) : (
              <Link
                href="/"
                className="group inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all active:scale-95 border border-slate-200/60 dark:border-white/5 text-xs sm:text-sm font-semibold"
                title="Volver a la página principal"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
                <span>Volver al inicio</span>
              </Link>
            )}
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
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50/90 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-2xs cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
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
