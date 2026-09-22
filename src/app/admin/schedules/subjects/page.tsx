'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/core/config/supabase/client'
import { BookOpen, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [savingName, setSavingName] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchSubjects()
  }, [])

  // Función auxiliar para normalizar (quitar tildes y pasar a minúsculas)
  const normalizeString = (str: string) => {
    return str
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  }

  const fetchSubjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sch_subjects')
      .select('id, name, is_academic_workload')
      .order('name', { ascending: true })
    
    if (data && !error) {
      // Deduplicar materias ignorando mayúsculas y tildes
      const uniqueMap = new Map<string, any>()
      for (const subject of data) {
        const normalizedName = normalizeString(subject.name)
        if (!uniqueMap.has(normalizedName)) {
          uniqueMap.set(normalizedName, subject)
        }
      }
      setSubjects(Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
    } else {
      console.error('Error fetching subjects:', error)
    }
    setLoading(false)
  }

  const toggleWorkload = async (name: string, currentValue: boolean) => {
    setSavingName(name)
    const newValue = !currentValue
    
    // Al actualizar en base de datos, tenemos que actualizar TODOS los que coincidan al normalizar.
    // Como Supabase no tiene una función simple de ignorar tildes en el cliente, actualizaremos uno a uno
    // los que coinciden localmente con el nombre normalizado.
    const normalizedTarget = normalizeString(name)
    
    // Buscar todos los IDs reales en BD que coincidan con esta materia (con o sin tildes)
    const { data: allSubjects } = await supabase.from('sch_subjects').select('id, name')
    const idsToUpdate = allSubjects?.filter(s => normalizeString(s.name) === normalizedTarget).map(s => s.id) || []

    let success = true
    if (idsToUpdate.length > 0) {
      const { error } = await supabase
        .from('sch_subjects')
        .update({ is_academic_workload: newValue })
        .in('id', idsToUpdate)
        
      if (error) success = false
    }

    if (success) {
      setSubjects(prev => prev.map(s => normalizeString(s.name) === normalizedTarget ? { ...s, is_academic_workload: newValue } : s))
    } else {
      alert('Error al actualizar el estado.')
    }
    
    setSavingName(null)
  }

  const filteredSubjects = subjects.filter(s => normalizeString(s.name).includes(normalizeString(searchTerm)))

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1c] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-purple-500" />
          Materias y Carga Académica
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestiona cuáles materias contabilizan horas oficiales en la carga académica del docente. 
          Desmarca aquellas que correspondan a reuniones institucionales (ej. Comité Calidad, Núcleos de Área).
        </p>
      </div>

      {/* Buscador */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl leading-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors shadow-sm"
          placeholder="Buscar materia..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Listado con scroll interno y altura máxima */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mb-12">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-auto max-h-[550px]">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 relative">
              <thead className="bg-slate-50 dark:bg-slate-800/90 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nombre de Materia / Reunión
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-40">
                    Suma a Carga Académica
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {filteredSubjects.length > 0 ? (
                  filteredSubjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {subject.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={subject.is_academic_workload !== false}
                            onChange={() => toggleWorkload(subject.name, subject.is_academic_workload !== false)}
                            disabled={savingName === subject.name}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                          {savingName === subject.name && (
                            <span className="absolute -right-6 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                            </span>
                          )}
                        </label>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No se encontraron materias que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
