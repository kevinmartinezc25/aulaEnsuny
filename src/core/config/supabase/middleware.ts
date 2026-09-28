import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

interface UserRoleInfo {
  roleName: string
  passwordChanged: boolean
}

// Obtiene el nombre del rol y estado de contraseña de forma optimizada:
// 1. Cookie ligera de sesión (0 queries).
// 2. Metadata del JWT (0 queries).
// 3. Fallback unificado a BD (1 sola query consolidada en lugar de 3).
async function getUserRoleAndStatus(
  request: NextRequest,
  response: NextResponse,
  supabase: any,
  userId: string,
  userMetadata?: Record<string, any>
): Promise<UserRoleInfo> {
  // 1. Comprobar caché en cookie de la sesión actual
  const cachedRoleCookie = request.cookies.get('aulaensuny-auth-cache')?.value
  if (cachedRoleCookie) {
    const [cachedUserId, cachedRole, cachedPwd] = cachedRoleCookie.split(':')
    if (cachedUserId === userId && cachedRole) {
      return {
        roleName: cachedRole.toLowerCase(),
        passwordChanged: cachedPwd === '1'
      }
    }
  }

  // 2. Comprobar si está en metadata del JWT
  const metaRole = (userMetadata?.role_name as string | undefined)?.toLowerCase()
  const metaPwd = Boolean(userMetadata?.password_changed_at)

  if (metaRole && (metaRole === 'admin' || metaRole === 'superadmin' || metaRole === 'teacher')) {
    response.cookies.set('aulaensuny-auth-cache', `${userId}:${metaRole}:1`, {
      path: '/',
      sameSite: 'lax',
      maxAge: 86400 * 7
    })
    return { roleName: metaRole, passwordChanged: true }
  }

  // 3. Consulta consolidada a profiles (una sola petición para rol y password_changed_at)
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('password_changed_at, roles(name)')
      .eq('id', userId)
      .maybeSingle()

    let resolvedRole = 'student'
    if (profile?.roles && typeof profile.roles === 'object' && 'name' in profile.roles) {
      resolvedRole = (profile.roles.name as string).toLowerCase()
    } else if (metaRole) {
      resolvedRole = metaRole
    }

    const hasChangedPassword = Boolean(profile?.password_changed_at || metaPwd)

    response.cookies.set('aulaensuny-auth-cache', `${userId}:${resolvedRole}:${hasChangedPassword ? '1' : '0'}`, {
      path: '/',
      sameSite: 'lax',
      maxAge: 86400 * 7
    })

    return {
      roleName: resolvedRole,
      passwordChanged: hasChangedPassword
    }
  } catch {
    return { roleName: metaRole || 'student', passwordChanged: true }
  }
}

// Calcula la ruta del dashboard según el rol
function getDashboardPath(roleName: string): string {
  const role = roleName.toLowerCase()
  if (role === 'admin' || role === 'superadmin') return '/admin/dashboard'
  if (role === 'teacher') return '/teacher/dashboard'
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
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || (pathname.startsWith('/recovery') && !isRecoveryReset)
  const isChangePasswordPage = pathname === '/auth/change-password'
  const isPwaResource = pathname === '/manifest.webmanifest' ||
                        pathname === '/manifest.json' ||
                        pathname === '/sw.js' ||
                        pathname === '/offline' ||
                        pathname.startsWith('/icons/')
  const isPublicFile = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|webmanifest|json)$/) || isPwaResource
  const isPublicDocs = pathname.startsWith('/docs')
  const isLandingPage = pathname === '/'

  if (isDemoMode) {
    const demoSessionCookie = request.cookies.get('aulaensuny-demo-session')
    const session = demoSessionCookie ? JSON.parse(demoSessionCookie.value) : null

    // 1. Caso: Invitado intentando entrar a ruta protegida
    if (!session && !isAuthPage && !isChangePasswordPage && !isRecoveryReset && !isAuthCallback && !isPublicFile && !isPublicDocs && !isLandingPage && !isPwaResource) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // 2. Caso: Logueado en demo
    if (session) {
      const roleName = (session.role || 'student').toLowerCase()

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
            response.cookies.set(name, value, { ...options, maxAge: 315360000 })
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Las Server Actions deben continuar directamente sin redirección de middleware
  // para no romper la respuesta Flight de Next.js (error: An unexpected response was received from the server)
  const isServerAction = request.headers.has('next-action')
  if (isServerAction) {
    return response
  }

  // 1. Caso: Usuario no autenticado
  if (!user && !isAuthPage && !isChangePasswordPage && !isRecoveryReset && !isAuthCallback && !isPublicFile && !isPublicDocs && !isLandingPage && !isPwaResource) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Caso: Usuario autenticado
  if (user) {
    const { roleName, passwordChanged } = await getUserRoleAndStatus(
      request,
      response,
      supabase,
      user.id,
      user.user_metadata
    )

    // Verificar si el estudiante debe cambiar su contraseña antes de acceder
    if (roleName === 'student') {
      const isStudentDashboardAccess = pathname.startsWith('/student') || pathname === '/'
      const isGoingToChangePassword = isChangePasswordPage

      if (isStudentDashboardAccess && !isGoingToChangePassword && !passwordChanged) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/change-password'
        return NextResponse.redirect(url)
      }

      // Si el estudiante ya cambió su contraseña e intenta volver a /auth/change-password, redirigir al dashboard
      if (isGoingToChangePassword && passwordChanged) {
        const url = request.nextUrl.clone()
        url.pathname = '/student/dashboard'
        return NextResponse.redirect(url)
      }
    }

    if (isAuthPage || pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = getDashboardPath(roleName)
      return NextResponse.redirect(url)
    }

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
