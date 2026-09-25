/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// Inyecta el manifiesto del build de Next.js
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Escuchar evento de notificaciones push
self.addEventListener("push", (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    // El payload debe contener title y body. Opcionalmente badge, icon, data, etc.
    const title = data.title || "Notificación de aulaEnsuny";
    const options: NotificationOptions = {
      body: data.message || "",
      icon: "/icons/icon-192x192.png", // Asumiendo que existe un icono en public/icons
      badge: "/icons/icon-192x192.png",
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: {
        url: data.url || "/", 
      },
    } as any;

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("Error al procesar la notificación Push", error);
  }
});

// Manejar el clic en la notificación
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close(); // Cierra la notificación

  const targetUrl = event.notification.data?.url || "/";

  // Intentar enfocar una pestaña abierta con la app o abrir una nueva
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList: readonly WindowClient[]) => {
      // Si ya hay una pestaña abierta con la URL, la enfocamos
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      // Si no, abrimos una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
