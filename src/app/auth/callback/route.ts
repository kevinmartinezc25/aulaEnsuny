import { NextResponse } from 'next/server'
import { createClient } from '@/core/config/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Base URL para redirecciones (evita el host 0.0.0.0 de Next.js dev server)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log('Sesión de recuperación establecida correctamente para el código.')
      return NextResponse.redirect(`${siteUrl}${next}`)
    } else {
      console.error('Error al intercambiar código por sesión en Supabase:', error.message)
    }
  } else {
    console.warn('No se recibió el parámetro code en el callback de autenticación.')
  }

  // Si hay error o no hay código, redirigir al login con parámetro de error
  return NextResponse.redirect(`${siteUrl}/login?error=El%20enlace%20es%20inv%C3%A1lido%20o%20ha%20expirado`)
}
