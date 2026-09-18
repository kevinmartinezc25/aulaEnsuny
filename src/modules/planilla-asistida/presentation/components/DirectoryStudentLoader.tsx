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
}

interface DirectoryStudentLoaderProps {
  isOpen: boolean
  onClose: () => void
  onAddStudents: (students: { id: string, number: number, full_name: string, directoryId: string }[]) => void
  existingDirectoryIds: string[]
}

export function DirectoryStudentLoader({ isOpen, onClose, onAddStudents, existingDirectoryIds }: DirectoryStudentLoaderProps) {
  const [students, setStudents] = useState<DirectoryStudent[]>([])
  const [filteredStudents, setFilteredStudents] = useState<DirectoryStudent[]>([])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (isOpen) {
      loadDirectory()
      setSelectedIds(new Set())
      setSearch('')
    }
  }, [isOpen])

  const loadDirectory = async () => {
    setIsLoading(true)
    try {
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
    if (search.trim() === '') {
      setFilteredStudents(students)
    } else {
      const lower = search.toLowerCase()
      setFilteredStudents(students.filter(s => 
        s.first_name.toLowerCase().includes(lower) || 
        s.last_name.toLowerCase().includes(lower) ||
        s.document_id.includes(lower)
      ))
    }
  }, [search, students])

  const handleToggleSelect = (id: string) => {
    if (existingDirectoryIds.includes(id)) return // Already in subject

    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleAdd = () => {
    if (selectedIds.size === 0) return

    const toAdd = students.filter(s => selectedIds.has(s.id)).map(s => {
      // Regla del sistema: "Las 2 primeras palabras son apellidos; resto son nombres"
      // Ya están separados en la BD, así que solo unimos para el full_name del spreadsheet
      const fullName = `${s.last_name} ${s.first_name}`.trim().toUpperCase()
      return {
        id: crypto.randomUUID(), // ID temporal para el store
        number: 0, // El store o el backend asignará el número
        full_name: fullName,
        directoryId: s.id
      }
    })

    onAddStudents(toAdd)
    onClose()
  }

  const handleSelectAll = () => {
    const selectable = filteredStudents.filter(s => !existingDirectoryIds.includes(s.id))
    if (selectedIds.size === selectable.length && selectable.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectable.map(s => s.id)))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Cargar desde Directorio Estudiantil
          </DialogTitle>
          <DialogDescription>
            Selecciona los estudiantes que deseas agregar a la planilla de esta materia. 
            Al hacerlo, ellos podrán consultar sus notas con su documento.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o documento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-4 border rounded-lg divide-y min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <p>Cargando directorio...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p>No se encontraron estudiantes.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <div className="flex justify-between items-center px-2 py-2 bg-slate-50 rounded-md mb-2">
                <span className="text-sm font-medium text-slate-600">
                  {filteredStudents.length} estudiantes encontrados
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-8">
                  {selectedIds.size === filteredStudents.filter(s => !existingDirectoryIds.includes(s.id)).length && filteredStudents.length > 0
                    ? 'Deseleccionar todos' 
                    : 'Seleccionar todos'}
                </Button>
              </div>
              {filteredStudents.map(student => {
                const isExisting = existingDirectoryIds.includes(student.id)
                const isSelected = selectedIds.has(student.id)
                return (
                  <div 
                    key={student.id}
                    onClick={() => handleToggleSelect(student.id)}
                    className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                      isExisting ? 'bg-slate-100 opacity-60 cursor-not-allowed' :
                      isSelected ? 'bg-emerald-50 hover:bg-emerald-100 cursor-pointer' : 
                      'hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <div className="text-emerald-600 flex-shrink-0">
                      {isExisting ? (
                        <CheckSquare className="h-5 w-5 text-slate-400" />
                      ) : isSelected ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {student.last_name} {student.first_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Doc: {student.document_id}
                      </p>
                    </div>
                    {isExisting && (
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded">
                        Ya inscrito
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={selectedIds.size === 0 || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Añadir seleccionados ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
