'use client'

import React, { useState } from 'react'
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { toast } from 'sonner'

export function InstallPWA() {
  const { isInstallable, isInstalled, isIOS, installPWA } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  const handleInstallClick = () => {
    if (isInstalled) {
      toast.success('¡aulaEnsuny ya está instalada en tu dispositivo!')
      return
    }
    
    if (isInstallable) {
      installPWA()
    } else if (isIOS) {
      setShowIOSModal(true)
    } else {
      toast.info('Para instalar en tu dispositivo, abre el menú de tu navegador y selecciona "Agregar a la pantalla principal".')
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 bg-white/60 dark:bg-slate-900/40 px-5 py-3 sm:py-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 max-w-xl mx-auto shadow-sm shadow-slate-900/5 backdrop-blur-sm w-full">
        <div className="flex items-center gap-3 sm:gap-4 text-left w-full sm:w-auto">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2.5 rounded-xl shrink-0">
            <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Lleva aulaEnsuny contigo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug pr-2">
              Instala la aplicación en tu PC, Android o iOS para un acceso rápido.
            </p>
          </div>
        </div>

        <button
          onClick={handleInstallClick}
          className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-[#1F4E31] hover:bg-[#183e27] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Instalar App</span>
        </button>
      </div>

      {/* Modal para iOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Instalar en iOS
              </h3>
              <button 
                onClick={() => setShowIOSModal(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
              Actualmente aulaEnsuny es una PWA Web (No requiere descarga desde la App Store oficial). Para instalarla en tu iPhone o iPad, sigue estos pasos:
            </p>
            
            <div className="space-y-4 mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 flex items-center justify-center rounded-xl shrink-0">
                  <Share className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  1. Toca el botón <span className="font-bold">Compartir</span> en la barra inferior de Safari.
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 flex items-center justify-center rounded-xl shrink-0">
                  <PlusSquare className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  2. Desliza hacia abajo y selecciona <span className="font-bold">Agregar a inicio</span>.
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 bg-[#1F4E31] hover:bg-[#153622] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}
