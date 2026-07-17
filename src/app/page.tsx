'use client'

import React, { useEffect, useState } from 'react'
import { motion, Variants } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen, TrendingUp, Calendar, FileText, ArrowRight, CheckCircle2,
  Moon, Sun, GraduationCap, ArrowUpRight, ShieldAlert, Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const savedTheme = window.localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    root.classList.toggle('dark', shouldUseDark)
    setIsDark(shouldUseDark)
  }, [])

  const toggleTheme = () => {
    const nextDark = !isDark
    const root = document.documentElement
    root.classList.toggle('dark', nextDark)
    window.localStorage.setItem('theme', nextDark ? 'dark' : 'light')
    setIsDark(nextDark)
  }

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 25 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 15 } }
  }

  const features = [
    {
      icon: BookOpen,
      title: 'Mis Cursos Académicos',
      description: 'Accede a tus asignaturas asignadas, visualiza las lecciones, los módulos temáticos y descarga recursos de estudio en PDF directamente desde Google Drive.',
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
    },
    {
      icon: TrendingUp,
      title: 'Monitoreo de Calificaciones',
      description: 'Consulta tus notas en tiempo real organizadas por periodos. Sistema intuitivo para estudiantes y control total sobre el libro de calificaciones para docentes.',
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
    },
    {
      icon: FileText,
      title: 'Centro de Documentación',
      description: 'Repositorio oficial para circulares, manuales académicos y guías institucionales. Acceso público para padres y estudiantes de forma rápida.',
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400'
    },
    {
      icon: Calendar,
      title: 'Calendario y Agenda Integrada',
      description: 'Mantente al día con los eventos del colegio, fechas límites de trabajos escolares, exámenes y comunicados importantes programados por los docentes.',
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
    }
  ]

  return (
    <div className="relative min-h-screen w-full bg-[#f8f9fa] dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-35 dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-emerald-400/10 blur-[100px] dark:bg-emerald-900/20" />
        <div className="absolute top-[30%] right-[-10%] w-[400px] sm:w-[700px] h-[400px] sm:h-[700px] rounded-full bg-blue-400/10 blur-[120px] dark:bg-blue-900/15" />
        <div className="absolute bottom-[-10%] left-[20%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-[#1F4E31]/10 blur-[100px] dark:bg-[#1F4E31]/15" />
      </div>

      {/* Header/Navbar */}
      <header className="relative z-10 w-full border-b border-slate-200/50 bg-white/75 backdrop-blur-md dark:border-slate-800/50 dark:bg-slate-950/75">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-[#1F4E31] flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-none">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              aulaEnsuny
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/docs"
              className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#1F4E31] dark:hover:text-[#4AB874] transition-colors"
            >
              Documentación pública
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-full p-2.5 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
              title="Cambiar tema"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <Link href="/login">
              <Button className="rounded-xl bg-[#1F4E31] hover:bg-[#153823] text-white font-semibold text-xs px-4 py-2 transition-all duration-200 dark:bg-[#2A6B43] dark:hover:bg-[#1F4E31]">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-20">

        {/* Section Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[#1F4E31] text-[11px] font-semibold tracking-wide dark:bg-emerald-950/30 dark:border-emerald-900/30 dark:text-[#4AB874] mx-auto lg:mx-0">
              <Sparkles className="h-3 w-3" />
              <span>Plataforma Educativa Oficial</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.1] text-slate-900 dark:text-white">
              aula<span className="text-[#1F4E31] dark:text-[#4AB874] bg-gradient-to-r from-emerald-600 to-[#1F4E31] bg-clip-text text-transparent dark:from-[#4AB874] dark:to-emerald-500">Ensuny</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Ecosistema digital diseñado para la Institución Educativa Escuela Normal Superior del Nordeste - ENSUNY
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto rounded-xl bg-[#1F4E31] hover:bg-[#153823] text-white font-semibold text-sm px-6 h-12 transition-all duration-200 dark:bg-[#2A6B43] dark:hover:bg-[#1F4E31] shadow-lg shadow-emerald-100 dark:shadow-none">
                  Acceder a mi cuenta <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register/student" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-6 h-12 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                  Registro de estudiantes
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Premium Glass Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="lg:col-span-6 flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[500px] aspect-[4/3] rounded-3xl border border-slate-200/50 bg-white/60 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-slate-800/50 dark:bg-slate-900/60 dark:shadow-none">
              <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4 shrink-0">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="text-[10px] text-slate-400 font-mono ml-2">dashboard_mockup.html</span>
              </div>

              <div className="space-y-4">
                {/* Header mock */}
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                      AG
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">García Ana María</p>
                      <p className="text-[9px] text-slate-400">Grado 11° - Grupo 1</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                    Estudiante Activo
                  </span>
                </div>

                {/* Progress bar mock */}
                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Progreso de Física General</span>
                    <span className="font-bold text-[#1F4E31] dark:text-[#4AB874]">82% Completado</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full w-[82%]" />
                  </div>
                </div>

                {/* Grid items mock */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl space-y-1">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wide">Promedio</span>
                    <span className="text-base font-extrabold text-slate-800 dark:text-slate-200">4.7 / 5.0</span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block">Excelente rendimiento</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl space-y-1">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wide">Entregas Hoy</span>
                    <span className="text-base font-extrabold text-slate-800 dark:text-slate-200">0 Pendientes</span>
                    <span className="text-[9px] text-slate-400 block">¡Al día con las tareas!</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Section: Features Grid */}
        <section className="mb-28">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Diseñado para la excelencia escolar
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              aulaEnsuny combina simplicidad técnica con herramientas de alta fidelidad académica.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div key={i} variants={itemVariants}>
                  <Card className="border-0 bg-white/50 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 dark:bg-slate-900/60 dark:shadow-none rounded-2xl overflow-hidden h-full">
                    <CardContent className="p-6 sm:p-8 flex gap-5">
                      <div className={`h-12 w-12 rounded-xl shrink-0 flex items-center justify-center ${feature.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* Section: Documentación Pública */}
        <section className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-gradient-to-br from-emerald-800 to-[#153823] p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-xl"
          >
            {/* Overlay Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-5 pointer-events-none" />
            <div className="absolute top-[-50%] left-[-20%] w-[400px] h-[400px] rounded-full bg-emerald-500/20 blur-[80px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-5">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Repositorio de Documentación Institucional
              </h2>
              <p className="text-sm text-emerald-100/80 leading-relaxed">
                ¿Necesitas acceder a manuales, circulares o reglamentos oficiales? Puedes ingresar al Centro de Documentación de forma pública, sin necesidad de iniciar sesión en la plataforma.
              </p>
              <div className="pt-4">
                <Link href="/docs">
                  <Button className="rounded-xl bg-white hover:bg-slate-100 text-[#1F4E31] font-bold text-sm px-6 h-12 transition-all shadow-md">
                    Ver Documentación Pública <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/50 bg-white/50 dark:border-slate-800/50 dark:bg-slate-950/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <span className="text-base font-bold text-slate-900 dark:text-white">
              Institución Educativa Escuela Normal Superior del Nordeste - ENSUNY LMS
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/login" className="hover:text-[#1F4E31] dark:hover:text-[#4AB874] transition-colors">Iniciar Sesión</Link>
            <Link href="/register/student" className="hover:text-[#1F4E31] dark:hover:text-[#4AB874] transition-colors">Registro de Estudiantes</Link>
            <Link href="/docs" className="hover:text-[#1F4E31] dark:hover:text-[#4AB874] transition-colors">Documentos Oficiales</Link>
          </div>

          <p className="text-xs text-slate-400 leading-normal">
            &copy; {new Date().getFullYear()} aulaEnsuny. Todos los derechos reservados.<br />
            <a
              href="https://www.ensuny.edu.co"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-semibold text-slate-500 hover:text-[#1F4E31] dark:text-slate-400 dark:hover:text-[#4AB874] transition-colors hover:underline"
            >
              www.ensuny.edu.co
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
