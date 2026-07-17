'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, Variants } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/modules/auth/application/actions'
import { loginSchema, LoginInput } from '@/modules/auth/application/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import QRCode from 'react-qr-code'
import { Loader2, AlertCircle, Eye, EyeOff, Moon, Sun, QrCode, X, ArrowLeft } from 'lucide-react'

export function LoginScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const savedTheme = window.localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark)

    root.classList.toggle('dark', shouldUseDark)

    // Capturar error de parámetros de la URL
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setErrorMsg(errorParam)
    }
  }, [searchParams])

  const toggleTheme = () => {
    const isDarkNow = document.documentElement.classList.toggle('dark')
    window.localStorage.setItem('theme', isDarkNow ? 'dark' : 'light')
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const response = await login(data)
      if (response?.error) {
        setErrorMsg(response.error)
        return
      }

      if (response?.success && response.redirectTo) {
        router.push(response.redirectTo)
        return
      }
    } catch {
      setErrorMsg('Ocurrió un error inesperado al intentar iniciar sesión. Por favor reintenta.')
    } finally {
      setIsLoading(false)
    }
  }

  // Animaciones para elementos con desfase (stagger)
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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f8f9fa] dark:bg-slate-950">

      {/* Back to Landing */}
      <div className="absolute top-4 left-4 z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-white/60 border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm backdrop-blur-md dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Volver al Inicio</span>
        </Link>
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="rounded-full p-2.5 bg-white/60 border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm backdrop-blur-md dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
          title="Cambiar tema"
        >
          <Sun className="hidden h-4 w-4 dark:block" />
          <Moon className="block h-4 w-4 dark:hidden" />
        </button>
      </div>

      {/* Decorative Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]" />
        <div className="absolute top-[-10%] left-[-5%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] rounded-full bg-emerald-400/20 blur-[80px] sm:blur-[120px] dark:bg-emerald-900/30" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[280px] sm:w-[600px] h-[280px] sm:h-[600px] rounded-full bg-[#1F4E31]/15 blur-[90px] sm:blur-[150px] dark:bg-[#1F4E31]/20" />
      </div>

      {/* Scroll container — centres content vertically on tall screens, scrolls on short ones */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:py-16 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[400px] flex flex-col items-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="mb-6 sm:mb-8 w-full flex justify-center px-6 sm:px-0"
          >
            <div className="relative w-full max-w-[280px] sm:max-w-[360px] aspect-[416/145]">
              <img
                src="/logo.svg?v=2"
                alt="aulaEnsuny Logo"
                className="object-contain w-full h-full"
              />
            </div>
          </motion.div>

          {/* Card */}
          <Card className="w-full border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl dark:bg-slate-900 dark:shadow-none">
            <CardContent className="p-5 sm:p-8">

              {/* Cabecera de la card */}
              <div className="mb-5 text-center">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Bienvenido
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Ingresa tus credenciales para continuar
                </p>
              </div>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  {/* Email */}
                  <motion.div variants={itemVariants} className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                      Correo electrónico
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@ensuny.edu.co"
                      className={`rounded-xl border-slate-200/80 bg-slate-50/50 h-12 text-sm focus:bg-white focus:ring-[#1F4E31] dark:border-slate-800 dark:bg-slate-950/50 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''
                        }`}
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                    )}
                  </motion.div>

                  {/* Password */}
                  <motion.div variants={itemVariants} className="space-y-1.5">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={`rounded-xl border-slate-200/80 bg-slate-50/50 h-12 pr-11 text-sm focus:bg-white focus:ring-[#1F4E31] dark:border-slate-800 dark:bg-slate-950/50 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''
                          }`}
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      {errors.password
                        ? <p className="text-xs text-red-500">{errors.password.message}</p>
                        : <span />
                      }
                      <a
                        href="/recovery"
                        className="text-[13px] font-medium text-[#1F4E31] hover:text-[#153823] hover:underline transition-colors dark:text-[#388E59] dark:hover:text-[#4AB874] ml-auto"
                      >
                        ¿Olvidé mi contraseña?
                      </a>
                    </div>
                  </motion.div>

                  {/* Submit */}
                  <motion.div variants={itemVariants} className="pt-1">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full rounded-xl bg-[#1F4E31] h-12 text-[15px] text-white font-semibold hover:bg-[#153823] active:scale-[0.99] transition-all duration-200 dark:bg-[#2A6B43] dark:hover:bg-[#1F4E31]"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Iniciando...
                        </>
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </Button>
                  </motion.div>

                  {/* Footer links */}
                  <motion.div variants={itemVariants} className="pt-1 text-center flex flex-col items-center gap-2.5">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      ¿No tienes una cuenta?{' '}
                      <a
                        href="/register/student"
                        className="font-semibold text-[#1F4E31] hover:text-[#153823] hover:underline transition-colors dark:text-[#388E59] dark:hover:text-[#4AB874]"
                      >
                        Regístrate aquí
                      </a>
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowQRModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-semibold transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Mostrar QR de Registro
                    </button>
                  </motion.div>
                </motion.div>
              </form>
            </CardContent>
          </Card>

          {/* Enlace institucional */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-5 text-center"
          >
            <a
              href="https://www.ensuny.edu.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-slate-400 hover:text-[#1F4E31] transition-colors dark:text-slate-500 dark:hover:text-[#4AB874] tracking-wide"
            >
              www.ensuny.edu.co
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Modal QR */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative"
          >
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-[#1F4E31]/10 rounded-full flex items-center justify-center">
                <QrCode className="w-6 h-6 text-[#1F4E31] dark:text-[#4AB874]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Registro Rápido
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Escanea este código QR desde tu dispositivo móvil para acceder al formulario de registro.
              </p>
              <div className="bg-white p-4 rounded-2xl inline-flex items-center justify-center mt-2 shadow-sm border border-slate-100">
                <QRCode
                  value={typeof window !== 'undefined' ? `${window.location.origin}/register/student` : 'https://aula.ensuny.edu.co/register/student'}
                  size={180}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}


