import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'aulaEnsuny - Sistema de Gestión Escolar',
    short_name: 'aulaEnsuny',
    id: '/?v=2',
    description: 'Plataforma de gestión educativa integral de la Escuela Normal Superior del Nordeste.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'es-CO',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Permisos Docentes',
        short_name: 'Permisos',
        description: 'Solicitudes y seguimiento de permisos institucionales',
        url: '/teacher/permissions',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Horarios de Clase',
        short_name: 'Horarios',
        description: 'Consulta de horarios académicos',
        url: '/teacher/schedules',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  }
}
