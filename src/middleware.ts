import { type NextRequest } from 'next/server'
import { updateSession } from '@/core/config/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto las que comiencen con:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (icono del sitio)
     * - Recursos PWA (manifest, sw.js, offline, icons)
     * - extensiones de archivos multimedia comunes
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|manifest\\.json|sw\\.js|offline|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|webmanifest)$).*)',
  ],
}

