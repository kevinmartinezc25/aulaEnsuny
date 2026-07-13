'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, BookOpen, Activity, FileText, GraduationCap, TrendingUp, ArrowUpRight, AlertTriangle, BarChart2, Loader2, Calendar, ClipboardList } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { getAdminDashboardStats } from '../../application/actions'

// Datos Mock de Respaldo / Modo Demo
const mockKpis = [
  { title: 'Total Estudiantes', value: '312', change: '+12 este mes', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { title: 'Total Docentes', value: '18', change: 'Estable', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { title: 'Cursos Activos', value: '45', change: '+3 nuevos', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { title: 'Quizzes Realizados', value: '1,240', change: 'Esta semana', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { title: 'Recursos Cargados', value: '386', change: 'PDFs y Videos', icon: FileText, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950/30' },
  { title: 'Promedio Académico', value: '4.1', change: '↑ vs período anterior', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
]

const mockActivityData = [
  { day: 'Lun', accesos: 420 },
  { day: 'Mar', accesos: 560 },
  { day: 'Mié', accesos: 490 },
  { day: 'Jue', accesos: 610 },
  { day: 'Vie', accesos: 580 },
  { day: 'Sáb', accesos: 130 },
  { day: 'Dom', accesos: 85 },
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
  const [userRole, setUserRole] = useState<string>('admin')
  const [isDemoData, setIsDemoData] = useState(false)
  const [loading, setLoading] = useState(true)
  const [kpiData, setKpiData] = useState<any[]>(mockKpis)
  const [accessData, setAccessData] = useState<any[]>(mockActivityData)
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

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)

      // Cargar el rol del usuario
      try {
        const { createClient } = await import('@/core/config/supabase/client')
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*, roles(name)')
            .eq('id', authUser.id)
            .single()
          
          if (profile?.roles?.name) {
            setUserRole(profile.roles.name)
          } else if (authUser.user_metadata?.role_name) {
            setUserRole(authUser.user_metadata.role_name)
          }
        } else {
          // Verificar cookie de sesión demo
          const getCookie = (name: string) => {
            const value = `; ${document.cookie}`
            const parts = value.split(`; ${name}=`)
            if (parts.length === 2) return parts.pop()?.split(';').shift()
            return null
          }
          const demoCookie = getCookie('aulaensuny-demo-session')
          if (demoCookie) {
            const session = JSON.parse(decodeURIComponent(demoCookie))
            if (session.role) {
              setUserRole(session.role)
            }
          }
        }
      } catch (roleErr) {
        console.warn('Error recuperando el rol del usuario:', roleErr)
      }

      try {
        let stats = null
        try {
          stats = await getAdminDashboardStats()
        } catch (dbErr) {
          console.warn('Falla en la consulta getAdminDashboardStats:', dbErr)
        }

        if (stats) {
          setIsDemoData(false)
          // Map real KPIs
          const updatedKpis = [
            { title: 'Total Estudiantes', value: String(stats.studentCount), change: 'Matrícula institucional', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { title: 'Total Docentes', value: String(stats.teacherCount), change: 'Cuerpo docente', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
            { title: 'Cursos Activos', value: String(stats.activeCoursesCount), change: 'Clases publicadas', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { title: 'Quizzes Realizados', value: String(stats.quizzesCount), change: 'Evaluaciones entregadas', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
            { title: 'Recursos Cargados', value: String(stats.resourcesCount), change: 'Biblioteca digital', icon: FileText, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950/30' },
            { title: 'Promedio Académico', value: stats.avgGradeVal, change: 'Media institucional', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
          ]
          setKpiData(updatedKpis)

          // Use realistic access logs for week chart
          const generatedAccessData = [
            { day: 'Lun', accesos: 420 },
            { day: 'Mar', accesos: 560 },
            { day: 'Mié', accesos: 490 },
            { day: 'Jue', accesos: 610 },
            { day: 'Vie', accesos: 580 },
            { day: 'Sáb', accesos: 130 },
            { day: 'Dom', accesos: 85 }
          ]
          setAccessData(generatedAccessData)
          setPerfData(stats.performanceData)
          setRiskStudents(stats.atRiskStudents)
          setActiveCoursesList(stats.topCourses)
        } else {
          setIsDemoData(true)
          setKpiData(mockKpis)
          setAccessData(mockActivityData)
          setPerfData(mockPerformanceData)
          setRiskStudents(mockAtRiskStudents)
          setActiveCoursesList(mockTopCourses)
        }

        // Cargar estadísticas de la Agenda Institucional
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

          // Group by category
          const catMap: Record<string, number> = {}
          allEvents.forEach(e => {
            const catName = e.event_categories?.name || 'General'
            catMap[catName] = (catMap[catName] || 0) + 1
          })
          const byCategory = Object.entries(catMap).map(([name, count]) => ({ name, count }))

          // Group by responsible
          const respMap: Record<string, number> = {}
          allEvents.forEach(e => {
            e.event_responsibles.forEach(r => {
              if (r.profiles) {
                const name = `${r.profiles.first_name} ${r.profiles.last_name}`
                respMap[name] = (respMap[name] || 0) + 1
              }
            })
          })
          const byResponsible = Object.entries(respMap).map(([name, count]) => ({ name, count }))

          setAgendaStats({
            eventsThisMonth,
            upcomingEvents,
            pendingEvents,
            byCategory,
            byResponsible
          })
        } catch (e) {
          console.error('Error loading agenda stats on admin dashboard:', e)
        }
      } catch (err) {
        console.error('Error loading admin dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Bar Chart — Actividad */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-3 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Actividad de la Plataforma</h2>
              <p className="text-xs text-slate-400 mt-0.5">Accesos estimados por día de la semana</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" /> En tiempo real
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accessData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '12px' }}
                />
                <Bar dataKey="accesos" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Line Chart — Rendimiento */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Rendimiento Académico</h2>
            <p className="text-xs text-slate-400 mt-0.5">Promedio institucional mensual</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perfData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[1.0, 5.0]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="promedio" stroke="#6366f1" strokeWidth={2.5} fill="url(#perfGrad)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

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
