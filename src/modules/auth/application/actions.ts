'use server'

import { createClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'

import { loginSchema, LoginInput } from './validation'

/**
 * Iniciar sesión con correo y contraseña.
 */
export async function login(input: LoginInput) {
  const validation = loginSchema.safeParse(input)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  // Verificar si está en Modo Demo (sin variables de Supabase válidas)
  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

  if (isDemoMode) {
    const email = input.email.toLowerCase()
    let role = 'student'
    
    if (email === 'docente@colegio.edu') {
      role = 'teacher'
    } else if (email === 'admin@colegio.edu' || email === 'admin_pruebas@ensuny.edu.co') {
      role = 'admin'
    } else if (email === 'estudiante@colegio.edu') {
      role = 'student'
    } else if (email === 'superadmin@colegio.edu' || email === 'admin@ensuny.edu.co') {
      role = 'superadmin'
    } else {
      return { error: 'Credenciales demo incorrectas. Prueba con admin@ensuny.edu.co o admin_pruebas@ensuny.edu.co' }
    }

    if (email === 'admin@ensuny.edu.co' || email === 'admin_pruebas@ensuny.edu.co') {
      if (input.password !== 'Admin123!') {
        return { error: 'Contraseña incorrecta para Administrador.' }
      }
    } else {
      if (input.password !== '123456') {
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

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error) {
    const translatedMessage = error.message === 'Invalid login credentials'
      ? 'Credenciales de inicio de sesión inválidas. Verifica tu correo y contraseña.'
      : error.message

    return { error: translatedMessage }
  }

  // Obtener el rol del usuario para redireccionarlo directamente
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

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/recovery/reset`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
