import { Metadata } from 'next'
import { RecoveryResetScreen } from '@/modules/auth/presentation/screens/RecoveryResetScreen'
import { createClient } from '@/core/config/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Restablecer Contraseña | aulaEnsuny',
  description: 'Restablece tu contraseña de acceso a la plataforma aulaEnsuny.',
}

export default async function RecoveryResetPage() {
  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

  if (!isDemoMode) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login?error=El enlace de recuperación es inválido o ha expirado.')
    }
  }

  return <RecoveryResetScreen />
}
