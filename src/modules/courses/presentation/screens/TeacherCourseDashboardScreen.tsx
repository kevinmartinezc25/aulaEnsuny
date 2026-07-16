'use client'

import React, { useState, useEffect } from 'react'
import { Users, FolderOpen, TrendingUp, HelpCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getTeacherCourseStats, TeacherCourseStats } from '../../application/teacherActions'
import { getCourseJoinCode } from '../../application/joinRequestsActions'

export function TeacherCourseDashboardScreen({ courseId }: { courseId: string }) {
  const [stats, setStats] = useState<TeacherCourseStats | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [data, code] = await Promise.all([
          getTeacherCourseStats(courseId),
          getCourseJoinCode(courseId)
        ])
        setStats(data)
        setJoinCode(code)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [courseId])

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Cabecera Interna */}
      <div className="space-y-1">
        <div className="flex items-center text-xs font-medium text-slate-400 mb-2">
          <span>Mis materias</span>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-white">{stats.title}</span>
          <span className="mx-2">/</span>
          <span>Gestión del Curso</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Gestión del Curso
        </h1>
        {joinCode ? (
          <div className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
            <span>Código de acceso</span>
            <span className="font-mono tracking-[0.2em]">{joinCode}</span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Aún no hay un código de acceso configurado para este curso.
          </p>
        )}
        <p className="text-slate-500 dark:text-slate-400">
          Supervisa el rendimiento y contenido de esta materia.
        </p>
      </div>

      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Módulos activos', value: stats.modulesCount, icon: FolderOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
          { title: 'Quizzes creados', value: stats.quizzesCount, icon: HelpCircle, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
          { title: 'Estudiantes', value: stats.studentsCount, icon: Users, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
          { title: 'Promedio del curso', value: stats.averageGrade.toFixed(1), icon: TrendingUp, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Gráficas y Resumen Adicional */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gráfico Principal */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900">
          <div className="pb-4 border-b border-slate-50 dark:border-slate-800/40 text-left">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Rendimiento Histórico Promedio
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Evolución del curso a lo largo de las semanas</p>
          </div>
          <div className="h-[300px] mt-6 w-full flex items-center justify-center">
            {stats.chartData.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-xs font-semibold text-slate-400">Sin datos de calificaciones suficientes.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} domain={[1.0, 5.0]} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="promedio" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPromedio)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Alertas y Progreso */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4">Estado del Grupo</h3>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Estudiantes Aprobados</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{stats.activeStudents}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${stats.studentsCount > 0 ? (stats.activeStudents / stats.studentsCount) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Estudiantes en Riesgo</span>
                  <span className="text-red-600 dark:text-red-400">{stats.atRiskStudents}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${stats.studentsCount > 0 ? (stats.atRiskStudents / stats.studentsCount) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
