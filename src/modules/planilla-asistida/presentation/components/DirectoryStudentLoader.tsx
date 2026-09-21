'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Search, Users, CheckSquare, Square } from 'lucide-react'
import { toast } from 'sonner'

interface DirectoryStudent {
  id: string
  first_name: string
  last_name: string
  document_id: string
  source?: 'profiles' | 'directory'
  isAlreadyInPlanilla?: boolean
  currentPlanillaNumber?: number | null
}

interface DirectoryStudentLoaderProps {
  isOpen: boolean
  onClose: () => void
  onAddStudents: (students: { id: string, number: number, full_name: string, directoryId: string }[]) => void
  existingDirectoryIds: string[]
  subjectId?: string
}

export function DirectoryStudentLoader({ isOpen, onClose, onAddStudents, existingDirectoryIds, subjectId }: DirectoryStudentLoaderProps) {
  const [students, setStudents] = useState<DirectoryStudent[]>([])
  const [filteredStudents, setFilteredStudents] = useState<DirectoryStudent[]>([])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [filterTab, setFilterTab] = useState<'all' | 'missing' | 'already'>('missing')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (isOpen) {
      loadDirectory()
      setSelectedIds(new Set())
      setSearch('')
      setFilterTab('missing')
    }
  }, [isOpen])

  const loadDirectory = async () => {
    setIsLoading(true)
    try {
      if (subjectId) {
        const { getPlanillaDirectoryCandidates } = await import('@/modules/planilla-asistida/application/actions')
        const result = await getPlanillaDirectoryCandidates(subjectId)
        const mapped: DirectoryStudent[] = result.candidates.map(c => ({
          id: c.id,
          first_name: c.firstName,
          last_name: c.lastName,
          document_id: c.documentNumber || '',
          source: c.source,
          isAlreadyInPlanilla: c.isAlreadyInPlanilla,
          currentPlanillaNumber: c.currentPlanillaNumber
        }))
        setStudents(mapped)
        setFilteredStudents(mapped)
        const missing = mapped.filter(s => !s.isAlreadyInPlanilla).map(s => s.id)
        setSelectedIds(new Set(missing))
        if (result.missingCount === 0) {
          setFilterTab('all')
        }
        return
      }

      const { data, error } = await supabase
        .from('student_directory')
        .select('id, first_name, last_name, document_id')
        .eq('status', 'active')
        .order('last_name')

      if (error) throw error

      setStudents(data || [])
      setFilteredStudents(data || [])
    } catch (error: any) {
      toast.error('Error al cargar directorio: ' + (error.message || 'Error desconocido'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let list = students
    if (filterTab === 'missing') {
      list = list.filter(s => !s.isAlreadyInPlanilla && !existingDirectoryIds.includes(s.id))
    } else if (filterTab === 'already') {
      list = list.filter(s => s.isAlreadyInPlanilla || existingDirectoryIds.includes(s.id))
    }

    if (search.trim() !== '') {
      const lower = search.toLowerCase()
      list = list.filter(s => 
        s.first_name.toLowerCase().includes(lower) || 
        s.last_name.toLowerCase().includes(lower) ||
        (s.document_id && s.document_id.includes(lower))
      )
    }
    setFilteredStudents(list)
  }, [search, students, filterTab, existingDirectoryIds])

  const isStudentInPlanilla = (s: DirectoryStudent) => {
    return !!s.isAlreadyInPlanilla || existingDirectoryIds.includes(s.id)
  }

  const handleToggleSelect = (id: string) => {
    const student = students.find(s => s.id === id)
    if (student && isStudentInPlanilla(student)) return

    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleAdd = () => {
    if (selectedIds.size === 0) return

    const toAdd = students
      .filter(s => selectedIds.has(s.id) && !isStudentInPlanilla(s))
      .map(s => {
        const fullName = `${s.last_name} ${s.first_name}`.trim().toUpperCase()
        return {
          id: crypto.randomUUID(),
          number: 0,
          full_name: fullName,
          directoryId: s.id
        }
      })

    onAddStudents(toAdd)
    onClose()
  }

  const handleSelectAll = () => {
    const selectable = filteredStudents.filter(s => !isStudentInPlanilla(s))
    if (selectedIds.size === selectable.length && selectable.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectable.map(s => s.id)))
    }
  }

  const missingCount = students.filter(s => !isStudentInPlanilla(s)).length
  const alreadyCount = students.filter(s => isStudentInPlanilla(s)).length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Cargar desde Directorio Estudiantil
          </DialogTitle>
          <DialogDescription>
            Selecciona los estudiantes para agregarlos a la planilla. Se valida automáticamente contra Gestión de Estudiantes.
          </DialogDescription>
        </DialogHeader>

        {/* Pestañas de Filtro y Buscador */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterTab('missing')}
              className={`px-2.5 py-1 rounded-md transition-all ${filterTab === 'missing' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'}`}
            >
              Faltantes ({missingCount})
            </button>
            <button
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'}`}
            >
              Todos ({students.length})
            </button>
            <button
              onClick={() => setFilterTab('already')}
              className={`px-2.5 py-1 rounded-md transition-all ${filterTab === 'already' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'}`}
            >
              En planilla ({alreadyCount})
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar nombre o documento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-2 border rounded-xl divide-y min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <p className="text-xs">Consultando Gestión de Estudiantes...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
              <p className="text-xs">No se encontraron estudiantes con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <div className="flex justify-between items-center px-2 py-1.5 bg-slate-50 rounded-md mb-1">
                <span className="text-xs font-medium text-slate-600">
                  {filteredStudents.length} estudiantes mostrados
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-7 text-xs">
                  {selectedIds.size === filteredStudents.filter(s => !isStudentInPlanilla(s)).length && filteredStudents.length > 0
                    ? 'Deseleccionar todos' 
                    : 'Seleccionar mostrados'}
                </Button>
              </div>
              {filteredStudents.map(student => {
                const isExisting = isStudentInPlanilla(student)
                const isSelected = selectedIds.has(student.id)
                return (
                  <div 
                    key={student.id}
                    onClick={() => handleToggleSelect(student.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                      isExisting ? 'bg-slate-50 opacity-70 cursor-not-allowed' :
                      isSelected ? 'bg-emerald-50 hover:bg-emerald-100 cursor-pointer' : 
                      'hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <div className="text-emerald-600 flex-shrink-0">
                      {isExisting ? (
                        <CheckSquare className="h-4 w-4 text-slate-400" />
                      ) : isSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-xs text-slate-900 truncate uppercase">
                          {student.last_name} {student.first_name}
                        </p>
                        {student.source === 'profiles' ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                            Campus
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full">
                            Directorio
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {student.document_id ? `Doc: ${student.document_id}` : 'Sin documento'}
                      </p>
                    </div>
                    {isExisting && (
                      <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {student.currentPlanillaNumber ? `En planilla #${student.currentPlanillaNumber}` : 'Ya en planilla'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 border-t pt-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAdd} 
            size="sm"
            disabled={selectedIds.size === 0 || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            Añadir seleccionados ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
