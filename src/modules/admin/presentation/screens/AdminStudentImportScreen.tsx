'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle,
  XCircle, Loader2, ChevronLeft, Users, AlertTriangle,
  SkipForward, Trash2, RefreshCw, Info
} from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import {
  validateImportRows,
  importStudentsBatch,
  generateImportTemplate,
  type StudentImportRow,
  type ImportRowValidated,
  type ImportResult,
} from '../../application/studentImportActions'

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type ImportRowState = ImportRowValidated & { _needsValidation?: boolean }

type ImportStep = 'upload' | 'preview' | 'importing' | 'done'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const COLUMN_MAP: Record<string, keyof StudentImportRow> = {
  'apellidos': 'lastName',
  'nombres': 'firstName',
  'documento': 'documentId',
  'grado': 'gradeLevel',
  'grupo': 'groupName',
  'email': 'email',
  'correo': 'email',
}

const MAX_ROWS = 500

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseFileToRows(file: File): Promise<StudentImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (raw.length < 2) {
          reject(new Error('El archivo no tiene datos. Revisa que la primera fila sean encabezados.'))
          return
        }

        // Detectar encabezados (primera fila)
        const headers = (raw[0] as string[]).map(h =>
          String(h).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        )

        // Verificar columnas requeridas
        const required = ['apellidos', 'nombres', 'grado', 'grupo']
        const missing = required.filter(col => !headers.includes(col))
        if (missing.length > 0) {
          reject(new Error(`Columnas faltantes: ${missing.join(', ')}. Descarga la plantilla para ver el formato correcto.`))
          return
        }

        // Parsear filas de datos
        const rows: StudentImportRow[] = []
        for (let i = 1; i < raw.length && rows.length < MAX_ROWS; i++) {
          const row = raw[i] as string[]
          const obj: Partial<StudentImportRow> = {}

          headers.forEach((header, idx) => {
            const field = COLUMN_MAP[header]
            if (field) {
              obj[field] = String(row[idx] || '').trim()
            }
          })

          // Omitir filas completamente vacías
          if (!obj.lastName && !obj.firstName && !obj.gradeLevel && !obj.groupName) {
            continue
          }

          rows.push(obj as StudentImportRow)
        }

        if (rows.length === 0) {
          reject(new Error('No se encontraron filas con datos válidos en el archivo.'))
          return
        }

        resolve(rows)
      } catch {
        reject(new Error('Error al leer el archivo. Asegúrate de que sea un CSV o XLSX válido.'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo.'))
    reader.readAsArrayBuffer(file)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function StepIndicator({ step }: { step: ImportStep }) {
  const steps = [
    { key: 'upload', label: 'Subir archivo' },
    { key: 'preview', label: 'Vista previa' },
    { key: 'importing', label: 'Importando' },
    { key: 'done', label: 'Completado' },
  ]
  const currentIdx = steps.findIndex(s => s.key === step)

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, idx) => (
        <React.Fragment key={s.key}>
          <div className="flex flex-col items-center gap-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              idx < currentIdx
                ? 'bg-emerald-500 text-white'
                : idx === currentIdx
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
            }`}>
              {idx < currentIdx ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
            </div>
            <span className={`text-[10px] font-medium hidden sm:block ${
              idx === currentIdx ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'
            }`}>{s.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`h-0.5 flex-1 mx-2 transition-all duration-300 ${
              idx < currentIdx ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function StatusBadge({ row }: { row: ImportRowValidated; excluded?: boolean }) {
  if (row.errors.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
        <XCircle className="h-3 w-3" /> Error
      </span>
    )
  }
  if (row.isDuplicate) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" /> Duplicado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" /> OK
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function AdminStudentImportScreen() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [rows, setRows] = useState<ImportRowState[]>([])
  const [excluded, setExcluded] = useState<Set<number>>(new Set()) // rowIndex excluidos
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  // Re-validación en tiempo real
  const debouncedRows = useDebounceValue(rows, 800)

  useEffect(() => {
    const rowsToValidate = debouncedRows.filter(r => r._needsValidation)
    if (rowsToValidate.length === 0) return

    async function revalidate() {
      try {
        const validated = await validateImportRows(rowsToValidate)
        setRows(currentRows => {
          const newRows = [...currentRows]
          for (const vRow of validated) {
            const index = newRows.findIndex(r => r.rowIndex === vRow.rowIndex)
            if (index !== -1) {
              newRows[index] = {
                ...newRows[index],
                errors: vRow.errors,
                isDuplicate: vRow.isDuplicate,
                duplicateId: vRow.duplicateId,
                _needsValidation: false
              }
            }
          }
          return newRows
        })
      } catch (err) {
        console.error('Error re-validando', err)
      }
    }
    
    revalidate()
  }, [debouncedRows])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Descarga de plantilla ──────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const base64 = await generateImportTemplate()
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_importacion_estudiantes.xlsx'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Plantilla descargada correctamente')
    } catch {
      toast.error('Error al generar la plantilla')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  // ── Manejo de archivo ──────────────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setParseError(null)
    setValidating(true)

    try {
      const parsed = await parseFileToRows(f)

      if (parsed.length > MAX_ROWS) {
        setParseError(`El archivo tiene ${parsed.length} filas. El límite es ${MAX_ROWS} estudiantes por importación.`)
        setValidating(false)
        return
      }

      const validated = await validateImportRows(parsed)
      setRows(validated)
      setExcluded(new Set()) // limpiar exclusiones previas
      setStep('preview')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Error al procesar el archivo')
    } finally {
      setValidating(false)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  // ── Toggle exclusión de fila ───────────────────────────────────────────────
  const toggleExclude = (rowIndex: number) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(rowIndex)) next.delete(rowIndex)
      else next.add(rowIndex)
      return next
    })
  }

  // ── Edición inline de celda ────────────────────────────────────────────────
  const handleCellEdit = (rowIndex: number, field: keyof StudentImportRow, value: string) => {
    setRows(prev => prev.map(r =>
      r.rowIndex === rowIndex
        ? { ...r, [field]: value, errors: [], isDuplicate: false, _needsValidation: true }
        : r
    ))
  }

  // ── Importar ───────────────────────────────────────────────────────────────
  const handleImport = async () => {
    // Filas a importar: válidas, no duplicadas, no excluidas
    const toImport = rows.filter(r =>
      r.errors.length === 0 &&
      !r.isDuplicate &&
      !excluded.has(r.rowIndex)
    )

    if (toImport.length === 0) {
      toast.warning('No hay filas válidas para importar.')
      return
    }

    setStep('importing')
    setImportProgress(0)

    // Simular progreso mientras se importa
    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      const result = await importStudentsBatch(toImport)
      clearInterval(progressInterval)
      setImportProgress(100)
      setImportResult(result)
      setTimeout(() => setStep('done'), 500)
    } catch {
      clearInterval(progressInterval)
      toast.error('Error durante la importación')
      setStep('preview')
    }
  }

  // ── Estadísticas de la vista previa ───────────────────────────────────────
  const stats = {
    total: rows.length,
    valid: rows.filter(r => r.errors.length === 0 && !r.isDuplicate && !excluded.has(r.rowIndex)).length,
    withErrors: rows.filter(r => r.errors.length > 0).length,
    duplicates: rows.filter(r => r.isDuplicate && r.errors.length === 0).length,
    excluded: excluded.size,
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/students"
              className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Importar estudiantes
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Carga el padrón estudiantil desde un archivo Excel o CSV
              </p>
            </div>
          </div>

          {/* Descargar plantilla */}
          <button
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {downloadingTemplate
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />
            }
            Descargar plantilla
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
          <StepIndicator step={step} />
        </div>

        <AnimatePresence mode="wait">

          {/* ── PASO 1: UPLOAD ─────────────────────────────────────────── */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              {/* Info box */}
              <div className="flex gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Sube un archivo <strong>.xlsx</strong> o <strong>.csv</strong> con las columnas:
                  {' '}<strong>Apellidos</strong>, <strong>Nombres</strong>, <strong>Grado</strong>, <strong>Grupo</strong> (requeridas)
                  {' '}y <strong>Documento</strong>, <strong>Email</strong> (opcionales). Límite: {MAX_ROWS} estudiantes por importación.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={onFileChange}
                />

                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
                  isDragging ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {validating
                    ? <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
                    : <FileSpreadsheet className={`h-7 w-7 ${isDragging ? 'text-blue-500' : 'text-slate-500'}`} />
                  }
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {validating ? 'Procesando archivo...' : 'Arrastra tu archivo aquí'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    o haz clic para seleccionar · .xlsx, .xls, .csv
                  </p>
                </div>
              </div>

              {/* Error de parseo */}
              {parseError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{parseError}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── PASO 2: PREVIEW ────────────────────────────────────────── */}
          {step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              {/* Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total leídos', value: stats.total, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-900' },
                  { label: 'Listos para importar', value: stats.valid, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-white dark:bg-slate-900' },
                  { label: 'Con errores', value: stats.withErrors, color: 'text-red-600 dark:text-red-400', bg: 'bg-white dark:bg-slate-900' },
                  { label: 'Duplicados', value: stats.duplicates, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-white dark:bg-slate-900' },
                ].map(card => (
                  <div key={card.label} className={`${card.bg} rounded-xl border border-slate-100 dark:border-slate-800 p-4`}>
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              {stats.duplicates > 0 && (
                <div className="flex gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Se detectaron <strong>{stats.duplicates} posibles duplicados</strong>. Serán omitidos automáticamente en la importación. Puedes usar el botón de exclusión para descartar otras filas.
                  </p>
                </div>
              )}

              {/* Tabla de vista previa */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-10">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Apellidos</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombres</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Documento</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Grado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Grupo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Estado</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Excluir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {rows.map((row) => {
                        const isExcluded = excluded.has(row.rowIndex)
                        const hasIssue = row.errors.length > 0 || row.isDuplicate

                        return (
                          <tr
                            key={row.rowIndex}
                            className={`transition-colors ${
                              isExcluded
                                ? 'opacity-40 bg-slate-50 dark:bg-slate-800/30'
                                : hasIssue
                                ? row.errors.length > 0
                                  ? 'bg-red-50/50 dark:bg-red-500/5'
                                  : 'bg-amber-50/50 dark:bg-amber-500/5'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                            }`}
                          >
                            <td className="px-4 py-2.5 text-xs text-slate-400">{row.rowIndex}</td>

                            {(['lastName', 'firstName', 'documentId', 'gradeLevel', 'groupName'] as const).map(field => (
                              <td key={field} className="px-4 py-2">
                                <input
                                  type="text"
                                  value={row[field] || ''}
                                  onChange={e => handleCellEdit(row.rowIndex, field, e.target.value)}
                                  disabled={isExcluded}
                                  className={`w-full min-w-[80px] text-sm rounded-lg px-2 py-1 border transition-colors bg-transparent
                                    ${hasIssue && !isExcluded
                                      ? 'border-amber-200 dark:border-amber-700 focus:border-amber-400'
                                      : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-400 dark:focus:border-blue-500'
                                    }
                                    text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-0
                                    disabled:cursor-not-allowed`}
                                />
                              </td>
                            ))}

                            <td className="px-4 py-2.5">
                              {!isExcluded && <StatusBadge row={row} />}
                              {row.errors.length > 0 && !isExcluded && (
                                <p className="text-[10px] text-red-500 mt-1">{row.errors[0]}</p>
                              )}
                            </td>

                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => toggleExclude(row.rowIndex)}
                                title={isExcluded ? 'Incluir fila' : 'Excluir fila'}
                                className={`h-7 w-7 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                                  isExcluded
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                    : 'hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-300 hover:text-red-500'
                                }`}
                              >
                                {isExcluded
                                  ? <RefreshCw className="h-3.5 w-3.5" />
                                  : <Trash2 className="h-3.5 w-3.5" />
                                }
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  onClick={() => { setStep('upload'); setFile(null); setRows([]) }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Cambiar archivo
                </button>

                <div className="flex items-center gap-3">
                  {stats.duplicates > 0 && (
                    <button
                      onClick={() => {
                        const dupeIndexes = rows.filter(r => r.isDuplicate).map(r => r.rowIndex)
                        setExcluded(prev => new Set([...prev, ...dupeIndexes]))
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                    >
                      <SkipForward className="h-4 w-4" /> Excluir todos los duplicados
                    </button>
                  )}

                  <button
                    onClick={handleImport}
                    disabled={stats.valid === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-4 w-4" />
                    Importar {stats.valid} estudiante{stats.valid !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PASO 3: IMPORTING ──────────────────────────────────────── */}
          {step === 'importing' && (
            <motion.div
              key="importing"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center gap-6 py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Loader2 className="h-10 w-10 text-slate-500 animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-slate-900 dark:text-white">Importando estudiantes...</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Por favor espera, esto puede tomar unos segundos.</p>
              </div>
              <div className="w-64 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-slate-900 dark:bg-white rounded-full"
                  animate={{ width: `${importProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-600">{importProgress}%</p>
            </motion.div>
          )}

          {/* ── PASO 4: DONE ───────────────────────────────────────────── */}
          {step === 'done' && importResult && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              {/* Resultado principal */}
              <div className="flex flex-col items-center gap-5 py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${
                  importResult.errors === 0
                    ? 'bg-emerald-100 dark:bg-emerald-500/10'
                    : 'bg-amber-100 dark:bg-amber-500/10'
                }`}>
                  {importResult.errors === 0
                    ? <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    : <AlertCircle className="h-10 w-10 text-amber-500" />
                  }
                </div>

                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {importResult.errors === 0 ? 'Importación exitosa' : 'Importación con advertencias'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    El directorio estudiantil ha sido actualizado.
                  </p>
                </div>

                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{importResult.imported}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Importados</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-amber-500">{importResult.skipped}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Omitidos</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-500">{importResult.errors}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Errores</p>
                  </div>
                </div>
              </div>

              {/* Acciones post-importación */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    setStep('upload')
                    setFile(null)
                    setRows([])
                    setImportResult(null)
                    setExcluded(new Set())
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Upload className="h-4 w-4" /> Nueva importación
                </button>

                <Link
                  href="/admin/students"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors"
                >
                  <Users className="h-4 w-4" /> Ver directorio de estudiantes
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
