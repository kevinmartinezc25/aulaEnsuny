'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Este módulo fue eliminado. Los logros académicos ya no se utilizan.
// Redirigir a la pantalla de calificaciones.
export function TeacherLogrosScreen() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/teacher/grades')
  }, [router])
  return null
}
