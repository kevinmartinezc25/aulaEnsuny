'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { Loader2, CalendarDays, Users, Printer } from 'lucide-react'
import ScheduleCanvas from '@/app/admin/schedules/components/ScheduleCanvas'

export default function TeacherSchedulePage() {
  const [loading, setLoading] = useState(true)
  const [teacherProfile, setTeacherProfile] = useState<any>(null)
  const [directorGroups, setDirectorGroups] = useState<any[]>([])
  const [workloadDetails, setWorkloadDetails] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'personal' | 'group' | 'workload'>('personal')
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    
    if (user) {
      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setTeacherProfile(profile)

      // Get groups where this teacher is director
      const { data: groups } = await supabase
        .from('sch_groups')
        .select('*')
        .eq('director_id', user.id)
      
      if (groups && groups.length > 0) {
        setDirectorGroups(groups)
        setActiveGroupId(groups[0].id)
      }

      // Fetch workload details
      const { data: curriculumRows } = await supabase
        .from('sch_curriculum')
        .select('hours_per_week, sch_groups(name, level), sch_subjects(name)')
        .eq('teacher_id', user.id)

      if (curriculumRows) {
        const details = curriculumRows.map((row: any) => ({
          group: row.sch_groups?.name || 'Desconocido',
          subject: row.sch_subjects?.name || 'Materia desconocida',
          hours: row.hours_per_week || 0
        }))
        setWorkloadDetails(details)
      }
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (!teacherProfile) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        Perfil de docente no encontrado.
      </div>
    )
  }

  const groupedWorkload = Object.values(workloadDetails.reduce((acc: any, detail: any) => {
    if (!acc[detail.subject]) {
      acc[detail.subject] = { subject: detail.subject, groups: [], totalHours: 0 }
    }
    acc[detail.subject].groups.push({ name: detail.group, hours: detail.hours })
    acc[detail.subject].totalHours += detail.hours
    return acc
  }, {}))

  const totalAssignedHours = groupedWorkload.reduce((sum: number, g: any) => sum + g.totalHours, 0)

  return (
    <div className="-mt-3 sm:-mt-4 h-full flex flex-col print:bg-white print:p-0">
      <div className="mb-4 shrink-0 print:hidden">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-indigo-500" />
              Mi Horario
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">
              Visualiza tus horas asignadas.
            </p>
          </div>
          
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold shadow-sm transition-colors text-sm shrink-0"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir / Descargar PDF</span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === 'personal' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Horario Personal
          </button>
          {directorGroups.length > 0 && (
            <button
              onClick={() => setActiveTab('group')}
              className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
                activeTab === 'group' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Users className="h-4 w-4" />
              Horario de mi Grupo
            </button>
          )}
          <button
            onClick={() => setActiveTab('workload')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === 'workload' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Carga Académica
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 md:rounded-xl md:border border-slate-200 dark:border-slate-800 md:shadow-sm overflow-hidden relative">
        {activeTab === 'personal' && (
          <ScheduleCanvas 
            entityType="teacher"
            entityId={teacherProfile.id}
            entityName={`${teacherProfile.first_name} ${teacherProfile.last_name}`}
            readOnly={true}
          />
        )}
        
        {activeTab === 'group' && directorGroups.length > 0 && activeGroupId && (
          <div className="h-full flex flex-col">
            {directorGroups.length > 1 && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto shrink-0">
                {directorGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      activeGroupId === g.id
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
            <div className="px-4 pt-4 shrink-0">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                Grupo: <span className="text-indigo-600 dark:text-indigo-400">{directorGroups.find(g => g.id === activeGroupId)?.name}</span>
              </h2>
            </div>
            <div className="flex-1 min-h-0 relative mt-2">
              <ScheduleCanvas 
                entityType="group"
                entityId={activeGroupId}
                entityName={directorGroups.find(g => g.id === activeGroupId)?.name}
                directorName={`${teacherProfile.first_name} ${teacherProfile.last_name}`}
                readOnly={true}
              />
            </div>
          </div>
        )}

        {activeTab === 'workload' && (
          <div className="h-full overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-4xl mx-auto">
              {groupedWorkload.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Materia</th>
                        <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Grupos Asignados</th>
                        <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center">Horas Totales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedWorkload.map((groupObj: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium align-middle">
                            {groupObj.subject}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            <div className="flex flex-wrap gap-2">
                              {groupObj.groups.map((g: any, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-md text-xs">
                                  <span className="font-semibold">{g.name}</span>
                                  <span className="text-slate-400 dark:text-slate-500">({g.hours}h)</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center align-middle">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold rounded-lg text-sm">
                              {groupObj.totalHours}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300 text-base">
                          Total Horas Asignadas:
                        </td>
                        <td className="px-4 py-3 text-center font-black text-indigo-600 dark:text-indigo-400 text-xl">
                          {totalAssignedHours}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                  <p className="text-lg">No tienes materias asignadas actualmente.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
