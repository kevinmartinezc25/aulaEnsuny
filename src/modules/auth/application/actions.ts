'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'

import { loginSchema, LoginInput, isEmailIdentifier } from './validation'

/**
 * Resuelve el email oficial de autenticación (auth.users)
 * a partir de un identificador que puede ser:
 * 1. Número de documento (con o sin puntos/espacios).
 * 2. Correo electrónico (directo en auth.users o registrado en student_contacts).
 */
async function resolveAuthEmail(identifier: string): Promise<string | null> {
  try {
    const adminClient = createAdminClient()
    const trimmed = identifier.trim()
    const isEmail = isEmailIdentifier(trimmed)

    if (isEmail) {
      const cleanEmail = trimmed.toLowerCase()

      // 1. Verificar si existe en student_contacts para enlazarlo con su cuenta
      const { data: contact } = await adminClient
        .from('student_contacts')
        .select('student_id')
        .ilike('student_email', cleanEmail)
        .limit(1)
        .maybeSingle()

      if (contact?.student_id) {
        const { data: userData } = await adminClient.auth.admin.getUserById(contact.student_id)
        if (userData?.user?.email) {
          return userData.user.email
        }
      }

      // Si no difiere o no está en student_contacts, retorna el correo ingresado
      return cleanEmail
    }

    // Es un documento de identidad: normalizar eliminando puntos, comas, guiones y espacios
    const docDigits = trimmed.replace(/\D/g, '')
    const docAlphanumeric = trimmed.replace(/[^0-9a-zA-Z]/g, '')

    // Construir lista de variantes para la consulta OR
    const variants = Array.from(new Set([trimmed, docDigits, docAlphanumeric])).filter(Boolean)
    const orQuery = variants.map(v => `document_number.eq.${v}`).join(',')
    const dirOrQuery = variants.map(v => `document_id.eq.${v}`).join(',')

    // 1. Buscar en student_details por document_number
    const { data: detail } = await adminClient
      .from('student_details')
      .select('student_id')
      .or(orQuery)
      .limit(1)
      .maybeSingle()

    let studentId = detail?.student_id

    // 2. Fallback: buscar en student_directory por document_id
    if (!studentId) {
      const { data: dir } = await adminClient
        .from('student_directory')
        .select('profile_id')
        .or(dirOrQuery)
        .not('profile_id', 'is', null)
        .limit(1)
        .maybeSingle()
      studentId = dir?.profile_id
    }

    if (!studentId) return null

    // 3. Obtener email desde auth.users usando el admin client
    const { data: userData, error } = await adminClient.auth.admin.getUserById(studentId)
    if (error || !userData?.user?.email) return null

    return userData.user.email
  } catch (err) {
    console.error('resolveAuthEmail error:', err)
    return null
  }
}

/**
 * Iniciar sesión con correo/documento y contraseña.
 * Acepta tanto correo institucional como número de documento de identidad.
 */
