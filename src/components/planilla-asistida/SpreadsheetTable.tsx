'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { usePlanillaStore } from '@/store/usePlanillaStore'
import { AssistedAchievement, AssistedActivity, createAssistedStudent, addDirectoryStudents, deleteAssistedStudent } from '@/modules/planilla-asistida/application/actions'
import { Search, ArrowDownAZ, ArrowDownZA, Plus, Trash2, Loader2, Lock, Unlock, TrendingUp, Users, Eye, EyeOff } from 'lucide-react'
import { DirectoryStudentLoader } from '@/modules/planilla-asistida/presentation/components/DirectoryStudentLoader'
import { toast } from 'sonner'

interface SpreadsheetTableProps {
  subjectId: string
}

// Colores pastel por Logro
const LOGRO_COLORS = [
  { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  { bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
]

// Subcomponente para manejar el estado local del input y permitir escribir decimales como "4." antes de que se parsee.
const GradeCell = React.memo(({ 
  studentId, 
  activityId, 
  initialValue, 
  rowIdx, 
  colIdx,
  isSelected,
  isLocked,
  onChange, 
  onKeyDown,
  onMouseDown,
  onMouseEnter
}: { 
  studentId: string, 
  activityId: string, 
  initialValue: number | undefined, 
  rowIdx: number, 
  colIdx: number,
  isSelected: boolean,
  isLocked: boolean,
  onChange: (studentId: string, activityId: string, val: string) => void,
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => void,
  onMouseDown: (r: number, c: number) => void,
  onMouseEnter: (r: number, c: number) => void
}) => {
  const [localValue, setLocalValue] = useState<string>(initialValue !== undefined && initialValue !== null ? initialValue.toFixed(1) : '')
  const [isFocused, setIsFocused] = useState(false)

  // Sincronizar si el valor cambia desde fuera (p. ej. otra pestaña)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(initialValue !== undefined && initialValue !== null ? initialValue.toFixed(1) : '')
    }
  }, [initialValue, isFocused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocalValue(val)
    onChange(studentId, activityId, val)
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Formatear al salir si es válido
    const parsed = parseFloat(localValue.replace(',', '.'))
    if (!isNaN(parsed) && parsed >= 1.0 && parsed <= 5.0) {
      setLocalValue(parsed.toFixed(1))
    } else if (localValue === '') {
      setLocalValue('')
    } else {
      // Si es inválido, revertir a initialValue visualmente
      setLocalValue(initialValue !== undefined && initialValue !== null ? initialValue.toFixed(1) : '')
    }
  }
  const isFailing = !isFocused && localValue !== '' && parseFloat(localValue) < 3.0

  return (
    <input
      type="text"
      data-row={rowIdx}
      data-col={colIdx}
      readOnly={isLocked}
      className={`w-full h-full absolute inset-0 text-center text-[16px] md:text-xs outline-none focus:bg-red-50 dark:focus:bg-red-900/30 focus:ring-1 focus:ring-inset focus:ring-red-500 transition-colors ${
        isSelected && !isLocked ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-transparent'
      } ${isLocked ? 'cursor-not-allowed opacity-80' : ''} ${
        isFailing ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-800 dark:text-slate-200'
      }`}
      value={localValue}
      onChange={handleChange}
      onKeyDown={(e) => {
        if (!isLocked) onKeyDown(e, rowIdx, colIdx)
      }}
      onMouseDown={() => onMouseDown(rowIdx, colIdx)}
      onMouseEnter={() => onMouseEnter(rowIdx, colIdx)}
      onFocus={(e) => {
        if (!isLocked) {
          setIsFocused(true)
          e.target.select()
        }
      }}
      onBlur={handleBlur}
    />
  )
})
GradeCell.displayName = 'GradeCell'

