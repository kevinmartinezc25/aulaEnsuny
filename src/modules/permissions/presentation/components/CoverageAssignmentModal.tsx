'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserCheck, ShieldCheck, Check, AlertCircle } from 'lucide-react'
import { AcademicImpactItem, CoverageAssignment } from '../../domain/entities'

interface Props {
  isOpen: boolean
  onClose: () => void
  impactItems: AcademicImpactItem[]
  currentCoverage: CoverageAssignment[]
  availableTeachers: Array<{ id: string; name: string; email: string; subject: string }>
  onConfirm: (coverage: CoverageAssignment[], notes: string) => Promise<void>
}

export function CoverageAssignmentModal({
  isOpen,
  onClose,
  impactItems,
  currentCoverage,
  availableTeachers,
  onConfirm
}: Props) {
  const [coverageState, setCoverageState] = useState<CoverageAssignment[]>(() => {
    return impactItems.map((item, idx) => {
      const existing = currentCoverage.find(c => c.academicItemIndex === idx)
      return {
        academicItemIndex: idx,
        groupName: item.gradeGroup || item.courseName,
        subject: item.subject,
        periodOrTime: `${item.hoursCount} hora(s) [${item.startTime || 'Jornada'}]`,
        substituteTeacherId: existing?.substituteTeacherId || '',
        substituteTeacherName: existing?.substituteTeacherName || '',
        observations: existing?.observations || ''
      }
    })
  })

  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleTeacherChange = (index: number, teacherId: string) => {
    const teacher = availableTeachers.find(t => t.id === teacherId)
    const updated = [...coverageState]
    updated[index] = {
      ...updated[index],
      substituteTeacherId: teacherId,
      substituteTeacherName: teacher?.name || 'Docente asignado'
    }
    setCoverageState(updated)
  }

  const handleObsChange = (index: number, obs: string) => {
    const updated = [...coverageState]
    updated[index] = {
      ...updated[index],
      observations: obs
    }
    setCoverageState(updated)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(coverageState, notes)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Gestión de Cobertura y Reemplazos Académicos
              </h3>
              <p className="text-xs text-slate-500">
                Asigne qué docentes cubrirán las clases afectadas para garantizar la continuidad pedagógica.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {impactItems.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 text-center">
              Esta solicitud no reporta horas académicas afectadas directas. Puede proceder a la aprobación.
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Clases afectadas ({impactItems.length}):
              </p>
              <div className="space-y-3">
                {impactItems.map((item, idx) => {
                  const state = coverageState[idx]
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Grupo: {item.gradeGroup} — {item.subject}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold text-[11px]">
                          {item.hoursCount} hora(s) | Fecha: {item.date}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Docente encargado / reemplazante
                          </label>
                          <select
                            value={state?.substituteTeacherId || ''}
                            onChange={e => handleTeacherChange(idx, e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">Seleccione docente reemplazo...</option>
                            {availableTeachers.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.subject})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Observaciones de cobertura
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Acompañamiento en aula, taller..."
                            value={state?.observations || ''}
                            onChange={e => handleObsChange(idx, e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observaciones generales de Coordinación Académica
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Escriba comentarios o directrices para el archivo institucional..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {isSubmitting ? 'Guardando...' : 'Confirmar Cobertura y Aprobar'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
