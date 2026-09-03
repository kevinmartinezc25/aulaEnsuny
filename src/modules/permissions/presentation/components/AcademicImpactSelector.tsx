'use client'

import React, { useState } from 'react'
import { Plus, Trash2, GraduationCap, Clock, BookOpen, AlertCircle } from 'lucide-react'
import { AcademicImpactItem } from '../../domain/entities'

interface Props {
  affectsDuty: boolean
  onChangeAffectsDuty: (value: boolean) => void
  impactItems: AcademicImpactItem[]
  onChangeImpactItems: (items: AcademicImpactItem[]) => void
  availableCourses: Array<{ id: string; title: string; subject: string; gradeLevel: string; groupName: string }>
  defaultDate?: string
}

export function AcademicImpactSelector({
  affectsDuty,
  onChangeAffectsDuty,
  impactItems,
  onChangeImpactItems,
  availableCourses,
  defaultDate
}: Props) {
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [hours, setHours] = useState(2)
  const [itemDate, setItemDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('08:40')

  const handleAddItem = () => {
    if (!selectedCourseId) return
    const course = availableCourses.find(c => c.id === selectedCourseId)
    if (!course) return

    const newItem: AcademicImpactItem = {
      id: `imp-${Date.now()}`,
      courseId: course.id,
      courseName: course.title,
      gradeGroup: course.groupName || course.gradeLevel,
      subject: course.subject,
      hoursCount: Number(hours),
      date: itemDate,
      startTime,
      endTime
    }

    onChangeImpactItems([...impactItems, newItem])
    setSelectedCourseId('')
  }

  const handleRemoveItem = (index: number) => {
    const updated = [...impactItems]
    updated.splice(index, 1)
    onChangeImpactItems(updated)
  }

  return (
    <div className="space-y-4">
      {/* Toggle ¿Afecta la jornada académica? */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
          ¿Afecta la jornada académica regular?
        </label>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <button
            type="button"
            onClick={() => onChangeAffectsDuty(false)}
            className={`py-2.5 px-4 rounded-xl text-sm font-medium border text-center transition-all cursor-pointer ${
              !affectsDuty
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            No afecta clases
          </button>
          <button
            type="button"
            onClick={() => onChangeAffectsDuty(true)}
            className={`py-2.5 px-4 rounded-xl text-sm font-medium border text-center transition-all cursor-pointer ${
              affectsDuty
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            Sí, afecta clases
          </button>
        </div>
      </div>

      {affectsDuty && (
        <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
              <GraduationCap className="h-4 w-4" />
              <span>Selección de clases / grupos afectados (obtenidos de su carga en aulaEnsuny)</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Opcional
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Indicar las clases o grupos específicos es opcional. Puede agregarlos a continuación si desea que Coordinación asigne cobertura específica, o continuar sin especificarlos.
          </p>

          {/* Formulario de agregar clase afectada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Curso / Grupo / Asignatura
              </label>
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccione una asignatura...</option>
                {availableCourses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} — {c.subject} ({c.groupName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Fecha afectada
              </label>
              <input
                type="date"
                value={itemDate}
                onChange={e => setItemDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                N° de Horas
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={hours}
                  onChange={e => setHours(Number(e.target.value))}
                  className="w-16 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-center font-bold text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  disabled={!selectedCourseId}
                  onClick={handleAddItem}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
            </div>
          </div>

          {/* Listado de items agregados */}
          {impactItems.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Ha indicado que afecta la jornada académica. Por favor agregue al menos una clase o grupo afectado.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Clases afectadas agregadas ({impactItems.length}):
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                {impactItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                        {item.hoursCount}h
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.courseName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Grupo: {item.gradeGroup} | Asignatura: {item.subject} | Fecha: {item.date}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Quitar clase"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
