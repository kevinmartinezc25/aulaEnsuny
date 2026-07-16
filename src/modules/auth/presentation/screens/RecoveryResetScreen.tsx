'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, Variants } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { resetPassword } from '@/modules/auth/application/actions'
import { recoveryResetSchema, RecoveryResetInput } from '@/modules/auth/application/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle, Eye, EyeOff, Moon, Sun, CheckCircle2 } from 'lucide-react'

export function RecoveryResetScreen() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
  } = useForm<RecoveryResetInput>({
    resolver: zodResolver(recoveryResetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RecoveryResetInput) => {
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const response = await resetPassword(data.password)
      if (response?.error) {
        setErrorMsg(response.error)
        return
      }

      setSuccessMsg('Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión con tu nueva contraseña.')
    } catch {
      setErrorMsg('Ocurrió un error inesperado al restablecer la contraseña. Por favor reintenta.')
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
                  Nueva Contraseña
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Ingresa y confirma tu nueva contraseña de acceso.
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
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>

                  <Button
                    onClick={() => router.push('/login')}
                    className="w-full rounded-lg bg-[#1F4E31] py-5 sm:py-6 text-[15px] sm:text-base text-white font-medium hover:bg-[#153823] active:scale-[0.99] transition-all duration-200 dark:bg-[#2A6B43] dark:hover:bg-[#1F4E31]"
                  >
                    Iniciar Sesión
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                        Nueva contraseña
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          className={`rounded-lg border-slate-200/80 bg-slate-50/50 py-4 sm:py-5 pr-10 text-sm focus:bg-white focus:ring-[#1F4E31] dark:border-slate-800 dark:bg-slate-950/50 ${
                            errors.password ? 'border-red-500 focus:ring-red-500' : ''
                          }`}
                          {...register('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                        Confirmar contraseña
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Repite tu contraseña"
                          className={`rounded-lg border-slate-200/80 bg-slate-50/50 py-4 sm:py-5 pr-10 text-sm focus:bg-white focus:ring-[#1F4E31] dark:border-slate-800 dark:bg-slate-950/50 ${
                            errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''
                          }`}
                          {...register('confirmPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
                      )}
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
                            Guardando contraseña...
                          </>
                        ) : (
                          'Restablecer contraseña'
                        )}
                      </Button>
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
