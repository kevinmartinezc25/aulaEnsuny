'use client'

import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion, Variants } from 'framer-motion'
import Link from 'next/link'
import { TrendingUp, CalendarDays, ShieldAlert, Activity, BookOpen, ChevronRight, Settings, Clock, Users, Sparkles } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { StudentVirtualCourseModal } from '../components/StudentVirtualCourseModal'
import { getStudentEmailStatus } from '../../application/studentEmailActions'
import { getStudentDashboardSchedule } from '../../application/scheduleActions'
import { getColombianHoliday, type ColombianHoliday } from '@/lib/colombianHolidays'

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

function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null
  const clean = timeStr.trim().toUpperCase()
  if (!clean.includes(':')) return null

  const isPM = clean.includes('PM')
  const isAM = clean.includes('AM')
  const timeOnly = clean.replace(/[AP]M/, '').trim()
  const [hStr, mStr] = timeOnly.split(':')
  let hours = parseInt(hStr, 10)
  const minutes = parseInt(mStr, 10)

  if (isNaN(hours) || isNaN(minutes)) return null

  if (isPM && hours < 12) hours += 12
  if (isAM && hours === 12) hours = 0

  return hours * 60 + minutes
}

function getBogotaDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
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

  // Sincronizar de inmediato si cambia el sessionUser en el store
  useEffect(() => {
    if (sessionUser?.name && sessionUser.name !== 'Estudiante') {
      setInfo(prev => ({
        ...prev,
        name: sessionUser.name,
        group: sessionUser.group || prev.group,
        gradeLevel: sessionUser.grade || prev.gradeLevel,
        avatarInitials: getInitials(sessionUser.name)
      }))
    }
  }, [sessionUser])

  const [hasCourses, setHasCourses] = useState(false)
  const [hasEmail, setHasEmail] = useState(false)
  const [isVirtualModalOpen, setIsVirtualModalOpen] = useState(false)
  // Schedule state
  const [todaySchedule, setTodaySchedule] = useState<any[]>([])
  const [isWeekend, setIsWeekend] = useState(() => {
    const d = getBogotaDate().getDay()
    return d === 0 || d === 6
  })
  const [dayOfWeekNumber, setDayOfWeekNumber] = useState<number>(() => getBogotaDate().getDay())
  const [colombianHoliday, setColombianHoliday] = useState<ColombianHoliday | null>(() => getColombianHoliday(getBogotaDate()))
  const [currentClass, setCurrentClass] = useState<any | null>(null)
  const [nextClass, setNextClass] = useState<any | null>(null)
  const [completedClasses, setCompletedClasses] = useState(0)
  const [totalClasses, setTotalClasses] = useState(0)

  // Función para evaluar clase en curso y siguiente clase a partir del horario
  const evaluateSchedule = React.useCallback((slots: any[]) => {
    if (!slots || slots.length === 0) {
      return { updatedSlots: [], curr: null, next: null, completed: 0, total: 0 }
    }

    const bogotaNow = getBogotaDate()
    const currentMinutes = bogotaNow.getHours() * 60 + bogotaNow.getMinutes()
    let curr: any = null
    let next: any = null
    let completed = 0

    const updatedSlots = slots.map((cls) => {
      let isOngoing = false
      const startMins = parseTimeToMinutes(cls.startTime)
      let endMins = parseTimeToMinutes(cls.endTime)

      if (startMins !== null) {
        if (endMins === null || endMins <= startMins) {
          endMins = startMins + 55
        }

        isOngoing = currentMinutes >= startMins && currentMinutes < endMins

        if (currentMinutes >= endMins && !cls.isFree) {
          completed++
        }

        if (isOngoing && !cls.isFree && !curr) {
          const duration = Math.max(1, endMins - startMins)
          const elapsed = Math.max(0, currentMinutes - startMins)
          const remaining = Math.max(0, endMins - currentMinutes)
          const progress = Math.min(100, Math.round((elapsed / duration) * 100))
          curr = { ...cls, isOngoing: true, startMins, endMins, duration, elapsed, remaining, progress }
        }
      }

      return { ...cls, isCurrent: isOngoing, startMins, endMins }
    })

    // Buscar la siguiente clase no libre posterior a la clase actual o al momento actual
    for (const cls of updatedSlots) {
      if (!cls.isFree) {
        const startMins = cls.startMins !== undefined && cls.startMins !== null
          ? cls.startMins
          : parseTimeToMinutes(cls.startTime)

        if (startMins === null) continue

        if (curr) {
          const clsPeriod = parseInt(cls.period, 10) || 0
          const currPeriod = parseInt(curr.period, 10) || 0
          if (clsPeriod > currPeriod && cls.id !== curr.id && startMins >= (curr.endMins || 0)) {
            next = cls
            break
          }
        } else {
          if (startMins > currentMinutes) {
            next = cls
            break
          }
        }
      }
    }

    if (next && curr && (next.id === curr.id || next.period === curr.period)) {
      next = null
    }

    const total = updatedSlots.filter((s: any) => !s.isFree).length

    return { updatedSlots, curr, next, completed, total }
  }, [])

  useEffect(() => {
    if (todaySchedule.length === 0 || isWeekend || colombianHoliday) return
    const timer = setInterval(() => {
      const res = evaluateSchedule(todaySchedule)
      setTodaySchedule(res.updatedSlots)
      setCurrentClass(res.curr)
      setNextClass(res.next)
      setCompletedClasses(res.completed)
    }, 60000)
    return () => clearInterval(timer)
  }, [todaySchedule, evaluateSchedule, isWeekend, colombianHoliday])

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
            const full = ((s.first_name || '') + ' ' + (s.last_name || '')).trim()
            setInfo({ name: full || 'Estudiante', group: 'Demo 10-A', gradeLevel: s.grade_level || '10', jornada: 'Mañana', academicYear: new Date().getFullYear().toString(), avatarInitials: getInitials(full || 'E') })
            setHasCourses(true)
            setHasEmail(true)
          }
          const bogotaDate = getBogotaDate()
          const dow = bogotaDate.getDay()
          setDayOfWeekNumber(dow)
          setIsWeekend(dow === 0 || dow === 6)
          setColombianHoliday(getColombianHoliday(bogotaDate))
          setLoading(false)
          return
        }

        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
          setLoading(false)
          return
        }

        // Actualización inmediata con los metadatos de la sesión activa
        const metaFirst = authUser.user_metadata?.first_name || ''
        const metaLast = authUser.user_metadata?.last_name || ''
        const metaName = (metaFirst + ' ' + metaLast).trim()
        if (metaName) {
          setInfo(prev => ({
            ...prev,
            name: metaName,
            group: authUser.user_metadata?.group_name || prev.group,
            gradeLevel: authUser.user_metadata?.grade_level || prev.gradeLevel,
            avatarInitials: getInitials(metaName)
          }))
        }

        // Sincronizar usuario con el store si cambió de cuenta
        let currentUser = sessionUser
        if (!currentUser || currentUser.id !== authUser.id) {
          currentUser = await initSession(true)
        }

        const userId = authUser.id

        // Ejecutar consultas en PARALELO para evitar efecto cascada
        const [enrollmentRes, coursesRes, emailStatusRes, scheduleRes] = await Promise.allSettled([
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
          getStudentEmailStatus(),
          getStudentDashboardSchedule()
        ])

        let name = currentUser?.name || metaName || 'Estudiante'
        let group = currentUser?.group || authUser.user_metadata?.group_name || '-'
        let gradeLevel = currentUser?.grade || authUser.user_metadata?.grade_level || '-'
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
          if (status.fullName && status.fullName !== 'Estudiante') {
            name = status.fullName
          }
        }

        const bogotaDate = getBogotaDate()
        const dow = bogotaDate.getDay() // 0 = Domingo, 1 = Lunes
        setDayOfWeekNumber(dow)
        const isWk = dow === 0 || dow === 6
        setIsWeekend(isWk)
        const holiday = getColombianHoliday(bogotaDate)
        setColombianHoliday(holiday)

        let dayKey: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | null = null
        if (dow === 1) dayKey = 'lunes'
        else if (dow === 2) dayKey = 'martes'
        else if (dow === 3) dayKey = 'miercoles'
        else if (dow === 4) dayKey = 'jueves'
        else if (dow === 5) dayKey = 'viernes'

        if (!isWk && !holiday && dayKey && scheduleRes.status === 'fulfilled' && scheduleRes.value.success && scheduleRes.value.schedule) {
          const todayArr = scheduleRes.value.schedule[dayKey] || []
          const res = evaluateSchedule(todayArr)
          setTodaySchedule(res.updatedSlots)
          setCurrentClass(res.curr)
          setNextClass(res.next)
          setCompletedClasses(res.completed)
          setTotalClasses(res.total)
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
        className='relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#0D5F4E] dark:bg-slate-900 p-4.5 sm:p-7 shadow-sm border border-[#0a4639] dark:border-slate-800'
      >
        <div className='pointer-events-none absolute top-0 right-0 w-48 sm:w-56 h-48 sm:h-56 rounded-full bg-white/10 dark:bg-slate-800/50 blur-3xl' />
        <div className='pointer-events-none absolute bottom-0 left-6 sm:left-8 w-32 sm:w-40 h-32 sm:h-40 rounded-full bg-teal-200/10 dark:bg-slate-800/30 blur-2xl' />

        <Link
          href='/student/settings'
          className='absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 border border-white/20 dark:border-slate-700 flex items-center justify-center text-white dark:text-slate-400 transition-all duration-200 shadow-sm'
          title='Configuración de Cuenta'
          aria-label='Configuración de Cuenta'
        >
          <Settings className='h-4.5 w-4.5 sm:h-5.5 sm:w-5.5' />
        </Link>

        <div className='relative z-10 flex items-start gap-3 sm:gap-4 pr-11 sm:pr-14'>
          <div className='h-11 w-11 sm:h-14 sm:w-14 shrink-0 rounded-xl sm:rounded-2xl bg-white/15 dark:bg-slate-800 border border-white/20 dark:border-slate-700 flex items-center justify-center text-base sm:text-xl font-black shadow-inner text-white dark:text-slate-200 mt-0.5 sm:mt-0'>
            {avatarInitials}
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-teal-50 dark:text-slate-400 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-0.5 opacity-90'>
              {getGreeting()}
            </p>
            <h1 className='text-base sm:text-2xl font-black text-white dark:text-white tracking-tight leading-snug sm:leading-tight break-words'>
              {name}
            </h1>
          </div>
        </div>

        <div className='relative z-10 mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2'>
          {chips.map((l, i) => (
            <span
              key={i}
              className='inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-white/10 dark:bg-slate-800 border border-white/15 dark:border-slate-700 text-[10px] sm:text-[11px] font-semibold text-white dark:text-slate-300 tracking-wide'
            >
              {l}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Tarjeta de Horario (Clase Actual / Siguiente / Fin de semana / Festivo) */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220, delay: 0.1 }}
          className={`relative overflow-hidden rounded-2xl sm:rounded-3xl text-white w-full ${
            !isWeekend && !colombianHoliday && totalClasses > 0 && (currentClass || nextClass)
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 border border-emerald-500/40 shadow-[0_8px_32px_rgba(16,185,129,0.22)]'
              : 'bg-gradient-to-r from-blue-600 to-indigo-700 border border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.3)]'
          }`}
        >
          <div className='pointer-events-none absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-60' />

          {(() => {
            // CASO 1: Festivo oficial en Colombia
            if (colombianHoliday) {
              return (
                <div className='relative z-10 p-4.5 sm:p-6'>
                  <div className='space-y-1.5 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/40 text-amber-100 text-[10px] sm:text-[11px] font-extrabold tracking-wide shadow-xs backdrop-blur-md'>
                        <CalendarDays className='h-3 w-3 text-amber-300' />
                        FESTIVO EN COLOMBIA
                      </span>
                    </div>
                    <h2 className='text-base sm:text-xl font-black text-white tracking-tight leading-tight'>
                      Sin clases programadas · {colombianHoliday.name}
                    </h2>
                    <p className='text-xs sm:text-sm text-blue-100 font-medium leading-relaxed max-w-2xl'>
                      Hoy no hay jornada académica por ser día festivo oficial en el calendario nacional. ¡Disfruta de tu descanso!
                    </p>
                  </div>
                </div>
              )
            }

            // CASO 2: Fin de semana (Sábado o Domingo)
            if (isWeekend) {
              const isSaturday = dayOfWeekNumber === 6
              return (
                <div className='relative z-10 p-4.5 sm:p-6'>
                  <div className='space-y-1.5 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] sm:text-[11px] font-extrabold tracking-wide shadow-xs backdrop-blur-md'>
                        <Sparkles className='h-3 w-3 text-amber-300' />
                        {isSaturday ? 'SÁBADO' : 'DOMINGO'} · FIN DE SEMANA
                      </span>
                    </div>
                    <h2 className='text-base sm:text-xl font-black text-white tracking-tight leading-tight'>
                      Sin clases programadas
                    </h2>
                    <p className='text-xs sm:text-sm text-blue-100 font-medium leading-relaxed max-w-2xl'>
                      {isSaturday
                        ? '¡Feliz sábado! Aprovecha el fin de semana para recargar energías, compartir en familia o adelantar repasos.'
                        : '¡Feliz domingo! Prepara tus cuadernos y actividades para iniciar la semana con la mejor energía mañana.'}
                    </p>
                  </div>
                </div>
              )
            }

            // CASO 3: Día de semana ordinario sin clases programadas
            if (totalClasses === 0) {
              return (
                <div className='relative z-10 p-4.5 sm:p-6'>
                  <div className='space-y-1.5 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] sm:text-[11px] font-bold tracking-wide backdrop-blur-md'>
                        <Clock className='h-3 w-3 text-blue-200' />
                        HORARIO ESCOLAR
                      </span>
                    </div>
                    <h2 className='text-base sm:text-xl font-black text-white tracking-tight leading-tight'>
                      Sin clases programadas para hoy
                    </h2>
                    <p className='text-xs sm:text-sm text-blue-100 font-medium leading-relaxed max-w-2xl'>
                      No tienes asignaturas registradas para la jornada de hoy.
                    </p>
                  </div>
                </div>
              )
            }

            // CASO 4: Día de semana con clases programadas
            const isSameClass = nextClass && currentClass && (nextClass.id === currentClass.id || nextClass.period === currentClass.period)
            const effectiveNextClass = isSameClass ? null : nextClass
            const isFinishedDay = !currentClass && !effectiveNextClass && totalClasses > 0

            if (isFinishedDay) {
              return (
                <div className='relative z-10 p-4.5 sm:p-6'>
                  <div className='space-y-1.5 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] sm:text-[11px] font-bold tracking-wide backdrop-blur-md'>
                        <Clock className='h-3 w-3 text-blue-200' />
                        JORNADA FINALIZADA
                      </span>
                    </div>
                    <h2 className='text-base sm:text-xl font-black text-white tracking-tight leading-tight'>
                      No tienes más clases por hoy
                    </h2>
                    <p className='text-xs sm:text-sm text-blue-100 font-medium leading-relaxed max-w-2xl'>
                      Has completado todas las asignaturas de la jornada escolar. ¡Buen trabajo!
                    </p>
                  </div>
                </div>
              )
            }

            return (
              <div className='flex flex-row h-full divide-x divide-emerald-600/30'>
                {/* 70% Izquierda: Clase Actual */}
                <div className='flex-[7] p-3 sm:p-4.5 md:px-6 flex flex-col justify-center'>
                  <div className='flex items-center justify-between gap-2 mb-1.5'>
                    {currentClass ? (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-extrabold tracking-wide ${currentClass.isNovedad ? 'bg-amber-950/50 border-amber-500/50 text-amber-200' : 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200'}`}>
                        {currentClass.isNovedad ? (
                          <>
                            <ShieldAlert className='h-3 w-3 text-amber-400' />
                            NOVEDAD ({currentClass.period}ª)
                          </>
                        ) : (
                          <>
                            <span className='relative flex h-1.5 w-1.5'>
                              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                              <span className='relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500'></span>
                            </span>
                            EN CURSO ({currentClass.period}ª)
                          </>
                        )}
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/40 border border-slate-600/30 text-slate-300 text-[9px] sm:text-[10px] font-bold tracking-wide'>
                        <Clock className='h-2.5 w-2.5 text-slate-400' />
                        SIN CLASE
                      </span>
                    )}
                    {currentClass?.remaining !== undefined && currentClass.remaining > 0 && (
                      <span className='hidden sm:inline-flex text-[9px] sm:text-[10px] font-semibold text-emerald-100 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10'>
                        Quedan ~{currentClass.remaining} min
                      </span>
                    )}
                  </div>

                  {currentClass ? (
                    <div className='space-y-0.5'>
                      <h2 className='text-sm sm:text-lg md:text-xl font-black text-white leading-tight line-clamp-1'>
                        {currentClass.subject}
                      </h2>
                      <div className='flex flex-wrap items-center gap-1.5 text-[9px] sm:text-[11px] text-emerald-200/80 font-medium'>
                        <span className='inline-flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5'>
                          <Users className='h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-300/80' />
                          {currentClass.teacher?.split(' ')[0] || 'Autónomo'}
                        </span>
                        <span className='inline-flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5'>
                          <Clock className='h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-300/80' />
                          {currentClass.startTime} - {currentClass.endTime}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className='text-sm sm:text-lg md:text-xl font-bold tracking-tight text-white leading-tight'>
                        Tiempo de Receso o Libre
                      </h2>
                      <p className='text-[9px] sm:text-xs text-emerald-200/70 font-medium mt-0.5 hidden sm:block'>
                        Aprovecha para repasar. Consulta tu próxima clase a la derecha.
                      </p>
                    </div>
                  )}

                  {currentClass && currentClass.progress !== undefined && (
                    <div className='mt-2'>
                      <div className='w-full bg-black/20 rounded-full h-1 overflow-hidden'>
                        <div className='bg-emerald-400 h-1 rounded-full transition-all duration-500 ease-out' style={{ width: `${currentClass.progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 30% Derecha: Próxima Clase */}
                <div className='flex-[3] p-3 sm:p-4.5 md:px-5 bg-gradient-to-r from-blue-600 to-indigo-700 flex flex-col justify-center'>
                  <div className='mb-1 flex items-center justify-between gap-1'>
                    <span className={`inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider ${effectiveNextClass?.isNovedad ? 'text-amber-300' : 'text-blue-200'}`}>
                      {effectiveNextClass?.isNovedad ? <ShieldAlert className='h-2.5 w-2.5' /> : <Clock className='h-2.5 w-2.5' />}
                      {effectiveNextClass ? `Próxima (${effectiveNextClass.period}°)` : 'Próxima'}
                    </span>
                    {effectiveNextClass?.isNovedad && (
                      <span className='inline-flex items-center px-1.5 py-0.5 rounded bg-amber-400/25 border border-amber-300/40 text-[8px] font-black text-amber-200'>
                        ⚠️ NOVEDAD
                      </span>
                    )}
                  </div>

                  {effectiveNextClass ? (
                    <div className='space-y-0.5'>
                      <h3 className='text-xs sm:text-sm font-bold text-white line-clamp-1 leading-snug'>
                        {effectiveNextClass.subject}
                      </h3>
                      <div className='inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-blue-100 bg-white/10 px-1.5 py-0.5 rounded border border-white/10'>
                        {effectiveNextClass.startTime}
                      </div>
                    </div>
                  ) : (
                    <div className='space-y-0.5'>
                      <p className='text-xs sm:text-sm font-bold text-blue-50 leading-snug'>
                        Fin jornada
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </motion.div>
      )}

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

