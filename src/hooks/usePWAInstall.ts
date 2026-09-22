'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PWAInstallState {
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  installPWA: () => Promise<void>
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // 1. Detección de iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // 2. Comprobar si ya está instalada (Standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true
    setIsInstalled(isStandalone)

    // 3. Escuchar evento de instalación (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Previene que aparezca el mini-banner predeterminado de Chrome
      e.preventDefault()
      // Guarda el evento para poder dispararlo luego con nuestro botón
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstallable(false)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installPWA = useCallback(async () => {
    if (!deferredPrompt) return

    // Disparar el prompt de instalación nativo
    deferredPrompt.prompt()

    // Esperar a la decisión del usuario
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('El usuario aceptó la instalación de la PWA')
    } else {
      console.log('El usuario rechazó la instalación de la PWA')
    }

    // Una vez usado el prompt no puede volver a llamarse
    setDeferredPrompt(null)
    setIsInstallable(false)
  }, [deferredPrompt])

  return { isInstallable, isInstalled, isIOS, installPWA }
}
