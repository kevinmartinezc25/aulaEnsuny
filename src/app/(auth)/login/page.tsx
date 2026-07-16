import { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginScreen } from '@/modules/auth/presentation/screens/LoginScreen'

export const metadata: Metadata = {
  title: 'Iniciar Sesión | aulaEnsuny',
  description: 'Ingresa al portal educativo aulaEnsuny para acceder a tus cursos, lecciones y calificaciones.',
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  )
}
