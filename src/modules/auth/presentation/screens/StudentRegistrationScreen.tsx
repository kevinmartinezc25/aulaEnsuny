'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, Variants } from 'framer-motion'
import { selfRegisterStudent } from '@/modules/auth/application/studentRegistrationActions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle, CheckCircle2, Moon, Sun, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Validación Zod
const registrationSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  documentType: z.string().min(1, 'Selecciona un tipo de documento'),
  documentNumber: z.string().min(5, 'El número de documento es requerido'),
  birthDate: z.string().min(1, 'La fecha de nacimiento es requerida'),
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
})

type RegistrationInput = z.infer<typeof registrationSchema>

export function StudentRegistrationScreen() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
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
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      documentType: 'TI'
    }
  })

  const onSubmit = async (data: RegistrationInput) => {
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    
    try {
      const response = await selfRegisterStudent(data)
      if (response && !response.success) {
        setErrorMsg(response.error || 'No se pudo crear la cuenta.')
        return
      }

      setSuccessMsg(
        '¡Registro exitoso! Tu cuenta ha sido creada y ahora puedes iniciar sesión con tu correo y contraseña.'
      )
    } catch {
      setErrorMsg('Ocurrió un error inesperado al intentar registrarte. Por favor reintenta.')
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
          className="w-full max-w-[500px] px-4 sm:px-0 flex flex-col items-center"
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
                  Registro de Estudiante
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Completa tus datos para crear tu cuenta en la plataforma.
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
                  <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/30">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                          Registro completado
                        </h3>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">
                          {successMsg}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link href="/login" className="block w-full">
                    <Button className="w-full bg-[#1F4E31] text-white hover:bg-[#1a4229] transition-all py-6 rounded-xl font-semibold text-base shadow-md dark:shadow-none">
                      Ir a Iniciar Sesión
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <motion.form
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombres *</Label>
                      <Input
                        {...register('firstName')}
                        type="text"
                        placeholder="Ej. Juan Carlos"
                        disabled={isLoading}
                        className="h-11 md:h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:border-[#1F4E31] focus:ring-[#1F4E31] rounded-xl transition-all"
                      />
                      {errors.firstName && (
                        <p className="text-[13px] text-red-500 mt-1.5">{errors.firstName.message}</p>
                      )}
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Apellidos *</Label>
                      <Input
                        {...register('lastName')}
                        type="text"
                        placeholder="Ej. Pérez Gómez"
                        disabled={isLoading}
                        className="h-11 md:h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:border-[#1F4E31] focus:ring-[#1F4E31] rounded-xl transition-all"
                      />
                      {errors.lastName && (
                        <p className="text-[13px] text-red-500 mt-1.5">{errors.lastName.message}</p>
                      )}
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <motion.div variants={itemVariants} className="space-y-1.5 col-span-1">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo *</Label>
                      <select
                        {...register('documentType')}
                        disabled={isLoading}
                        className="flex h-11 md:h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-all focus:border-[#1F4E31] focus:outline-none focus:ring-2 focus:ring-[#1F4E31] focus:ring-offset-2 dark:border-slate-800 dark:bg-slate-950/50 dark:text-white"
                      >
                        <option value="TI">TI</option>
                        <option value="CC">CC</option>
                        <option value="CE">CE</option>
                        <option value="RC">RC</option>
                        <option value="PEP">PEP</option>
                        <option value="PPT">PPT</option>
                      </select>
                      {errors.documentType && (
                        <p className="text-[13px] text-red-500 mt-1.5">{errors.documentType.message}</p>
                      )}
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-1.5 col-span-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">N° de Documento *</Label>
                      <Input
                        {...register('documentNumber')}
                        type="text"
                        placeholder="1002300400"
                        disabled={isLoading}
                        className="h-11 md:h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:border-[#1F4E31] focus:ring-[#1F4E31] rounded-xl transition-all"
                      />
                      {errors.documentNumber && (
                        <p className="text-[13px] text-red-500 mt-1.5">{errors.documentNumber.message}</p>
                      )}
                    </motion.div>
                  </div>

                  <motion.div variants={itemVariants} className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Nacimiento *</Label>
                    <Input
                      {...register('birthDate')}
                      type="date"
                      disabled={isLoading}
                      className="h-11 md:h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:border-[#1F4E31] focus:ring-[#1F4E31] rounded-xl transition-all"
                    />
                    {errors.birthDate && (
                      <p className="text-[13px] text-red-500 mt-1.5">{errors.birthDate.message}</p>
                    )}
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Correo Electrónico *</Label>
                    <Input
                      {...register('email')}
                      type="email"
                      placeholder="estudiante@ejemplo.com"
                      disabled={isLoading}
                      className="h-11 md:h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:border-[#1F4E31] focus:ring-[#1F4E31] rounded-xl transition-all"
                    />
                    {errors.email && (
                      <p className="text-[13px] text-red-500 mt-1.5">{errors.email.message}</p>
                    )}
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña Inicial *</Label>
                    <Input
                      {...register('password')}
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      disabled={isLoading}
                      className="h-11 md:h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:border-[#1F4E31] focus:ring-[#1F4E31] rounded-xl transition-all"
                    />
                    {errors.password && (
                      <p className="text-[13px] text-red-500 mt-1.5">{errors.password.message}</p>
                    )}
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#1F4E31] text-white hover:bg-[#1a4229] transition-all py-6 rounded-xl font-semibold text-base shadow-md dark:shadow-none"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creando cuenta...
                        </>
                      ) : (
                        'Registrarme'
                      )}
                    </Button>
                  </motion.div>

                  <motion.div variants={itemVariants} className="mt-6 text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-[#1F4E31] dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver al Inicio de Sesión
                    </Link>
                  </motion.div>
                </motion.form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
