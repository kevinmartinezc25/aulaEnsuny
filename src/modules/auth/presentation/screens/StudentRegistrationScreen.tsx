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
  gradeLevel: z.string().min(1, 'Selecciona tu grado'),
  groupName: z.string().min(1, 'Selecciona tu grupo'),
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirma tu contraseña')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
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
    mode: 'onChange',
    defaultValues: {
      documentType: 'TI',
      gradeLevel: '',
      groupName: ''
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
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  }

  const selectClass = 'flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-all focus:border-[#1F4E31] focus:outline-none focus:ring-2 focus:ring-[#1F4E31] dark:border-slate-800 dark:bg-slate-950/50 dark:text-white'
  const inputClass = 'h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:border-[#1F4E31] focus:ring-[#1F4E31] rounded-xl transition-all'

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

      {/* Theme toggle */}
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

      {/* Decorative background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]" />
        <div className="absolute top-[-10%] left-[-5%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] rounded-full bg-emerald-400/20 blur-[80px] sm:blur-[120px] dark:bg-emerald-900/30" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[280px] sm:w-[600px] h-[280px] sm:h-[600px] rounded-full bg-[#1F4E31]/15 blur-[90px] sm:blur-[150px] dark:bg-[#1F4E31]/20" />
      </div>

      {/* Scroll container */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-start px-4 py-10 sm:py-16 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[480px] flex flex-col items-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="mb-6 sm:mb-8 w-full flex justify-center px-6 sm:px-0"
          >
            <div className="relative w-full max-w-[240px] sm:max-w-[320px] aspect-[416/145]">
              <img src="/logo.svg?v=2" alt="aulaEnsuny Logo" className="object-contain w-full h-full" />
            </div>
          </motion.div>

          {/* Card */}
          <Card className="w-full border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl dark:bg-slate-900 dark:shadow-none">
            <CardContent className="p-5 sm:p-8">

              {/* Header */}
              <div className="mb-5 text-center">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Registro de Estudiante
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Completa tus datos para crear tu cuenta
                </p>
              </div>

              {/* Error banner */}
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

              {successMsg ? (
                /* ── Success state ── */
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="rounded-2xl bg-emerald-50 p-5 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/30 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      ¡Registro completado!
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">
                      {successMsg}
                    </p>
                  </div>
                  <Link href="/login" className="block w-full">
                    <Button className="w-full bg-[#1F4E31] text-white hover:bg-[#1a4229] transition-all h-12 rounded-xl font-semibold text-sm sm:text-base shadow-md dark:shadow-none">
                      Ir a Iniciar Sesión
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                /* ── Registration form ── */
                <motion.form
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {/* ─ Sección: Datos personales ─ */}
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 pt-1">
                    Datos personales
                  </p>

                  {/* Nombres & Apellidos — stacked on mobile, 2-col on sm+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombres *</Label>
                      <Input
                        {...register('firstName')}
                        type="text"
                        placeholder="Ej. Juan Carlos"
                        disabled={isLoading}
                        className={inputClass}
                      />
                      {errors.firstName && <p className="text-[12px] text-red-500 mt-1">{errors.firstName.message}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Apellidos *</Label>
                      <Input
                        {...register('lastName')}
                        type="text"
                        placeholder="Ej. Pérez Gómez"
                        disabled={isLoading}
                        className={inputClass}
                      />
                      {errors.lastName && <p className="text-[12px] text-red-500 mt-1">{errors.lastName.message}</p>}
                    </motion.div>
                  </div>

                  {/* Tipo doc & N° — tipo siempre compacto, número ocupa el resto */}
                  <div className="grid grid-cols-[auto_1fr] gap-3">
                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo *</Label>
                      <select {...register('documentType')} disabled={isLoading} className={selectClass}>
                        <option value="TI">TI</option>
                        <option value="CC">CC</option>
                        <option value="CE">CE</option>
                        <option value="RC">RC</option>
                        <option value="PEP">PEP</option>
                        <option value="PPT">PPT</option>
                      </select>
                      {errors.documentType && <p className="text-[12px] text-red-500 mt-1">{errors.documentType.message}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">N° de Documento *</Label>
                      <Input
                        {...register('documentNumber')}
                        type="text"
                        placeholder="1002300400"
                        disabled={isLoading}
                        className={inputClass}
                      />
                      {errors.documentNumber && <p className="text-[12px] text-red-500 mt-1">{errors.documentNumber.message}</p>}
                    </motion.div>
                  </div>

                  {/* Fecha de nacimiento */}
                  <motion.div variants={itemVariants} className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Nacimiento *</Label>
                    <Input
                      {...register('birthDate')}
                      type="date"
                      disabled={isLoading}
                      className={inputClass}
                    />
                    {errors.birthDate && <p className="text-[12px] text-red-500 mt-1">{errors.birthDate.message}</p>}
                  </motion.div>

                  {/* Grado & Grupo — 2 columnas siempre (etiquetas cortas) */}
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Grado *</Label>
                      <select {...register('gradeLevel')} disabled={isLoading} className={selectClass}>
                        <option value="" disabled>Grado…</option>
                        <option value="6°">6°</option>
                        <option value="7°">7°</option>
                        <option value="8°">8°</option>
                        <option value="9°">9°</option>
                        <option value="10°">10°</option>
                        <option value="11°">11°</option>
                        <option value="PFC">PFC</option>
                      </select>
                      {errors.gradeLevel && <p className="text-[12px] text-red-500 mt-1">{errors.gradeLevel.message}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Grupo *</Label>
                      <select {...register('groupName')} disabled={isLoading} className={selectClass}>
                        <option value="" disabled>Grupo…</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                      {errors.groupName && <p className="text-[12px] text-red-500 mt-1">{errors.groupName.message}</p>}
                    </motion.div>
                  </div>

                  {/* ─ Sección: Acceso ─ */}
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 pt-2">
                    Acceso a la plataforma
                  </p>

                  {/* Correo */}
                  <motion.div variants={itemVariants} className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Correo Electrónico *</Label>
                    <Input
                      {...register('email')}
                      type="email"
                      placeholder="estudiante@ejemplo.com"
                      disabled={isLoading}
                      className={inputClass}
                    />
                    {errors.email && <p className="text-[12px] text-red-500 mt-1">{errors.email.message}</p>}
                  </motion.div>

                  {/* Contraseñas — stacked on mobile, 2-col on sm+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña *</Label>
                      <Input
                        {...register('password')}
                        type="password"
                        placeholder="Mín. 6 caracteres"
                        disabled={isLoading}
                        className={inputClass}
                      />
                      {errors.password && <p className="text-[12px] text-red-500 mt-1">{errors.password.message}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar *</Label>
                      <Input
                        {...register('confirmPassword')}
                        type="password"
                        placeholder="Repite la contraseña"
                        disabled={isLoading}
                        className={inputClass}
                      />
                      {errors.confirmPassword && <p className="text-[12px] text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                    </motion.div>
                  </div>

                  {/* Submit */}
                  <motion.div variants={itemVariants} className="pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#1F4E31] text-white hover:bg-[#1a4229] transition-all h-12 rounded-xl font-semibold text-sm sm:text-base shadow-md dark:shadow-none"
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

                  {/* Back link */}
                  <motion.div variants={itemVariants} className="text-center pt-1">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#1F4E31] dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Volver al Inicio de Sesión
                    </Link>
                  </motion.div>
                </motion.form>
              )}
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
    </div>
  )
}
