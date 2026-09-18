'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { authenticatePlanillaStudent } from '@/modules/planilla-asistida/application/studentAuthActions'
import { Loader2, User, KeyRound, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function StudentLoginClient() {
  const [documentId, setDocumentId] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!documentId || !password) {
      toast.error('Por favor, ingresa tu documento y contraseña')
      return
    }
    
    // Para esta versión inicial, validamos que la contraseña sea igual al documento en el frontend
    // antes de enviarlo, aunque en futuras versiones esto lo verificará el backend con bcrypt.
    if (documentId.trim() !== password.trim()) {
      toast.error('Credenciales incorrectas')
      return
    }

    try {
      setIsLoading(true)
      const result = await authenticatePlanillaStudent(documentId)
      if (result.success) {
        toast.success(`¡Hola, ${result.studentName}!`)
        router.push('/consulta-calificaciones')
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-12">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Consulta de Calificaciones
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Ingresa para revisar tus actividades y resultados académicos.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Documento de identidad"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Documento de identidad"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl text-base font-semibold shadow-md shadow-emerald-500/20"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Ingresar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <strong>Nota:</strong> Para tu primer ingreso, utiliza tu número de documento de identidad tanto en usuario como en contraseña.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
