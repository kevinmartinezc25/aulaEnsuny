'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/config/supabase/client'
import { Loader2, CalendarDays, Users, Printer, ArrowLeft } from 'lucide-react'
import StaticScheduleGrid from './components/StaticScheduleGrid'
import EmergencyScheduleView from './components/EmergencyScheduleView'

export default function TeacherSchedulePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [teacherProfile, setTeacherProfile] = useState<any>(null)
  const [directorGroups, setDirectorGroups] = useState<any[]>([])
  const [workloadDetails, setWorkloadDetails] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'personal' | 'group' | 'workload' | 'emergency'>('personal')
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

      // Obtener el ID del docente en la tabla académica (XML)
      const { data: academicTeacher } = await supabase
        .from('academic_teachers')
        .select('id')
        .eq('profile_id', user.id)
        .single()
      
      setTeacherProfile({ ...profile, academic_teacher_id: academicTeacher?.id || null })

      // Get groups where this teacher is director
      const { data: groups } = await supabase
        .from('sch_groups')
        .select('*')
        .eq('director_id', user.id)
      
      if (groups && groups.length > 0) {
        // Deduplicar por nombre para evitar badges duplicados cuando hay registros repetidos en BD
        const seenNames = new Set<string>()
        const uniqueGroups = groups.filter((g: any) => {
          if (seenNames.has(g.name)) return false
          seenNames.add(g.name)
          return true
        })
        setDirectorGroups(uniqueGroups)
        setActiveGroupId(uniqueGroups[0].id)
      }

      // Fetch workload details (Carga Académica desde Master Data)
      const { data: curriculumRows } = await supabase
        .from('academic_assignments')
        .select('hours_per_week, sch_groups!inner(name, level), sch_subjects!inner(name, is_academic_workload), academic_teachers!inner(profile_id)')
        .eq('academic_teachers.profile_id', user.id)
        .eq('sch_subjects.is_academic_workload', true)

      if (curriculumRows) {
        const details = curriculumRows.map((row: any) => ({
          group: row.sch_groups?.name || 'Desconocido',
          subject: row.sch_subjects?.name || 'Materia desconocida',
          hours: row.hours_per_week || 0
        }))
        setWorkloadDetails(details)
      } else {
        setWorkloadDetails([])
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
    <div className="h-screen w-full bg-slate-50 dark:bg-[#0B1120] flex flex-col print:bg-white print:h-auto print:overflow-visible print:p-0 p-3 sm:p-4 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto flex flex-col flex-1 min-h-0 print:max-w-none print:w-full print:h-auto print:overflow-visible">
        <div className="shrink-0 print:hidden pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            {/* Fila 1 en móvil / Lado izquierdo en desktop */}
            <div className="flex items-center justify-between md:justify-start gap-2">
              <div className="flex items-center gap-2">
                <Link
                  href="/teacher/dashboard"
                  onClick={(e) => {
                    if (window.history.length > 1) {
                      e.preventDefault()
                      router.back()
                    }
                  }}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 shrink-0"
                  title="Volver"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
                  <CalendarDays className="h-4 w-4 text-indigo-500" />
                  <span>Mi Horario</span>
                </h1>
              </div>

              {/* Botón Imprimir en móvil (lado derecho fila superior) */}
              <div className="md:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold shadow-xs transition-colors text-xs shrink-0"
                  title="Imprimir horario"
                >
                  <Printer className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {/* Fila 2 en móvil / Centro en desktop: Segmented Control Responsive */}
            <div className={`w-full md:w-auto grid ${directorGroups.length > 0 ? 'grid-cols-4' : 'grid-cols-3'} md:flex md:items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl gap-1`}>
              {/* 1. Personal */}
              <button
                onClick={() => setActiveTab('personal')}
                className={`py-1.5 md:py-1 px-1 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all text-center select-none flex items-center justify-center ${
                  activeTab === 'personal'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="md:hidden">Personal</span>
                <span className="hidden md:inline">Horario Personal</span>
              </button>

              {/* 2. Mi Grupo (si aplica) */}
              {directorGroups.length > 0 && (
                <button
                  onClick={() => setActiveTab('group')}
                  className={`py-1.5 md:py-1 px-1 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all text-center select-none flex items-center justify-center gap-1 ${
                    activeTab === 'group'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Users className="h-3 w-3 hidden sm:inline" />
                  <span className="md:hidden">Mi Grupo</span>
                  <span className="hidden md:inline">Horario de mi Grupo</span>
                </button>
              )}

              {/* 3. Carga Académica */}
              <button
                onClick={() => setActiveTab('workload')}
                className={`py-1.5 md:py-1 px-1 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all text-center select-none flex items-center justify-center ${
                  activeTab === 'workload'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="md:hidden">Carga</span>
                <span className="hidden md:inline">Carga Académica</span>
              </button>


            </div>

            {/* Selector de subgrupos si está en pestaña de grupo */}
            {activeTab === 'group' && directorGroups.length > 0 && (
              <div className="flex md:hidden items-center justify-center gap-1.5 py-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grupo:</span>
                {directorGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black transition-all ${
                      activeGroupId === g.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            {/* Lado derecho en desktop: Botón imprimir */}
            <div className="hidden md:flex items-center shrink-0">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold shadow-xs transition-colors text-xs shrink-0"
                title="Imprimir horario"
              >
                <Printer className="h-3.5 w-3.5 text-indigo-500" />
                <span>
                  Imprimir {
                    activeTab === 'personal'
                      ? 'Horario Personal'
                      : activeTab === 'group'
                      ? `Horario ${directorGroups.find(g => g.id === activeGroupId)?.name || 'de Grupo'}`
                      : activeTab === 'workload'
                      ? 'Carga Académica'
                      : ''
                  }
                </span>
              </button>
            </div>
          </div>
        </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 overflow-hidden flex flex-col relative mt-2 md:rounded-2xl md:border border-slate-200 dark:border-slate-800 md:shadow-sm print:mt-0 print:border-none print:shadow-none print:overflow-visible print:h-auto">
        {activeTab === 'personal' && teacherProfile?.academic_teacher_id && (
          <StaticScheduleGrid 
            entityType="teacher"
            entityId={teacherProfile.academic_teacher_id}
            entityName={`${teacherProfile.first_name} ${teacherProfile.last_name}`}
          />
        )}
        
        {activeTab === 'personal' && !teacherProfile?.academic_teacher_id && (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <p className="text-slate-500">Tu cuenta aún no está vinculada a ningún docente en el sistema académico.</p>
          </div>
        )}

        {activeTab === 'emergency' && (
          teacherProfile?.academic_teacher_id ? (
            <EmergencyScheduleView 
              profileId={teacherProfile.id} 
              academicTeacherId={teacherProfile.academic_teacher_id} 
            />
          ) : (
            <div className="h-full flex items-center justify-center p-6 text-center">
              <p className="text-slate-500">Tu cuenta aún no está vinculada a ningún docente en el sistema académico.</p>
            </div>
          )
        )}
        
        {activeTab === 'group' && directorGroups.length > 0 && activeGroupId && (
          <div className="flex-1 flex flex-col min-h-0 print:h-auto print:overflow-visible">
            <StaticScheduleGrid
              entityType="group"
              entityId={activeGroupId}
              entityName={directorGroups.find(g => g.id === activeGroupId)?.name}
              directorName={`${teacherProfile.first_name} ${teacherProfile.last_name}`}
              hideGroupBadge={true}
            />
          </div>
        )}

        {activeTab === 'workload' && (
          <div className="h-full overflow-y-auto custom-scrollbar p-6 print:p-0 print:overflow-visible print:h-auto">
            {/* Header Institucional Oficial para Impresión de Carga Académica */}
            <div className="hidden print:block mb-8 pb-3 border-b-2 border-slate-900">
              <div className="w-full flex items-center justify-between pb-3">
                <div className="flex-1 flex justify-center">
                  <img
                    src="/institutional-header.png"
                    alt="Institución Educativa Escuela Normal Superior del Nordeste - Yolombó Antioquia"
                    className="max-h-20 w-auto max-w-2xl object-contain"
                    loading="eager"
                  />
                </div>
                <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs flex flex-col gap-1 text-right ml-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Año Lectivo {new Date().getFullYear()}</span>
                  <span className="text-xs font-black text-[#1e293b]">Jornada Mañana</span>
                </div>
              </div>
              <h1 className="text-xl font-black uppercase tracking-wide text-slate-900 text-center mt-2">
                Carga Académica Docente
              </h1>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-100 p-2.5 rounded-lg border border-slate-300 mt-2">
                <span>Docente: <b>{teacherProfile?.first_name} {teacherProfile?.last_name}</b></span>
                <span>Total Horas Asignadas: <b>{totalAssignedHours}h</b></span>
              </div>
            </div>

            <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
              {groupedWorkload.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 print:rounded-none">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 print:bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 print:text-slate-900 border-b border-slate-200 dark:border-slate-700 print:border-slate-300">Materia</th>
                        <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 print:text-slate-900 border-b border-slate-200 dark:border-slate-700 print:border-slate-300">Grupos Asignados</th>
                        <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 print:text-slate-900 border-b border-slate-200 dark:border-slate-700 print:border-slate-300 text-center">Horas Totales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedWorkload.map((groupObj: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50 print:border-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 print:text-slate-900 font-medium align-middle">
                            {groupObj.subject}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 print:text-slate-700">
                            <div className="flex flex-wrap gap-2">
                              {groupObj.groups.map((g: any, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 print:border-slate-300 rounded-md text-xs">
                                  <span className="font-semibold">{g.name}</span>
                                  <span className="text-slate-400 dark:text-slate-500 print:text-slate-600">({g.hours}h)</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center align-middle font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 print:bg-transparent print:text-slate-900 font-bold rounded-lg text-sm">
                              {groupObj.totalHours}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/50 print:bg-slate-100 border-t-2 border-slate-200 dark:border-slate-700 print:border-slate-300">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300 print:text-slate-900 text-base">
                          Total Horas Asignadas:
                        </td>
                        <td className="px-4 py-3 text-center font-black text-indigo-600 dark:text-indigo-400 print:text-slate-900 text-xl">
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

              {/* Firmas en impresión */}
              <div className="hidden print:flex justify-between items-center mt-16 pt-8 border-t border-slate-300">
                <div className="flex flex-col items-center">
                  <div className="w-56 border-b border-slate-600 mb-1.5"></div>
                  <span className="text-xs font-bold text-slate-700">Firma del Docente</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-56 border-b border-slate-600 mb-1.5"></div>
                  <span className="text-xs font-bold text-slate-700">Firma Coordinación Académica</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
