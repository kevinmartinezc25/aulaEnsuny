'use client'

import React, { useState, useMemo } from 'react'
import { AssistedSubject, AssistedAchievement, AssistedActivity, AssistedGrade } from '@/modules/planilla-asistida/application/actions'
import { ArrowLeft, BookOpen, Calendar, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface StudentSubjectViewProps {
  subject: AssistedSubject
  achievements: AssistedAchievement[]
  activities: AssistedActivity[]
  grades: AssistedGrade[]
  studentName: string
}

export function StudentSubjectClientView({ subject, achievements, activities, grades }: StudentSubjectViewProps) {
  const [activeAchievementId, setActiveAchievementId] = useState<string>(achievements[0]?.id || '')

  // Calcular promedios (igual a la lógica del docente)
  const results = useMemo(() => {
    if (!activeAchievementId) return null
    
    const achActivities = activities.filter(a => a.achievement_id === activeAchievementId)
    const hacerActs = achActivities.filter(a => a.component_type === 'hacer')
    const saberActs = achActivities.filter(a => a.component_type === 'saber')
    const serActs = achActivities.filter(a => a.component_type === 'ser')

    const getComponentAvg = (acts: AssistedActivity[]) => {
      if (acts.length === 0) return null
      let sum = 0
      let count = 0
      acts.forEach(act => {
        const grade = grades.find(g => g.activity_id === act.id)
        if (grade && grade.grade_value !== null) {
          sum += grade.grade_value
          count++
        }
      })
      return count > 0 ? sum / count : null
    }

    const hacerAvg = getComponentAvg(hacerActs)
    const saberAvg = getComponentAvg(saberActs)
    const serAvg = getComponentAvg(serActs)

    let finalAvg = null
    if (hacerAvg !== null || saberAvg !== null || serAvg !== null) {
      let totalWeight = 0
      let weightedSum = 0
      
      if (hacerAvg !== null) { totalWeight += 35; weightedSum += hacerAvg * 35 }
      if (saberAvg !== null) { totalWeight += 35; weightedSum += saberAvg * 35 }
      if (serAvg !== null) { totalWeight += 30; weightedSum += serAvg * 30 }
      
      finalAvg = totalWeight > 0 ? weightedSum / totalWeight : null
    }

    return { hacerActs, saberActs, serActs, hacerAvg, saberAvg, serAvg, finalAvg }
  }, [activeAchievementId, activities, grades])

  const getPerformanceScale = (score: number | null) => {
    if (score === null) return null
    if (score >= 4.6) {
      return {
        label: 'Superior',
        color: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        cardBorder: 'border-emerald-200 dark:border-emerald-900/50',
        glowBg: 'bg-emerald-500/10'
      }
    }
    if (score >= 4.0) {
      return {
        label: 'Alto',
        color: 'text-blue-600 dark:text-blue-400',
        badgeBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        cardBorder: 'border-blue-200 dark:border-blue-900/50',
        glowBg: 'bg-blue-500/10'
      }
    }
    if (score >= 3.0) {
      return {
        label: 'Básico',
        color: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        cardBorder: 'border-amber-200 dark:border-amber-900/50',
        glowBg: 'bg-amber-500/10'
      }
    }
    return {
      label: 'Insuficiente',
      color: 'text-red-600 dark:text-red-400',
      badgeBg: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800',
      cardBorder: 'border-red-200 dark:border-red-900/50',
      glowBg: 'bg-red-500/10'
    }
  }

  const formatGrade = (val: number | null) => {
    if (val === null) return <span className="text-slate-400 italic font-normal text-sm">Sin calificar</span>
    return <span className={`font-bold ${val < 3.0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{val.toFixed(2)}</span>
  }

  const formatAvg = (val: number | null) => {
    if (val === null) return <span className="text-slate-400 italic text-sm">Pendiente</span>
    return <span className={`font-bold ${val < 3.0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{val.toFixed(2)}</span>
  }

  const renderComponentSection = (title: string, acts: AssistedActivity[], avg: number | null, weight: string) => {
    if (acts.length === 0) return null
    return (
      <div className="mb-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-wider">
            {title} <span className="text-slate-500 font-medium ml-1">· {weight}</span>
          </h4>
          <div className="text-sm">
            Promedio: {formatAvg(avg)}
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {acts.map(act => {
            const g = grades.find(g => g.activity_id === act.id)?.grade_value || null
            return (
              <div key={act.id} className="px-5 py-3 flex justify-between items-center">
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{act.name}</span>
                <div className="bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800 text-right min-w-[80px]">
                  {formatGrade(g)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (achievements.length === 0) {
    return (
      <div className="space-y-6">
        <Link 
          href="/consulta-calificaciones" 
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border-2 border-emerald-500/30 text-xs sm:text-sm font-bold text-[#1F4E31] dark:text-emerald-300 transition-all active:scale-95 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" /> 
          <span>Volver a Mis Materias</span>
        </Link>
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Materia sin logros configurados</h2>
          <p className="text-slate-500">El docente aún no ha registrado los logros para esta materia en el período actual.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link 
        href="/consulta-calificaciones" 
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border-2 border-emerald-500/30 text-xs sm:text-sm font-bold text-[#1F4E31] dark:text-emerald-300 transition-all active:scale-95 shadow-xs"
      >
        <ArrowLeft className="h-4 w-4" /> 
        <span>Volver a Mis Materias</span>
      </Link>

      {/* Header Materia */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-full -mr-10 -mt-10 opacity-50" />
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight pr-10">
          {subject.name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="inline-flex items-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm px-3 py-1 rounded-full font-medium border border-slate-200 dark:border-slate-700">
            <BookOpen className="h-4 w-4 mr-1.5 opacity-70" />
            {subject.grade === 0 ? 'Nivelatorio' : subject.grade === 12 ? 'PFC-12' : subject.grade === 13 ? 'PFC-13' : `${subject.grade}°`}{subject.group_number ? ` - ${subject.group_number}` : ''}
          </span>
          <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm px-3 py-1 rounded-full font-medium border border-emerald-200 dark:border-emerald-800/50">
            <Calendar className="h-4 w-4 mr-1.5 opacity-70" />
            Periodo: {subject.period}
          </span>
        </div>
      </div>

      {/* Selector de Logros (Móvil) */}
      <div className="sm:hidden relative">
        <select 
          className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
          value={activeAchievementId}
          onChange={(e) => setActiveAchievementId(e.target.value)}
        >
          {achievements.map((ach, idx) => (
            <option key={ach.id} value={ach.id}>Logro {idx + 1}: {ach.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
      </div>

      {/* Tabs de Logros (Desktop) */}
      <div className="hidden sm:flex overflow-x-auto custom-scrollbar border-b border-slate-200 dark:border-slate-800 hide-scrollbar pb-px">
        {achievements.map((ach, idx) => (
          <button
            key={ach.id}
            onClick={() => setActiveAchievementId(ach.id)}
            className={`whitespace-nowrap px-6 py-3 border-b-2 font-semibold text-sm transition-colors ${
              activeAchievementId === ach.id
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            Logro {idx + 1}
          </button>
        ))}
      </div>

      {/* Contenido del Logro */}
      {results && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {achievements.find(a => a.id === activeAchievementId)?.name}
            </h3>
            {achievements.find(a => a.id === activeAchievementId)?.description && (
              <p className="text-slate-500 text-sm">
                {achievements.find(a => a.id === activeAchievementId)?.description}
              </p>
            )}
          </div>

          {/* Componentes */}
          {results.hacerActs.length === 0 && results.saberActs.length === 0 && results.serActs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800 my-4 shadow-sm">
              <p className="text-slate-500 dark:text-slate-400 text-sm">El docente aún no ha registrado actividades evaluables para este logro.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {renderComponentSection('Hacer', results.hacerActs, results.hacerAvg, '35%')}
              {renderComponentSection('Saber', results.saberActs, results.saberAvg, '35%')}
              {renderComponentSection('Ser', results.serActs, results.serAvg, '30%')}
            </div>
          )}

          {/* Promedio Final del Logro */}
          {(() => {
            const perf = getPerformanceScale(results.finalAvg)
            return (
              <div
                className={`mt-8 bg-white dark:bg-slate-900 rounded-3xl border ${
                  perf ? perf.cardBorder : 'border-slate-200 dark:border-slate-800'
                } p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-4 relative overflow-hidden`}
              >
                {perf && (
                  <div
                    className={`absolute top-0 right-0 w-44 h-44 ${perf.glowBg} rounded-bl-full pointer-events-none -mr-12 -mt-12 opacity-80`}
                  />
                )}
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Promedio del Logro</h3>
                    {perf && (
                      <span
                        className={`inline-flex items-center text-xs font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border ${perf.badgeBg}`}
                      >
                        {perf.label}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Calculado según los porcentajes (Hacer 35%, Saber 35%, Ser 30%)
                  </p>
                </div>

                <div className="relative z-10 flex flex-col items-center sm:items-end">
                  <div
                    className={`text-3xl sm:text-4xl font-black px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner ${
                      perf ? perf.color : 'text-slate-400'
                    }`}
                  >
                    {results.finalAvg !== null ? results.finalAvg.toFixed(2) : '--'}
                  </div>
                  {perf && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                      Desempeño: <strong className={perf.color}>{perf.label}</strong>
                    </span>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
