'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { getAdminUsers } from '@/modules/admin/application/actions'
import { Loader2, Briefcase, Mail, Search, Eye, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

      // 3. Fetch curriculum and constraints to identify multi-teacher subjects accurately
      const { data: curriculumRows } = await supabase.from('sch_curriculum').select('group_id, subject_id, teacher_id, hours_per_week, sch_groups(name, level), sch_subjects(name)')
      const { data: constraintsData } = await supabase.from('sch_constraints').select('*').eq('rule_type', 'MULTI_TEACHER_SAME_SLOT').eq('is_active', true)
      const { data: workloadConfigData } = await supabase.from('sch_constraints').select('*').eq('rule_type', 'MULTI_TEACHER_WORKLOAD_CONFIG').eq('is_active', true).maybeSingle()

      const normalWorkloadSubjectIds = new Set<string>(workloadConfigData?.parameters?.normal_workload_subject_ids || [])

      const explicitMultiTeacherSubjIds = new Set<string>()
      if (constraintsData) {
        constraintsData.forEach((c: any) => {
          if (c.parameters?.rules && Array.isArray(c.parameters.rules)) {
            c.parameters.rules.forEach((r: any) => {
              if (r.subject_id && r.subject_id !== 'ALL') explicitMultiTeacherSubjIds.add(r.subject_id)
            })
          }
          if (c.parameters?.subject_id && c.parameters.subject_id !== 'ALL') {
            explicitMultiTeacherSubjIds.add(c.parameters.subject_id)
          }
        })
      }

      // Group-level check: A (group_id, subject_id) pair is multi-teacher IF it has > 1 teacher assigned in the SAME group
      const groupSubjectTeachers = new Map<string, Set<string>>()
      if (curriculumRows) {
        curriculumRows.forEach((row: any) => {
          if (!row.group_id || !row.subject_id || !row.teacher_id) return
          const key = `${row.group_id}-${row.subject_id}`
          if (!groupSubjectTeachers.has(key)) groupSubjectTeachers.set(key, new Set())
          groupSubjectTeachers.get(key)!.add(row.teacher_id)
        })
      }
      const multiTeacherGroupSubjectKeys = new Set<string>()
      for (const [key, tSet] of groupSubjectTeachers.entries()) {
        if (tSet.size > 1) multiTeacherGroupSubjectKeys.add(key)
      }

      const workloadMap = new Map()
      
      if (curriculumRows) {
        curriculumRows.forEach((row: any) => {
          if (!row.teacher_id) return
          if (!workloadMap.has(row.teacher_id)) {
            workloadMap.set(row.teacher_id, { count: 0, regularCount: 0, specialCount: 0, groups: new Set(), levelHours: { Primaria: 0, Secundaria: 0, PFC: 0 }, details: [] })
          }
          const current = workloadMap.get(row.teacher_id)
          const hours = row.hours_per_week || 0
          const key = `${row.group_id}-${row.subject_id}`
          const isMultiTeacherGroup = multiTeacherGroupSubjectKeys.has(key) || (row.subject_id && explicitMultiTeacherSubjIds.has(row.subject_id))
          // Una materia multi-docente es exenta/especial SOLO SI NO está marcada en Reglas como Carga Académica Normal
          const isSpecial = isMultiTeacherGroup && (!row.subject_id || !normalWorkloadSubjectIds.has(row.subject_id))

          current.count += hours
          if (isSpecial) {
            current.specialCount += hours
          } else {
            current.regularCount += hours
          }



          if (row.sch_groups) {
            current.groups.add(row.sch_groups.name)
            if (row.sch_groups.level === 'Primaria') current.levelHours.Primaria += hours
            else if (row.sch_groups.level === 'PFC') current.levelHours.PFC += hours
            else current.levelHours.Secundaria += hours
            
            current.details.push({
              group: row.sch_groups.name,
              subject: row.sch_subjects?.name || 'Materia desconocida',
              hours: hours,
              isSpecial
            })
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
        const stats = workloadMap.get(t.id) || { count: 0, regularCount: 0, specialCount: 0, groups: new Set(), levelHours: { Primaria: 0, Secundaria: 0, PFC: 0 }, details: [] }
        
        let dominantLevel = 'Secundaria'
        if (stats.levelHours.Primaria > stats.levelHours.Secundaria && stats.levelHours.Primaria > stats.levelHours.PFC) dominantLevel = 'Primaria'
        if (stats.levelHours.PFC > stats.levelHours.Secundaria && stats.levelHours.PFC > stats.levelHours.Primaria) dominantLevel = 'PFC'
        
        const defaultMax = (globalMaxHours as any)[dominantLevel]

        return {
          ...t,
          assignedHours: stats.regularCount, // Solo horas regulares cuentan para la comparación con maxHours
          totalHours: stats.count,
          specialHours: stats.specialCount,
          maxHours: settingsMap.get(t.id) || defaultMax,
          groups: Array.from(stats.groups).join(', ') || 'Ninguno',
          details: stats.details
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

  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openTeacherDetails = (teacher: any) => {
    setSelectedTeacher(teacher)
    setIsModalOpen(true)
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
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center">Acciones</th>
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
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className="text-lg font-black text-slate-800 dark:text-slate-200">{t.assignedHours}</span>
                        <span className="text-xs font-bold text-slate-400">/ {t.maxHours}h</span>
                        {t.specialHours > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold" title="Horas especiales exentas del límite contractual">
                            +{t.specialHours}h especiales
                          </span>
                        )}
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
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openTeacherDetails(t)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Ver Detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {workloads.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.email?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron docentes con ese criterio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && selectedTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-[90%] max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 z-50 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    Detalles de Carga Académica
                  </h2>
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {selectedTeacher.name}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                {selectedTeacher.details && selectedTeacher.details.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Materia</th>
                          <th className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Grupos Asignados</th>
                          <th className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center">Horas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(selectedTeacher.details.reduce((acc: any, detail: any) => {
                          if (!acc[detail.subject]) {
                            acc[detail.subject] = { subject: detail.subject, isSpecial: detail.isSpecial, groups: [], totalHours: 0 }
                          }
                          acc[detail.subject].groups.push({ name: detail.group, hours: detail.hours })
                          acc[detail.subject].totalHours += detail.hours
                          return acc
                        }, {})).map((groupObj: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-medium align-middle">
                              <div className="flex items-center gap-1.5">
                                <span>{groupObj.subject}</span>
                                {groupObj.isSpecial && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded">
                                    Multi-docente / Exenta
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                              <div className="flex flex-wrap gap-1.5">
                                {groupObj.groups.map((g: any, i: number) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-md text-[10px]">
                                    <span className="font-semibold">{g.name}</span>
                                    <span className="text-slate-400 dark:text-slate-500">({g.hours}h)</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center align-middle">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold rounded-lg">
                                {groupObj.totalHours}h
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                        <tr>
                          <td colSpan={2} className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-300">
                            Resumen de Horas:
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {selectedTeacher.assignedHours}h lectivas
                            </span>
                            {selectedTeacher.specialHours > 0 ? (
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 ml-1">
                                + {selectedTeacher.specialHours}h exentas = {selectedTeacher.totalHours}h total
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      </tfoot>

                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                    <Briefcase className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm">Sin materias asignadas.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
