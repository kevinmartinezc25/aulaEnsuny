'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { WifiOff, RefreshCw, Home, ShieldAlert } from 'lucide-react'

export function OfflineScreen() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 text-slate-800 dark:text-slate-100">
      {/* Top institutional header */}
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-blue-900/10 p-1 flex items-center justify-center">
            <Image
              src="/icons/icon-192x192.png"
              alt="aulaEnsuny"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-blue-950 dark:text-blue-100">
              aula<span className="text-blue-600 dark:text-blue-400">Ensuny</span>
            </span>
            <p className="text-[11px] text-slate-500 font-medium leading-none">
              Escuela Normal Superior del Nordeste
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Modo Offline
        </div>
      </header>

      {/* Main offline card */}
      <main className="max-w-md mx-auto w-full my-auto py-10 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center shadow-lg shadow-blue-500/5 mb-6 text-blue-600 dark:text-blue-400">
          <WifiOff className="w-10 h-10 animate-bounce" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
          Sin conexión a internet
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mb-8 leading-relaxed">
          No pudimos conectar con el servidor institucional. Verifica tu conexión Wi-Fi o red móvil para continuar gestionando tus clases y actividades.
        </p>

        {/* Action buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-medium shadow-md shadow-blue-600/20 text-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar conexión
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
        </div>

        {/* Tips section */}
        <div className="w-full bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 text-left shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            ¿Qué puedes hacer?
          </div>
          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Revisa si el modo avión está desactivado.</li>
            <li>Prueba cambiar entre red móvil y Wi-Fi institucional.</li>
            <li>Si ya abriste la app previamente, tu sesión se mantiene protegida.</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
        aulaEnsuny &bull; Escuela Normal Superior del Nordeste &bull; Todos los derechos reservados
      </footer>
    </div>
  )
}
