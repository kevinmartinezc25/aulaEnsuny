import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Obtiene el nombre del rol: primero desde user_metadata del JWT (sin BD),
// con fallback a la tabla profiles si no está en metadata.
async function getUserRole(supabase: any, userId: string, userMetadata?: Record<string, any>): Promise<string> {
  // 1. Lectura rápida desde JWT (no requiere query a BD)
  const metaRole = userMetadata?.role_name as string | undefined
  if (metaRole === 'admin' || metaRole === 'superadmin' || metaRole === 'teacher' || metaRole === 'student') {
    return metaRole
  }

  // 2. Fallback: consultar BD
  const { data: profile } = await supabase
    .from('profiles')
    .select('role_id')
    .eq('id', userId)
    .single()

  if (!profile?.role_id) return 'student'

  const { data: role } = await supabase
    .from('roles')
    .select('name')
    .eq('id', profile.role_id)
    .single()

  return role?.name || 'student'
}

// Calcula la ruta del dashboard según el rol
function getDashboardPath(roleName: string): string {
  if (roleName === 'admin' || roleName === 'superadmin') return '/admin/dashboard'
  if (roleName === 'teacher') return '/teacher/dashboard'
  return '/student/dashboard'
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  // Verificar si estamos en Modo Demo (Supabase no configurado)
  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

  const pathname = request.nextUrl.pathname
  const isAuthCallback = pathname.startsWith('/auth/callback')
  const isRecoveryReset = pathname.startsWith('/recovery/reset')
  const isAuthPage = pathname.startsWith('/login') || (pathname.startsWith('/recovery') && !isRecoveryReset)
  const isPublicFile = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/)

  if (isDemoMode) {
    const demoSessionCookie = request.cookies.get('aulaensuny-demo-session')
    const session = demoSessionCookie ? JSON.parse(demoSessionCookie.value) : null

    // 1. Caso: Invitado intentando entrar a ruta protegida
    if (!session && !isAuthPage && !isRecoveryReset && !isAuthCallback && !isPublicFile) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // 2. Caso: Logueado en demo
    if (session) {
      const roleName = session.role || 'student'

      // Si está en login o la raíz, redirigir a su dashboard correspondiente
      if (isAuthPage || pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = getDashboardPath(roleName)
        return NextResponse.redirect(url)
      }

      // Validar accesos según rol
      if (pathname.startsWith('/student') || pathname.startsWith('/teacher') || pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) {
        const url = request.nextUrl.clone()

        if (pathname.startsWith('/student') && roleName !== 'student') {
          const isCourseDetail = pathname.startsWith('/student/courses/')
          if (!(isCourseDetail && (roleName === 'teacher' || roleName === 'admin' || roleName === 'superadmin'))) {
            url.pathname = getDashboardPath(roleName)
            return NextResponse.redirect(url)
          }
        }

        if (pathname.startsWith('/teacher') && roleName !== 'teacher') {
          url.pathname = getDashboardPath(roleName)
          return NextResponse.redirect(url)
        }

        if (pathname.startsWith('/admin') && roleName !== 'admin' && roleName !== 'superadmin') {
          url.pathname = getDashboardPath(roleName)
          return NextResponse.redirect(url)
        }

        if (pathname.startsWith('/superadmin') && roleName !== 'superadmin') {
          url.pathname = getDashboardPath(roleName)
          return NextResponse.redirect(url)
        }
      }
    }

    return response
  }

  // Flujo normal de Supabase (Producción / Staging)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. Caso: Usuario no autenticado
  if (!user && !isAuthPage && !isAuthCallback && !isPublicFile) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Caso: Usuario autenticado
  if (user) {
    if (isAuthPage || pathname === '/') {
      const roleName = await getUserRole(supabase, user.id, user.user_metadata)
      const url = request.nextUrl.clone()
      url.pathname = getDashboardPath(roleName)
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/student') || pathname.startsWith('/teacher') || pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) {
      const roleName = await getUserRole(supabase, user.id, user.user_metadata)
      const url = request.nextUrl.clone()

      if (pathname.startsWith('/student') && roleName !== 'student') {
        const isCourseDetail = pathname.startsWith('/student/courses/')
        if (!(isCourseDetail && (roleName === 'teacher' || roleName === 'admin' || roleName === 'superadmin'))) {
          url.pathname = getDashboardPath(roleName)
          return NextResponse.redirect(url)
        }
      }

      if (pathname.startsWith('/teacher') && roleName !== 'teacher') {
        url.pathname = getDashboardPath(roleName)
        return NextResponse.redirect(url)
      }

      if (pathname.startsWith('/admin') && roleName !== 'admin' && roleName !== 'superadmin') {
        url.pathname = getDashboardPath(roleName)
        return NextResponse.redirect(url)
      }

      if (pathname.startsWith('/superadmin') && roleName !== 'superadmin') {
        url.pathname = getDashboardPath(roleName)
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}
