'use client'

import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion, Variants } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen,
  TrendingUp,
  Calendar,
  FileText,
  ArrowRight,
  Moon,
  Sun,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Award,
  Layers,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const savedTheme = window.localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return savedTheme === 'dark' || (!savedTheme && prefersDark)
  })
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    window.localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => {
    setIsDark((prev) => !prev)
  }

  // Animaciones Apple Design con resortes de amortiguación crítica
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
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

  const features = [
    {
      icon: BookOpen,
      title: 'Mis Cursos Académicos',
      description:
        'Accede a tus asignaturas asignadas, visualiza lecciones interactivas, módulos temáticos y descarga recursos educativos en PDF sincronizados.',
      badge: 'Contenido Central',
      accent: 'emerald',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20',
    },
    {
      icon: TrendingUp,
      title: 'Monitoreo de Calificaciones',
      description:
        'Consulta tus notas en tiempo real por periodos lectivos. Gráficas de rendimiento para estudiantes y control integral para docentes.',
      badge: 'En Tiempo Real',
      accent: 'blue',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-500/20',
    },
    {
      icon: FileText,
      title: 'Centro de Documentación',
      description:
        'Repositorio institucional para circulares, manuales académicos, guías y formatos. Acceso público y seguro para padres y la comunidad.',
      badge: 'Acceso Abierto',
      accent: 'indigo',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 border border-indigo-500/20',
    },
    {
      icon: Calendar,
      title: 'Calendario y Agenda Escolar',
      description:
        'Cronograma oficial de eventos, fechas límite de proyectos, evaluaciones y comunicados prioritarios programados por la institución.',
      badge: 'Sincronizado',
      accent: 'amber',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20',
    },
  ]

  return (
    <div className="relative min-h-screen w-full bg-[#fbfbfd] dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-200 transition-colors duration-200 overflow-x-hidden">
      {/* Luces difuminadas ambientales orgánicas de fondo */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] dark:opacity-30" />
        <div className="absolute -top-40 -left-20 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full bg-emerald-400/15 blur-[130px] dark:bg-emerald-600/10" />
        <div className="absolute top-[25%] -right-24 w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] rounded-full bg-teal-400/10 blur-[140px] dark:bg-teal-900/15" />
        <div className="absolute bottom-10 left-10 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] rounded-full bg-[#1F4E31]/10 blur-[130px] dark:bg-[#1F4E31]/20" />
      </div>

      {/* Header flotante estilo Apple (Fijo al hacer scroll, optimizado para móvil y desktop) */}
      <header className="fixed top-2.5 sm:top-4 inset-x-0 z-50 px-2.5 sm:px-6 lg:px-8 max-w-6xl mx-auto pointer-events-auto">
        <div className="relative rounded-full border border-white/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl px-3 sm:px-7 py-1.5 sm:py-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex items-center justify-between transition-all duration-200">
          {/* Reflejo especular superior */}
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

          {/* Logotipo oficial con escala responsiva */}
          <Link
            href="/"
            className="group flex items-center justify-start active:scale-95 duration-100 ease-out cursor-pointer shrink-0"
          >
            <div className="relative w-[135px] xs:w-[155px] sm:w-[310px] md:w-[340px] h-9 sm:h-[66px] flex items-center justify-start">
              <img
                src="/logo.svg?v=2"
                alt="aulaEnsuny Logo"
                className="object-contain object-left w-full h-full dark:hidden"
              />
              <img
                src="/logo_dark.svg?v=2"
                alt="aulaEnsuny Logo Dark"
                className="object-contain object-left w-full h-full hidden dark:block"
              />
            </div>
          </Link>

          {/* Enlaces y Acciones */}
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            <Link
              href="/docs"
              className="hidden md:inline-flex items-center text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#1F4E31] dark:hover:text-emerald-400 transition-colors active:scale-95 duration-100"
            >
              Documentación
            </Link>

            {/* Alternador de tema */}
            <button
              onClick={toggleTheme}
              type="button"
              className="rounded-full p-2 sm:p-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-white/10 active:scale-90 duration-100 ease-out cursor-pointer shrink-0"
              title="Cambiar tema"
              aria-label="Cambiar tema"
            >
              {isDark ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </button>

            {/* Botón CTA Header anti-desbordamiento */}
            <Link href="/login" className="shrink-0">
              <Button className="rounded-full bg-[#1F4E31] hover:bg-[#183e27] text-white font-semibold text-[11px] sm:text-sm px-3 sm:px-6 h-8 sm:h-10 whitespace-nowrap shadow-sm shadow-emerald-950/20 active:scale-[0.96] duration-100 ease-out dark:bg-emerald-600 dark:hover:bg-emerald-700 cursor-pointer">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-32 pb-20">
        {/* ── Sección Hero ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center mb-24 sm:mb-28">
          {/* Columna Izquierda: Mensaje y Llamada a la Acción */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220, mass: 0.9 }}
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
          >
            {/* Pill Chip Apple */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#1F4E31] dark:text-emerald-300 text-xs font-semibold tracking-wide backdrop-blur-md shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Plataforma Educativa Oficial ENSUNY</span>
            </div>

            {/* Titular Principal Display */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-[-0.03em] leading-[1.08] text-slate-900 dark:text-white">
              Aprender, gestionar y crecer en{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-[#1F4E31] to-teal-700 dark:from-emerald-400 dark:via-emerald-300 dark:to-teal-400 bg-clip-text text-transparent">
                un solo lugar.
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-lg mx-auto lg:mx-0 leading-relaxed font-normal">
              Ecosistema escolar diseñado para la Escuela Normal Superior del Nordeste. Seguimiento de notas, gestión académica y acceso directo a lecciones.
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto rounded-2xl bg-[#1F4E31] hover:bg-[#183e27] text-white font-semibold text-sm px-6 h-12 shadow-sm shadow-emerald-950/20 active:scale-[0.98] duration-100 ease-out dark:bg-emerald-600 dark:hover:bg-emerald-700 cursor-pointer flex items-center justify-center gap-2">
                  <span>Acceder a mi cuenta</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register/student" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto rounded-2xl border-slate-200/90 dark:border-white/10 bg-white/70 hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold text-sm px-6 h-12 backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] active:scale-[0.98] duration-100 ease-out cursor-pointer"
                >
                  Registro de estudiantes
                </Button>
              </Link>
            </div>

            {/* Garantías o Micro-detalles */}
            <div className="pt-2 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Seguridad institucional
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Acreditación ENSUNY
              </span>
            </div>
          </motion.div>

          {/* Columna Derecha: Mockup Vidrio Multicapa (Apple Glass Preview) */}
          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220, mass: 0.9, delay: 0.1 }}
            className="lg:col-span-6 flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[480px] rounded-[32px] border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl overflow-hidden">
              {/* Línea de luz especular superior */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

              {/* Cabecera del mockup */}
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="text-[11px] text-slate-400 font-medium ml-2">Panel del Estudiante</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  En línea
                </span>
              </div>

              {/* Cuerpo del Mockup */}
              <div className="space-y-3.5">
                {/* Perfil del estudiante */}
                <div className="flex items-center justify-between bg-slate-100/60 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-[#1F4E31] flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-emerald-950/20">
                      AM
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">García Ana María</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Grado 11° - Grupo 1</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-xs border border-slate-200/60 dark:border-white/10">
                    Periodo II
                  </span>
                </div>

                {/* Barra de progreso de materia */}
                <div className="bg-slate-100/60 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Física General & Mecánica</span>
                    <span className="font-bold text-[#1F4E31] dark:text-emerald-400">88%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-[#1F4E31] rounded-full w-[88%]" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Módulo 4 de 5 completado</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Al día</span>
                  </div>
                </div>

                {/* Tarjetas métricas rápidas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-100/60 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                      Promedio
                    </span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">4.8 / 5.0</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                      Desempeño Superior
                    </span>
                  </div>
                  <div className="bg-slate-100/60 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                      Asistencia
                    </span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">99.2%</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                      0 fallas sin justificar
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Sección Bento Grid de Funcionalidades ── */}
        <section className="mb-24 sm:mb-28">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-semibold">
              <Layers className="h-3.5 w-3.5" />
              <span>Herramientas del Ecosistema</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Diseñado para la excelencia escolar
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              aulaEnsuny combina simplicidad técnica, alta disponibilidad y una experiencia fluida para toda la comunidad académica.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6"
          >
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div key={i} variants={itemVariants}>
                  <div className="group relative rounded-[28px] border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.06)] dark:shadow-none dark:hover:border-white/20 transition-all duration-300 hover:-translate-y-1 overflow-hidden h-full flex flex-col justify-between">
                    {/* Reflejo especular superior */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${feature.iconBg}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {feature.badge}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center text-xs font-semibold text-[#1F4E31] dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform duration-150">
                      <span>Explorar módulo</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* ── Sección Documentación Pública (Glass Banner) ── */}
        <section className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="relative rounded-[32px] bg-gradient-to-br from-[#1F4E31] via-[#163a24] to-[#0f2819] p-8 sm:p-12 text-center text-white overflow-hidden shadow-[0_25px_50px_rgba(31,78,49,0.25)] border border-emerald-500/20"
          >
            {/* Iluminación volumétrica ambiental interna */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-1/4 w-[350px] h-[350px] rounded-full bg-emerald-400/20 blur-[90px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 border border-white/15 text-xs font-semibold backdrop-blur-md">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                <span>Consulta Abierta a la Comunidad</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Repositorio de Documentación Institucional
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed max-w-xl mx-auto font-normal">
                ¿Necesitas acceder a manuales, reglamentos o circulares oficiales? Ingresa directamente al Centro de Documentación de forma abierta y sin iniciar sesión.
              </p>

              <div className="pt-3">
                <Link href="/docs">
                  <Button className="rounded-2xl bg-white hover:bg-slate-100 text-[#1F4E31] font-bold text-sm px-6 h-11 transition-all shadow-md active:scale-[0.98] duration-100 ease-out cursor-pointer inline-flex items-center gap-2">
                    <span>Ver Documentación Pública</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer minimalista Apple */}
      <footer className="relative z-10 border-t border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Institución Educativa Escuela Normal Superior del Nordeste — ENSUNY
          </p>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link href="/login" className="hover:text-[#1F4E31] dark:hover:text-emerald-400 transition-colors">
              Iniciar Sesión
            </Link>
            <Link href="/register/student" className="hover:text-[#1F4E31] dark:hover:text-emerald-400 transition-colors">
              Registro de Estudiantes
            </Link>
            <Link href="/docs" className="hover:text-[#1F4E31] dark:hover:text-emerald-400 transition-colors">
              Documentos Oficiales
            </Link>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            &copy; {new Date().getFullYear()} aulaEnsuny. Todos los derechos reservados.<br />
            <a
              href="https://www.ensuny.edu.co"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block font-medium text-slate-500 hover:text-[#1F4E31] dark:text-slate-400 dark:hover:text-emerald-400 transition-colors hover:underline"
            >
              www.ensuny.edu.co
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
