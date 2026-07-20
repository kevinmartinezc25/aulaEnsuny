'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { getAdminUsers } from '@/modules/admin/application/actions'
import { Loader2, Briefcase, Mail, Search } from 'lucide-react'

export default function WorkloadPage() {
  const [loading, setLoading] = useState(true)
  const [workloads, setWorkloads] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchWorkloads()
  }, [])

  const fetchWorkloads = async () => {
    setLoading(true)
    try {
      // 1. Fetch all teachers from superadmin
      const users = await getAdminUsers()
      const teachers = (users || []).filter(u => u.role === 'teacher')

      // 2. Fetch max hours settings
      const { data: settingsData } = await supabase.from('sch_teacher_settings').select('*')
      const settingsMap = new Map()
      if (settingsData) {
        settingsData.forEach(s => settingsMap.set(s.teacher_id, s.max_hours))
      }

      // 3. Fetch curriculum to count assigned hours and determine level
      const { data: curriculumRows } = await supabase.from('sch_curriculum').select('teacher_id, hours_per_week, sch_groups(name, level)')
      
      const workloadMap = new Map()
      
      if (curriculumRows) {
        curriculumRows.forEach((row: any) => {
          if (!row.teacher_id) return
          if (!workloadMap.has(row.teacher_id)) {
            workloadMap.set(row.teacher_id, { count: 0, groups: new Set(), levelHours: { Primaria: 0, Secundaria: 0, PFC: 0 } })
          }
          const current = workloadMap.get(row.teacher_id)
          const hours = row.hours_per_week || 0
          current.count += hours
          if (row.sch_groups) {
            current.groups.add(row.sch_groups.name)
            if (row.sch_groups.level === 'Primaria') current.levelHours.Primaria += hours
            else if (row.sch_groups.level === 'PFC') current.levelHours.PFC += hours
            else current.levelHours.Secundaria += hours // Default a secundaria para media/etc
          }
        })
      }

      // Read global settings from local storage
      let globalMaxHours = { Primaria: 25, Secundaria: 22, PFC: 20 }
      try {
        const stored = localStorage.getItem('sch_settings')
        if (stored) {
          const parsed = JSON.parse(stored)
          globalMaxHours.Primaria = parseInt(parsed.maxHoursPrimary || '25', 10)
          globalMaxHours.Secundaria = parseInt(parsed.maxHoursSecondary || '22', 10)
          globalMaxHours.PFC = parseInt(parsed.maxHoursPFC || '20', 10)
        }
      } catch(e) {}

      // 4. Combine data
      const combined = teachers.map(t => {
        const stats = workloadMap.get(t.id) || { count: 0, groups: new Set(), levelHours: { Primaria: 0, Secundaria: 0, PFC: 0 } }
        
        // Determinar el nivel predominante
        let dominantLevel = 'Secundaria' // fallback
        if (stats.levelHours.Primaria > stats.levelHours.Secundaria && stats.levelHours.Primaria > stats.levelHours.PFC) dominantLevel = 'Primaria'
        if (stats.levelHours.PFC > stats.levelHours.Secundaria && stats.levelHours.PFC > stats.levelHours.Primaria) dominantLevel = 'PFC'
        
        const defaultMax = (globalMaxHours as any)[dominantLevel]

        return {
          ...t,
          assignedHours: stats.count,
          maxHours: settingsMap.get(t.id) || defaultMax,
          groups: Array.from(stats.groups).join(', ') || 'Ninguno'
        }
      })

      // Sort by assigned hours descending
      combined.sort((a, b) => b.assignedHours - a.assignedHours)
      setWorkloads(combined)

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-indigo-500" />
          Carga Académica de Docentes
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Visualiza y gestiona la intensidad horaria asignada a cada docente.
        </p>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Buscar docente por nombre o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Docente</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Correo</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Grupos Asignados</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Intensidad Horaria</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Estado de Carga</th>
              </tr>
            </thead>
            <tbody>
              {workloads
                .filter(t => 
                  t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  t.email?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(t => {
                const percentage = Math.min(100, Math.round((t.assignedHours / t.maxHours) * 100))
                let barColor = "bg-indigo-500"
                if (percentage > 90) barColor = "bg-rose-500"
                else if (percentage > 70) barColor = "bg-amber-500"
                else if (percentage < 30) barColor = "bg-emerald-500"

                return (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 text-slate-800 dark:text-slate-200 font-medium">
                      {t.name}
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {t.email}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-xs max-w-xs truncate">
                      {t.groups}
                    </td>
                    <td className="p-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-800 dark:text-slate-200">{t.assignedHours}</span>
                        <span className="text-xs font-bold text-slate-400">/ {t.maxHours}h</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-12 text-right ${percentage > 90 ? 'text-rose-500' : 'text-slate-500'}`}>
                          {percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {workloads.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.email?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No se encontraron docentes con ese criterio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
