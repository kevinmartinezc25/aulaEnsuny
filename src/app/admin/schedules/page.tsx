'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/core/config/supabase/client'
import { 
  Sparkles, 
  Download, 
  Trash2, 
  AlertTriangle,
  ChevronDown,
  CalendarDays,
  Users,
  User
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import TeachersDrawer from './components/TeachersDrawer'
import ClassroomsDrawer from './components/ClassroomsDrawer'
import GroupsDrawer from './components/GroupsDrawer'
import ScheduleCanvas from './components/ScheduleCanvas'
import MasterScheduleCanvas from './components/MasterScheduleCanvas'
import { getAdminUsers } from '@/modules/admin/application/actions'

export default function SchedulesMainPage() {
  const [view, setView] = useState<'grid'|'list'>('grid')
  const searchParams = useSearchParams()
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [activePeriod, setActivePeriod] = useState<string>(`${new Date().getFullYear()} - I`)

  const [groups, setGroups] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'group'|'teacher'>('group')
  const [teachers, setTeachers] = useState<any[]>([])
  const [selectedEntityId, setSelectedEntityId] = useState<string>('general-all')
  const supabase = createClient()

  useEffect(() => {
    setActivePanel(searchParams.get('panel'))
    fetchData()
    
    // Cargar el periodo de la configuración global
    const savedPeriod = localStorage.getItem('sch_active_period')
    if (savedPeriod) {
      setActivePeriod(savedPeriod)
    }
  }, [searchParams])

  const fetchData = async () => {
    const [gData, users] = await Promise.all([
      supabase.from('sch_groups').select('id, name, director:profiles(first_name, last_name)'),
      getAdminUsers()
    ])
    
    if (gData.data) {
      // Map the director name correctly from profiles
      const mappedGroups = gData.data.map((g: any) => ({
        ...g,
        director: g.director ? { name: `${g.director.first_name} ${g.director.last_name}`.trim() } : null
      }))
      const sortedGroups = mappedGroups.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      const groupsWithGeneral = [{ id: 'general-all', name: 'GENERAL' }, ...sortedGroups]
      setGroups(groupsWithGeneral)
    }
    
    if (users && Array.isArray(users)) {
      const globalTeachers = users.filter(u => u.role === 'teacher')
      const sortedTeachers = globalTeachers.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      const teachersWithGeneral = [{ id: 'general-all', name: 'GENERAL' }, ...sortedTeachers]
      setTeachers(teachersWithGeneral)
    }
    
    if (!selectedEntityId) setSelectedEntityId('general-all')
  }

  const activeEntityName = viewMode === 'group' 
    ? (groups.find(g => g.id === selectedEntityId)?.name || 'Seleccione un grupo')
    : (teachers.find(t => t.id === selectedEntityId)?.name || 'Seleccione un docente')
    
  const directorName = viewMode === 'group' 
    ? groups.find(g => g.id === selectedEntityId)?.director?.name 
    : undefined

  return (
    <div className="relative h-full w-full flex flex-col p-2">
      
      {/* --- HEADER SUPERIOR (Selector + Acciones Portadas) --- */}
      <div className="flex flex-wrap items-center gap-4 mx-2 mt-2 relative z-10 print:hidden">
        
        {/* Selector de Contexto */}
        <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm w-max">
          <div className="flex flex-col justify-center">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 min-w-[120px] leading-tight">
              Horario - {activeEntityName}
            </h2>
            {selectedEntityId !== 'general-all' && directorName && (
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                Director de Grupo: {directorName}
              </p>
            )}
          </div>
        
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
        
        <div className="flex items-center gap-3">
          
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => { setViewMode('group'); setSelectedEntityId('general-all'); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'group' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users className="h-3.5 w-3.5" /> Grupos
            </button>
            <button
              onClick={() => { setViewMode('teacher'); setSelectedEntityId('general-all'); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'teacher' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <User className="h-3.5 w-3.5" /> Docentes
            </button>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase leading-none">{viewMode === 'group' ? 'Grupo:' : 'Docente:'}</label>
            <select 
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="w-48 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium hover:border-indigo-500 transition-colors focus:outline-none cursor-pointer"
            >
              {viewMode === 'group' ? (
                groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))
              ) : (
                teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              )}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase leading-none">Periodo:</label>
            <button className="flex items-center justify-between min-w-[6rem] px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium hover:border-indigo-500 transition-colors">
              {activePeriod}
              <ChevronDown className="h-3 w-3 text-slate-400 ml-2" />
            </button>
          </div>
        </div>
        </div> {/* <-- Cierra el div bg-white/80 */}
        
        {/* Contenedor donde los Canvas inyectarán sus botones (Portal) */}
        <div id="canvas-actions-portal" className="empty:hidden flex items-center"></div>

      </div>

      {/* --- CANVAS AREA (El horario irá aquí) --- */}
      <div className="flex-1 mt-2 w-full relative z-0 min-h-0">
        {selectedEntityId === 'general-all' ? (
          <MasterScheduleCanvas viewMode={viewMode} />
        ) : selectedEntityId ? (
          <ScheduleCanvas 
            entityType={viewMode}
            entityId={selectedEntityId} 
            entityName={activeEntityName} 
            directorName={directorName}
            key={`${viewMode}-${selectedEntityId}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <CalendarDays className="h-12 w-12 mb-4 opacity-50" />
            <p>Selecciona o crea un grupo para ver su horario.</p>
          </div>
        )}
      </div>



      {/* --- DRAWERS (Single Page Editor Panels) --- */}
      <TeachersDrawer isOpen={activePanel === 'teachers'} />
      <ClassroomsDrawer isOpen={activePanel === 'classrooms'} />
      <GroupsDrawer isOpen={activePanel === 'groups'} />

    </div>
  )
}
