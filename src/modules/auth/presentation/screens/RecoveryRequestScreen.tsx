'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, Variants } from 'framer-motion'
import { recoverPassword } from '@/modules/auth/application/actions'
import { recoveryRequestSchema, RecoveryRequestInput } from '@/modules/auth/application/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle, CheckCircle2, Moon, Sun, ArrowLeft } from 'lucide-react'

export function RecoveryRequestScreen() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const savedTheme = window.localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark)

    root.classList.toggle('dark', shouldUseDark)
  }, [])

  const toggleTheme = () => {
    const isDarkNow = document.documentElement.classList.toggle('dark')
    window.localStorage.setItem('theme', isDarkNow ? 'dark' : 'light')
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoveryRequestInput>({
    resolver: zodResolver(recoveryRequestSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: RecoveryRequestInput) => {
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    setSubmittedEmail(data.email)
    try {
      const response = await recoverPassword(data.email)
      if (response?.error) {
        setErrorMsg(response.error)
        return
      }

      setSuccessMsg(
        'Hemos enviado un enlace de recuperación a tu correo electrónico. Por favor, revisa tu bandeja de entrada.'
      )
    } catch {
      setErrorMsg('Ocurrió un error inesperado al intentar solicitar la recuperación. Por favor reintenta.')
    } finally {
      setIsLoading(false)
    }
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  }

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#f8f9fa] dark:bg-slate-950">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="rounded-full p-2.5 bg-white/50 border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm backdrop-blur-md dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
          title="Cambiar tema"
        >
          <Sun className="hidden h-5 w-5 dark:block" />
          <Moon className="block h-5 w-5 dark:hidden" />
        </button>
      </div>

      {/* Premium Decorative Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]"></div>
        <div className="absolute top-[-10%] left-[-5%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-emerald-400/20 blur-[80px] sm:blur-[120px] dark:bg-emerald-900/30" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-[#1F4E31]/15 blur-[90px] sm:blur-[150px] dark:bg-[#1F4E31]/20" />
      </div>

      {/* Scrollable Content Shell */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-y-auto p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[420px] px-4 sm:px-0 flex flex-col items-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="mb-8 sm:mb-10 flex justify-center w-full px-2 sm:px-0"
          >
            <div className="relative w-full max-w-[416px] aspect-[416/145]">
              <img src="/logo.svg?v=2" alt="aulaEnsuny Logo" className="object-contain w-full h-full" />
            </div>
          </motion.div>

          <Card className="w-full border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl dark:bg-slate-900 dark:shadow-none">
            <CardContent className="p-6 pt-8 sm:p-8 sm:pt-10">
              <div className="mb-6 text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white">
                  ¿Olvidaste tu contraseña?
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Ingresa tu correo electrónico institucional y te enviaremos las instrucciones para restablecer tu contraseña.
                </p>
              </div>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                >
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {successMsg ? (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-1" />
                    <div className="flex-1 space-y-2">
                      <p className="font-medium text-emerald-900 dark:text-emerald-400">Hemos enviado un enlace de recuperación a:</p>
                      <div className="py-1.5 px-3 bg-emerald-100/60 dark:bg-emerald-950/40 rounded-lg font-semibold text-emerald-950 dark:text-emerald-200 text-center break-all select-all border border-emerald-200/50 dark:border-emerald-900/20">
                        {submittedEmail}
                      </div>
                      <p className="text-emerald-800/90 dark:text-emerald-400/90">Por favor, revisa tu bandeja de entrada para continuar.</p>
                    </div>
                  </div>

                  <a
                    href="/login"
                    className="flex items-center justify-center gap-2 w-full rounded-lg border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al Inicio de Sesión
                  </a>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                        Correo electrónico
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="ejemplo@colegio.edu"
                        className={`rounded-lg border-slate-200/80 bg-slate-50/50 py-4 sm:py-5 text-sm focus:bg-white focus:ring-[#1F4E31] dark:border-slate-800 dark:bg-slate-950/50 ${
                          errors.email ? 'border-red-500 focus:ring-red-500' : ''
                        }`}
                        {...register('email')}
                      />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="pt-2">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-lg bg-[#1F4E31] py-5 sm:py-6 text-[15px] sm:text-base text-white font-medium hover:bg-[#153823] active:scale-[0.99] transition-all duration-200 dark:bg-[#2A6B43] dark:hover:bg-[#1F4E31]"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Enviando instrucciones...
                          </>
                        ) : (
                          'Enviar enlace de recuperación'
                        )}
                      </Button>
                    </motion.div>

                    <motion.div variants={itemVariants} className="text-center pt-2">
                      <a
                        href="/login"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1F4E31] hover:text-[#153823] hover:underline dark:text-[#388E59] dark:hover:text-[#4AB874] transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al inicio de sesión
                      </a>
                    </motion.div>
                  </motion.div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Institutional Link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-6 text-center"
          >
            <a
              href="https://www.ensuny.edu.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-500 hover:text-[#1F4E31] transition-colors dark:text-slate-400 dark:hover:text-[#4AB874] tracking-wide"
            >
              www.ensuny.edu.co
            </a>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
