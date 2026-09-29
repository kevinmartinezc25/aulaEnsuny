'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users, BookOpen, Activity, FileText, GraduationCap, TrendingUp,
  ArrowUpRight, AlertTriangle, BarChart2, Loader2, Calendar, ClipboardList,
  UserCheck, Link as LinkIcon, CheckCircle2
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { getAdminDashboardStats } from '../../application/actions'
import { useUserSessionStore } from '@/store/useUserSessionStore'

const AdminDashboardCharts = dynamic(
  () => import('../components/AdminDashboardCharts'),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 h-72 animate-pulse flex items-center justify-center text-xs text-slate-400">
          Cargando gráfica de actividad...
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 h-72 animate-pulse flex items-center justify-center text-xs text-slate-400">
          Cargando gráfica de rendimiento...
        </div>
      </div>
    )
  }
)

// Datos Mock de Respaldo / Modo Demo
const mockKpis = [
  { title: 'Total Estudiantes', value: '370', change: 'Matrícula institucional', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { title: 'Con Cuenta Virtual', value: '141', change: '38% con acceso', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { title: 'Sin Acceso Virtual', value: '229', change: '62% pendientes', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { title: 'Total Docentes', value: '18', change: 'Cuerpo docente', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { title: 'Cursos Activos', value: '45', change: 'Clases publicadas', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  { title: 'Promedio Académico', value: '4.1', change: 'Media institucional', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
]

const defaultEmptyActivityData = [
  { day: 'Lun', accesos: 0 },
  { day: 'Mar', accesos: 0 },
  { day: 'Mié', accesos: 0 },
  { day: 'Jue', accesos: 0 },
  { day: 'Vie', accesos: 0 },
  { day: 'Sáb', accesos: 0 },
  { day: 'Dom', accesos: 0 },
]

const mockPerformanceData = [
  { month: 'Ago', promedio: 3.8 },
  { month: 'Sep', promedio: 3.9 },
  { month: 'Oct', promedio: 4.0 },
  { month: 'Nov', promedio: 3.7 },
  { month: 'Dic', promedio: 4.2 },
  { month: 'Ene', promedio: 4.1 },
]

const mockAtRiskStudents = [
  { name: 'José Ramírez', grade: 'Grado 8°', avg: 2.4, initials: 'JR' },
  { name: 'María Torres', grade: 'Grado 9°', avg: 2.7, initials: 'MT' },
  { name: 'Luis Sandoval', grade: 'Grado 10°', avg: 2.9, initials: 'LS' },
  { name: 'Ana Herrera', grade: 'Grado 11°', avg: 2.6, initials: 'AH' },
]

const mockTopCourses = [
  { name: 'Física General', completionPct: 82, students: 32 },
  { name: 'Álgebra y Funciones', completionPct: 74, students: 28 },
  { name: 'Inglés Intermedio', completionPct: 91, students: 40 },
  { name: 'Literatura Universal', completionPct: 67, students: 35 },
]

export function AdminDashboardScreen() {
  // ── Leer rol y nombre desde el store de sesión (ya hidratado en el layout) ──
  const sessionUser = useUserSessionStore(state => state.user)
  const [userRole, setUserRole] = useState<string>(sessionUser?.role || 'admin')
  const [rectorName, setRectorName] = useState<string>(sessionUser?.name || '')
  const [isDemoData, setIsDemoData] = useState(false)
  const [loading, setLoading] = useState(true)
  const [studentStats, setStudentStats] = useState({
    total: 370,
    withAccount: 141,
    withoutAccount: 229,
    withAccountPct: 38,
    withoutAccountPct: 62
  })
  const [kpiData, setKpiData] = useState<any[]>(mockKpis)
  const [accessData, setAccessData] = useState<any[]>(defaultEmptyActivityData)
  const [perfData, setPerfData] = useState<any[]>(mockPerformanceData)
  const [riskStudents, setRiskStudents] = useState<any[]>(mockAtRiskStudents)
  const [activeCoursesList, setActiveCoursesList] = useState<any[]>(mockTopCourses)
  const [agendaStats, setAgendaStats] = useState({
    eventsThisMonth: 0,
    upcomingEvents: 0,
    pendingEvents: 0,
    byCategory: [] as { name: string; count: number }[],
    byResponsible: [] as { name: string; count: number }[]
  })

  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Sincronizar rol/nombre cuando el store de sesión se hidrate (si llegó después del primer render)
  useEffect(() => {
    if (sessionUser?.role) setUserRole(sessionUser.role)
    if (sessionUser?.name) {
      // Prioridad: nombre del store; si no hay, consultar schoolInfo de localStorage
      let rector = sessionUser.name
      if (!rector && typeof window !== 'undefined') {
        const storedSchool = localStorage.getItem('schoolInfo')
        if (storedSchool) {
          try {
            const parsed = JSON.parse(storedSchool)
            if (parsed?.rector && parsed.rector !== 'Dr. Fernando Restrepo') rector = parsed.rector
          } catch (e) {}
        }
      }
      setRectorName(rector || 'Administrador Ensuny')
    } else if (!rectorName && typeof window !== 'undefined') {
      // Fallback: leer de schoolInfo o cookie demo si el store aún no tiene nombre
      const storedSchool = localStorage.getItem('schoolInfo')
      if (storedSchool) {
        try {
          const parsed = JSON.parse(storedSchool)
          if (parsed?.rector && parsed.rector !== 'Dr. Fernando Restrepo') {
            setRectorName(parsed.rector)
          }
        } catch (e) {}
      }
    }
  }, [sessionUser])

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)

      try {
        let stats = null
        try {
          stats = await getAdminDashboardStats()
        } catch (dbErr) {
          console.warn('Falla en la consulta getAdminDashboardStats:', dbErr)
        }

        if (stats) {
          setIsDemoData(false)
          setStudentStats({
            total: stats.studentCount,
            withAccount: stats.studentsWithAccount,
            withoutAccount: stats.studentsWithoutAccount,
            withAccountPct: stats.withAccountPct,
            withoutAccountPct: stats.withoutAccountPct
          })
          const updatedKpis = [
            { title: 'Total Estudiantes', value: String(stats.studentCount), change: 'Matrícula institucional', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { title: 'Con Cuenta Virtual', value: String(stats.studentsWithAccount), change: `${stats.withAccountPct}% con acceso`, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { title: 'Sin Acceso Virtual', value: String(stats.studentsWithoutAccount), change: `${stats.withoutAccountPct}% pendientes`, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            { title: 'Total Docentes', value: String(stats.teacherCount), change: 'Cuerpo docente', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
            { title: 'Cursos Activos', value: String(stats.activeCoursesCount), change: 'Clases publicadas', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
            { title: 'Promedio Académico', value: stats.avgGradeVal, change: 'Media institucional', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
          ]
          setKpiData(updatedKpis)
          if (stats.accessData && stats.accessData.length > 0) {
            setAccessData(stats.accessData)
          } else {
            setAccessData(defaultEmptyActivityData)
          }
          setPerfData(stats.performanceData)
          setRiskStudents(stats.atRiskStudents)
          setActiveCoursesList(stats.topCourses)
        } else {
          setIsDemoData(true)
          setKpiData(mockKpis)
          setAccessData(defaultEmptyActivityData)
          setPerfData(mockPerformanceData)
          setRiskStudents(mockAtRiskStudents)
          setActiveCoursesList(mockTopCourses)
        }
      } catch (err) {
        console.error('Error loading admin dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  // Carga de agenda separada — no bloquea los KPIs principales
  useEffect(() => {
    async function loadAgendaStats() {
      try {
        const { getEvents } = await import('@/modules/institutional-agenda/application/actions')
        const allEvents = await getEvents()
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const eventsThisMonth = allEvents.filter(e => {
          const sd = new Date(e.start_date)
          return sd.getMonth() === currentMonth && sd.getFullYear() === currentYear
        }).length

        const upcomingEvents = allEvents.filter(e => new Date(e.start_date) >= now).length
        const pendingEvents = allEvents.filter(e => e.status === 'pending').length

        const catMap: Record<string, number> = {}
        allEvents.forEach(e => {
          const catName = e.event_categories?.name || 'General'
          catMap[catName] = (catMap[catName] || 0) + 1
        })
        const byCategory = Object.entries(catMap).map(([name, count]) => ({ name, count }))

        const respMap: Record<string, number> = {}
        allEvents.forEach(e => {
          e.event_responsibles.forEach((r: any) => {
            if (r.profiles) {
              const name = `${r.profiles.first_name} ${r.profiles.last_name}`
              respMap[name] = (respMap[name] || 0) + 1
            }
          })
        })
        const byResponsible = Object.entries(respMap).map(([name, count]) => ({ name, count }))

        setAgendaStats({ eventsThisMonth, upcomingEvents, pendingEvents, byCategory, byResponsible })
      } catch (e) {
        console.error('Error loading agenda stats on admin dashboard:', e)
      }
    }
    // Diferir 300ms para no competir con la carga principal de KPIs
    const timer = setTimeout(loadAgendaStats, 300)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div className="space-y-2">
            <div className="h-3 w-40 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-8 w-72 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-3 w-56 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
          <div className="h-7 w-40 rounded-full bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        </div>
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3 animate-pulse">
              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 rounded-3xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 h-72 animate-pulse" />
          <div className="lg:col-span-2 rounded-3xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 h-72 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{today}</p>
          <div className="flex flex-row items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {userRole === 'superadmin' ? 'Panel de SuperAdministración' : 'Panel Administrativo'}
            </h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border w-fit ${
              userRole === 'superadmin'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30'
                : 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200/50 dark:border-violet-800/30'
            }`}>
              {userRole === 'superadmin' ? 'SuperAdmin' : 'Administrador'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Resumen general del sistema académico institucional.
          </p>
          {rectorName && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Responsable:
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs">
                <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                {rectorName}
              </span>
            </div>
          )}
        </div>
        {isDemoData ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 self-start sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Modo Demo (Datos Simulados)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 self-start sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Sistema en línea (Datos Reales)</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiData.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex flex-col gap-3"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.bg}`}>
                <Icon className={`h-4.5 w-4.5 ${kpi.color}`} />
              </div>
              <div>
                <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{kpi.title}</p>
                <p className="text-[10px] text-slate-400 mt-1">{kpi.change}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Student Virtual Account Coverage Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <GraduationCap className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Acceso y Cobertura de Cuentas Virtuales de Estudiantes
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Monitoreo en tiempo real de alumnos con cuenta virtual activa vs. estudiantes pre-matriculados sin acceso
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aula.ensuny.edu.co'
                navigator.clipboard.writeText(`${baseUrl}/login`)
                toast.success('¡Enlace de acceso copiado al portapapeles!')
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span>Copiar Enlace de Acceso</span>
            </button>
            <Link
              href="/admin/students"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 transition-all"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Gestionar Estudiantes</span>
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Con Cuenta Virtual: {studentStats.withAccount} ({studentStats.withAccountPct}%)
            </span>
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              Sin Acceso Virtual: {studentStats.withoutAccount} ({studentStats.withoutAccountPct}%)
            </span>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            <div
              style={{ width: `${studentStats.withAccountPct}%` }}
              className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
              title={`Con cuenta virtual: ${studentStats.withAccount} (${studentStats.withAccountPct}%)`}
            />
            <div
              style={{ width: `${studentStats.withoutAccountPct}%` }}
              className="bg-amber-400 dark:bg-amber-500 h-full rounded-r-full transition-all duration-500"
              title={`Sin acceso virtual: ${studentStats.withoutAccount} (${studentStats.withoutAccountPct}%)`}
            />
          </div>
        </div>

        {/* Breakdown 3 Columns */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Estudiantes</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{studentStats.total}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Matrícula institucional consolidada</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30">
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Con Cuenta Virtual</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{studentStats.withAccount}</p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Usuarios activos con acceso al campus y cursos</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30">
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Sin Acceso Virtual</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{studentStats.withoutAccount}</p>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">En directorio escolar pendientes de registro</p>
          </div>
        </div>
      </motion.div>

      {/* Charts Row (Lazy Loaded) */}
      <AdminDashboardCharts accessData={accessData} perfData={perfData} />

      {/* Bottom Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* At-Risk Students */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Estudiantes en Riesgo</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">{riskStudents.length} detectados</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/40 flex-1">
            {riskStudents.length === 0 ? (
              <div className="h-full flex items-center justify-center py-12 text-slate-450 dark:text-slate-550 text-xs italic">
                No hay estudiantes en riesgo académico detectados.
              </div>
            ) : (
              riskStudents.map(s => (
                <div key={s.name} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-55/40 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-105 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-xs font-bold">
                      {s.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.grade}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-red-655 dark:text-red-405">{Number(s.avg).toFixed(1)}</span>
                    <p className="text-[10px] text-slate-400">promedio</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Top Courses */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm dark:border-slate-800/60 dark:bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cursos Más Activos</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">Por rendimiento</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/40 flex-1">
            {activeCoursesList.length === 0 ? (
              <div className="h-full flex items-center justify-center py-12 text-slate-450 dark:text-slate-550 text-xs italic">
                No hay cursos activos registrados.
              </div>
            ) : (
              activeCoursesList.map(c => (
                <div key={c.name} className="px-6 py-3.5 hover:bg-slate-55/40 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.name}</p>
                    <span className="text-xs font-bold text-slate-500">{c.completionPct}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-1.5 rounded-full bg-slate-900 dark:bg-white transition-all duration-500" style={{ width: `${c.completionPct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{c.students} est.</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Resumen Agenda Institucional */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Resumen Agenda Institucional</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">Panel consolidado</span>
        </div>

        {/* Small stats badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400">Eventos de este mes</span>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{agendaStats.eventsThisMonth}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400">Próximos eventos</span>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{agendaStats.upcomingEvents}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400">Actividades pendientes</span>
            <p className="text-2xl font-black text-amber-500 mt-1">{agendaStats.pendingEvents}</p>
          </div>
        </div>

        {/* Categories & Responsibles lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Actividades por Categoría</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {agendaStats.byCategory.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin registros</p>
              ) : (
                agendaStats.byCategory.map(c => (
                  <div key={c.name} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/20 p-2.5 rounded-xl text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-350">{c.name}</span>
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">{c.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Actividades por Responsable</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {agendaStats.byResponsible.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin registros</p>
              ) : (
                agendaStats.byResponsible.map(r => (
                  <div key={r.name} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/20 p-2.5 rounded-xl text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-350">{r.name}</span>
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">{r.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
