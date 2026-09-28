'use client'

import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion, Variants } from 'framer-motion'
import Link from 'next/link'
import { TrendingUp, CalendarDays, ShieldAlert, Activity, BookOpen, ChevronRight, Settings } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { StudentVirtualCourseModal } from '../components/StudentVirtualCourseModal'
import { getStudentEmailStatus } from '../../application/studentEmailActions'

import { useUserSessionStore } from '@/store/useUserSessionStore'

interface StudentInfo { name: string; group: string; gradeLevel: string; jornada: string; academicYear: string; avatarInitials: string }

interface ModuleCard { id: string; title: string; description: string; href: string; icon: React.ElementType; bgColor: string; iconColor: string; borderColor: string }

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0]?.[0]?.toUpperCase() ?? 'E'
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function StudentPortalScreen() {
  const shouldReduceMotion = useReducedMotion()
  const sessionUser = useUserSessionStore(state => state.user)
  const initSession = useUserSessionStore(state => state.initSession)

  const [info, setInfo] = useState<StudentInfo>(() => ({
    name: sessionUser?.name || 'Estudiante',
    group: sessionUser?.group || '-',
    gradeLevel: sessionUser?.grade || '-',
    jornada: 'Mañana',
    academicYear: new Date().getFullYear().toString(),
    avatarInitials: getInitials(sessionUser?.name || 'E')
  }))
  const [hasCourses, setHasCourses] = useState(false)
  const [hasEmail, setHasEmail] = useState(false)
  const [isVirtualModalOpen, setIsVirtualModalOpen] = useState(false)
  // Si ya tenemos sesión precacheada, no bloquear la pantalla con skeleton
  const [loading, setLoading] = useState(!sessionUser)

  useEffect(() => {
    async function load() {
      try {
        const demo = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
        if (demo) {
          const gc = (n: string) => { const v = '; ' + document.cookie; const p = v.split('; ' + n + '='); if (p.length === 2) return p.pop()?.split(';').shift(); return null }
          const ck = gc('aulaensuny-demo-session')
          if (ck) {
            const s = JSON.parse(decodeURIComponent(ck))
            const full = ((s.first_name||'') + ' ' + (s.last_name||'')).trim()
            setInfo({ name: full||'Estudiante', group: 'Demo 10-A', gradeLevel: s.grade_level||'10', jornada: 'Mañana', academicYear: new Date().getFullYear().toString(), avatarInitials: getInitials(full||'E') })
            setHasCourses(true)
            setHasEmail(true)
          }
          setLoading(false)
          return
        }

        // Obtener usuario del store o inicializarlo si aún no está
        let currentUser = sessionUser
        if (!currentUser) {
          currentUser = await initSession()
        }

        if (!currentUser) {
          setLoading(false)
          return
        }

        const supabase = createClient()
        const userId = currentUser.id

        // Ejecutar consultas en PARALELO para evitar efecto cascada
        const [enrollmentRes, coursesRes, emailStatusRes] = await Promise.allSettled([
          supabase
            .from('student_enrollments')
            .select('jornada, group_name, grade_level, academic_year')
            .eq('student_id', userId)
            .eq('enrollment_status', 'active')
            .order('academic_year', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('student_courses')
            .select('id')
            .eq('student_id', userId)
            .limit(1),
          getStudentEmailStatus()
        ])

        let name = currentUser.name || 'Estudiante'
        let group = currentUser.group || '-'
        let gradeLevel = currentUser.grade || '-'
        let jornada = 'Mañana'
        let academicYear = new Date().getFullYear().toString()

        if (enrollmentRes.status === 'fulfilled' && enrollmentRes.value.data) {
          const en = enrollmentRes.value.data
          if (en.jornada) jornada = en.jornada
          if (en.group_name) group = en.group_name
          if (en.grade_level) gradeLevel = en.grade_level
          if (en.academic_year) academicYear = String(en.academic_year)
        }

        if (coursesRes.status === 'fulfilled' && coursesRes.value.data) {
          setHasCourses(coursesRes.value.data.length > 0)
        }

        if (emailStatusRes.status === 'fulfilled' && emailStatusRes.value) {
          const status = emailStatusRes.value
          if (status.hasCourses) setHasCourses(true)
          if (status.hasEmail) setHasEmail(true)
          if (status.fullName && status.fullName !== 'Estudiante' && name === 'Estudiante') {
            name = status.fullName
          }
        }

        setInfo({ name, group, gradeLevel, jornada, academicYear, avatarInitials: getInitials(name) })
      } catch (e) {
        console.error('Error cargando portal estudiante:', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [sessionUser, initSession])

  const BASE: ModuleCard[] = [
    { id: 'grades', title: 'Calificaciones', description: 'Resultados por periodo, área y competencia.', href: '/student/grades', icon: TrendingUp, bgColor: 'bg-emerald-50/80 dark:bg-emerald-950/20', iconColor: 'text-emerald-700 dark:text-emerald-400', borderColor: 'border-emerald-200/60 dark:border-emerald-800/40' },
    { id: 'schedule', title: 'Mi Horario', description: 'Clases según tu grupo y matrícula activa.', href: '/student/schedule', icon: CalendarDays, bgColor: 'bg-blue-50/80 dark:bg-blue-950/20', iconColor: 'text-blue-700 dark:text-blue-400', borderColor: 'border-blue-200/60 dark:border-blue-800/40' },
    { id: 'disciplinary', title: 'Convivencia', description: 'Seguimiento institucional de convivencia escolar.', href: '/student/disciplinary', icon: ShieldAlert, bgColor: 'bg-violet-50/80 dark:bg-violet-950/20', iconColor: 'text-violet-700 dark:text-violet-400', borderColor: 'border-violet-200/60 dark:border-violet-800/40' },
    { id: 'attendance', title: 'Asistencia Escolar', description: 'Asistencias, ausencias y porcentajes por periodo.', href: '/student/attendance', icon: Activity, bgColor: 'bg-sky-50/80 dark:bg-sky-950/20', iconColor: 'text-sky-700 dark:text-sky-400', borderColor: 'border-sky-200/60 dark:border-sky-800/40' },
  ]
  const VIRTUAL: ModuleCard = { id: 'courses', title: 'Campus Virtual', description: 'Cursos, contenidos y actividades en línea.', href: '/student/courses', icon: BookOpen, bgColor: 'bg-teal-50/80 dark:bg-teal-950/20', iconColor: 'text-teal-700 dark:text-teal-400', borderColor: 'border-teal-200/60 dark:border-teal-800/40' }
  const modules = [...BASE, VIRTUAL]

  const cv: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06, delayChildren: 0.05 } } }
  const iv: Variants = { hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 260 } } }

  if (loading) {
    return (
      <div className='w-[90%] sm:w-full max-w-4xl mx-auto py-5 sm:py-6 space-y-5 px-0 sm:px-4'>
        <div className='rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-900 to-emerald-950 h-32 sm:h-36 animate-pulse' />
        <div className='grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4'>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className='rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 h-32 sm:h-36 animate-pulse' />
          ))}
        </div>
      </div>
    )
  }

  const { name, group, gradeLevel, jornada, academicYear, avatarInitials } = info
  const chips = [
    (gradeLevel && gradeLevel !== '-') ? 'Grado ' + gradeLevel : null,
    (group && group !== '-') ? 'Grupo ' + group : null,
    jornada ? 'Jornada ' + jornada : null,
    academicYear ? 'Año ' + academicYear : null
  ].filter(Boolean) as string[]

  return (
    <div className='w-[90%] sm:w-full max-w-4xl mx-auto py-5 sm:py-6 space-y-5 sm:space-y-6 px-0 sm:px-4'>
      {/* Banner de Bienvenida Institucional */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className='relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#1F4E31] via-[#163a24] to-[#0f2819] p-4.5 sm:p-7 text-white shadow-[0_8px_32px_rgba(31,78,49,0.22)] border border-emerald-600/20'
      >
        <div className='pointer-events-none absolute top-0 right-0 w-48 sm:w-56 h-48 sm:h-56 rounded-full bg-emerald-400/10 blur-3xl' />
        <div className='pointer-events-none absolute bottom-0 left-6 sm:left-8 w-32 sm:w-40 h-32 sm:h-40 rounded-full bg-teal-400/10 blur-2xl' />
        
        {/* Botón de Configuración de Cuenta (Engranaje) Reubicado arriba a la derecha */}
        <Link
          href='/student/settings'
          className='absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 flex items-center justify-center text-white transition-all duration-200 shadow-sm backdrop-blur-xs'
          title='Configuración de Cuenta'
          aria-label='Configuración de Cuenta'
        >
          <Settings className='h-4.5 w-4.5 sm:h-5.5 sm:w-5.5' />
        </Link>

        <div className='relative z-10 flex items-start gap-3 sm:gap-4 pr-11 sm:pr-14'>
          <div className='h-11 w-11 sm:h-14 sm:w-14 shrink-0 rounded-xl sm:rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-base sm:text-xl font-black shadow-inner mt-0.5 sm:mt-0'>
            {avatarInitials}
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-emerald-200/80 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-0.5'>
              {getGreeting()}
            </p>
            <h1 className='text-base sm:text-2xl font-black text-white tracking-tight leading-snug sm:leading-tight break-words'>
              {name}
            </h1>
          </div>
        </div>

        <div className='relative z-10 mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2'>
          {chips.map((l, i) => (
            <span
              key={i}
              className='inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-white/10 border border-white/15 text-[10px] sm:text-[11px] font-semibold text-emerald-100 tracking-wide'
            >
              {l}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Título de Sección */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <h2 className='text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2.5 sm:mb-4'>
          Consulta tu información institucional
        </h2>
      </motion.div>

      {/* Grid de Módulos (2 columnas en móvil, 3 columnas en escritorio) */}
      <motion.div
        variants={cv}
        initial='hidden'
        animate='show'
        className='grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5'
      >
        {modules.map(mod => {
          const Icon = mod.icon
          const isCourses = mod.id === 'courses'

          return (
            <motion.div key={mod.id} variants={iv}>
              <Link 
                href={mod.href} 
                onClick={(e) => {
                  if (isCourses && !hasEmail) {
                    e.preventDefault()
                    setIsVirtualModalOpen(true)
                  }
                }}
                className='group block h-full'
              >
                <div
                  className={[
                    'relative h-full rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border',
                    mod.borderColor,
                    'shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 hover:-translate-y-0.5',
                    'p-3.5 sm:p-5 flex flex-col justify-between overflow-hidden cursor-pointer'
                  ].join(' ')}
                >
                  <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent' />
                  
                  <div className='flex items-start justify-between mb-2.5 sm:mb-3'>
                    <div
                      className={[
                        'h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl',
                        mod.bgColor,
                        'border',
                        mod.borderColor,
                        'flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0'
                      ].join(' ')}
                    >
                      <Icon className={'h-4.5 w-4.5 sm:h-5 sm:w-5 ' + mod.iconColor} />
                    </div>
                    {isCourses && (
                      hasCourses ? (
                        <span className='inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 text-[9px] sm:text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wide'>
                          Activo
                        </span>
                      ) : hasEmail ? (
                        <span className='inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide'>
                          Sin Curso
                        </span>
                      ) : (
                        <span className='inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-[9px] sm:text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide'>
                          Vincular Correo
                        </span>
                      )
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <h3 className='text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-1 line-clamp-1'>
                      {mod.title}
                    </h3>
                    <p className='text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug sm:leading-relaxed line-clamp-2'>
                      {mod.description}
                    </p>
                  </div>

                  <div className='mt-3 sm:mt-4 flex items-center justify-end'>
                    <span
                      className={[
                        'inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-[11px] font-bold',
                        mod.iconColor,
                        'opacity-80 group-hover:opacity-100 transition-all duration-200 translate-x-0 sm:translate-x-1 sm:group-hover:translate-x-0'
                      ].join(' ')}
                    >
                      <span>
                        {isCourses
                          ? (hasEmail ? 'Entrar' : 'Vincular')
                          : 'Ver'}
                      </span>
                      <ChevronRight className='h-3 w-3 sm:h-3.5 sm:w-3.5' />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Pie sutil */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className='pt-1 pb-4 text-center'>
        <p className='text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium'>
          Escuela Normal Superior del Nordeste &middot; aulaEnsuny
        </p>
      </motion.div>

      {/* Modal / Bottom Sheet de Requisitos de Campus Virtual */}
      <StudentVirtualCourseModal
        isOpen={isVirtualModalOpen}
        onClose={() => setIsVirtualModalOpen(false)}
        onEmailUpdated={(_newMail) => {
          setHasEmail(true)
        }}
      />
    </div>
  )
}

