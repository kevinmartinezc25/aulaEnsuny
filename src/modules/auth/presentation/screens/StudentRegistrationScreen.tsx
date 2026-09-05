'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence, useReducedMotion, Variants } from 'framer-motion'
import { selfRegisterStudent, checkStudentPreloaded } from '@/modules/auth/application/studentRegistrationActions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Moon,
  Sun,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  UserCheck
} from 'lucide-react'
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
  const shouldReduceMotion = useReducedMotion()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingDoc, setIsCheckingDoc] = useState(false)
  const [isPreloaded, setIsPreloaded] = useState(false)
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    mode: 'onChange',
    defaultValues: {
      documentType: 'TI',
      gradeLevel: '',
      groupName: '',
      email: '',
      firstName: '',
      lastName: '',
      birthDate: '',
      password: '',
      confirmPassword: '',
    }
  })

  const documentNumber = watch('documentNumber')

  useEffect(() => {
    if (errorMsg === 'Este documento ya se encuentra registrado. Por favor, inicia sesión o recupera tu contraseña.') {
      setErrorMsg(null)
    }
  }, [documentNumber, errorMsg])

  const handleCheckDocument = async () => {
    if (!documentNumber || documentNumber.length < 5) return
    setIsCheckingDoc(true)
    setErrorMsg(null)
    try {
      const res = await checkStudentPreloaded(documentNumber)
      
      if (res.alreadyRegistered) {
        setErrorMsg('Este documento ya se encuentra registrado. Por favor, inicia sesión o recupera tu contraseña.')
        setIsPreloaded(false)
        return
      }

      if (res.found && res.student) {
        setValue('firstName', res.student.firstName, { shouldValidate: true })
        setValue('lastName', res.student.lastName, { shouldValidate: true })
        setValue('gradeLevel', res.student.gradeLevel, { shouldValidate: true })
        setValue('groupName', res.student.groupName, { shouldValidate: true })
        setIsPreloaded(true)
      } else {
        setIsPreloaded(false)
      }
    } catch {
      setIsPreloaded(false)
    } finally {
      setIsCheckingDoc(false)
    }
  }

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

  // Animaciones Apple Design con resortes de amortiguación crítica
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.02,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
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

  const inputBaseClass =
    'h-11 rounded-2xl border-slate-200/90 bg-slate-100/60 px-3.5 text-sm transition-all duration-150 hover:bg-slate-100/90 focus:bg-white focus:ring-2 focus:ring-[#1F4E31]/20 focus:border-[#1F4E31] dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 dark:focus:bg-slate-900 dark:focus:ring-emerald-500/25 dark:focus:border-emerald-500'

  const selectBaseClass =
    'flex h-11 w-full rounded-2xl border border-slate-200/90 bg-slate-100/60 px-3 py-2 text-sm text-slate-800 transition-all duration-150 hover:bg-slate-100/90 focus:bg-white focus:border-[#1F4E31] focus:outline-none focus:ring-2 focus:ring-[#1F4E31]/20 dark:border-white/10 dark:bg-slate-800/50 dark:text-white dark:hover:bg-slate-800/80 dark:focus:bg-slate-900 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/25'

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

      {/* Contenedor principal scrollable */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-start px-4 py-16 sm:py-20 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220, mass: 0.9 }}
          className="w-full max-w-[520px] flex flex-col items-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: 'spring', damping: 22, stiffness: 200 }}
            className="mb-5 w-full flex justify-center px-6"
          >
            <div className="relative w-full max-w-[210px] sm:max-w-[260px] aspect-[416/145] drop-shadow-sm">
              <img src="/logo.svg?v=2" alt="aulaEnsuny Logo" className="object-contain w-full h-full dark:hidden" />
              <img src="/logo_dark.svg?v=2" alt="aulaEnsuny Logo Dark" className="object-contain w-full h-full hidden dark:block" />
            </div>
          </motion.div>

          {/* Tarjeta de cristal translúcido */}
          <div className="relative w-full rounded-[28px] border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.45)] p-6 sm:p-8 overflow-hidden">
            {/* Línea de luz especular superior */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

            {/* Encabezado */}
            <div className="mb-6 text-center">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Registro de Estudiante
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Completa tus datos para crear tu cuenta en la plataforma
              </p>
            </div>

            {/* Banner de error */}
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

            {/* Estado de Éxito con AnimatePresence */}
            <AnimatePresence mode="wait">
              {successMsg ? (
                <motion.div
                  key="success-card"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 260 }}
                  className="space-y-5 text-center py-3"
                >
                  <div className="rounded-3xl bg-emerald-500/10 p-6 border border-emerald-500/20 dark:bg-emerald-950/30 dark:border-emerald-800/40">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                      ¡Registro completado con éxito!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                      {successMsg}
                    </p>
                  </div>
                  <Link href="/login" className="block w-full">
                    <Button className="w-full bg-[#1F4E31] text-white hover:bg-[#183e27] active:scale-[0.98] transition-all duration-100 ease-out h-11 rounded-2xl font-semibold text-sm shadow-sm shadow-emerald-950/15 dark:bg-emerald-600 dark:hover:bg-emerald-700 cursor-pointer">
                      Ir a Iniciar Sesión
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <motion.form
                  key="registration-form"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  {/* ── Sección 1: Documento de Identidad ── */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        1. Documento de Identidad
                      </span>
                    </div>

                    <div className="grid grid-cols-[85px_1fr_44px] sm:grid-cols-[100px_1fr_44px] gap-2.5 items-start">
                      {/* Tipo */}
                      <motion.div variants={itemVariants} className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Tipo *
                        </Label>
                        <select
                          {...register('documentType')}
                          disabled={isLoading || isPreloaded}
                          className={selectBaseClass}
                        >
                          <option value="TI">TI</option>
                          <option value="CC">CC</option>
                          <option value="CE">CE</option>
                          <option value="RC">RC</option>
                          <option value="PEP">PEP</option>
                          <option value="PPT">PPT</option>
                        </select>
                        {errors.documentType && (
                          <p className="text-[11px] text-red-500 mt-1">{errors.documentType.message}</p>
                        )}
                      </motion.div>

                      {/* Número de documento */}
                      <motion.div variants={itemVariants} className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          N° de Documento *
                        </Label>
                        <Input
                          {...register('documentNumber')}
                          type="text"
                          placeholder="1002300400"
                          disabled={isLoading || isPreloaded}
                          className={inputBaseClass}
                          onBlur={handleCheckDocument}
                        />
                        {errors.documentNumber && (
                          <p className="text-[11px] text-red-500 mt-1">{errors.documentNumber.message}</p>
                        )}
                      </motion.div>

                      {/* Indicador de estado */}
                      <motion.div variants={itemVariants} className="pt-6">
                        <div
                          className={`h-11 w-11 rounded-2xl flex items-center justify-center border transition-all duration-200 ${
                            isPreloaded
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : isCheckingDoc
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-400'
                              : 'bg-slate-100/60 dark:bg-slate-800/50 border-slate-200/80 dark:border-white/10 text-slate-400'
                          }`}
                          title={
                            isPreloaded
                              ? 'Estudiante precargado'
                              : isCheckingDoc
                              ? 'Verificando en sistema...'
                              : 'Verifica tu número al salir del campo'
                          }
                        >
                          {isCheckingDoc ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isPreloaded ? (
                            <UserCheck className="h-5 w-5" />
                          ) : (
                            <span className="text-xs font-semibold">ID</span>
                          )}
                        </div>
                      </motion.div>
                    </div>

                    {/* Alerta de datos precargados con animación fluida */}
                    <AnimatePresence>
                      {isPreloaded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -4 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -4 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
                          className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-3.5 py-2.5 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300"
                        >
                          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="leading-snug">
                            ¡Estudiante encontrado en la base escolar! Tus datos institucionales se han precargado.
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Sección 2: Información Básica ── */}
                  <div className="space-y-2.5 pt-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      2. Información Básica
                    </span>

                    {/* Nombres y Apellidos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <motion.div variants={itemVariants} className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Nombres *
                        </Label>
                        <Input
                          {...register('firstName')}
                          type="text"
                          placeholder="Ej. Juan Carlos"
                          disabled={isLoading || isPreloaded}
                          className={`${inputBaseClass} ${
                            isPreloaded ? 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400' : ''
                          }`}
                        />
                        {errors.firstName && (
                          <p className="text-[11px] text-red-500 mt-1">{errors.firstName.message}</p>
                        )}
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Apellidos *
                        </Label>
                        <Input
                          {...register('lastName')}
                          type="text"
                          placeholder="Ej. Pérez Gómez"
                          disabled={isLoading || isPreloaded}
                          className={`${inputBaseClass} ${
                            isPreloaded ? 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400' : ''
                          }`}
                        />
                        {errors.lastName && (
                          <p className="text-[11px] text-red-500 mt-1">{errors.lastName.message}</p>
                        )}
                      </motion.div>
                    </div>

                    {/* Fecha de nacimiento */}
                    <motion.div variants={itemVariants} className="space-y-1">
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Fecha de Nacimiento *
                      </Label>
                      <Input
                        {...register('birthDate')}
                        type="date"
                        disabled={isLoading}
                        className={inputBaseClass}
                      />
                      {errors.birthDate && (
                        <p className="text-[11px] text-red-500 mt-1">{errors.birthDate.message}</p>
                      )}
                    </motion.div>

                    {/* Grado & Grupo */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <motion.div variants={itemVariants} className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Grado *
                        </Label>
                        <select
                          {...register('gradeLevel')}
                          disabled={isLoading || isPreloaded}
                          className={`${selectBaseClass} ${
                            isPreloaded ? 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400' : ''
                          }`}
                        >
                          <option value="" disabled>Grado…</option>
                          <option value="6°">6°</option>
                          <option value="7°">7°</option>
                          <option value="8°">8°</option>
                          <option value="9°">9°</option>
                          <option value="10°">10°</option>
                          <option value="11°">11°</option>
                          <option value="PFC">PFC</option>
                        </select>
                        {errors.gradeLevel && (
                          <p className="text-[11px] text-red-500 mt-1">{errors.gradeLevel.message}</p>
                        )}
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Grupo *
                        </Label>
                        <select
                          {...register('groupName')}
                          disabled={isLoading || isPreloaded}
                          className={`${selectBaseClass} ${
                            isPreloaded ? 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400' : ''
                          }`}
                        >
                          <option value="" disabled>Grupo…</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </select>
                        {errors.groupName && (
                          <p className="text-[11px] text-red-500 mt-1">{errors.groupName.message}</p>
                        )}
                      </motion.div>
                    </div>
                  </div>

                  {/* ── Sección 3: Acceso a la Plataforma ── */}
                  <div className="space-y-2.5 pt-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      3. Acceso a la Plataforma
                    </span>

                    {/* Correo */}
                    <motion.div variants={itemVariants} className="space-y-1">
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Correo Electrónico *
                      </Label>
                      <Input
                        {...register('email')}
                        type="email"
                        autoComplete="email"
                        placeholder="estudiante@ejemplo.com"
                        disabled={isLoading}
                        className={inputBaseClass}
                      />
                      {errors.email && (
                        <p className="text-[11px] text-red-500 mt-1">{errors.email.message}</p>
                      )}
                    </motion.div>

                    {/* Contraseñas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Contraseña */}
                      <motion.div variants={itemVariants} className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Contraseña *
                        </Label>
                        <div className="relative">
                          <Input
                            {...register('password')}
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Mín. 6 caracteres"
                            disabled={isLoading}
                            className={`${inputBaseClass} pr-10`}
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
                          <p className="text-[11px] text-red-500 mt-1">{errors.password.message}</p>
                        )}
                      </motion.div>

                      {/* Confirmar Contraseña */}
                      <motion.div variants={itemVariants} className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Confirmar *
                        </Label>
                        <div className="relative">
                          <Input
                            {...register('confirmPassword')}
                            type={showConfirmPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Repite la contraseña"
                            disabled={isLoading}
                            className={`${inputBaseClass} pr-10`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors active:scale-90 duration-100 cursor-pointer"
                            aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-[11px] text-red-500 mt-1">{errors.confirmPassword.message}</p>
                        )}
                      </motion.div>
                    </div>
                  </div>

                  {/* Botón de Enviar */}
                  <motion.div variants={itemVariants} className="pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading || errorMsg === 'Este documento ya se encuentra registrado. Por favor, inicia sesión o recupera tu contraseña.'}
                      className="w-full bg-[#1F4E31] text-white hover:bg-[#183e27] active:scale-[0.98] active:brightness-95 transition-all duration-100 ease-out h-11 rounded-2xl font-semibold text-sm shadow-sm shadow-emerald-950/15 dark:bg-emerald-600 dark:hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span>Creando cuenta...</span>
                        </>
                      ) : (
                        'Registrarme'
                      )}
                    </Button>
                  </motion.div>

                  {/* Enlace para volver */}
                  <motion.div variants={itemVariants} className="text-center pt-1">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-[#1F4E31] dark:text-slate-400 dark:hover:text-emerald-400 transition-colors active:scale-95 duration-100"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Volver al Inicio de Sesión</span>
                    </Link>
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>
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
    </div>
  )
}
