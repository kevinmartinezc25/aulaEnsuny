'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSpreadsheet, BookOpen, Loader2, Save, ClipboardCheck,
  Star, Pencil, Check, X, LayoutGrid, Download, Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { getTeacherCourses } from '../../application/achievementsActions'
import {
  getGradesMatrix,
  saveLessonGradesBatch,
  getAcademicPeriods,
  GradeMatrixColumn,
  GradeMatrixRow,
  LessonGradeType,
  AcademicPeriod
} from '../../application/gradesActions'

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

export function TeacherGradesMatrixScreen() {
  const [courses, setCourses] = useState<{ id: string; title: string; subject: string; gradeLevel: string; groupName: string }[]>([])
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all')
  const [columns, setColumns] = useState<GradeMatrixColumn[]>([])
  const [rows, setRows] = useState<GradeMatrixRow[]>([])
  const [courseInfo, setCourseInfo] = useState<{ title: string; gradeLevel: string; groupName: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Load courses and periods on mount
  useEffect(() => {
    Promise.all([
      getTeacherCourses(),
      getAcademicPeriods()
    ])
      .then(([c, p]) => {
        setCourses(c)
        setPeriods(p)
        if (c.length > 0) setSelectedCourseId(c[0].id)
        if (p.length > 0) setSelectedPeriodId(p[0].id)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        toast.error('Error al cargar cursos o períodos')
        setLoading(false)
      })
  }, [])

  // Load matrix when course or period changes
  const loadMatrix = useCallback(async (courseId: string, periodId?: string) => {
    if (!courseId) return
    setLoading(true)
    try {
      const result = await getGradesMatrix(courseId, periodId)
      setColumns(result.columns)
      setRows(result.students)
      setCourseInfo(result.courseInfo)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la matriz de calificaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setSelectedActivityId('all')
    if (selectedCourseId) loadMatrix(selectedCourseId, selectedPeriodId)
  }, [selectedCourseId, selectedPeriodId, loadMatrix])

  const handleExportCSV = () => {
    const visibleColumns = selectedActivityId === 'all'
      ? columns
      : columns.filter(c => c.gradeType === selectedActivityId)

    const header = ['Estudiante', ...visibleColumns.map(c => `${TYPE_LABELS[c.gradeType]} - ${c.lessonTitle}`), 'Definitiva', 'Desempeño']
    const rowsData = rows.map(r => {
      const colVals = visibleColumns.map(c => {
        const entry = r.grades[c.lessonId]
        return entry ? entry.grade.toFixed(1) : '-'
      })
      const finalGrade = r.finalGrade
      let performanceText = '-'
      if (finalGrade !== null) {
        if (finalGrade >= 4.6) performanceText = 'Superior'
        else if (finalGrade >= 4.0) performanceText = 'Alto'
        else if (finalGrade >= 3.0) performanceText = 'Básico'
        else if (finalGrade > 0) performanceText = 'Bajo'
      }
      return [r.studentName, ...colVals, r.finalGrade?.toFixed(2) ?? '-', performanceText]
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

  const visibleColumns = selectedActivityId === 'all'
    ? columns
    : columns.filter(col => col.gradeType === selectedActivityId)

  return (
    <div className="grades-matrix-container">
      {/* Header */}
      <div className="grades-header">
        <div className="grades-header-left">
          <div className="grades-header-icon">
            <LayoutGrid size={20} />
          </div>
          <div>
            <h1 className="grades-title">Matriz de Calificaciones</h1>
            <p className="grades-subtitle">Calificaciones por lección evaluable · Escala 0–5 · Modo Lectura</p>
          </div>
        </div>
        <div className="grades-header-actions">
          <button className="btn-export" onClick={handleExportCSV} disabled={rows.length === 0}>
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Modern Premium Filters Grid */}
      <div className="grades-filters-container">
        {/* Course Selector */}
        <div className="filter-group">
          <label className="filter-label">Curso</label>
          <div className="select-wrapper">
            <BookOpen size={16} className="selector-icon" />
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
            >
              <option value="">Seleccionar curso…</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} — Grado {c.gradeLevel}{c.groupName ? ` · Grupo ${c.groupName}` : ''}
                </option>
              ))}
            </select>
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
              disabled={!selectedCourseId || columns.length === 0}
            >
              <option value="all">Todas las actividades</option>
              {Array.from(new Set(columns.map(c => c.gradeType))).map(type => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Matrix */}
      {loading ? (
        <div className="matrix-loading">
          <Loader2 size={32} className="spin" />
          <p>Cargando matriz…</p>
        </div>
      ) : !selectedCourseId ? (
        <div className="matrix-empty">
          <FileSpreadsheet size={48} />
          <p>Selecciona un curso para ver la matriz</p>
        </div>
      ) : columns.length === 0 ? (
        <div className="matrix-empty">
          <ClipboardCheck size={48} />
          <p>Este curso no tiene lecciones evaluables (quiz, tarea, taller o actividad)</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="matrix-empty">
          <Star size={48} />
          <p>No hay estudiantes inscritos en este curso</p>
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
              {rows.map((row, rIdx) => {
                const finalAvg = row.finalGrade?.toFixed(2) ?? null

                return (
                  <motion.tr
                    key={row.studentId}
                    className="grade-row"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rIdx * 0.02 }}
                  >
                    <td className="cell-student">
                      <div className="student-avatar-cell">
                        <div className="student-initials">
                          {row.studentName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <span>{row.studentName}</span>
                      </div>
                    </td>
                    {visibleColumns.map(col => {
                      const entry = row.grades[col.lessonId]
                      const isGraded = !!entry
                      const numVal = entry ? entry.grade : 0

                      return (
                        <td key={col.lessonId} className="cell-grade">
                          <div
                            className={`grade-display-readonly ${isGraded ? 'has-grade' : 'no-grade'}`}
                            style={isGraded ? { borderColor: TYPE_COLORS[col.gradeType] + '22', background: TYPE_COLORS[col.gradeType] + '06' } : {}}
                          >
                            {isGraded ? (
                              <span style={{ color: numVal < 3 ? '#ef4444' : numVal >= 4.6 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                                {numVal.toFixed(1)}
                              </span>
                            ) : (
                              <span className="no-grade-text">—</span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                    <td className="cell-final">
                      {finalAvg ? (
                        <span className={`final-badge ${parseFloat(finalAvg) >= 4.6 ? 'superior' : parseFloat(finalAvg) >= 4.0 ? 'alto' : parseFloat(finalAvg) >= 3.0 ? 'basico' : 'bajo'}`}>
                          {finalAvg}
                        </span>
                      ) : (
                        <span className="final-empty">—</span>
                      )}
                    </td>
                    <td className="cell-performance">
                      {finalAvg ? (
                        <span className={`performance-badge ${parseFloat(finalAvg) >= 4.6 ? 'superior' : parseFloat(finalAvg) >= 4.0 ? 'alto' : parseFloat(finalAvg) >= 3.0 ? 'basico' : 'bajo'}`}>
                          {parseFloat(finalAvg) >= 4.6 ? 'Superior' : parseFloat(finalAvg) >= 4.0 ? 'Alto' : parseFloat(finalAvg) >= 3.0 ? 'Básico' : 'Bajo'}
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

      <style>{`
        .grades-matrix-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px;
          min-height: 100%;
        }
        .grades-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .grades-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .grades-header-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          color: white;
        }
        .grades-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }
        .grades-subtitle { font-size: 0.8rem; color: #475569; margin: 0; }
        
        .dark .grades-title { color: #f8fafc; }
        .dark .grades-subtitle { color: #94a3b8; }
        
        .grades-header-actions { display: flex; gap: 8px; align-items: center; }
        .btn-export {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px; font-size: 0.82rem;
          border: 1px solid #cbd5e1; background: #ffffff;
          color: #334155; cursor: pointer; transition: all 0.2s;
        }
        .btn-export:hover { background: #f1f5f9; color: #0f172a; }
        .btn-export:disabled { opacity: 0.4; cursor: not-allowed; }
        
        .dark .btn-export {
          border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06);
          color: #cbd5e1;
        }
        .dark .btn-export:hover { background: rgba(255,255,255,0.1); color: white; }
        
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
        .dark .cell-student {
          background: rgba(15,23,42,0.85);
        }
        .student-avatar-cell { display: flex; align-items: center; gap: 8px; }
        .student-initials {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 700; color: white; flex-shrink: 0;
        }
        .cell-student span { font-size: 0.84rem; color: #1e293b; font-weight: 500; }
        .dark .cell-student span { color: #e2e8f0; }
        .cell-grade { padding: 4px 6px; text-align: center; }
        
        .grade-display-readonly {
          min-width: 44px; height: 28px; border-radius: 6px;
          border: 1px solid transparent;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem;
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
