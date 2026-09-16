'use client'

import React, { useMemo } from 'react'
import { usePlanillaStore } from '@/store/usePlanillaStore'
import { Users, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export function AttendanceDashboard() {
  const { students, sessions, attendance } = usePlanillaStore()

  const stats = useMemo(() => {
    let totalAsistencias = 0
    let totalInasistencias = 0
    let totalExcusas = 0

    students.forEach(student => {
      sessions.forEach(session => {
        const status = attendance[student.id]?.[session.id]
        if (status === 'A') totalAsistencias++
        else if (status === 'I') totalInasistencias++
        else if (status === 'E') totalExcusas++
      })
    })

    const totalRegistros = totalAsistencias + totalInasistencias + totalExcusas
    
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
      totalRegistros
    }
  }, [students, sessions, attendance])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Estudiantes</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{students.length}</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Asistencias</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.asistencias.percentage}%</h3>
            <span className="text-xs font-medium text-slate-400">({stats.asistencias.count})</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
          <XCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Inasistencias</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.inasistencias.percentage}%</h3>
            <span className="text-xs font-medium text-slate-400">({stats.inasistencias.count})</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Excusas</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.excusas.percentage}%</h3>
            <span className="text-xs font-medium text-slate-400">({stats.excusas.count})</span>
          </div>
        </div>
      </div>

    </div>
  )
}
