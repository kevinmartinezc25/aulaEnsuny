'use client'

import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion, Variants } from 'framer-motion'
import Link from 'next/link'
import {
  TrendingUp, CalendarDays, ShieldAlert, Activity, BookOpen, ChevronRight
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { StudentVirtualCourseModal } from '../components/StudentVirtualCourseModal'
import { getStudentEmailStatus } from '../../application/studentEmailActions'
import { getStudentDashboardSchedule } from '../../application/scheduleActions'
import { getColombianHoliday, type ColombianHoliday } from '@/lib/colombianHolidays'
import { useUserSessionStore } from '@/store/useUserSessionStore'

/* ─── Types ─────────────────────────────────────────────────────────── */
interface StudentInfo {
  name: string; group: string; gradeLevel: string
  jornada: string; academicYear: string; avatarInitials: string
}
interface ModuleCard {
  id: string; title: string; description: string; href: string; icon: React.ElementType
}

/* ─── Helpers (sin cambios respecto a la versión original) ───────────── */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0]?.[0]?.toUpperCase() ?? 'E'
}
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días,'
  if (h < 18) return 'Buenas tardes,'
  return 'Buenas noches,'
}
function parseTimeToMinutes(t: string | null | undefined): number | null {
  if (!t || typeof t !== 'string') return null
  const c = t.trim().toUpperCase()
  if (!c.includes(':')) return null
  const isPM = c.includes('PM'), isAM = c.includes('AM')
  const [hStr, mStr] = c.replace(/[AP]M/, '').trim().split(':')
  let h = parseInt(hStr, 10); const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return null
  if (isPM && h < 12) h += 12
  if (isAM && h === 12) h = 0
  return h * 60 + m
}
function getBogotaDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}

/* ─── Module cards ───────────────────────────────────────────────────── */
const BASE_MODULES: ModuleCard[] = [
  { id: 'grades',       title: 'Calificaciones',    description: 'Resultados por periodo, área y competencia.',      href: '/student/grades',       icon: TrendingUp },
  { id: 'schedule',     title: 'Mi Horario',         description: 'Clases según tu grupo y matrícula activa.',         href: '/student/schedule',     icon: CalendarDays },
  { id: 'disciplinary', title: 'Convivencia',        description: 'Seguimiento institucional de convivencia escolar.', href: '/student/disciplinary', icon: ShieldAlert },
  { id: 'attendance',   title: 'Asistencia Escolar', description: 'Asistencias, ausencias y porcentajes.',            href: '/student/attendance',   icon: Activity },
]
const VIRTUAL: ModuleCard = {
  id: 'courses', title: 'Campus Virtual', description: 'Cursos, contenidos y actividades en línea.',
  href: '/student/courses', icon: BookOpen,
}

