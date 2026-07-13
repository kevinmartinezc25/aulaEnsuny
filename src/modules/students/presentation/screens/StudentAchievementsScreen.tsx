'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Award,
  Flame,
  Rocket,
  Code2,
  Calendar,
  Sparkles,
  Info,
  TrendingUp
} from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'

interface Achievement {
  id: string
  title: string
  description: string
  date: string
  icon: React.ReactNode
  iconBg: string
  points: number
}

export function StudentAchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  const mockAchievements: Achievement[] = [
    {
      id: 'ach-1',
      title: 'Racha de 7 días',
      description: 'Entraste a la plataforma todos los días durante una semana.',
      date: '21 de mayo, 2026',
      icon: <Flame className="h-6 w-6 text-orange-500" />,
      iconBg: 'bg-orange-50 dark:bg-orange-950/30',
      points: 100
    },
    {
      id: 'ach-2',
      title: 'Explorador STEM',
      description: 'Alcanzaste el Nivel 12 en asignaturas científicas.',
      date: '20 de mayo, 2026',
      icon: <Rocket className="h-6 w-6 text-indigo-500" />,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/30',
      points: 150
    },
    {
      id: 'ach-3',
      title: 'Programador Inicial',
      description: 'Completaste satisfactoriamente 5 proyectos prácticos de Python.',
      date: '18 de mayo, 2026',
      icon: <Code2 className="h-6 w-6 text-emerald-500" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      points: 200
    },
    {
      id: 'ach-4',
      title: 'Perfect Score',
      description: 'Obtuviste nota de 5.0 en un quiz trimestral.',
      date: '10 de mayo, 2026',
      icon: <Award className="h-6 w-6 text-yellow-500" />,
      iconBg: 'bg-yellow-50 dark:bg-yellow-950/30',
      points: 250
    }
  ]

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        setTimeout(() => {
          setAchievements(mockAchievements)
          setLoading(false)
        }, 600)
        return
      }

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: dbAchievements } = await supabase
            .from('student_achievements')
            .select('*, achievements(*)')
            .eq('student_id', user.id)

          const mapDbAchievement = (sa: any): Achievement => {
            const ach = sa.achievements
            let iconBg = 'bg-blue-50 dark:bg-blue-950/30'
            let iconEl = <Award className="h-6 w-6 text-blue-500" />
            
            if (ach.badge_icon === 'flame') {
              iconBg = 'bg-orange-50 dark:bg-orange-950/30'
              iconEl = <Flame className="h-6 w-6 text-orange-500" />
            } else if (ach.badge_icon === 'rocket') {
              iconBg = 'bg-indigo-50 dark:bg-indigo-950/30'
              iconEl = <Rocket className="h-6 w-6 text-indigo-500" />
            } else if (ach.badge_icon === 'code' || ach.badge_icon === 'code2') {
              iconBg = 'bg-emerald-50 dark:bg-emerald-950/30'
              iconEl = <Code2 className="h-6 w-6 text-emerald-500" />
            }

            return {
              id: sa.id,
              title: ach.title,
              description: ach.description,
              date: new Date(sa.awarded_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
              icon: iconEl,
              iconBg,
              points: ach.points || 0
            }
          }

          setAchievements((dbAchievements || []).map(mapDbAchievement))
        }
      } catch (error) {
        console.error('Error al cargar logros:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const totalPoints = achievements.reduce((acc, curr) => acc + curr.points, 0)
  const nextLevelPoints = 1000
  const progressPercent = Math.min((totalPoints / nextLevelPoints) * 100, 100)

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mis Logros
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Revisa tus medallas obtenidas, estadísticas y puntos de aprendizaje acumulados.
          </p>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-base shadow-md shadow-blue-500/20 self-start md:self-auto">
          <Award className="h-5.5 w-5.5 animate-pulse" />
          <span>{totalPoints} Puntos Totales</span>
        </div>
      </div>

      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <Award className="h-10 w-10 text-slate-350 animate-bounce" />
            <p className="text-sm font-medium text-slate-400">Cargando tus logros...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Card de Progreso General */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" /> Nivel de Aprendizaje
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Llega a <strong>{nextLevelPoints} pts</strong> para subir al nivel de <strong className="text-blue-500">Estudiante Avanzado</strong> y desbloquear nuevas insignias.
              </p>
              
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-450">Progreso de Nivel</span>
                  <span className="text-slate-700 dark:text-slate-300">{totalPoints} / {nextLevelPoints} pts</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-50 dark:border-slate-800/40 pt-4 md:pt-0 md:pl-6 text-center">
              <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
                Nivel {Math.floor(totalPoints / 250) + 1}
              </span>
              <p className="text-[11px] text-slate-450 mt-1 font-semibold uppercase tracking-wider">Rango Actual</p>
            </div>
          </div>

          {/* Listado de Logros */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Logros Desbloqueados ({achievements.length})
            </h3>

            {achievements.length === 0 ? (
              <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center dark:border-slate-800/60 dark:bg-slate-900 shadow-sm max-w-xl mx-auto">
                <Award className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Aún sin logros</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Comienza a participar activamente en tus cursos y resolver tareas para desbloquear tu primera insignia.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {achievements.map((ach, idx) => (
                  <motion.div
                    key={ach.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className="group relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 hover:shadow-md hover:-translate-y-0.5 transition-all text-center flex flex-col justify-between"
                  >
                    <div className="flex flex-col items-center">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-4 transition-transform group-hover:scale-110 duration-300 ${ach.iconBg}`}>
                        {ach.icon}
                      </div>
                      <h4 className="font-bold text-slate-950 dark:text-white text-base">
                        {ach.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {ach.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between text-[11px] text-slate-450">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {ach.date}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+{ach.points} pts</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
