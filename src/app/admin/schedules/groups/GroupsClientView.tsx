'use client'

import React, { useState } from 'react'
import { Users, Info, ArrowUpRight, Search, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { assignGroupDirector, updateGroupLevel } from './actions'

type Group = {
  id: string
  name: string
  level: string | null
  director_id: string | null
  profiles: { first_name: string; last_name: string } | null
}

type Profile = {
  id: string
  first_name: string
  last_name: string
}

interface Props {
  initialGroups: Group[]
  levelsCount: Record<string, number>
  availableDirectors: Profile[]
}

const AVAILABLE_LEVELS = ['Preescolar', 'Primaria', 'Secundaria', 'Media', 'PFC']

export default function GroupsClientView({ initialGroups, levelsCount, availableDirectors }: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [filterLevel, setFilterLevel] = useState<string>('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null)

  // Opciones de filtro
  const levels = ['Todos', ...Object.keys(levelsCount).filter(l => l !== 'Sin nivel'), 'Sin nivel']

  // Filtrado
  const filteredGroups = groups.filter(g => {
    const matchLevel = filterLevel === 'Todos' || (g.level || 'Sin nivel') === filterLevel
    const matchSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchLevel && matchSearch
  })

  // Cambio de nivel
  const handleLevelChange = async (groupId: string, level: string) => {
    setLoadingGroupId(groupId)
    const newLevel = level === 'none' ? null : level
    
    const res = await updateGroupLevel(groupId, newLevel)
    
    if (res.success) {
      toast.success('Nivel actualizado')
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, level: newLevel } : g))
    } else {
      toast.error(res.error || 'Error al actualizar nivel')
    }
    
    setLoadingGroupId(null)
  }

  // Cambio de director
  const handleDirectorChange = async (groupId: string, profileId: string) => {
    setLoadingGroupId(groupId)
    const newDirectorId = profileId === 'none' ? null : profileId
    
    const res = await assignGroupDirector(groupId, newDirectorId)
    
    if (res.success) {
      toast.success('Director asignado correctamente')
      // Update local state to avoid full reload
      const selectedDirector = availableDirectors.find(d => d.id === profileId)
      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            director_id: newDirectorId,
            profiles: selectedDirector ? { first_name: selectedDirector.first_name, last_name: selectedDirector.last_name } : null
          }
        }
        return g
      }))
    } else {
      toast.error(res.error || 'Error al asignar director')
    }
    
    setLoadingGroupId(null)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header y Filtros (Fijo) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-orange-500" />
              Grupos Escolares
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Visualización en lista. Asigna directores de grupo desde aquí.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar grupo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-orange-500 w-48 sm:w-64"
              />
            </div>
            
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-orange-500"
            >
              {levels.map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{groups.length}</p>
          </div>
          {Object.entries(levelsCount).map(([level, count]) => (
            <div key={level} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex justify-between items-center">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{level}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla con Scroll Nativo de Página */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="px-6 py-4">Grupo</th>
                <th className="px-6 py-4">Nivel Académico</th>
                <th className="px-6 py-4">Director de Grupo</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredGroups.map((group) => (
                <tr key={group.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                    {group.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative w-40">
                      <select
                        value={group.level || 'none'}
                        onChange={(e) => handleLevelChange(group.id, e.target.value)}
                        disabled={loadingGroupId === group.id}
                        className={`w-full text-xs py-1.5 px-3 rounded-lg border focus:outline-none transition-colors appearance-none font-bold uppercase tracking-wider ${
                          group.level 
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400'
                        } ${loadingGroupId === group.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <option value="none">-- Sin Nivel --</option>
                        {AVAILABLE_LEVELS.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                         <div className="h-0 w-0 border-x-[4px] border-x-transparent border-t-[5px] border-t-slate-400"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative w-64">
                      <select
                        value={group.director_id || 'none'}
                        onChange={(e) => handleDirectorChange(group.id, e.target.value)}
                        disabled={loadingGroupId === group.id}
                        className={`w-full text-sm py-1.5 pl-3 pr-8 rounded-lg border focus:outline-none transition-colors appearance-none ${
                          group.director_id 
                            ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50 text-orange-900 dark:text-orange-200 font-medium' 
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        } ${loadingGroupId === group.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <option value="none">-- Sin Asignar --</option>
                        {availableDirectors.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.first_name} {d.last_name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                         {group.director_id ? (
                           <CheckCircle2 className="h-4 w-4 text-orange-500" />
                         ) : (
                           <div className="h-0 w-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-slate-400"></div>
                         )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/admin/schedules?view=group&id=${group.id}&group=${encodeURIComponent(group.name)}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                    >
                      Ver Horario
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredGroups.length === 0 && (
          <div className="py-16 text-center">
            <Info className="h-8 w-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No se encontraron grupos</h3>
            <p className="text-sm text-slate-500 mt-1">Intenta ajustando los filtros de búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  )
}
