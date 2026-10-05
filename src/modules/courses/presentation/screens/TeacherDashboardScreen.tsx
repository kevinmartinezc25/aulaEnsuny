'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { BookOpen, Users, BrainCircuit, FileText, Upload, Save, X, Edit, Eye, Play, Loader2, Calendar, Clock, CheckCircle2, Search, Filter, ArrowRight, Sparkles } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'
import { getTeacherDashboardOverview, TeacherDashboardCourse } from '@/modules/courses/application/teacherActions'

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

export interface TeacherDashboardProps {
  initialTeacherName?: string;
  initialCourses?: TeacherDashboardCourse[];
  initialStats?: any;
  initialTodaySchedule?: any[];
  initialCurrentClass?: any | null;
  initialNextClass?: any | null;
  initialIsWeekend?: boolean;
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

export function TeacherDashboardScreen(props: TeacherDashboardProps) {
  const [courses, setCourses] = useState<TeacherDashboardCourse[]>(props.initialCourses || [])
  const [teacherName, setTeacherName] = useState(props.initialTeacherName || 'Prof. Docente')
  const [loading, setLoading] = useState(!props.initialCourses)
  const [stats, setStats] = useState(props.initialStats || {
    coursesCount: 0,
    studentsCount: 0,
    quizzesCount: 0,
    avgGrade: '—'
  })
  const initialCurrent = props.initialCurrentClass || null
  const initialNext = (props.initialNextClass && (!initialCurrent || (props.initialNextClass.id !== initialCurrent.id && props.initialNextClass.period !== initialCurrent.period)))
    ? props.initialNextClass
    : null

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [todaySchedule, setTodaySchedule] = useState<any[]>(props.initialTodaySchedule || [])
  const [isWeekend, setIsWeekend] = useState(props.initialIsWeekend || false)
  const [currentClass, setCurrentClass] = useState<any | null>(initialCurrent)
  const [nextClass, setNextClass] = useState<any | null>(initialNext)
  const [completedClasses, setCompletedClasses] = useState(0)
  const [totalClasses, setTotalClasses] = useState(0)

  // Filtros de Cursos
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('ALL')

  // Grados disponibles extraídos de los cursos
  const availableGrades = React.useMemo(() => {
    const grades = new Set<string>()
    courses.forEach((c) => {
      if (c.gradeLevel && c.gradeLevel.trim()) {
        grades.add(c.gradeLevel.trim())
      }
    })
    return Array.from(grades).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [courses])

  // Cursos filtrados
  const filteredCourses = React.useMemo(() => {
    return courses.filter((course) => {
      if (selectedGrade !== 'ALL') {
        const cGrade = (course.gradeLevel || '').trim().toLowerCase()
        if (cGrade !== selectedGrade.toLowerCase()) {
          return false
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchTitle = course.title?.toLowerCase().includes(query)
        const matchSubject = course.subject?.toLowerCase().includes(query)
        const matchGrade = course.gradeLevel?.toLowerCase().includes(query)
        const matchDescription = course.description?.toLowerCase().includes(query)
        const matchJoinCode = course.joinCode?.toLowerCase().includes(query)

        if (!matchTitle && !matchSubject && !matchGrade && !matchDescription && !matchJoinCode) {
          return false
        }
      }

      return true
    })
  }, [courses, selectedGrade, searchQuery])

  // Modales y Editores State
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // Editor de Lecciones State
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonContent, setLessonContent] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeEmbedId, setYoutubeEmbedId] = useState<string | null>(null)
  const [selectedPdfName, setSelectedPdfName] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Tabs
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'general' | 'virtual'>('general')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'virtual') {
      setActiveTab('virtual')
    } else if (tab === 'general') {
      setActiveTab('general')
    }
  }, [searchParams])

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
          // Debe ser estrictamente un período posterior y no la misma clase
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

    // Regla estricta de unicidad: la siguiente clase nunca puede ser la misma clase actual
    if (next && curr && (next.id === curr.id || next.period === curr.period)) {
      next = null
    }

    const total = updatedSlots.filter((s: any) => !s.isFree).length

    return {
      updatedSlots,
      curr,
      next,
      completed,
      total
    }
  }, [])

  // Carga de datos dinámicos desde Supabase o fallback a Mock en Modo Demo
  useEffect(() => {
    async function loadTeacherData() {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) return parts.pop()?.split(';').shift()
        return null
      }

      if (isDemoMode) {
        const demoCookie = getCookie('aulaensuny-demo-session')
        if (demoCookie) {
          try {
            const session = JSON.parse(decodeURIComponent(demoCookie))
            setTeacherName(`${session.first_name || 'Prof.'} ${session.last_name || 'Alejandro'}`)
          } catch (e) {
            console.error(e)
          }
        }
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          if (!props.initialTeacherName) {
            // 1. Cargar perfil del docente
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()

            if (profile) {
              setTeacherName(`${profile.first_name || 'Prof.'} ${profile.last_name || 'Docente'}`)
            } else if (user.user_metadata) {
              setTeacherName(`${user.user_metadata.first_name || 'Prof.'} ${user.user_metadata.last_name || 'Docente'}`)
            }
          }

          if (!props.initialCourses) {
            // 2. Cargar asignaturas y métricas reales del Aula Virtual
            const overview = await getTeacherDashboardOverview()
            setCourses(overview.courses)
            setStats(overview.stats)
          }

          // 5. Cargar Horario de Hoy (usando datos iniciales del servidor)
          try {
            if (props.initialIsWeekend !== undefined) {
              setIsWeekend(props.initialIsWeekend)
            }
            if (props.initialTodaySchedule && props.initialTodaySchedule.length > 0) {
              const res = evaluateSchedule(props.initialTodaySchedule)
              setTodaySchedule(res.updatedSlots)
              setCurrentClass(res.curr)
              setNextClass(res.next)
              setCompletedClasses(res.completed)
              setTotalClasses(res.total)
            } else if (props.initialNextClass || props.initialCurrentClass) {
              const c = props.initialCurrentClass || null
              const n = (props.initialNextClass && (!c || (props.initialNextClass.id !== c.id && props.initialNextClass.period !== c.period)))
                ? props.initialNextClass
                : null
              setCurrentClass(c)
              setNextClass(n)
            }
          } catch(e) {
            console.error('Error procesando horario de hoy:', e)
          }

          // Cargar próximos eventos institucionales
          try {
            const { getEvents } = await import('@/modules/institutional-agenda/application/actions')
            const allEvents = await getEvents()
            setUpcomingEvents(allEvents.slice(0, 5) || [])
          } catch (e) {
            console.error('Error cargando eventos de agenda en dashboard docente:', e)
          }
        }
      } catch (err) {
        console.error('Error cargando datos del docente en el dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTeacherData()
  }, [])

  // Actualizar periódicamente el estado de la clase en curso / tiempo restante cada minuto
  useEffect(() => {
    if (todaySchedule.length === 0) return
    const timer = setInterval(() => {
      const res = evaluateSchedule(todaySchedule)
      setTodaySchedule(res.updatedSlots)
      setCurrentClass(res.curr)
      setNextClass(res.next)
      setCompletedClasses(res.completed)
    }, 60000)
    return () => clearInterval(timer)
  }, [todaySchedule, evaluateSchedule])

  // Validar y parsear URL de Youtube
  useEffect(() => {
    if (!youtubeUrl) {
      setYoutubeEmbedId(null)
      return
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = youtubeUrl.match(regExp)
    if (match && match[2].length === 11) {
      setYoutubeEmbedId(match[2])
    } else {
      setYoutubeEmbedId(null)
    }
  }, [youtubeUrl])



  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Solo se admiten documentos PDF.')
        return
      }
      setSelectedPdfName(file.name)
    }
  }

  const handleSaveLesson = () => {
    if (!lessonTitle.trim()) {
      toast.warning('La lección requiere un título.')
      return
    }
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success('¡Lección guardada exitosamente en el servidor (Modo Demo)!')
      // Limpiar formulario
      setLessonTitle('')
      setLessonContent('')
      setYoutubeUrl('')
      setSelectedPdfName(null)
      setSelectedCourseId(null)
    }, 1200)
  }

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="td-page">
      <style>{`
        .td-page {
          --td-bg: #e9f0ec;
          --td-tile: #fff;
          --td-tile-b: #d9e4de;
          --td-ink: #10231c;
          --td-mute: #5f776b;
          --td-soft: #eef4f0;
          --td-hi: #123325;
          --td-hi-ink: #fff;
          --td-hi-mute: #6f9e8a;
          --td-hero: #123325;
          --td-acc: #12a374;
          --td-accbg: rgba(18,163,116,.12);
          --td-bad: #e5484d;
          --td-warn: #d9831a;
          padding: 20px 16px 40px;
          margin: 0 auto;
          max-width: 1100px;
          color: var(--td-ink);
        }
        .dark .td-page {
          --td-bg: #0c1512;
          --td-tile: #15221d;
          --td-tile-b: #22352d;
          --td-ink: #eaf4ef;
          --td-mute: #8aa399;
          --td-soft: #1c2c26;
          --td-hi: #123325;
          --td-hi-ink: #fff;
          --td-hi-mute: #6f9e8a;
          --td-hero: #123325;
          --td-acc: #5ee0b0;
          --td-accbg: rgba(94,224,176,.12);
          --td-bad: #ff7a85;
          --td-warn: #f2b04b;
        }
        @media(min-width: 760px) { .td-page { padding: 28px 32px 56px; } }
        
        .td-h1 { margin:0; font-size: clamp(26px, 5vw, 34px); line-height: 1.05; font-weight: 700; letter-spacing: -1.2px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        @media(min-width: 760px) { .td-h1 { font-size: 44px; letter-spacing: -1.5px; } }
        .td-badge { font-size: 13px; font-weight: 700; letter-spacing: 0; color: var(--td-acc); background: var(--td-accbg); border-radius: 99px; padding: 5px 14px; }
        .td-sub { margin: 10px 0 22px; color: var(--td-mute); font-size: 15px; max-width: 46em; }
        .td-tabs { display: inline-flex; gap: 4px; padding: 5px; border-radius: 99px; background: var(--td-tile); border: 1px solid var(--td-tile-b); margin-bottom: 22px; overflow-x: auto; max-width: 100%; }
        .td-tabs button { border: 0; background: transparent; border-radius: 99px; padding: 10px 20px; font-size: 14px; font-weight: 700; color: var(--td-mute); cursor: pointer; white-space: nowrap; transition: all 0.2s; outline: none; }
        .td-tabs button.on { background: var(--td-hi); color: var(--td-hi-ink); }
        .td-tabs button:focus-visible { outline: 2px solid var(--td-acc); outline-offset: 2px; }
        
        .td-bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
        .td-c8 { grid-column: span 12; }
        .td-c4 { grid-column: span 12; }
        .td-c6 { grid-column: span 12; }
        .td-c12 { grid-column: span 12; }
        @media(min-width: 900px) {
          .td-c8 { grid-column: span 8; }
          .td-c4 { grid-column: span 4; }
          .td-c6 { grid-column: span 6; }
        }
        
        .td-tile { position: relative; overflow: hidden; background: var(--td-tile); border: 1px solid var(--td-tile-b); border-radius: 24px; }
        @media(min-width: 760px) { .td-tile { border-radius: 32px; } }
        
        .td-hero { background: var(--td-hero); border-color: transparent; color: #fff; padding: 24px; min-height: 200px; display: flex; flex-direction: column; justify-content: flex-end; }
        @media(min-width: 760px) { .td-hero { padding: 30px 34px; } }
        .td-hero .wm { position: absolute; right: 26px; top: 50%; transform: translateY(-50%); width: 200px; height: 200px; opacity: 0.1; stroke-width: 3; color: #fff; pointer-events: none; }
        .td-hero small { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: 1.4px; color: var(--td-hi-mute); margin-bottom: 10px; }
        .td-hero small i { width: 8px; height: 8px; border-radius: 50%; background: #e9b56a; flex: none; }
        .td-hero strong { font-size: 24px; line-height: 1.15; font-weight: 700; letter-spacing: -0.9px; max-width: 15em; position: relative; }
        @media(min-width: 760px) { .td-hero strong { font-size: 30px; } }
        
        .td-pair { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 22px; position: relative; z-index: 1; }
        @media(min-width: 600px) { .td-pair { grid-template-columns: 1fr 1fr; } }
        .td-cur { padding: 6px 0; }
        .td-nxt { padding: 14px 16px; border-radius: 20px; background: rgba(233, 150, 42, 0.12); border: 1px solid rgba(233, 150, 42, 0.25); display: flex; flex-direction: column; justify-content: center; }
        .td-nxt small { color: rgba(233, 150, 42, 0.85); font-size: 11px; letter-spacing: 1px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
        .td-nxt strong { display: block; font-size: 20px; line-height: 1.1; letter-spacing: -0.6px; color: #f0b469; margin-bottom: 8px; max-width: 100%; }
        .td-nxt span { display: flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(233, 150, 42, 0.8); font-weight: 600; }
        
        .td-prog { background: var(--td-hi); border-color: transparent; color: var(--td-hi-ink); padding: 20px; display: flex; flex-direction: column; justify-content: space-between; min-height: 140px; }
        @media(min-width: 760px) { .td-prog { padding: 26px; min-height: 200px; } }
        .td-prog .wm { position: absolute; right: -24px; top: -24px; width: 150px; height: 150px; opacity: 0.12; stroke-width: 1.5; pointer-events: none; }
        .td-prog small { display: block; font-size: 12px; font-weight: 700; letter-spacing: 1.3px; color: var(--td-hi-mute); text-transform: uppercase; }
        .td-prog .ic { width: 36px; height: 36px; border-radius: 50%; background: rgba(128,128,128,0.25); display: grid; place-items: center; }
        @media(min-width: 760px) { .td-prog .ic { width: 44px; height: 44px; } }
        .td-prog .num { font-size: 42px; line-height: 1; font-weight: 700; letter-spacing: -1.5px; }
        @media(min-width: 760px) { .td-prog .num { font-size: 56px; letter-spacing: -2px; } }
        .td-prog .num span { font-size: 16px; color: var(--td-hi-mute); font-weight: 600; letter-spacing: 0; margin-left: 6px; }
        @media(min-width: 760px) { .td-prog .num span { font-size: 20px; } }
        .td-bar { height: 7px; border-radius: 4px; background: rgba(128,128,128,0.3); margin-top: 14px; overflow: hidden; }
        .td-bar b { display: block; height: 100%; width: 0; background: var(--td-hi-ink); transition: width 0.5s ease; }
        
        .td-panel { padding: 20px; display: flex; flex-direction: column; min-height: 220px; }
        @media(min-width: 760px) { .td-panel { padding: 24px; } }
        .td-ph { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .td-ph h2 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.3px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: var(--td-ink); }
        .td-ph p { margin: 4px 0 0; font-size: 13px; color: var(--td-mute); }
        .td-chip { font-size: 11px; font-weight: 700; letter-spacing: 0.6px; color: var(--td-acc); background: var(--td-accbg); border-radius: 99px; padding: 4px 11px; text-transform: uppercase; }
        .td-go { width: 38px; height: 38px; border-radius: 50%; background: var(--td-soft); display: grid; place-items: center; color: var(--td-acc); flex: none; }
        .td-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; color: var(--td-mute); font-size: 14px; border-top: 1px solid var(--td-tile-b); margin-top: 18px; padding-top: 18px; }
        .td-empty .td-go { width: 48px; height: 48px; color: var(--td-mute); }
        .td-foot { border-top: 1px solid var(--td-tile-b); margin-top: 16px; padding-top: 14px; }
        .td-foot a { color: var(--td-acc); font-size: 14px; font-weight: 700; text-decoration: none; }
        .td-foot a:hover { text-decoration: underline; }
        
        .td-event { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--td-tile-b); }
        .td-event:last-child { border-bottom: none; }
        .td-event h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--td-ink); }
        .td-event p { margin: 2px 0 0; font-size: 11px; color: var(--td-mute); }
        .td-event-cat { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 8px; border-radius: 8px; background: var(--td-soft); color: var(--td-mute); }

        .td-sch { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-radius: 16px; border: 1px solid transparent; transition: all 0.2s; margin-top: 12px; }
        .td-sch.free { border: 1px dashed var(--td-tile-b); background: transparent; }
        .td-sch.reg { background: var(--td-soft); }
        .td-sch.curr { background: var(--td-accbg); border-color: var(--td-acc); }
        .td-sch h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--td-ink); }
        .td-sch .info { font-size: 11px; font-weight: 600; color: var(--td-mute); display: flex; align-items: center; gap: 6px; margin-top: 4px; }
        .td-sch .right { text-align: right; flex-shrink: 0; }
        .td-sch .right b { display: block; font-size: 12px; color: var(--td-acc); }
        .td-sch .right span { display: block; font-size: 11px; color: var(--td-mute); margin-top: 2px; }
        
        .td-btn { border: 0; background: var(--td-hi); color: var(--td-hi-ink); border-radius: 99px; padding: 12px 22px; font-size: 14px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform 0.15s; outline: none; }
        .td-btn:active { transform: scale(0.96); }
        .td-btn:focus-visible { outline: 2px solid var(--td-acc); outline-offset: 2px; }

        /* Virtual Campus Grid */
        .td-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
        @media(min-width: 600px) { .td-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; } }
        
        .td-pc { padding: 14px; display: flex; flex-direction: column; gap: 10px; text-decoration: none; color: inherit; position: relative; overflow: hidden; }
        @media(min-width: 600px) { .td-pc { padding: 20px; gap: 14px; } }
        @media(prefers-reduced-motion: no-preference) { .td-pc { transition: transform 0.15s; } .td-pc:active { transform: scale(0.97); } }
        .td-pc .h { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
        @media(min-width: 600px) { .td-pc .h { flex-direction: row; align-items: center; gap: 12px; } }
        .td-pc .h .go { background: var(--td-accbg); width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; color: var(--td-acc); }
        @media(min-width: 600px) { .td-pc .h .go { width: 40px; height: 40px; } }
        .td-pc h3 { flex: 1; margin: 0; font-size: 14px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.2; color: var(--td-ink); word-break: break-word; hyphens: auto; }
        @media(min-width: 600px) { .td-pc h3 { font-size: 17px; } }
        .td-pc .p { display: none; font-size: 12px; color: var(--td-mute); -webkit-box-orient: vertical; overflow: hidden; }
        @media(min-width: 600px) { .td-pc .p { display: -webkit-box; -webkit-line-clamp: 2; font-size: 13px; } }
        .td-pc .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--td-tile-b); padding-top: 10px; font-size: 11px; font-weight: 600; color: var(--td-mute); gap: 6px; flex-wrap: wrap; }
        @media(min-width: 600px) { .td-pc .foot { padding-top: 12px; font-size: 12px; } }
        
        .td-pc-stats { display: none; gap: 8px; }
        @media(min-width: 600px) { .td-pc-stats { display: flex; } }
        
        .td-search { display: flex; align-items: center; gap: 12px; padding: 0 16px; height: 48px; border-radius: 99px; background: var(--td-soft); border: 1px solid var(--td-tile-b); width: 100%; transition: border-color 0.15s; }
        .td-search:focus-within { border-color: var(--td-acc); }
        .td-search input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--td-ink); font: inherit; font-size: 14px; outline: none; }
        .td-search input::placeholder { color: var(--td-mute); }
        .td-sel { position: relative; width: 100%; }
        @media(min-width: 600px) { .td-sel { width: auto; min-width: 200px; } }
        .td-sel select { appearance: none; background: var(--td-soft); color: var(--td-ink); border: 1px solid var(--td-tile-b); border-radius: 99px; height: 48px; padding: 0 42px 0 16px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; outline: none; transition: border-color 0.15s; }
        .td-sel select:focus { border-color: var(--td-acc); }
        .td-sel svg { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--td-mute); }
        
        .td-filters { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        @media(min-width: 600px) { .td-filters { flex-direction: row; align-items: center; } }
      `}</style>
      
      <h1 className="td-h1">
        ¡Hola, {teacherName}!
        <span className="td-badge">Docente</span>
      </h1>
      <p className="td-sub">Aquí tienes el resumen y las herramientas de tus clases activas.</p>

      <div className="td-tabs" role="tablist">
        <button className={activeTab === 'general' ? 'on' : ''} onClick={() => setActiveTab('general')} role="tab">Resumen General</button>
        <button className={activeTab === 'virtual' ? 'on' : ''} onClick={() => setActiveTab('virtual')} role="tab">Aula Virtual</button>
      </div>

      {activeTab === 'general' && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="td-bento">
          {/* Hero Card */}
          {(() => {
             const isSameClass = nextClass && currentClass && (nextClass.id === currentClass.id || nextClass.period === currentClass.period)
             const effectiveNextClass = isSameClass ? null : nextClass
             const isFinishedDay = !currentClass && !effectiveNextClass

             if (isFinishedDay) {
               return (
                 <div className="td-tile td-hero td-c8">
                   <svg className="wm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                   <small><i></i>ESTADO DE LA JORNADA</small>
                   <strong>Jornada finalizada, no tiene más clases programadas.</strong>
                 </div>
               )
             }

             return (
                 <div className="td-tile td-hero td-c8">
                   <svg className="wm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                   <div className="td-pair">
                     <div className="td-cur">
                       <small><i style={{ background: currentClass ? 'var(--td-acc)' : '#e9b56a' }}></i> {currentClass ? `EN CURSO (${currentClass.period}ª HORA)` : 'SIN CLASE ACTIVA'}</small>
                       <strong>{currentClass ? currentClass.subject : 'Tiempo de Receso o Libre'}</strong>
                       
                       {currentClass && (
                         <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                           <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16}/> Grupo {currentClass.group}</span>
                           <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16}/> Termina ~{currentClass.remaining} min</span>
                         </div>
                       )}
                     </div>
                     
                     {effectiveNextClass && (
                       <div className="td-nxt">
                         <small><Clock size={14}/> PRÓXIMA CLASE</small>
                         <strong>{effectiveNextClass.subject}</strong>
                         <span><Users size={14}/> Grupo {effectiveNextClass.group}</span>
                       </div>
                     )}
                   </div>
                 </div>
             )
          })()}

          {/* Progress Card */}
          <div className="td-tile td-prog td-c4">
            <svg className="wm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M8 12l3 3 5-6"/></svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
              <small>PROGRESO DE HOY</small>
              <span className="ic"><CheckCircle2 size={24} /></span>
            </div>
            <div style={{ position: 'relative' }}>
              <div className="num">{completedClasses}<span>/ {totalClasses}</span></div>
              <div className="td-bar"><b style={{ width: totalClasses > 0 ? `${(completedClasses / totalClasses) * 100}%` : '0%' }}></b></div>
            </div>
          </div>

          {/* Schedule */}
          <div className="td-tile td-panel td-c6">
            <div className="td-ph">
              <div>
                <h2>Horario de Hoy <span className="td-chip">{new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span></h2>
                <p>Clases presenciales del día</p>
              </div>
              <span className="td-go"><Calendar size={20} /></span>
            </div>
            
            {isWeekend ? (
              <div className="td-empty"><span className="td-go"><Calendar size={24}/></span>Hoy es fin de semana, no tienes clases programadas.</div>
            ) : todaySchedule.length === 0 ? (
              <div className="td-empty"><span className="td-go"><Calendar size={24}/></span>No tienes clases asignadas para el día de hoy.</div>
            ) : (
              <div style={{ marginTop: '16px' }}>
                {todaySchedule.map(cls => (
                  <div key={cls.id} className={`td-sch ${cls.isFree ? 'free' : cls.isCurrent ? 'curr' : 'reg'}`}>
                    <div>
                       <h4>{cls.isFree ? <span style={{fontStyle:'italic', color:'var(--td-mute)'}}>Sin Clase Asignada</span> : cls.subject}</h4>
                       {!cls.isFree && <div className="info"><Users size={14} /> Grupo {cls.group}</div>}
                    </div>
                    <div className="right">
                       <b>{cls.period}ª Hora</b>
                       <span>{cls.startTime}{cls.endTime ? ` - ${cls.endTime}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Activities */}
          <div className="td-tile td-panel td-c6">
            <div className="td-ph">
              <div>
                <h2>Próximas Actividades</h2>
                <p>Agenda Institucional</p>
              </div>
              <span className="td-go"><Calendar size={20} /></span>
            </div>
            
            {upcomingEvents.length === 0 ? (
              <div className="td-empty" style={{ fontStyle: 'italic', fontSize: '13px' }}>No hay actividades próximas programadas.</div>
            ) : (
              <div style={{ marginTop: '16px' }}>
                {upcomingEvents.map(ev => (
                  <div key={ev.id} className="td-event">
                    <div>
                      <h4>{ev.title}</h4>
                      <p>{new Date(ev.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} • {new Date(ev.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                    </div>
                    <span className="td-event-cat">{ev.event_categories?.name || 'General'}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="td-foot"><Link href="/teacher/institutional-agenda">Ver Agenda Completa →</Link></div>
          </div>
        </motion.section>
      )}

      {activeTab === 'virtual' && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="td-filters">
            <label className="td-search">
              <Search size={20} className="text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar curso o materia..."
              />
            </label>
            {availableGrades.length > 0 && (
              <div className="td-sel">
                <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                  <option value="ALL">Todos los grados</option>
                  {availableGrades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade.toLowerCase().includes('grado') ? grade : `${grade} Grado`}
                    </option>
                  ))}
                </select>
                <Filter size={16} />
              </div>
            )}
          </div>

          {filteredCourses.length === 0 ? (
             <div className="td-tile td-empty" style={{ padding: '40px' }}>
               <span className="td-go"><Search size={24}/></span>
               No se encontraron cursos que coincidan.
             </div>
          ) : (
             <div className="td-grid">
               {filteredCourses.map(course => (
                 <Link href={`/teacher/courses/${course.slug || course.id}`} key={course.id} className="td-tile td-pc">
                   <div className="h">
                     <span className="td-go"><BookOpen size={20} /></span>
                     <h3>{course.title}</h3>
                   </div>
                   <p className="p">{course.description || 'Sin descripción disponible para este curso.'}</p>
                   <div className="foot">
                     <span>{course.gradeLevel || 'S/G'}</span>
                     <span className="td-pc-stats">
                       <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14}/> {course.studentsCount}</span>
                       <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={14}/> {course.modulesCount}</span>
                     </span>
                   </div>
                 </Link>
               ))}
             </div>
          )}
        </motion.section>
      )}
    </div>
  )
}
