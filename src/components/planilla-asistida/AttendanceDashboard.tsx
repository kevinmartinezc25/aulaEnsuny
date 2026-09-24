'use client'

import React, { useMemo } from 'react'
import { usePlanillaStore } from '@/store/usePlanillaStore'
import { Users, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'

export function AttendanceDashboard() {
  const { students, sessions, attendance } = usePlanillaStore()

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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
      
      <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 overflow-hidden">
        <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 break-words w-full">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-tight">Total Estudiantes</p>
          <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-0">{students.length}</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 overflow-hidden">
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

      <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 overflow-hidden">
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

      <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 overflow-hidden">
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

      <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 overflow-hidden">
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
  )
}