export function SpreadsheetTable({ subjectId }: SpreadsheetTableProps) {
  const { students, achievements, activities, grades, setGrade, saveChanges, isSaving, hasUnsavedChanges, addStudent, addStudents, removeStudent } = usePlanillaStore()
  const tableRef = useRef<HTMLDivElement>(null)

  // Modo seguro (Bloqueo)
  const [isLocked, setIsLocked] = useState(false)
  
  // Filtro y Orden
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Agregar/Eliminar estudiante local
  const [isLoaderOpen, setIsLoaderOpen] = useState(false)
  const [isAddingStudent, setIsAddingStudent] = useState(false)
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null)

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students]
    
    // Filtrar
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s => s.full_name.toLowerCase().includes(q) || s.number.toString().includes(q))
    }
    
    // Ordenar
    if (sortOrder === 'desc') {
      result.sort((a, b) => b.full_name.localeCompare(a.full_name))
    } else {
      result.sort((a, b) => a.full_name.localeCompare(b.full_name))
    }
    
    return result
  }, [students, searchQuery, sortOrder])
  
  // Auto-save logic (debounce)
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        saveChanges()
      }, 1500)
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [grades, hasUnsavedChanges, saveChanges])

  // Estadísticas rápidas se moverán abajo de calcFinalAverage

  // Lógica de Selección tipo Excel
  const [selectionStart, setSelectionStart] = useState<{r: number, c: number} | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{r: number, c: number} | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleTogglePublish = async (id: string, name: string, currentState: boolean) => {
    try {
      const { toggleActivityPublishStatus } = await import('@/modules/planilla-asistida/application/actions')
      await toggleActivityPublishStatus(id, !currentState)
      usePlanillaStore.getState().toggleActivityPublished(id)
      toast.success(`Actividad "${name}" ${!currentState ? 'publicada' : 'ocultada'} exitosamente.`)
    } catch (error: any) {
      toast.error('Error al cambiar el estado de publicación: ' + error.message)
    }
  }

  // Lista plana de columnas para la selección
  const columnsData = React.useMemo(() => {
    const cols: {type: string, id: string}[] = []
    achievements.forEach(ach => {
      (['hacer', 'saber', 'ser'] as const).forEach(comp => {
        const compActivities = activities.filter(a => a.achievement_id === ach.id && a.component_type === comp)
        compActivities.forEach(act => {
          cols.push({ type: 'activity', id: act.id })
        })
      })
      if (ach.code_config && ach.code_config.type !== 'none') {
        cols.push({ type: 'achievement_code', id: ach.id })
      }
      cols.push({ type: 'achievement_avg', id: ach.id })
    })
    cols.push({ type: 'final_avg', id: 'final' })
    return cols
  }, [achievements, activities])

  const handleMouseDown = useCallback((r: number, c: number) => {
    setIsDragging(true)
    setSelectionStart({ r, c })
    setSelectionEnd({ r, c })
  }, [])

  const handleMouseEnter = useCallback((r: number, c: number) => {
    if (isDragging) {
      setSelectionEnd({ r, c })
    }
  }, [isDragging])

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Limpiar selección al hacer clic fuera de la tabla
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setSelectionStart(null)
        setSelectionEnd(null)
      }
    }
    document.addEventListener('mousedown', handleGlobalClick)
    return () => document.removeEventListener('mousedown', handleGlobalClick)
  }, [])

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (!selectionStart || !selectionEnd) return
      
      // Si solo hay una celda seleccionada y estamos editando un input, dejar comportamiento nativo
      if (selectionStart.r === selectionEnd.r && selectionStart.c === selectionEnd.c) {
        if (document.activeElement?.tagName === 'INPUT') return
      }

      e.preventDefault()

      const rMin = Math.min(selectionStart.r, selectionEnd.r)
      const rMax = Math.max(selectionStart.r, selectionEnd.r)
      const cMin = Math.min(selectionStart.c, selectionEnd.c)
      const cMax = Math.max(selectionStart.c, selectionEnd.c)

      const lines = []
      for (let r = rMin; r <= rMax; r++) {
        const rowVals = []
        for (let c = cMin; c <= cMax; c++) {
          const student = students[r]
          const colDef = columnsData[c]
          if (student && colDef) {
            if (colDef.type === 'activity') {
              const val = grades[student.id]?.[colDef.id]
              rowVals.push(val !== undefined && val !== null ? val.toString() : '')
            } else if (colDef.type === 'achievement_avg') {
              const val = calcAchievementAverage(student.id, colDef.id)
              rowVals.push(val !== null ? val.toFixed(1) : '')
            } else if (colDef.type === 'achievement_code') {
              const ach = achievements.find(a => a.id === colDef.id)
              let codeStr = ''
              if (ach && ach.code_config && ach.code_config.type !== 'none') {
                const avg = calcAchievementAverage(student.id, ach.id)
                if (avg !== null) {
                  if (ach.code_config.type === 'single') {
                    codeStr = ach.code_config.singleCode || ''
                  } else if (ach.code_config.type === 'by_range') {
                    if (avg >= 4.6) codeStr = ach.code_config.rangeCodes?.superior || ''
                    else if (avg >= 4.0) codeStr = ach.code_config.rangeCodes?.alto || ''
                    else if (avg >= 3.0) codeStr = ach.code_config.rangeCodes?.basico || ''
                    else codeStr = ach.code_config.rangeCodes?.bajo || ''
                  }
                }
              }
              rowVals.push(codeStr)
            } else if (colDef.type === 'final_avg') {
              const val = calcFinalAverage(student.id)
              rowVals.push(val !== null ? val.toFixed(1) : '')
            }
          }
        }
        lines.push(rowVals.join('\t'))
      }

      const tsvData = lines.join('\n')
      e.clipboardData?.setData('text/plain', tsvData)
    }
    
    window.addEventListener('copy', handleCopy as any)
    return () => window.removeEventListener('copy', handleCopy as any)
  }, [selectionStart, selectionEnd, students, columnsData, grades])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      let startR = -1;
      let startC = -1;

      if (selectionStart && selectionEnd) {
        startR = Math.min(selectionStart.r, selectionEnd.r)
        startC = Math.min(selectionStart.c, selectionEnd.c)
      } else if (document.activeElement?.tagName === 'INPUT') {
        const input = document.activeElement as HTMLInputElement
        if (input.hasAttribute('data-row') && input.hasAttribute('data-col')) {
          startR = parseInt(input.getAttribute('data-row')!)
          startC = parseInt(input.getAttribute('data-col')!)
        }
      }

      if (startR === -1 || startC === -1) return;

      const pastedText = e.clipboardData?.getData('text')
      if (!pastedText) return;

      const rows = pastedText.split(/\r?\n/)
      
      // If it's a single value being pasted into a focused input, let the browser handle it naturally
      if (rows.length === 1 && !rows[0].includes('\t') && document.activeElement?.tagName === 'INPUT') {
        return;
      }

      e.preventDefault();

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }

      const parsedData = rows.map(r => r.split('\t'))
      
      parsedData.forEach((rowVals, rOffset) => {
        const r = startR + rOffset
        if (r >= students.length) return

        const student = students[r]

        rowVals.forEach((val, cOffset) => {
          const c = startC + cOffset
          if (c >= columnsData.length) return

          const colDef = columnsData[c]
          if (colDef.type === 'activity') {
            const cleanVal = val.replace(',', '.').trim()
            if (cleanVal) {
              const numVal = parseFloat(cleanVal)
              if (!isNaN(numVal) && numVal >= 1.0 && numVal <= 5.0) {
                setGrade(student.id, colDef.id, numVal)
              }
            } else if (cleanVal === '') {
               // Ignore empty paste for safety? Or clear? Excel usually clears. Let's keep it safe and ignore empty strings if pasting block.
            }
          }
        })
      })
    }

    window.addEventListener('paste', handlePaste as any)
    return () => window.removeEventListener('paste', handlePaste as any)
  }, [selectionStart, selectionEnd, students, columnsData, setGrade])

  // Calcular promedios
  const calcComponentAverage = (studentId: string, achievementId: string, component: 'hacer' | 'saber' | 'ser') => {
    const compActivities = activities.filter(a => a.achievement_id === achievementId && a.component_type === component)
    if (compActivities.length === 0) return null
    
    let sum = 0
    let count = 0
    compActivities.forEach(act => {
      const grade = grades[studentId]?.[act.id]
      if (grade !== undefined && grade !== null) {
        sum += grade
        count++
      }
    })
    
    if (count === 0) return null
    return sum / count
  }

  const calcAchievementAverage = (studentId: string, achievementId: string) => {
    const hacer = calcComponentAverage(studentId, achievementId, 'hacer')
    const saber = calcComponentAverage(studentId, achievementId, 'saber')
    const ser = calcComponentAverage(studentId, achievementId, 'ser')
    
    let total = 0
    let weight = 0
    
    if (hacer !== null) { total += hacer * 0.35; weight += 0.35 }
    if (saber !== null) { total += saber * 0.35; weight += 0.35 }
    if (ser !== null) { total += ser * 0.30; weight += 0.30 }
    
    // Si no tiene notas en absoluto en este logro
    if (weight === 0) return null
    
    // Proyección sobre el peso evaluado
    return total / weight 
  }

  const calcFinalAverage = (studentId: string) => {
    let sum = 0
    let count = 0
    achievements.forEach(ach => {
      const avg = calcAchievementAverage(studentId, ach.id)
      if (avg !== null) {
        sum += avg
        count++
      }
    })
    if (count === 0) return null
    return sum / count
  }

  const formatGrade = (grade: number | null) => {
    if (grade === null) return '-'
    return grade.toFixed(1)
  }

  // Estadísticas rápidas
  const { classAverage, passingPercentage, validStudents } = useMemo(() => {
    if (students.length === 0) return { classAverage: 0, passingPercentage: 0, validStudents: 0 }
    
    let totalScore = 0
    let passedCount = 0
    let count = 0

    students.forEach(student => {
      const avg = calcFinalAverage(student.id)
      if (avg !== null) {
        totalScore += avg
        count++
        if (avg >= 3.0) passedCount++
      }
    })

    const average = count > 0 ? totalScore / count : 0
    const passPct = count > 0 ? Math.round((passedCount / count) * 100) : 0

    return { classAverage: average, passingPercentage: passPct, validStudents: count }
  }, [students, grades, achievements, activities])

  const handleInputChange = useCallback((studentId: string, activityId: string, value: string) => {
    if (value === '') {
      setGrade(studentId, activityId, null)
      return
    }
    
    // Permitir guardar el número si termina en punto para que al menos no se pierda.
    // Sin embargo, el estado global guarda el número.
    const cleanStr = value.replace(',', '.')
    
    // Si la persona digitó "4." parseamos como "4" y lo guardamos
    if (!isNaN(parseFloat(cleanStr))) {
      const parsed = parseFloat(cleanStr)
      if (parsed >= 1.0 && parsed <= 5.0) {
        setGrade(studentId, activityId, parsed)
      }
    }
  }, [setGrade])

  const handleAddStudentsFromLoader = async (studentsToAdd: { full_name: string, directoryId: string }[]) => {
    try {
      setIsAddingStudent(true)
      const addedStudents = await addDirectoryStudents(subjectId, studentsToAdd.map(s => ({ full_name: s.full_name, directory_id: s.directoryId })))
      addStudents(addedStudents.map(s => ({
        id: s.id,
        number: s.number,
        full_name: s.full_name,
        directoryId: s.directory_id
      })))
      toast.success(`${addedStudents.length} estudiantes añadidos exitosamente`)
    } catch (error: any) {
      toast.error(error.message || 'Error al añadir estudiantes')
    } finally {
      setIsAddingStudent(false)
    }
  }

  const handleDeleteStudent = (studentId: string, fullName: string) => {
    toast.error(`¿Estás seguro de eliminar a ${fullName}?`, {
      description: 'Se perderán sus calificaciones.',
      duration: 8000,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            setDeletingStudentId(studentId)
            await deleteAssistedStudent(studentId)
            removeStudent(studentId)
            toast.success('Estudiante eliminado exitosamente')
          } catch (error: any) {
            toast.error(error.message || 'Error al eliminar estudiante')
          } finally {
            setDeletingStudentId(null)
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    // Navegación estilo Excel
    const target = e.target as HTMLInputElement
    const table = target.closest('table')
    if (!table) return
    
    let nextRow = rowIdx
    let nextCol = colIdx
    
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      nextRow++
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      nextRow--
      e.preventDefault()
    } else if (e.key === 'ArrowRight') {
      nextCol++
    } else if (e.key === 'ArrowLeft') {
      nextCol--
    }

    if (nextRow !== rowIdx || nextCol !== colIdx) {
      const nextInput = table.querySelector(`input[data-row="${nextRow}"][data-col="${nextCol}"]`) as HTMLInputElement
      if (nextInput) {
        nextInput.focus()
        nextInput.select()
        // Al moverse con teclado, actualizamos la selección a la nueva celda
        setSelectionStart({ r: nextRow, c: nextCol })
        setSelectionEnd({ r: nextRow, c: nextCol })
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-full select-none" ref={tableRef}>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-2 px-1">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {isSaving ? (
            <span className="flex items-center text-amber-600"><span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse mr-1.5"></span> Guardando...</span>
          ) : hasUnsavedChanges ? (
            <span className="text-slate-400">Cambios sin guardar</span>
          ) : (
            <span className="flex items-center text-emerald-600"><span className="h-1.5 w-1.5 bg-emerald-500 rounded-full mr-1.5"></span> Guardado en borrador</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Estadísticas */}
          <div className="hidden lg:flex items-center gap-3 mr-3 px-3 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium">Promedio:</span>
              <span className={`font-bold ${classAverage > 0 && classAverage < 3.0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                {classAverage > 0 ? classAverage.toFixed(1) : '-'}
              </span>
            </div>
            <div className="w-px h-3 bg-slate-300 dark:bg-slate-600"></div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Users className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium">Aprobados:</span>
              <span className={`font-bold ${passingPercentage < 50 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {validStudents > 0 ? `${passingPercentage}%` : '-'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center justify-center p-1 border rounded-md transition-colors ${
              isLocked 
                ? 'border-red-200 bg-red-50 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' 
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
            }`}
            title={isLocked ? "Desbloquear edición" : "Bloquear edición"}
          >
            {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar estudiante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center justify-center p-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            title={sortOrder === 'asc' ? "Ordenar Z-A" : "Ordenar A-Z"}
          >
            {sortOrder === 'asc' ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <ArrowDownZA className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="overflow-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm relative custom-scrollbar flex-1">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-40 shadow-sm">
            {/* Fila 1: Logros */}
            <tr>
              <th className="sticky left-0 z-50 w-8 min-w-[32px] max-w-[32px] bg-white dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700"></th>
              <th className="hidden md:table-cell sticky left-8 z-50 w-12 min-w-[48px] max-w-[48px] bg-white dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700"></th>
              <th className="sticky left-8 md:left-20 z-50 w-32 min-w-[128px] max-w-[128px] md:w-64 md:min-w-[256px] md:max-w-[256px] bg-white dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700"></th>
              
              {achievements.map((ach, i) => {
                const color = LOGRO_COLORS[i % LOGRO_COLORS.length]
                const achActivities = activities.filter(a => a.achievement_id === ach.id)
                // Colspan = actividades + 1 (promedio). Pero si un componente no tiene act, ocupa 0? 
                // Asumimos que los 3 componentes siempre se renderizan. 
                // Colspan = (acts de Hacer) + (acts de Saber) + (acts de Ser) + 1 (promedio)
                const totalActs = achActivities.length
                const baseCols = totalActs > 0 ? totalActs + 1 : 4 // Al menos 3 componentes vacíos + promedio = 4
                const hasCode = ach.code_config && ach.code_config.type !== 'none'
                const cols = baseCols + (hasCode ? 1 : 0)
                
                return (
                  <th key={ach.id} colSpan={cols} className={`px-4 py-2 border-b border-r ${color.border} ${color.bg} ${color.text} text-center font-bold`}>
                    {ach.name}
                  </th>
                )
              })}
              <th rowSpan={3} className="bg-slate-100 dark:bg-slate-800 border-b border-l border-slate-200 dark:border-slate-700 font-bold sticky right-0 z-50 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] w-16 min-w-[64px] align-bottom pb-4">
                <div className="writing-vertical-rl transform rotate-180 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap mx-auto h-24 text-left uppercase tracking-wide">
                  Promedio final
                </div>
              </th>
            </tr>
            
            {/* Header Fila 2: Componentes */}
            <tr>
              <th rowSpan={2} className="border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 w-8 min-w-[32px] max-w-[32px] sticky left-0 z-50"></th>
              <th rowSpan={2} className="hidden md:table-cell border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 w-12 min-w-[48px] max-w-[48px] text-center font-semibold text-slate-500 sticky left-8 z-50">N°</th>
              <th rowSpan={2} className="border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 w-32 min-w-[128px] max-w-[128px] md:w-64 md:min-w-[256px] md:max-w-[256px] text-left font-semibold text-slate-500 sticky left-8 md:left-20 z-50 shadow-[4px_0_10px_rgba(0,0,0,0.05)]">Apellidos y Nombres</th>
              
              {achievements.map((ach, i) => {
                const color = LOGRO_COLORS[i % LOGRO_COLORS.length]
                
                const hasCode = ach.code_config && ach.code_config.type !== 'none'
                
                const compHeaders = (['hacer', 'saber', 'ser'] as const).map(comp => {
                  const compActivities = activities.filter(a => a.achievement_id === ach.id && a.component_type === comp)
                  const colspan = Math.max(1, compActivities.length)
                  const weight = comp === 'ser' ? '30%' : '35%'
                  
                  return (
                    <th key={`${ach.id}-${comp}`} colSpan={colspan} className={`px-2 py-1 border-b border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-center text-slate-600 dark:text-slate-400`}>
                      {comp.toUpperCase()} <br/><span className="text-[10px] font-normal">{weight}</span>
                    </th>
                  )
                })

                const headers: React.ReactNode[] = [...compHeaders]
                
                if (hasCode) {
                  headers.push(
                    <th key={`${ach.id}-code`} rowSpan={2} className={`px-1 py-1 border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-center text-slate-500 align-bottom pb-3 w-12`}>
                      Cód.
                    </th>
                  )
                }

                headers.push(
                  <th key={`${ach.id}-prom`} rowSpan={2} className={`border-b border-r ${color.border} ${color.bg} align-bottom pb-3 w-12 min-w-[48px]`}>
                    <div className={`writing-vertical-rl transform rotate-180 text-xs font-bold ${color.text} whitespace-nowrap mx-auto h-20 text-left uppercase tracking-wide`}>
                      Promedio
                    </div>
                  </th>
                )

                return headers
              })}
            </tr>

            {/* Fila 3: Actividades */}
            <tr>
              {achievements.map((ach) => {
                return (['hacer', 'saber', 'ser'] as const).map(comp => {
                  const compActivities = activities.filter(a => a.achievement_id === ach.id && a.component_type === comp)
                  
                  if (compActivities.length === 0) {
                    return <th key={`${ach.id}-${comp}-empty`} className="px-1 py-1 border-b border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 w-12 min-w-[48px] text-center"></th>
                  }

                  return compActivities.map(act => (
                    <th key={act.id} className="px-1 pt-6 pb-2 border-b border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 w-12 min-w-[48px] relative group">
                      <button 
                        onClick={() => handleTogglePublish(act.id, act.name, !!act.is_published)}
                        className={`absolute top-1 right-1 p-1 rounded-md z-10 transition-all ${act.is_published ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title={act.is_published ? "Ocultar a estudiantes" : "Publicar a estudiantes"}
                      >
                        {act.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <div className={`writing-vertical-rl transform rotate-180 text-[11px] font-bold ${act.is_published ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'} whitespace-nowrap mx-auto h-20 text-left uppercase tracking-wide flex items-center justify-start gap-1`}>
                        {act.name}
                      </div>
                    </th>
                  ))
                })
              })}
            </tr>
          </thead>

          <tbody>
            {filteredAndSortedStudents.map((student, rowIdx) => {
              let colIdx = 0 // Para la navegación con teclado

              return (
                <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group">
                  <td className="sticky left-0 z-20 w-8 min-w-[32px] max-w-[32px] bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 text-center text-slate-500">
                    {!isLocked && (
                      <button 
                        onClick={() => handleDeleteStudent(student.id, student.full_name)}
                        disabled={deletingStudentId === student.id}
                        className="p-1 rounded-md hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 mx-auto"
                        title="Eliminar estudiante"
                      >
                        {deletingStudentId === student.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    )}
                  </td>
                  <td className="hidden md:table-cell sticky left-8 z-20 w-12 min-w-[48px] max-w-[48px] bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 text-center text-slate-500 font-medium">
                    {rowIdx + 1}
                  </td>
                  <td className="sticky left-8 md:left-20 z-20 w-32 min-w-[128px] max-w-[128px] md:w-64 md:min-w-[256px] md:max-w-[256px] bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 text-left font-semibold text-slate-700 dark:text-slate-200 px-2 uppercase text-xs truncate shadow-[4px_0_10px_rgba(0,0,0,0.05)]" title={student.full_name}>
                    {student.full_name}
                  </td>

                  {achievements.map((ach, i) => {
                    const color = LOGRO_COLORS[i % LOGRO_COLORS.length]
                    
                    return (
                      <React.Fragment key={ach.id}>
                        {(['hacer', 'saber', 'ser'] as const).map(comp => {
                          const compActivities = activities.filter(a => a.achievement_id === ach.id && a.component_type === comp)
                          
                          if (compActivities.length === 0) {
                            return <td key={`${ach.id}-${comp}-empty`} className="border-r border-b border-slate-200 dark:border-slate-700 w-12 min-w-[48px]"></td>
                          }

                          return compActivities.map(act => {
                            const cellColIdx = colIdx++
                            const val = grades[student.id]?.[act.id]
                            
                            const isSelected = selectionStart && selectionEnd && 
                                               rowIdx >= Math.min(selectionStart.r, selectionEnd.r) &&
                                               rowIdx <= Math.max(selectionStart.r, selectionEnd.r) &&
                                               cellColIdx >= Math.min(selectionStart.c, selectionEnd.c) &&
                                               cellColIdx <= Math.max(selectionStart.c, selectionEnd.c)
                            
                            return (
                              <td key={act.id} className={`border-r border-b border-slate-200 dark:border-slate-700 w-12 min-w-[48px] p-0 relative transition-colors ${isSelected && !isLocked ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}>
                                <GradeCell
                                  studentId={student.id}
                                  activityId={act.id}
                                  initialValue={val}
                                  rowIdx={rowIdx}
                                  colIdx={cellColIdx}
                                  isSelected={!!isSelected}
                                  isLocked={isLocked}
                                  onChange={handleInputChange}
                                  onKeyDown={handleKeyDown}
                                  onMouseDown={handleMouseDown}
                                  onMouseEnter={handleMouseEnter}
                                />
                              </td>
                            )
                          })
                        })}

                        {/* Celda Código del Logro y Promedio del Logro */}
                        {(() => {
                          const hasCode = ach.code_config && ach.code_config.type !== 'none'
                          const avg = calcAchievementAverage(student.id, ach.id)
                          let codeStr = ''
                          if (avg !== null) {
                            if (ach.code_config?.type === 'single') {
                              codeStr = ach.code_config.singleCode || ''
                            } else if (ach.code_config?.type === 'by_range') {
                              if (avg >= 4.6) codeStr = ach.code_config.rangeCodes?.superior || ''
                              else if (avg >= 4.0) codeStr = ach.code_config.rangeCodes?.alto || ''
                              else if (avg >= 3.0) codeStr = ach.code_config.rangeCodes?.basico || ''
                              else codeStr = ach.code_config.rangeCodes?.bajo || ''
                            }
                          }

                          const codeColIdx = hasCode ? colIdx++ : -1
                          const isCodeSelected = hasCode && selectionStart && selectionEnd && 
                                             rowIdx >= Math.min(selectionStart.r, selectionEnd.r) &&
                                             rowIdx <= Math.max(selectionStart.r, selectionEnd.r) &&
                                             codeColIdx >= Math.min(selectionStart.c, selectionEnd.c) &&
                                             codeColIdx <= Math.max(selectionStart.c, selectionEnd.c)

                          const avgCellColIdx = colIdx++
                          const achAvg = calcAchievementAverage(student.id, ach.id)
                          const isAchSelected = selectionStart && selectionEnd && 
                                             rowIdx >= Math.min(selectionStart.r, selectionEnd.r) &&
                                             rowIdx <= Math.max(selectionStart.r, selectionEnd.r) &&
                                             avgCellColIdx >= Math.min(selectionStart.c, selectionEnd.c) &&
                                             avgCellColIdx <= Math.max(selectionStart.c, selectionEnd.c)
                                             
                          return (
                            <React.Fragment key={`${ach.id}-calcs`}>
                              {hasCode && (
                                <td 
                                  onMouseDown={() => handleMouseDown(rowIdx, codeColIdx)}
                                  onMouseEnter={() => handleMouseEnter(rowIdx, codeColIdx)}
                                  className={`border-r border-b border-slate-200 dark:border-slate-700 w-12 min-w-[48px] p-0 relative transition-colors cursor-cell ${isCodeSelected && !isLocked ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-50 dark:bg-slate-800'}`}
                                >
                                  <div className="w-full h-full min-h-[32px] flex items-center justify-center text-[11px] font-bold text-slate-500">
                                    {codeStr}
                                  </div>
                                </td>
                              )}
                              <td 
                                onMouseDown={() => handleMouseDown(rowIdx, avgCellColIdx)}
                                onMouseEnter={() => handleMouseEnter(rowIdx, avgCellColIdx)}
                                className={`border-r border-b ${color.border} w-12 min-w-[48px] p-0 relative transition-colors cursor-cell ${isAchSelected && !isLocked ? 'bg-blue-100 dark:bg-blue-900/40' : color.bg}`}
                              >
                                <div className={`w-full h-full min-h-[32px] flex items-center justify-center text-xs font-bold ${achAvg !== null && achAvg < 3.0 ? 'text-red-600 dark:text-red-400' : color.text}`}>
                                  {formatGrade(achAvg)}
                                </div>
                              </td>
                            </React.Fragment>
                          )
                        })()}
                      </React.Fragment>
                    )
                  })}

                  {/* Celda Promedio Final */}
                  {(() => {
                    const finalCellColIdx = colIdx++
                    const isFinalSelected = selectionStart && selectionEnd && 
                                         rowIdx >= Math.min(selectionStart.r, selectionEnd.r) &&
                                         rowIdx <= Math.max(selectionStart.r, selectionEnd.r) &&
                                         finalCellColIdx >= Math.min(selectionStart.c, selectionEnd.c) &&
                                         finalCellColIdx <= Math.max(selectionStart.c, selectionEnd.c)
                                         
                    const finalAvg = calcFinalAverage(student.id)
                    return (
                      <td 
                        onMouseDown={() => handleMouseDown(rowIdx, finalCellColIdx)}
                        onMouseEnter={() => handleMouseEnter(rowIdx, finalCellColIdx)}
                        className={`sticky right-0 z-20 border-l border-b border-slate-200 dark:border-slate-700 w-16 min-w-[64px] p-0 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] transition-colors cursor-cell ${isFinalSelected && !isLocked ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}
                      >
                        <div className={`w-full h-full min-h-[32px] flex items-center justify-center text-sm font-black ${finalAvg !== null && finalAvg < 3.0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {formatGrade(finalAvg)}
                        </div>
                      </td>
                    )
                  })()}
                </tr>
              )
            })}
            
            {/* Fila para añadir estudiante */}
            <tr>
              <td colSpan={3} className="sticky left-0 z-20 bg-slate-50/90 dark:bg-slate-800/90 border-r border-b border-slate-200 dark:border-slate-700 shadow-[4px_0_10px_rgba(0,0,0,0.05)]">
                <button
                  onClick={() => setIsLoaderOpen(true)}
                  disabled={isAddingStudent || isLocked}
                  className="w-full h-full min-h-[32px] flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
                >
                  {isAddingStudent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  Cargar desde Directorio Estudiantil
                </button>
              </td>
              {achievements.map((ach) => {
                const color = LOGRO_COLORS[achievements.indexOf(ach) % LOGRO_COLORS.length]
                return (
                  <React.Fragment key={`new-${ach.id}`}>
                    {(['hacer', 'saber', 'ser'] as const).map(comp => {
                      const compActivities = activities.filter(a => a.achievement_id === ach.id && a.component_type === comp)
                      if (compActivities.length === 0) return null
                      return compActivities.map(act => (
                        <td key={`new-${act.id}`} className="w-10 border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20"></td>
                      ))
                    })}
                    {/* Promedio del logro (coloreado) */}
                    <td className={`w-12 border-r border-b ${color.border} bg-slate-50/50 dark:bg-slate-800/20`}></td>
                  </React.Fragment>
                )
              })}
              {/* Promedio final (columna sticky) */}
              <td className="sticky right-0 z-10 w-16 border-l border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20"></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* CSS inyectado para la rotación del texto en Safari/Chrome */}
      <style dangerouslySetInnerHTML={{__html: `
        .writing-vertical-rl {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 4px;
        }
      `}} />
      <DirectoryStudentLoader 
        isOpen={isLoaderOpen} 
        onClose={() => setIsLoaderOpen(false)} 
        onAddStudents={handleAddStudentsFromLoader} 
        existingDirectoryIds={students.map(s => (s as any).directoryId).filter(Boolean)} 
        subjectId={subjectId}
      />
    </div>
  )
}
