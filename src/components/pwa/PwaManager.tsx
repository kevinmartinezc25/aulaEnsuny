'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Wifi, WifiOff } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// Variable a nivel de módulo para mantener el deferredPrompt accesible
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null

export function PwaManager() {
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // 1. Detección de modo instalado (standalone)
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      setIsStandalone(standalone)
    }
    checkStandalone()

    // 2. Registro del Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            registration.onupdatefound = () => {
              const installingWorker = registration.installing
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    toast.info('Nueva versión disponible de aulaEnsuny', {
                      action: {
                        label: 'Actualizar',
                        onClick: () => {
                          if (registration.waiting) {
                            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
                          }
                          window.location.reload()
                        },
                      },
                      duration: 10000,
                    })
                  }
                }
              }
            }
          })
          .catch((err) => {
            console.debug('PWA ServiceWorker error de registro:', err)
          })
      })
    }

    // 3. Detección de conectividad (Online / Offline)
    const handleOnline = () => {
      toast.success('Conexión reestablecida', {
        icon: <Wifi className="w-4 h-4 text-emerald-500" />,
        description: 'Vuelves a estar en línea con el servidor.',
        duration: 4000,
      })
    }

    const handleOffline = () => {
      toast.warning('Sin conexión a internet', {
        icon: <WifiOff className="w-4 h-4 text-amber-500" />,
        description: 'aulaEnsuny está funcionando en modo sin conexión.',
        duration: 6000,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 4. Captura del evento beforeinstallprompt (Instalación nativa con 1 solo clic)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      globalDeferredPrompt = e as BeforeInstallPromptEvent
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 5. Escuchar evento directo de instalación cuando el usuario pulsa "Instalar"
    const handleDirectInstall = async () => {
      if (globalDeferredPrompt) {
        const promptEvent = globalDeferredPrompt
        globalDeferredPrompt = null
        await promptEvent.prompt()
        const { outcome } = await promptEvent.userChoice
        if (outcome === 'accepted') {
          toast.success('¡aulaEnsuny se instaló correctamente en tu dispositivo!')
        }
      } else {
        // Si ya está instalado o el navegador no soporta el prompt directo
        if (window.matchMedia('(display-mode: standalone)').matches) {
          toast.info('aulaEnsuny ya se encuentra instalada en este dispositivo.')
        } else {
          toast.info('Para instalar en este dispositivo:', {
            description: 'Usa el botón de instalación en la barra de direcciones de tu navegador o en el menú: "Instalar aulaEnsuny".',
            duration: 6000,
          })
        }
      }
    }

    window.addEventListener('open-pwa-install', handleDirectInstall)

    // Escuchar cuando la app se instala con éxito
    const handleAppInstalled = () => {
      globalDeferredPrompt = null
      setIsStandalone(true)
      toast.success('¡aulaEnsuny ahora está lista en tu pantalla de inicio!')
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('open-pwa-install', handleDirectInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  return null
}
