'use client'

import React, { useMemo, useState } from 'react'
import { usePlanillaStore } from '@/store/usePlanillaStore'
import { Users, CheckCircle2, XCircle, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

export function AttendanceDashboard() {
  const { students, sessions, attendance } = usePlanillaStore()
  const [isExpandedMobile, setIsExpandedMobile] = useState(false)

  const stats = useMemo(() => {
    let totalAsistencias = 0
    let totalInasistencias = 0
    let totalExcusas = 0
    let totalTardanzas = 0

    students.forEach(student => {
      sessions.forEach(session => {
        const status = attendance[student.id]?.[session.id]
        if (status === 'A') totalAsistencias++
        else if (status === 'I') totalInasistencias++
        else if (status === 'E') totalExcusas++
        else if (status === 'T') totalTardanzas++
      })
    })

    const totalRegistros = totalAsistencias + totalInasistencias + totalExcusas + totalTardanzas
    
    return {
      asistencias: {
        count: totalAsistencias,
        percentage: totalRegistros > 0 ? Math.round((totalAsistencias / totalRegistros) * 100) : 0
      },
      inasistencias: {
        count: totalInasistencias,
        percentage: totalRegistros > 0 ? Math.round((totalInasistencias / totalRegistros) * 100) : 0
      },
      excusas: {
        count: totalExcusas,
        percentage: totalRegistros > 0 ? Math.round((totalExcusas / totalRegistros) * 100) : 0
      },
      tardanzas: {
        count: totalTardanzas,
        percentage: totalRegistros > 0 ? Math.round((totalTardanzas / totalRegistros) * 100) : 0
      },
      totalRegistros
    }
  }, [students, sessions, attendance])

  return (
    <div className="mb-2 sm:mb-3">
      {/* 1. Vista Móvil Compacta (< sm): Strip de una sola línea ultraliviana */}
      <div className="sm:hidden">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5 text-xs font-medium">
            {/* Total Alumnos */}
            <div 
              className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
              title={`${students.length} estudiantes`}
            >
              <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="font-bold">{students.length}</span>
            </div>

            {/* Asistencias */}
            <div 
              className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
              title={`${stats.asistencias.percentage}% Asistencias (${stats.asistencias.count})`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold">{stats.asistencias.percentage}%</span>
            </div>

            {/* Tardanzas */}
            <div 
              className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
              title={`${stats.tardanzas.percentage}% Llegadas Tarde (${stats.tardanzas.count})`}
            >
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="font-bold">{stats.tardanzas.percentage}%</span>
            </div>

            {/* Inasistencias */}
            <div 
              className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
              title={`${stats.inasistencias.percentage}% Inasistencias (${stats.inasistencias.count})`}
            >
              <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <span className="font-bold">{stats.inasistencias.percentage}%</span>
            </div>

            {/* Excusas */}
            <div 
              className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400"
              title={`${stats.excusas.percentage}% Excusas (${stats.excusas.count})`}
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="font-bold">{stats.excusas.percentage}%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpandedMobile(prev => !prev)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
            aria-label={isExpandedMobile ? "Ocultar tarjetas de métricas" : "Ver tarjetas de métricas"}
          >
            <span>{isExpandedMobile ? 'Menos' : 'Métricas'}</span>
            {isExpandedMobile ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Desglose desplegable opcional en móvil */}
        {isExpandedMobile && (
          <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Alumnos</p>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">{students.length}</h4>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] text-emerald-600 uppercase font-semibold">Asistencias</p>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">{stats.asistencias.percentage}% <span className="text-xs font-normal text-slate-400">({stats.asistencias.count})</span></h4>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] text-amber-600 uppercase font-semibold">Llegadas Tarde</p>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">{stats.tardanzas.percentage}% <span className="text-xs font-normal text-slate-400">({stats.tardanzas.count})</span></h4>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] text-red-600 uppercase font-semibold">Inasistencias</p>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">{stats.inasistencias.percentage}% <span className="text-xs font-normal text-slate-400">({stats.inasistencias.count})</span></h4>
            </div>
            <div className="col-span-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-semibold">Excusas Justificadas</p>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">{stats.excusas.percentage}% <span className="text-xs font-normal text-slate-400">({stats.excusas.count})</span></h4>
            </div>
          </div>
        )}
      </div>

      {/* 2. Vista Tablet / Escritorio (>= sm): Grid de 5 columnas original */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 sm:gap-3 overflow-hidden">
          <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 break-words w-full">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-tight">Total Estudiantes</p>
            <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-0">{students.length}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 sm:gap-3 overflow-hidden">
          <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 break-words w-full">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-tight">Asistencias</p>
            <div className="flex items-baseline gap-1 sm:gap-1.5 mt-0.5 sm:mt-0">
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">{stats.asistencias.percentage}%</h3>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">({stats.asistencias.count})</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 sm:gap-3 overflow-hidden">
          <div className="p-1.5 sm:p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 break-words w-full">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-tight">Llegadas Tarde</p>
            <div className="flex items-baseline gap-1 sm:gap-1.5 mt-0.5 sm:mt-0">
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">{stats.tardanzas.percentage}%</h3>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">({stats.tardanzas.count})</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 sm:gap-3 overflow-hidden">
          <div className="p-1.5 sm:p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 break-words w-full">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-tight">Inasistencias</p>
            <div className="flex items-baseline gap-1 sm:gap-1.5 mt-0.5 sm:mt-0">
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">{stats.inasistencias.percentage}%</h3>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">({stats.inasistencias.count})</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 sm:gap-3 overflow-hidden">
          <div className="p-1.5 sm:p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 break-words w-full">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-tight">Excusas</p>
            <div className="flex items-baseline gap-1 sm:gap-1.5 mt-0.5 sm:mt-0">
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">{stats.excusas.percentage}%</h3>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">({stats.excusas.count})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