const ICON_LIGHT: Record<string, string> = {
  grades: '#1a7a58', schedule: '#2563eb', disciplinary: '#7c3aed', attendance: '#0284c7', courses: '#0d7a5f',
}
const ICON_DARK: Record<string, string> = {
  grades: '#5EE0B0', schedule: '#93c5fd', disciplinary: '#c4b5fd', attendance: '#7dd3fc', courses: '#5EE0B0',
}

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export function StudentPortalScreen() {
  const shouldReduceMotion = useReducedMotion()
  const sessionUser = useUserSessionStore(s => s.user)
  const initSession = useUserSessionStore(s => s.initSession)

  /* ── Student info ────────────────────────────────────────────────── */
  const [info, setInfo] = useState<StudentInfo>(() => ({
    name: sessionUser?.name || 'Estudiante',
    group: sessionUser?.group || '-',
    gradeLevel: sessionUser?.grade || '-',
    jornada: 'Mañana',
    academicYear: new Date().getFullYear().toString(),
    avatarInitials: getInitials(sessionUser?.name || 'E'),
  }))

  useEffect(() => {
    if (sessionUser?.name && sessionUser.name !== 'Estudiante') {
      setInfo(prev => ({
        ...prev,
        name: sessionUser.name,
        group: sessionUser.group || prev.group,
        gradeLevel: sessionUser.grade || prev.gradeLevel,
        avatarInitials: getInitials(sessionUser.name),
      }))
    }
  }, [sessionUser])

  /* ── Campus / schedule state ─────────────────────────────────────── */
  const [hasCourses, setHasCourses]             = useState(false)
  const [hasEmail,   setHasEmail]               = useState(false)
  const [isVirtualModalOpen, setIsVirtualModalOpen] = useState(false)
  const [todaySchedule, setTodaySchedule]       = useState<any[]>([])
  const [isWeekend, setIsWeekend]               = useState(() => { const d = getBogotaDate().getDay(); return d === 0 || d === 6 })
  const [dayOfWeekNumber, setDayOfWeekNumber]   = useState<number>(() => getBogotaDate().getDay())
  const [colombianHoliday, setColombianHoliday] = useState<ColombianHoliday | null>(() => getColombianHoliday(getBogotaDate()))
  const [currentClass, setCurrentClass]         = useState<any | null>(null)
  const [nextClass,    setNextClass]            = useState<any | null>(null)
  const [completedClasses, setCompletedClasses] = useState(0)
  const [totalClasses, setTotalClasses]         = useState(0)
  const [loading, setLoading]                   = useState(!sessionUser)

  /* ── Dark mode detection ─────────────────────────────────────────── */
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  /* ── Schedule evaluator (lógica original intacta) ────────────────── */
  const evaluateSchedule = React.useCallback((slots: any[]) => {
    if (!slots?.length) return { updatedSlots: [], curr: null, next: null, completed: 0, total: 0 }
    const now = getBogotaDate()
    const cur = now.getHours() * 60 + now.getMinutes()
    let curr: any = null, next: any = null, completed = 0
    const updatedSlots = slots.map(cls => {
      let isOngoing = false
      const sm = parseTimeToMinutes(cls.startTime)
      let em = parseTimeToMinutes(cls.endTime)
      if (sm !== null) {
        if (em === null || em <= sm) em = sm + 55
        isOngoing = cur >= sm && cur < em
        if (cur >= em && !cls.isFree) completed++
        if (isOngoing && !cls.isFree && !curr) {
          const dur = Math.max(1, em - sm)
          curr = { ...cls, isOngoing: true, startMins: sm, endMins: em, duration: dur, elapsed: Math.max(0, cur - sm), remaining: Math.max(0, em - cur), progress: Math.min(100, Math.round(((cur - sm) / dur) * 100)) }
        }
      }
      return { ...cls, isCurrent: isOngoing, startMins: sm, endMins: em }
    })
    for (const cls of updatedSlots) {
      if (!cls.isFree) {
        const sm = cls.startMins ?? parseTimeToMinutes(cls.startTime)
        if (sm === null) continue
        if (curr) {
          if ((parseInt(cls.period, 10) || 0) > (parseInt(curr.period, 10) || 0) && cls.id !== curr.id && sm >= (curr.endMins || 0)) { next = cls; break }
        } else {
          if (sm > cur) { next = cls; break }
        }
      }
    }
    if (next && curr && (next.id === curr.id || next.period === curr.period)) next = null
    return { updatedSlots, curr, next, completed, total: updatedSlots.filter((s: any) => !s.isFree).length }
  }, [])

  useEffect(() => {
    if (!todaySchedule.length || isWeekend || colombianHoliday) return
    const t = setInterval(() => {
      const r = evaluateSchedule(todaySchedule)
      setTodaySchedule(r.updatedSlots); setCurrentClass(r.curr); setNextClass(r.next); setCompletedClasses(r.completed)
    }, 60000)
    return () => clearInterval(t)
  }, [todaySchedule, evaluateSchedule, isWeekend, colombianHoliday])

  /* ── Data load (lógica original intacta) ────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const demo = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
        if (demo) {
          const gc = (n: string) => { const v = '; ' + document.cookie; const p = v.split('; ' + n + '='); if (p.length === 2) return p.pop()?.split(';').shift(); return null }
          const ck = gc('aulaensuny-demo-session')
          if (ck) {
            const s = JSON.parse(decodeURIComponent(ck)); const full = ((s.first_name || '') + ' ' + (s.last_name || '')).trim()
            setInfo({ name: full || 'Estudiante', group: 'Demo 10-A', gradeLevel: s.grade_level || '10', jornada: 'Mañana', academicYear: new Date().getFullYear().toString(), avatarInitials: getInitials(full || 'E') })
            setHasCourses(true); setHasEmail(true)
          }
          const bd = getBogotaDate(); const dow = bd.getDay()
          setDayOfWeekNumber(dow); setIsWeekend(dow === 0 || dow === 6); setColombianHoliday(getColombianHoliday(bd))
          setLoading(false); return
        }
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) { setLoading(false); return }
        const mf = authUser.user_metadata?.first_name || '', ml = authUser.user_metadata?.last_name || ''
        const metaName = (mf + ' ' + ml).trim()
        if (metaName) setInfo(prev => ({ ...prev, name: metaName, group: authUser.user_metadata?.group_name || prev.group, gradeLevel: authUser.user_metadata?.grade_level || prev.gradeLevel, avatarInitials: getInitials(metaName) }))
        let currentUser = sessionUser
        if (!currentUser || currentUser.id !== authUser.id) currentUser = await initSession(true)
        const uid = authUser.id
        const [er, cr, esr, sr] = await Promise.allSettled([
          supabase.from('student_enrollments').select('jornada,group_name,grade_level,academic_year').eq('student_id', uid).eq('enrollment_status', 'active').order('academic_year', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('student_courses').select('id').eq('student_id', uid).limit(1),
          getStudentEmailStatus(),
          getStudentDashboardSchedule(),
        ])
        let name = currentUser?.name || metaName || 'Estudiante'
        let group = currentUser?.group || authUser.user_metadata?.group_name || '-'
        let gradeLevel = currentUser?.grade || authUser.user_metadata?.grade_level || '-'
        let jornada = 'Mañana', academicYear = new Date().getFullYear().toString()
        if (er.status === 'fulfilled' && er.value.data) { const e = er.value.data; if (e.jornada) jornada = e.jornada; if (e.group_name) group = e.group_name; if (e.grade_level) gradeLevel = e.grade_level; if (e.academic_year) academicYear = String(e.academic_year) }
        if (cr.status === 'fulfilled' && cr.value.data) setHasCourses(cr.value.data.length > 0)
        if (esr.status === 'fulfilled' && esr.value) { const st = esr.value; if (st.hasCourses) setHasCourses(true); if (st.hasEmail) setHasEmail(true); if (st.fullName && st.fullName !== 'Estudiante') name = st.fullName }
        const bd = getBogotaDate(); const dow = bd.getDay()
        setDayOfWeekNumber(dow); const isWk = dow === 0 || dow === 6; setIsWeekend(isWk)
        const holiday = getColombianHoliday(bd); setColombianHoliday(holiday)
        let dayKey: 'lunes'|'martes'|'miercoles'|'jueves'|'viernes'|null = null
        if (dow === 1) dayKey = 'lunes'; else if (dow === 2) dayKey = 'martes'; else if (dow === 3) dayKey = 'miercoles'; else if (dow === 4) dayKey = 'jueves'; else if (dow === 5) dayKey = 'viernes'
        if (!isWk && !holiday && dayKey && sr.status === 'fulfilled' && sr.value.success && sr.value.schedule) {
          const todayArr = sr.value.schedule[dayKey] || []
          const res = evaluateSchedule(todayArr)
          setTodaySchedule(res.updatedSlots); setCurrentClass(res.curr); setNextClass(res.next); setCompletedClasses(res.completed); setTotalClasses(res.total)
        }
        setInfo({ name, group, gradeLevel, jornada, academicYear, avatarInitials: getInitials(name) })
      } catch (e) { console.error('Error cargando portal estudiante:', e) }
      finally { setLoading(false) }
    }
    load()
  }, [sessionUser, initSession]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Framer variants ─────────────────────────────────────────────── */
  const cv: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: shouldReduceMotion ? 0 : 0.07, delayChildren: 0.08 } } }
  const iv: Variants = { hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 260 } } }

  /* ── Skeleton ────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="portal-student ps-page">
        <div className="ps-layout">
          <div className="ps-left-col">
            <div className="ps-skeleton ps-skeleton-hero animate-pulse" />
            <div className="ps-skeleton ps-skeleton-hi animate-pulse" />
          </div>
          <div className="ps-right-col">
            <div className="ps-tiles-grid">
              {[1,2,3,4].map(i => <div key={i} className="ps-skeleton ps-skeleton-tile animate-pulse" />)}
            </div>
            <div className="ps-skeleton ps-skeleton-wide animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  /* ── Derived values ──────────────────────────────────────────────── */
  const { name, group, gradeLevel, jornada, academicYear } = info
  const chips = [
    (gradeLevel && gradeLevel !== '-') ? `Grado ${gradeLevel}` : null,
    (group && group !== '-')           ? `Grupo ${group}`      : null,
    jornada                            ? `Jornada ${jornada}`  : null,
    academicYear                       ? `Año ${academicYear}` : null,
  ].filter(Boolean) as string[]

  const isSameClass    = nextClass && currentClass && (nextClass.id === currentClass.id || nextClass.period === currentClass.period)
  const effectiveNext  = isSameClass ? null : nextClass
  const isFinishedDay  = !currentClass && !effectiveNext && totalClasses > 0
  const hasActiveClass = !isWeekend && !colombianHoliday && totalClasses > 0 && (currentClass || effectiveNext) && !isFinishedDay

  function resolveHiContent(): { label: string; detail: string } {
    if (colombianHoliday) return { label: 'Festivo — sin clases',         detail: colombianHoliday.name }
    if (isWeekend)        return { label: dayOfWeekNumber === 6 ? 'Sábado' : 'Domingo', detail: 'Sin clases programadas' }
    if (!totalClasses)    return { label: 'Sin horario registrado',        detail: 'No hay clases asignadas para hoy' }
    if (isFinishedDay)    return { label: 'Jornada finalizada',            detail: '¡Buen trabajo! No hay más clases hoy' }
    if (currentClass)     return { label: currentClass.subject,            detail: `En curso · ${currentClass.startTime} – ${currentClass.endTime}` }
    if (effectiveNext)    return { label: effectiveNext.subject,           detail: `Próxima clase · ${effectiveNext.startTime}` }
    return { label: 'Sin clase en este momento', detail: 'Consulta tu horario completo' }
  }

  const { label: hiLabel, detail: hiDetail } = resolveHiContent()
  const ic = (id: string) => isDark ? (ICON_DARK[id] || 'var(--ps-acc)') : (ICON_LIGHT[id] || 'var(--ps-acc)')

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="portal-student ps-page">
      {/* ── CSS responsive ── */}
      <style>{`
        /* ── Page wrapper ── */
        .ps-page {
          padding: 20px 16px 40px;
          margin: 0 auto;
          max-width: 680px;
          box-sizing: border-box;
        }

        /* ── Outer layout: single-column en móvil/tablet, dos paneles en desktop ── */
        .ps-layout {
          display: flex;
          flex-direction: column;
          gap: var(--ps-gap);
        }
        .ps-left-col, .ps-right-col {
          display: flex;
          flex-direction: column;
          gap: var(--ps-gap);
          min-width: 0;
        }

        /* ── Tile grid: siempre 2 columnas ── */
        .ps-tiles-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--ps-gap);
        }

        /* ── Tablet (640px+) ── */
        @media (min-width: 640px) {
          .ps-page {
            padding: 24px 28px 48px;
            max-width: 800px;
          }
        }

        /* ── Desktop (1024px+): dos paneles lado a lado ── */
        @media (min-width: 1024px) {
          .ps-page {
            padding: 24px 40px 24px;
            max-width: 1120px;
          }
          .ps-layout {
            flex-direction: row;
            align-items: stretch;
            gap: 16px;
          }
          .ps-left-col {
            flex: 0 0 420px;
            gap: 12px;
          }
          .ps-right-col {
            flex: 1;
            gap: 12px;
          }
          .ps-tiles-grid {
            gap: 12px;
          }
        }

        /* ── Hero ── */
        .ps-hero {
          position: relative;
          overflow: hidden;
          background: var(--ps-hero);
          border-radius: var(--ps-r-hero);
          padding: 24px 22px 22px;
          color: var(--ps-hero-ink);
          flex-shrink: 0;
        }
        @media (min-width: 1024px) {
          .ps-hero {
            padding: 24px 28px;
          }
        }

        .ps-hero-greeting {
          color: var(--ps-hero-mute);
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 4px;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 1024px) { .ps-hero-greeting { font-size: 16px; } }

        .ps-hero-name {
          font-size: clamp(26px, 5vw, 34px);
          line-height: 1.06;
          font-weight: 700;
          letter-spacing: -0.8px;
          margin-bottom: 20px;
          word-break: break-word;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 1024px) {
          .ps-hero-name {
            font-size: clamp(30px, 3vw, 40px);
            margin-bottom: 16px;
          }
        }

        .ps-chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          position: relative;
          z-index: 1;
        }
        .ps-chip {
          background: var(--ps-chip-bg);
          border: 1px solid var(--ps-chip-b);
          color: var(--ps-chip-ink);
          border-radius: var(--ps-r-pill);
          padding: 5px 13px;
          font-size: 13px;
          font-weight: 500;
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
        }
        @media (min-width: 1024px) {
          .ps-chip { padding: 6px 15px; font-size: 13.5px; }
        }

        .ps-watermark {
          position: absolute;
          right: -16px;
          bottom: -24px;
          width: 170px;
          opacity: 0.10;
          pointer-events: none;
          user-select: none;
        }
        @media (min-width: 1024px) {
          .ps-watermark { width: 220px; right: -20px; bottom: -30px; }
        }

        /* ── Tile base ── */
        .ps-tile {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 152px;
          padding: 18px;
          border-radius: var(--ps-r-tile);
          background: var(--ps-tile);
          border: 1px solid var(--ps-tile-b);
          color: var(--ps-ink);
          text-decoration: none;
          outline: none;
          cursor: pointer;
          height: 100%;
          box-sizing: border-box;
        }
        @media (min-width: 640px)  { .ps-tile { min-height: 164px; padding: 20px; } }
        @media (min-width: 1024px) { .ps-tile { min-height: 156px; padding: 20px; } }

        .ps-tile-title {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.2px;
          color: var(--ps-ink);
          margin-bottom: 2px;
        }
        @media (min-width: 1024px) { .ps-tile-title { font-size: 18px; } }

        .ps-tile-desc {
          font-size: 13px;
          line-height: 1.4;
          color: var(--ps-mute);
        }
        @media (min-width: 1024px) { .ps-tile-desc { font-size: 13.5px; } }

        .ps-tile-icon { margin-bottom: 12px; }

        .ps-hi-tile {
          background: var(--ps-hi);
          border-color: transparent;
          color: var(--ps-hi-ink);
          min-height: 150px;
        @media (min-width: 1024px) {
          .ps-hi-tile {
            flex: 1; /* llena el espacio restante en el panel izquierdo */
            min-height: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        }

        .ps-hi-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ps-pair {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 22px;
        }
        .ps-cur {
          padding: 6px 0;
        }
        .ps-nxt {
          padding: 12px 14px;
          border-radius: 16px;
          background: var(--ps-nxt-bg, rgba(233, 150, 42, 0.12));
        }
        .ps-cur small {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 6px;
          color: var(--ps-hi-mute);
          font-size: 13px;
        }
        .ps-nxt small {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 6px;
          color: var(--ps-nxt-mute, rgba(233, 150, 42, 0.85));
          font-size: 13px;
        }
        .ps-cur strong {
          display: block;
          font-size: 22px;
          line-height: 1.1;
          letter-spacing: -0.6px;
        }
        .ps-nxt strong {
          display: block;
          font-size: 20px;
          line-height: 1.1;
          letter-spacing: -0.6px;
          color: var(--ps-nxt-ink, #f0b469);
        }
        .ps-cur .ps-t {
          display: block;
          font-size: 13px;
          color: var(--ps-hi-mute);
          margin-top: 6px;
        }
        .ps-nxt .ps-t {
          display: block;
          font-size: 13px;
          color: var(--ps-nxt-mute, rgba(233, 150, 42, 0.85));
          margin-top: 6px;
        }
        .ps-live {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #12a374;
          box-shadow: 0 0 8px #12a374;
        }
        @media (prefers-reduced-motion: no-preference) {
          .ps-live { animation: pslive 2s ease-in-out infinite; }
          @keyframes pslive { 50% { opacity: 0.35; } }
        }
        .ps-bar {
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
          margin-top: 14px;
          overflow: hidden;
        }
        .ps-bar b {
          display: block;
          height: 100%;
          border-radius: 2px;
          background: var(--ps-hi-ink);
        }
        }
        @media (min-width: 1024px) {
          .ps-cur strong { font-size: 24px; }
        }

        .ps-go-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--ps-r-pill);
          background: var(--ps-hi-go-bg);
          color: var(--ps-hi-go-ink);
          border: 1px solid var(--ps-hi-go-b);
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        @media (min-width: 1024px) { .ps-go-btn { width: 44px; height: 44px; } }

        .ps-hi-dot {
          position: absolute;
          top: 18px; right: 18px;
          width: 9px; height: 9px;
          border-radius: var(--ps-r-pill);
          background: var(--ps-hi-ink);
          opacity: 0.7;
          box-shadow: 0 0 8px rgba(255,255,255,0.6);
        }

        /* ── Tile Campus Virtual (ancho completo en su columna) ── */
        .ps-wide-tile {
          min-height: 104px;
        }

        .ps-wide-bottom {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
        }

        .ps-dot {
          position: absolute;
          top: 18px; right: 18px;
          width: 9px; height: 9px;
          border-radius: var(--ps-r-pill);
          background: var(--ps-acc);
          box-shadow: var(--ps-dot-glow);
        }

        .ps-badge {
          font-size: 12px; font-weight: 600;
          color: var(--ps-acc);
          border: 1px solid var(--ps-acc);
          border-radius: var(--ps-r-pill);
          padding: 3px 11px;
          line-height: 1.2;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .ps-badge-neutral {
          font-size: 12px; font-weight: 600;
          color: var(--ps-mute);
          border: 1px solid var(--ps-tile-b);
          border-radius: var(--ps-r-pill);
          padding: 3px 11px;
          line-height: 1.2;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .ps-badge-link {
          font-size: 12px; font-weight: 600;
          color: var(--ps-acc);
          border: 1px solid var(--ps-acc);
          border-radius: var(--ps-r-pill);
          padding: 3px 11px;
          line-height: 1.2;
          flex-shrink: 0;
          white-space: nowrap;
          opacity: 0.8;
        }

        /* ── Footer ── */
        .ps-footer {
          padding-top: 12px;
          padding-bottom: 8px;
          text-align: center;
        }
        .ps-footer-text {
          font-size: 11px;
          color: var(--ps-mute);
          font-weight: 500;
        }

        /* ── Skeletons ── */
        .ps-skeleton { border-radius: var(--ps-r-tile); background: var(--ps-tile); opacity: 0.5; }
        .ps-skeleton-hero { height: 168px; border-radius: var(--ps-r-hero); background: var(--ps-hero); }
        .ps-skeleton-hi   { height: 136px; }
        .ps-skeleton-tile { height: 152px; }
        .ps-skeleton-wide { height: 108px; }
        @media (min-width: 1024px) {
          .ps-skeleton-hero { height: 220px; }
          .ps-skeleton-hi   { height: 180px; }
          .ps-skeleton-tile { height: 178px; }
          .ps-skeleton-wide { height: 120px; }
        }

        /* ── Interacción táctil / press ── */
        .ps-link {
          display: block;
          height: 100%;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
        }
        @media (prefers-reduced-motion: no-preference) {
          .ps-link:active .ps-tile,
          .ps-link:active .ps-hi-tile,
          .ps-link:active .ps-wide-tile {
            transform: scale(0.97);
            transition: transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1);
          }
        }
        .ps-link:focus-visible .ps-tile,
        .ps-link:focus-visible .ps-hi-tile,
        .ps-link:focus-visible .ps-wide-tile {
          outline: 2px solid var(--ps-acc);
          outline-offset: 3px;
        }
      `}</style>

      <motion.div
        className="ps-layout"
        variants={cv}
        initial="hidden"
        animate="show"
      >
        {/* ════════════════════════════════
            PANEL IZQUIERDO
            Hero + Tile Próxima Clase
            ════════════════════════════════ */}
        <div className="ps-left-col">

          {/* Hero */}
          <motion.section
            variants={iv}
            className="ps-hero"
            aria-label="Bienvenida al portal"
          >
            <img src="/escudo_ensuny.png" alt="" aria-hidden="true" className="ps-watermark" />
            <p className="ps-hero-greeting">{getGreeting()}</p>
            <h1 className="ps-hero-name">{name}</h1>
            <div className="ps-chips-row" role="list" aria-label="Información académica">
              {chips.map((label, i) => (
                <span key={i} className="ps-chip" role="listitem">{label}</span>
              ))}
            </div>
          </motion.section>

          {/* Tile destacado: Próxima Clase / Estado actual */}
          <motion.div variants={iv} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <Link
              href="/student/schedule"
              className="ps-link"
              aria-label={`Horario: ${hiLabel}. ${hiDetail}`}
            >
              <div className="ps-tile ps-hi-tile" style={{ justifyContent: 'space-between' }}>
                <div className="ps-hi-top">
                  <CalendarDays size={26} aria-hidden="true" style={{ color: 'var(--ps-hi-ink)', opacity: 0.85 }} />
                  <span className="ps-go-btn" aria-hidden="true">
                    <ChevronRight size={18} />
                  </span>
                </div>

                <div className="ps-pair" style={(!currentClass && !effectiveNext) ? { gridTemplateColumns: '1fr' } : {}}>
                  <div className="ps-cur" style={(!currentClass && !effectiveNext) ? { paddingRight: 0 } : {}}>
                    <small>
                      {currentClass && <i className="ps-live" aria-hidden="true"></i>}
                      {currentClass ? 'Clase actual' : (!effectiveNext ? hiLabel : 'Clase actual')}
                    </small>
                    <strong>{currentClass ? currentClass.subject : (!effectiveNext ? hiDetail : 'Receso o Libre')}</strong>
                    {currentClass && (
                      <>
                        <span className="ps-t">{currentClass.startTime} – {currentClass.endTime}</span>
                        <div className="ps-bar"><b style={{ width: `${currentClass.progress}%` }}></b></div>
                      </>
                    )}
                  </div>
                  
                  {(currentClass || effectiveNext) && (
                    <div className="ps-nxt">
                      <small>Clase siguiente</small>
                      <strong>{effectiveNext ? effectiveNext.subject : 'Ninguna'}</strong>
                      {effectiveNext && <span className="ps-t">{effectiveNext.startTime} – {effectiveNext.endTime}</span>}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* ════════════════════════════════
            PANEL DERECHO
            Grid 4 módulos + Campus Virtual
            ════════════════════════════════ */}
        <div className="ps-right-col">

          {/* Grid 2×2 de módulos */}
          <div className="ps-tiles-grid">
            {BASE_MODULES.map(mod => {
              const Icon = mod.icon
              return (
                <motion.div key={mod.id} variants={iv}>
                  <Link
                    href={mod.href}
                    className="ps-link"
                    aria-label={`${mod.title}: ${mod.description}`}
                  >
                    <div className="ps-tile">
                      <div className="ps-tile-icon">
                        <Icon size={26} style={{ color: ic(mod.id) }} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="ps-tile-desc">{mod.description}</p>
                        <p className="ps-tile-title">{mod.title}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          {/* Campus Virtual — ancho completo dentro del panel derecho */}
          <motion.div variants={iv}>
            <Link
              href={VIRTUAL.href}
              className="ps-link"
              onClick={e => { if (!hasEmail) { e.preventDefault(); setIsVirtualModalOpen(true) } }}
              aria-label={`Campus Virtual: ${hasCourses ? 'cursos activos' : hasEmail ? 'sin curso activo' : 'vincular correo institucional'}`}
            >
              <div className="ps-tile ps-wide-tile">
                {hasCourses && <span className="ps-dot" aria-hidden="true" />}

                <div className="ps-tile-icon">
                  <BookOpen size={26} style={{ color: ic('courses') }} aria-hidden="true" />
                </div>

                <div className="ps-wide-bottom">
                  <div>
                    <p className="ps-tile-desc">{VIRTUAL.description}</p>
                    <p className="ps-tile-title">{VIRTUAL.title}</p>
                  </div>
                  {hasCourses
                    ? <span className="ps-badge">Activo</span>
                    : hasEmail
                      ? <span className="ps-badge-neutral">Sin Curso</span>
                      : <span className="ps-badge-link">Vincular</span>
                  }
                </div>
              </div>
            </Link>
          </motion.div>

        </div>
      </motion.div>


      {/* Modal Campus Virtual */}
      <StudentVirtualCourseModal
        isOpen={isVirtualModalOpen}
        onClose={() => setIsVirtualModalOpen(false)}
        onEmailUpdated={() => setHasEmail(true)}
      />
    </div>
  )
}