export async function login(input: LoginInput) {
  const validation = loginSchema.safeParse(input)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { identifier, password } = validation.data

  // Verificar si está en Modo Demo (sin variables de Supabase válidas)
  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

  if (isDemoMode) {
    const email = identifier.toLowerCase()
    let role = 'student'

    if (email === 'docente@colegio.edu') {
      role = 'teacher'
    } else if (email === 'admin@colegio.edu' || email === 'admin_pruebas@ensuny.edu.co') {
      role = 'admin'
    } else if (email === 'estudiante@colegio.edu') {
      role = 'student'
    } else if (email === 'superadmin@colegio.edu' || email === 'admin@ensuny.edu.co' || email === 'superadmin_alt@ensuny.edu.co') {
      role = 'superadmin'
    } else {
      return { error: 'Credenciales demo incorrectas. Prueba con admin@ensuny.edu.co o superadmin_alt@ensuny.edu.co' }
    }

    if (email === 'admin@ensuny.edu.co' || email === 'admin_pruebas@ensuny.edu.co' || email === 'superadmin_alt@ensuny.edu.co') {
      if (password !== 'Admin123!') {
        return { error: 'Contraseña incorrecta para Administrador.' }
      }
    } else {
      if (password !== '123456') {
        return { error: 'Contraseña demo incorrecta. Usa: 123456' }
      }
    }

    const cookieStore = await cookies()
    cookieStore.set('aulaensuny-demo-session', JSON.stringify({
      id: 'demo-user-id',
      email: email,
      first_name: role === 'student' ? 'Kevin' : role === 'teacher' ? 'Prof. Alejandro' : role === 'superadmin' ? 'Administrador' : 'Admin',
      last_name: role === 'student' ? 'Martínez' : role === 'teacher' ? 'Gómez' : role === 'superadmin' ? 'Ensuny' : 'Pruebas',
      role: role,
      grade_level: role === 'student' ? '10°' : null,
    }), { path: '/', maxAge: 60 * 60 * 24 })

    revalidatePath('/', 'layout')
    return {
      success: true,
      redirectTo: (role === 'admin' || role === 'superadmin') ? '/admin/dashboard' : role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard',
    }
  }

  // ── Producción / Staging ──────────────────────────────────────────────────
  const supabase = await createClient()

  // Resolver el email oficial de Supabase Auth
  const emailToUse = await resolveAuthEmail(identifier)
  if (!emailToUse) {
    return {
      error: 'No encontramos una cuenta asociada a este documento o correo. Verifica que estés matriculado en aulaEnsuny.'
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  })

  if (error) {
    const translatedMessage = error.message === 'Invalid login credentials'
      ? 'Credenciales inválidas. Verifica tu documento/correo y contraseña.'
      : error.message

    return { error: translatedMessage }
  }

  // Obtener el rol del usuario para redireccionarlo
  const user = data.user
  let roleName = 'student'

  if (user) {
    const metaRole = user.user_metadata?.role_name
    if (metaRole === 'admin' || metaRole === 'superadmin' || metaRole === 'teacher' || metaRole === 'student') {
      roleName = metaRole
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role_id')
        .eq('id', user.id)
        .single()

      if (profile?.role_id) {
        const { data: role } = await supabase
          .from('roles')
          .select('name')
          .eq('id', profile.role_id)
          .single()
        if (role?.name) {
          roleName = role.name
        }
      }
    }
  }

  // Para estudiantes: verificar si deben cambiar su contraseña en el primer ingreso
  if (roleName === 'student' && user) {
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('password_changed_at')
      .eq('id', user.id)
      .single()

    if (!profile?.password_changed_at) {
      // Primera vez: forzar cambio de contraseña antes de entrar al dashboard
      revalidatePath('/', 'layout')
      return { success: true, requiresPasswordChange: true, redirectTo: '/auth/change-password' }
    }
  }

  const dashboardPath = (roleName === 'admin' || roleName === 'superadmin')
    ? '/admin/dashboard'
    : roleName === 'teacher'
    ? '/teacher/dashboard'
    : '/student/dashboard'

  revalidatePath('/', 'layout')
  return { success: true, redirectTo: dashboardPath }
}


/**
 * Cerrar sesión del usuario.
 */
export async function logout() {
  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

  const cookieStore = await cookies()
  cookieStore.delete('aulaensuny-demo-session')

  if (isDemoMode) {
    revalidatePath('/', 'layout')
    return { success: true }
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Solicitar enlace de recuperación de contraseña.
 */
export async function recoverPassword(email: string) {
  if (!email || !z.string().email().safeParse(email).success) {
    return { error: 'Por favor ingresa un correo electrónico válido.' }
  }

  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

  if (isDemoMode) {
    return { success: true, isDemo: true }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/recovery/reset`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Restablecer contraseña con el usuario ya autenticado.
 */
export async function resetPassword(password: string) {
  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

  if (isDemoMode) {
    return { success: true }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Cambio de contraseña obligatorio en el primer ingreso del estudiante.
 * Actualiza la contraseña en Supabase Auth y marca password_changed_at en profiles.
 * Requiere que el estudiante ya esté autenticado con su sesión de Supabase.
 */
export async function changePasswordFirstLogin(newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

  if (isDemoMode) {
    // En modo demo, simplemente marcamos como completado
    return { success: true }
  }

  const supabase = await createClient()

  // Verificar que hay sesión activa
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'No se encontró una sesión activa. Por favor inicia sesión nuevamente.' }
  }

  // 1. Actualizar la contraseña en Supabase Auth
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) {
    return { error: updateError.message }
  }

  // 2. Marcar en profiles que la contraseña ya fue cambiada
  const adminClient = createAdminClient()
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ password_changed_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileError) {
    // No falla crítico — la contraseña ya se actualizó. Solo lo registramos.
    console.error('Error actualizando password_changed_at:', profileError)
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

