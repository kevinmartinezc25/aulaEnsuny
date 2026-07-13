'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  BarChart3,
  Search,
  Download,
  MoreHorizontal,
  MessageSquare,
  Save,
  ExternalLink,
  Calendar,
  ClipboardCheck,
  BookOpen,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  Trash2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { MessageModal } from '../components/MessageModal'
import {
  getGradesMatrix,
  getAcademicPeriods,
  saveLessonGradesBatch,
  GradeMatrixColumn,
  GradeMatrixRow,
  LessonGradeType,
  AcademicPeriod
} from '../../../grades/application/gradesActions'

const TYPE_LABELS: Record<LessonGradeType, string> = {
  quiz: 'Quiz',
  task: 'Tarea',
  workshop: 'Taller',
  activity: 'Actividad',
  forum: 'Foro'
}

const TYPE_COLORS: Record<LessonGradeType, string> = {
  quiz: '#8b5cf6',
  task: '#06b6d4',
  workshop: '#f59e0b',
  activity: '#10b981',
  forum: '#ec4899'
}

export function TeacherCourseGradesScreen({ courseId }: { courseId: string }) {
  const router = useRouter()
  
  // Data State
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all')
  const [columns, setColumns] = useState<GradeMatrixColumn[]>([])
  const [rows, setRows] = useState<GradeMatrixRow[]>([])
  const [courseInfo, setCourseInfo] = useState<{ title: string; gradeLevel: string; groupName: string } | null>(null)
  
  // UI State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [activeRecipient, setActiveRecipient] = useState<{ name: string; email: string } | null>(null)
  
  // Unsaved Inline Grades state: `${studentId}_${lessonId}` -> value (number or null)
  const [unsavedGrades, setUnsavedGrades] = useState<Record<string, number | null>>({})

  const [mounted, setMounted] = useState(false)
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeDropdownRow = useMemo(() => {
    if (!openDropdownId) return null
    return rows.find(r => r.studentId === openDropdownId) || null
  }, [openDropdownId, rows])


  // Load periods on mount
  useEffect(() => {
    getAcademicPeriods()
      .then(p => {
        setPeriods(p)
        if (p.length > 0) setSelectedPeriodId(p[0].id)
      })
      .catch(err => {
        console.error(err)
        toast.error('Error al cargar períodos académicos')
      })
  }, [])

  // Load matrix when course or period changes
  const loadMatrix = useCallback(async (cId: string, pId?: string) => {
    if (!cId) return
    setLoading(true)
    try {
      const result = await getGradesMatrix(cId, pId)
      setColumns(result.columns)
      setRows(result.students)
      setCourseInfo(result.courseInfo)
      setUnsavedGrades({}) // Reset unsaved grades on reload
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la matriz de calificaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (courseId && selectedPeriodId) {
      loadMatrix(courseId, selectedPeriodId)
    }
  }, [courseId, selectedPeriodId, loadMatrix])

  // Click outside, scroll, or resize to close dropdowns
  useEffect(() => {
    const handleClose = () => {
      setOpenDropdownId(null)
      setDropdownCoords(null)
    }
    if (openDropdownId) {
      window.addEventListener('click', handleClose)
      window.addEventListener('scroll', handleClose, true)
      window.addEventListener('resize', handleClose)
    }
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [openDropdownId])

  // Recalculates the student final grade in real-time considering unsaved edits
  const calculateRowFinalGrade = useCallback((row: GradeMatrixRow) => {
    let sum = 0
    let count = 0
    columns.forEach(col => {
      const key = `${row.studentId}_${col.lessonId}`
      const dbEntry = row.grades[col.lessonId]
      const dbValue = dbEntry ? dbEntry.grade : null
      const currentValue = unsavedGrades[key] !== undefined ? unsavedGrades[key] : dbValue
      if (currentValue !== null) {
        sum += currentValue
        count++
      }
    })
    return count > 0 ? Number((sum / count).toFixed(2)) : null
  }, [columns, unsavedGrades])

  // Helper to determine performance level
  const getPerformanceLevel = (avg: number) => {
    if (avg >= 4.6) return 'Superior'
    if (avg >= 4.0) return 'Alto'
    if (avg >= 3.0) return 'Básico'
    if (avg > 0) return 'Bajo'
    return '-'
  }

  // --- Dropdown options for unique activity types ---
  const uniqueActivityTypes = useMemo(() => {
    return Array.from(new Set(columns.map(c => c.gradeType)))
  }, [columns])

  // --- Filtering columns & rows ---
  const visibleColumns = useMemo(() => {
    return selectedActivityId === 'all'
      ? columns
      : columns.filter(col => col.gradeType === selectedActivityId)
  }, [columns, selectedActivityId])

  const filteredRows = useMemo(() => {
    return rows.filter(r =>
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [rows, searchQuery])

  // --- Message Modal handlers ---
  const handleSendMessage = (row: GradeMatrixRow) => {
    setOpenDropdownId(null)
    setActiveRecipient({
      name: row.studentName,
      email: `${row.studentName.replace(/\s+/g, '').toLowerCase()}@estudiante.ensuny.edu.co`
    })
    setIsMessageModalOpen(true)
  }

  const handleSendModalMessage = (subject: string, message: string) => {
    console.log(`Mensaje enviado a ${activeRecipient?.name}`, { subject, message })
    setIsMessageModalOpen(false)
    setActiveRecipient(null)
    toast.success('Mensaje enviado exitosamente')
  }

  // --- Save batch grades ---
  const handleSaveAllGrades = async () => {
    if (Object.keys(unsavedGrades).length === 0) return
    setSaving(true)
    try {
      const rowsToSave = Object.entries(unsavedGrades).map(([key, grade]) => {
        const [studentId, lessonId] = key.split('_')
        const col = columns.find(c => c.lessonId === lessonId)
        return {
          studentId,
          lessonId,
          courseId,
          periodId: selectedPeriodId || undefined,
          gradeType: col?.gradeType ?? ('task' as LessonGradeType),
          grade: grade, // Can be null to clear / delete grade
          maxGrade: 5
        }
      })

      const result = await saveLessonGradesBatch(rowsToSave)
      if (result.error) {
        toast.error(`Error al guardar: ${result.error}`)
      } else {
        toast.success('Todas las calificaciones fueron actualizadas')
        await loadMatrix(courseId, selectedPeriodId)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Error al guardar calificaciones')
    } finally {
      setSaving(false)
    }
  }

  // --- CSV Export ---
  const handleExportCSV = () => {
    const header = ['Estudiante', ...visibleColumns.map(c => `${TYPE_LABELS[c.gradeType]} - ${c.lessonTitle}`), 'Definitiva', 'Desempeño']
    const rowsData = filteredRows.map(r => {
      const colVals = visibleColumns.map(c => {
        const key = `${r.studentId}_${c.lessonId}`
        const dbEntry = r.grades[c.lessonId]
        const dbValue = dbEntry ? dbEntry.grade : null
        const currentValue = unsavedGrades[key] !== undefined ? unsavedGrades[key] : dbValue
        return currentValue !== null ? currentValue.toFixed(1) : '-'
      })
      const finalGrade = calculateRowFinalGrade(r)
      const performanceText = finalGrade !== null ? getPerformanceLevel(finalGrade) : '-'
      return [r.studentName, ...colVals, finalGrade?.toFixed(2) ?? '-', performanceText]
    })

    const csv = [header, ...rowsData].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calificaciones_${courseInfo?.title ?? 'curso'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasUnsavedChanges = Object.keys(unsavedGrades).length > 0

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            Calificaciones
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Calificaciones por lección evaluable · Escala 0–5 · Edición Inline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              onClick={handleSaveAllGrades}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar Cambios
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={rows.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Premium Filters Container */}
      <div className="grades-filters-container">
        {/* Search Input */}
        <div className="filter-group">
          <label className="filter-label">Buscar Estudiante</label>
          <div className="select-wrapper">
            <Search size={16} className="selector-icon" />
            <input
              type="text"
              placeholder="Escribe el nombre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input-field"
            />
          </div>
        </div>

        {/* Period Selector */}
        <div className="filter-group filter-group-sm">
          <label className="filter-label">Período Académico</label>
          <div className="select-wrapper">
            <Calendar size={16} className="selector-icon" />
            <select
              value={selectedPeriodId}
              onChange={e => setSelectedPeriodId(e.target.value)}
            >
              <option value="">Seleccionar período…</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Activity Selector */}
        <div className="filter-group filter-group-sm">
          <label className="filter-label">Actividad Evaluativa</label>
          <div className="select-wrapper">
            <ClipboardCheck size={16} className="selector-icon" />
            <select
              value={selectedActivityId}
              onChange={e => setSelectedActivityId(e.target.value)}
              disabled={columns.length === 0}
            >
              <option value="all">Todas las actividades</option>
              {uniqueActivityTypes.map(type => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Gradebook Grid */}
      {loading ? (
        <div className="matrix-loading">
          <Loader2 size={32} className="spin animate-spin" />
          <p>Cargando matriz de calificaciones…</p>
        </div>
      ) : columns.length === 0 ? (
        <div className="matrix-empty">
          <ClipboardCheck size={48} />
          <p>Este curso no tiene lecciones evaluables (quiz, tarea, taller o actividad)</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="matrix-empty">
          <FileSpreadsheet size={48} />
          <p>No se encontraron estudiantes que coincidan con la búsqueda</p>
        </div>
      ) : (
        <div className="matrix-scroll-wrapper">
          <table className="grades-table">
            <thead>
              <tr>
                <th className="col-student">Estudiante</th>
                {visibleColumns.map(col => (
                  <th key={col.lessonId} className="col-grade">
                    <div className="col-header-inner">
                      <span
                        className="col-type-badge"
                        style={{ background: TYPE_COLORS[col.gradeType] + '22', color: TYPE_COLORS[col.gradeType] }}
                      >
                        {TYPE_LABELS[col.gradeType]}
                      </span>
                      <span className="col-title">{col.lessonTitle}</span>
                    </div>
                  </th>
                ))}
                <th className="col-final">Definitiva</th>
                <th className="col-performance">Desempeño</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rIdx) => {
                const finalGrade = calculateRowFinalGrade(row)
                const finalAvg = finalGrade?.toFixed(2) ?? null
                const perfLevel = finalGrade !== null ? getPerformanceLevel(finalGrade) : '-'

                return (
                  <motion.tr
                    key={row.studentId}
                    className="grade-row"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rIdx * 0.01 }}
                  >
                    {/* Student Column - Sticky with More Menu */}
                    <td className={`cell-student ${openDropdownId === row.studentId ? 'active-dropdown-cell' : ''}`}>
                      <div className="student-avatar-cell">
                        <div className="student-initials">
                          {row.studentName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <span className="student-name-text">{row.studentName}</span>
                        
                        <div className="student-actions-menu">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (openDropdownId === row.studentId) {
                                setOpenDropdownId(null)
                                setDropdownCoords(null)
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setDropdownCoords({
                                  top: rect.bottom + window.scrollY + 4,
                                  left: rect.right + window.scrollX - 140
                                })
                                setOpenDropdownId(row.studentId)
                              }
                            }}
                            className="btn-more-actions"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Columns Grades */}
                    {visibleColumns.map(col => {
                      const key = `${row.studentId}_${col.lessonId}`
                      const dbEntry = row.grades[col.lessonId]
                      const dbValue = dbEntry ? dbEntry.grade : null
                      const currentValue = unsavedGrades[key] !== undefined ? unsavedGrades[key] : dbValue
                      
                      const isQuiz = col.gradeType === 'quiz'

                      return (
                        <td key={col.lessonId} className="cell-grade">
                          {isQuiz ? (
                            // Read-only cell for quizzes
                            <div
                              className={`grade-display-readonly ${currentValue !== null ? 'has-grade' : 'no-grade'}`}
                              style={currentValue !== null ? { borderColor: TYPE_COLORS[col.gradeType] + '22', background: TYPE_COLORS[col.gradeType] + '06' } : {}}
                            >
                              {currentValue !== null ? (
                                <span style={{ color: currentValue < 3 ? '#ef4444' : currentValue >= 4.6 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                                  {currentValue.toFixed(1)}
                                </span>
                              ) : (
                                <span className="no-grade-text">—</span>
                              )}
                            </div>
                          ) : (
                            // Inline edit input cell for manual activities
                            <div className="inline-grade-cell">
                              <input
                                type="number"
                                min="0"
                                max="5"
                                step="0.1"
                                placeholder="—"
                                value={currentValue !== null ? currentValue : ''}
                                onChange={e => {
                                  const val = e.target.value === '' ? null : parseFloat(e.target.value)
                                  if (val === null) {
                                    setUnsavedGrades(prev => ({ ...prev, [key]: null }))
                                  } else if (val >= 0 && val <= 5) {
                                    setUnsavedGrades(prev => ({ ...prev, [key]: val }))
                                  }
                                }}
                                className={`grade-input ${unsavedGrades[key] !== undefined ? 'dirty' : ''}`}
                              />
                            </div>
                          )}
                        </td>
                      )
                    })}

                    {/* Final Grade column */}
                    <td className="cell-final">
                      {finalAvg ? (
                        <span className={`final-badge ${parseFloat(finalAvg) >= 4.6 ? 'superior' : parseFloat(parseFloat(finalAvg).toFixed(1)) >= 4.0 ? 'alto' : parseFloat(parseFloat(finalAvg).toFixed(1)) >= 3.0 ? 'basico' : 'bajo'}`}>
                          {finalAvg}
                        </span>
                      ) : (
                        <span className="final-empty">—</span>
                      )}
                    </td>

                    {/* Performance Column */}
                    <td className="cell-performance">
                      {finalAvg ? (
                        <span className={`performance-badge ${parseFloat(finalAvg) >= 4.6 ? 'superior' : parseFloat(finalAvg) >= 4.0 ? 'alto' : parseFloat(finalAvg) >= 3.0 ? 'basico' : 'bajo'}`}>
                          {perfLevel}
                        </span>
                      ) : (
                        <span className="performance-empty">—</span>
                      )}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Message Modal */}
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        recipient={activeRecipient}
        onSend={handleSendModalMessage}
      />

      {/* Portal Dropdown Menu */}
      {mounted && openDropdownId && dropdownCoords && activeDropdownRow && createPortal(
        <div
          className="dropdown-menu"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: `${dropdownCoords.top}px`,
            left: `${dropdownCoords.left}px`,
            margin: 0
          }}
        >
          <Link
            href={`/teacher/courses/${courseId}/students/${activeDropdownRow.studentId}`}
            className="dropdown-item"
          >
            <ExternalLink size={12} />
            Ver Detalle
          </Link>
          <button
            type="button"
            onClick={() => handleSendMessage(activeDropdownRow)}
            className="dropdown-item text-blue-600 dark:text-blue-400"
          >
            <MessageSquare size={12} />
            Enviar Mensaje
          </button>
        </div>,
        document.body
      )}

      {/* Embedded CSS Styles */}
      <style>{`
        .grades-filters-container {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 20px;
        }
        .dark .grades-filters-container {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: none;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          min-width: 250px;
        }
        .filter-group.filter-group-sm {
          max-width: 240px;
          min-width: 180px;
        }
        
        .filter-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .dark .filter-label {
          color: #94a3b8;
        }
        
        .select-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .dark .select-wrapper {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .select-wrapper:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
        .selector-icon { color: #64748b; flex-shrink: 0; }
        .dark .selector-icon { color: #94a3b8; }
        
        .select-wrapper select {
          flex: 1;
          background: transparent;
          border: none;
          color: #0f172a;
          font-size: 0.87rem;
          outline: none;
          cursor: pointer;
        }
        .dark .select-wrapper select {
          color: #f1f5f9;
        }
        .select-wrapper select option {
          background: #ffffff;
          color: #0f172a;
        }
        .dark .select-wrapper select option {
          background: #0f172a;
          color: #f1f5f9;
        }
        
        .search-input-field {
          flex: 1;
          background: transparent;
          border: none;
          color: #0f172a;
          font-size: 0.87rem;
          outline: none;
        }
        .dark .search-input-field {
          color: #f1f5f9;
        }

        .matrix-loading, .matrix-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 12px; padding: 80px 20px; color: #64748b; text-align: center;
        }
        .dark .matrix-loading, .dark .matrix-empty {
          color: #94a3b8;
        }
        .matrix-loading p, .matrix-empty p { font-size: 0.9rem; }
        
        .matrix-scroll-wrapper {
          overflow-x: auto; border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }
        .dark .matrix-scroll-wrapper {
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: none;
        }
        
        .grades-table {
          width: 100%; border-collapse: collapse; min-width: 600px;
          background: #ffffff;
        }
        .dark .grades-table {
          background: rgba(15,23,42,0.6);
        }
        .grades-table thead tr {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .dark .grades-table thead tr {
          background: rgba(99,102,241,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .grades-table th {
          padding: 10px 12px; text-align: left;
          font-size: 0.78rem; font-weight: 600; color: #475569;
          white-space: nowrap;
        }
        .dark .grades-table th {
          color: #94a3b8;
        }
        
        .col-student { min-width: 180px; position: sticky; left: 0; z-index: 2; background: #ffffff; }
        .dark .col-student { background: rgba(15,23,42,0.9); }
        .grades-table th.col-grade { text-align: center; min-width: 75px; }
        .grades-table th.col-final { text-align: center; min-width: 80px; }
        .grades-table th.col-performance { text-align: center; min-width: 110px; }
        
        .col-header-inner { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .col-type-badge {
          display: inline-block; padding: 2px 7px; border-radius: 4px;
          font-size: 0.7rem; font-weight: 600;
        }
        .col-title { font-size: 0.75rem; color: #334155; max-width: 75px; overflow: hidden; text-overflow: ellipsis; }
        .dark .col-title { color: #cbd5e1; }
        
        .grade-row { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
        .dark .grade-row { border-bottom: 1px solid rgba(255,255,255,0.04); }
        .grade-row:hover { background: #f8fafc; }
        .dark .grade-row:hover { background: rgba(255,255,255,0.02); }
        
        .cell-student {
          padding: 10px 12px; position: sticky; left: 0; z-index: 1;
          background: #ffffff;
        }
        .cell-student.active-dropdown-cell {
          z-index: 10;
        }
        .dark .cell-student {
          background: rgba(15,23,42,0.85);
        }
        
        .student-avatar-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }
        .student-initials {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 700; color: white; flex-shrink: 0;
        }
        .student-name-text {
          font-size: 0.84rem;
          color: #1e293b;
          font-weight: 500;
          flex-grow: 1;
          margin-right: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dark .student-name-text {
          color: #e2e8f0;
        }
        
        .student-actions-menu {
          position: relative;
          display: inline-block;
        }
        .btn-more-actions {
          padding: 4px;
          border-radius: 4px;
          color: #94a3b8;
          cursor: pointer;
          background: transparent;
          border: none;
          transition: all 0.2s;
        }
        .btn-more-actions:hover {
          background: #f1f5f9;
          color: #475569;
        }
        .dark .btn-more-actions:hover {
          background: rgba(255,255,255,0.08);
          color: white;
        }
        
        .dropdown-menu {
          position: absolute;
          left: 0;
          top: 100%;
          margin-top: 4px;
          width: 140px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          z-index: 50;
          padding: 4px 0;
        }
        .dark .dropdown-menu {
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: none;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          text-align: left;
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
          background: transparent;
          border: none;
          text-decoration: none;
        }
        .dark .dropdown-item {
          color: #cbd5e1;
        }
        .dropdown-item:hover {
          background: #f8fafc;
        }
        .dark .dropdown-item:hover {
          background: rgba(255,255,255,0.04);
        }

        .cell-grade { padding: 4px 6px; text-align: center; }
        
        .grade-display-readonly {
          min-width: 44px; height: 28px; border-radius: 6px;
          border: 1px solid transparent;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem;
          margin: 0 auto;
        }
        .grade-display-readonly.has-grade {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .dark .grade-display-readonly.has-grade {
          border-color: rgba(255, 255, 255, 0.08);
          background: transparent;
        }
        .grade-display-readonly.no-grade {
          border: 1px dashed #cbd5e1;
        }
        .dark .grade-display-readonly.no-grade {
          border: 1px dashed rgba(255, 255, 255, 0.08);
        }
        .no-grade-text {
          color: #94a3b8;
          font-size: 0.8rem;
        }
        .dark .no-grade-text {
          color: #475569;
        }
        
        .inline-grade-cell {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .grade-input {
          width: 44px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 700;
          color: #0f172a;
          outline: none;
          transition: all 0.2s;
        }
        .dark .grade-input {
          border-color: rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          color: #f1f5f9;
        }
        .grade-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
          background: #ffffff;
        }
        .dark .grade-input:focus {
          background: rgba(15,23,42,0.8);
        }
        .grade-input.dirty {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.05);
        }
        .dark .grade-input.dirty {
          border-color: #818cf8;
          background: rgba(129, 140, 248, 0.05);
        }
        .grade-input::placeholder {
          color: #cbd5e1;
          font-weight: 500;
        }
        .dark .grade-input::placeholder {
          color: #475569;
        }
        .grade-input::-webkit-outer-spin-button,
        .grade-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .grade-input[type=number] {
          -moz-appearance: textfield;
        }

        .cell-final { padding: 6px 12px; text-align: center; }
        .final-badge {
          display: inline-block; padding: 3px 10px; border-radius: 6px;
          font-size: 0.82rem; font-weight: 700;
        }
        .final-badge.superior { background: rgba(16,185,129,0.15); color: #059669; }
        .dark .final-badge.superior { color: #34d399; }
        .final-badge.alto { background: rgba(99,102,241,0.15); color: #4f46e5; }
        .dark .final-badge.alto { color: #a5b4fc; }
        .final-badge.basico { background: rgba(245,158,11,0.15); color: #d97706; }
        .dark .final-badge.basico { color: #fbbf24; }
        .final-badge.bajo { background: rgba(239,68,68,0.15); color: #dc2626; }
        .dark .final-badge.bajo { color: #f87171; }
        .final-empty { color: #cbd5e1; font-size: 0.8rem; }
        .dark .final-empty { color: #475569; }

        .cell-performance { padding: 6px 12px; text-align: center; }
        .performance-badge {
          display: inline-block; padding: 3px 10px; border-radius: 6px;
          font-size: 0.82rem; font-weight: 700;
        }
        .performance-badge.superior { background: rgba(16,185,129,0.15); color: #059669; }
        .dark .performance-badge.superior { color: #34d399; }
        .performance-badge.alto { background: rgba(99,102,241,0.15); color: #4f46e5; }
        .dark .performance-badge.alto { color: #a5b4fc; }
        .performance-badge.basico { background: rgba(245,158,11,0.15); color: #d97706; }
        .dark .performance-badge.basico { color: #fbbf24; }
        .performance-badge.bajo { background: rgba(239,68,68,0.15); color: #dc2626; }
        .dark .performance-badge.bajo { color: #f87171; }
        .performance-empty { color: #cbd5e1; font-size: 0.8rem; }
        .dark .performance-empty { color: #475569; }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
