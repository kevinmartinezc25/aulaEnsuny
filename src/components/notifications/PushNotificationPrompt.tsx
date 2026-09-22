'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { BellIcon } from '@heroicons/react/24/outline'; // Asumiendo Heroicons, ajústalo según tu proyecto

export const PushNotificationPrompt = () => {
  const { isSupported, permission, isSubscribed, isLoading, subscribeToPush } = usePushNotifications();
  const [isVisible, setIsVisible] = useState(false);

  console.log("==== PUSH PROMPT RENDER ==== ", { isVisible, isSupported, permission, isLoading });

  useEffect(() => {
    // Si ya está suscrito o dio permisos, ocultar
    if (isSubscribed || permission === 'granted') {
      setIsVisible(false);
      return;
    }

    const hasDismissed = localStorage.getItem('push_prompt_dismissed');
    if (!hasDismissed || permission === 'denied' || !isSupported) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, permission]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('push_prompt_dismissed', 'true');
  };

  const handleSubscribe = async () => {
    const success = await subscribeToPush();
    if (success) {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm w-full">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-5 pr-12 relative overflow-hidden">
        
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
        
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-full text-blue-600 dark:text-blue-400">
            <BellIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">
              {!isSupported ? 'Navegador no compatible' : permission === 'denied' ? 'Permiso Bloqueado' : 'Mantente informado'}
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              {!isSupported 
                ? 'Las notificaciones requieren HTTPS o estar en localhost para funcionar.'
                : permission === 'denied'
                ? 'Has bloqueado las notificaciones. Haz clic en el candado de la barra de direcciones para permitirlas.'
                : 'Activa las notificaciones para recibir únicamente comunicados urgentes.'}
            </p>
            <div className="flex items-center gap-3">
              {isSupported && permission !== 'denied' && (
                <button
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-70"
                >
                  {isLoading ? 'Activando...' : 'Activar notificaciones'}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:white px-3 py-2 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
