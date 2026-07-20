'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { Loader2, CalendarDays, Users } from 'lucide-react'
import ScheduleCanvas from '@/app/admin/schedules/components/ScheduleCanvas'

export default function TeacherSchedulePage() {
  const [loading, setLoading] = useState(true)
  const [teacherProfile, setTeacherProfile] = useState<any>(null)
  const [directorGroups, setDirectorGroups] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'personal' | 'group'>('personal')
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

  return (
    <div className="p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-indigo-500" />
          Mi Horario
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Visualiza tus horas asignadas.
        </p>

        {directorGroups.length > 0 && (
          <div className="mt-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'personal' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Horario Personal
            </button>
            <button
              onClick={() => setActiveTab('group')}
              className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'group' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Users className="h-4 w-4" />
              Horario de mi Grupo
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
        {activeTab === 'personal' ? (
          <ScheduleCanvas 
            entityType="teacher"
            entityId={teacherProfile.id}
            entityName={`${teacherProfile.first_name} ${teacherProfile.last_name}`}
            readOnly={true}
          />
        ) : (
          directorGroups.length > 0 && activeGroupId && (
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
              <div className="flex-1 min-h-0 relative">
                <ScheduleCanvas 
                  entityType="group"
                  entityId={activeGroupId}
                  entityName={directorGroups.find(g => g.id === activeGroupId)?.name}
                  directorName={`${teacherProfile.first_name} ${teacherProfile.last_name}`}
                  readOnly={true}
                />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
