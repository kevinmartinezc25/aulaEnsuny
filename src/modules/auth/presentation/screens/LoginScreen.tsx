'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence, useReducedMotion, Variants } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/modules/auth/application/actions'
import { loginSchema, LoginInput } from '@/modules/auth/application/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import QRCode from 'react-qr-code'
import { Loader2, AlertCircle, Eye, EyeOff, Moon, Sun, QrCode, X, ArrowLeft } from 'lucide-react'

export function LoginScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldReduceMotion = useReducedMotion()
  const errorParam = searchParams.get('error')
  const [errorMsg, setErrorMsg] = useState<string | null>(() => errorParam || null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)

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
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('pending_permissions_popup_dismissed')
        }
        router.push(response.redirectTo)
        return
      }
    } catch {
      setErrorMsg('Ocurrió un error inesperado al intentar iniciar sesión. Por favor reintenta.')
    } finally {
      setIsLoading(false)
    }
  }

  // Animaciones Apple Design con resortes de amortiguación crítica
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.05,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 24,
        stiffness: 260,
        mass: 0.8,
      },
    },
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#fbfbfd] dark:bg-slate-950 selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-200">
      {/* Navegación flotante superior */}
      <header className="absolute top-0 inset-x-0 z-40 flex items-center justify-between p-4 sm:p-6 pointer-events-none">
        {/* Volver al Landing */}
        <div className="pointer-events-auto">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full px-4 py-2 bg-white/70 hover:bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:bg-slate-900/70 dark:hover:bg-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white transition-all text-xs font-semibold active:scale-95 duration-100 ease-out cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
            <span>Volver al Inicio</span>
          </Link>
        </div>

        {/* Alternador de tema */}
        <div className="pointer-events-auto">
          <button
            onClick={toggleTheme}
            type="button"
            className="rounded-full p-2.5 bg-white/70 hover:bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:bg-slate-900/70 dark:hover:bg-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white transition-all active:scale-90 duration-100 ease-out cursor-pointer"
            title="Cambiar tema"
            aria-label="Cambiar tema"
          >
            <Sun className="hidden h-4 w-4 dark:block" />
            <Moon className="block h-4 w-4 dark:hidden" />
          </button>
        </div>
      </header>

      {/* Fondo ambiental orgánico con materiales y luces difuminadas */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] dark:opacity-30" />
        <div className="absolute -top-32 -left-20 w-[420px] sm:w-[620px] h-[420px] sm:h-[620px] rounded-full bg-emerald-400/15 blur-[120px] dark:bg-emerald-600/15" />
        <div className="absolute -bottom-32 -right-20 w-[420px] sm:w-[680px] h-[420px] sm:h-[680px] rounded-full bg-[#1F4E31]/15 blur-[130px] dark:bg-emerald-900/20" />
      </div>

      {/* Contenedor principal centrado */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:py-20 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220, mass: 0.9 }}
          className="w-full max-w-[420px] flex flex-col items-center"
        >
          {/* Logo institucional */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: 'spring', damping: 22, stiffness: 200 }}
            className="mb-5 w-full flex justify-center px-6"
          >
            <div className="relative w-full max-w-[210px] sm:max-w-[260px] aspect-[416/145] drop-shadow-sm">
              <img
                src="/logo.svg?v=2"
                alt="aulaEnsuny Logo"
                className="object-contain w-full h-full dark:hidden"
              />
              <img
                src="/logo_dark.svg?v=2"
                alt="aulaEnsuny Logo Dark"
                className="object-contain w-full h-full hidden dark:block"
              />
            </div>
          </motion.div>

          {/* Tarjeta de cristal translúcido (Apple Frosted Glass) */}
          <div className="relative w-full rounded-[28px] border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.45)] p-6 sm:p-8 overflow-hidden">
            {/* Línea de luz especular superior */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

            {/* Cabecera */}
            <div className="mb-6 text-center">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Bienvenido
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Mensaje de error con entrada suave */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                className="mb-5 flex items-start gap-2.5 rounded-2xl bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-700 border border-red-500/20 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900/40"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span className="leading-snug">{errorMsg}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {/* Correo electrónico */}
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="usuario@ensuny.edu.co"
                    className={`h-11 rounded-2xl border-slate-200/90 bg-slate-100/60 px-3.5 text-sm transition-all duration-150 hover:bg-slate-100/90 focus:bg-white focus:ring-2 focus:ring-[#1F4E31]/20 focus:border-[#1F4E31] dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 dark:focus:bg-slate-900 dark:focus:ring-emerald-500/25 dark:focus:border-emerald-500 ${
                      errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    {...register('email')}
                  />
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-500 mt-1 pl-1"
                    >
                      {errors.email.message}
                    </motion.p>
                  )}
                </motion.div>

                {/* Contraseña */}
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      Contraseña
                    </Label>
                    <Link
                      href="/recovery"
                      className="text-xs font-medium text-[#1F4E31] hover:text-[#153823] transition-colors dark:text-emerald-400 dark:hover:text-emerald-300 active:scale-95 duration-100 inline-block"
                    >
                      ¿Olvidé mi contraseña?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={`h-11 rounded-2xl border-slate-200/90 bg-slate-100/60 px-3.5 pr-11 text-sm transition-all duration-150 hover:bg-slate-100/90 focus:bg-white focus:ring-2 focus:ring-[#1F4E31]/20 focus:border-[#1F4E31] dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 dark:focus:bg-slate-900 dark:focus:ring-emerald-500/25 dark:focus:border-emerald-500 ${
                        errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                      }`}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors active:scale-90 duration-100 cursor-pointer"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-500 mt-1 pl-1"
                    >
                      {errors.password.message}
                    </motion.p>
                  )}
                </motion.div>

                {/* Botón de Iniciar Sesión con respuesta física inmediata en pointer-down */}
                <motion.div variants={itemVariants} className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-2xl bg-[#1F4E31] h-11 text-sm text-white font-semibold hover:bg-[#183e27] active:scale-[0.98] active:brightness-95 transition-all duration-100 ease-out shadow-sm shadow-emerald-950/15 dark:bg-emerald-600 dark:hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Iniciando sesión...</span>
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </motion.div>

                {/* Enlaces inferiores */}
                <motion.div variants={itemVariants} className="pt-2 text-center flex flex-col items-center gap-3">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    ¿No tienes una cuenta?{' '}
                    <Link
                      href="/register/student"
                      className="font-semibold text-[#1F4E31] hover:text-[#153823] underline-offset-2 hover:underline transition-colors dark:text-emerald-400 dark:hover:text-emerald-300 active:scale-95 duration-100 inline-block"
                    >
                      Regístrate aquí
                    </Link>
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowQRModal(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-semibold transition-all active:scale-95 duration-100 ease-out cursor-pointer border border-slate-200/50 dark:border-white/5"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>Mostrar QR de Registro</span>
                  </button>
                </motion.div>
              </motion.div>
            </form>
          </div>

          {/* Enlace institucional inferior */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-6 text-center"
          >
            <a
              href="https://www.ensuny.edu.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-slate-400 hover:text-[#1F4E31] transition-colors dark:text-slate-500 dark:hover:text-emerald-400 tracking-wide"
            >
              www.ensuny.edu.co
            </a>
          </motion.div>
        </motion.div>
      </main>

      {/* Modal QR con física de resorte y desenfoque fluido */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop desenfocado */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowQRModal(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md cursor-pointer"
            />

            {/* Tarjeta Modal centrada */}
            <motion.div
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.94, y: shouldReduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96, y: shouldReduceMotion ? 0 : 6 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280, mass: 0.8 }}
              className="relative z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-white/60 dark:border-white/10 overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

              <button
                onClick={() => setShowQRModal(false)}
                type="button"
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 duration-100 cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-3 pt-1">
                <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                  <QrCode className="w-6 h-6 text-[#1F4E31] dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Registro Rápido
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                  Escanea este código QR desde tu dispositivo móvil para acceder directamente al formulario de registro.
                </p>
                <div className="bg-white p-4 rounded-2xl inline-flex items-center justify-center mt-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-slate-100 dark:border-slate-800">
                  <QRCode
                    value={
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/register/student`
                        : 'https://aula.ensuny.edu.co/register/student'
                    }
                    size={170}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
