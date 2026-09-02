'use client'

import React from 'react'
import { StudentRef, DisciplinarySituation } from '@/modules/disciplinary/application/actions'

interface Props {
  student: StudentRef | null
  situation: DisciplinarySituation | null
  teacherDescription: string
  studentDefense?: string | null
  studentCommitment?: string | null
  date: Date
}

export function ReportPreviewDocument({ student, situation, teacherDescription, studentDefense, studentCommitment, date }: Props) {
  if (!student || !situation) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400">
        Faltan datos para generar la vista previa
      </div>
    )
  }

  // Formatear fecha y hora
  const formattedDate = date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const formattedTime = date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  // Generar el texto estructurado del reporte
  const reportText = `El/la estudiante ${student.fullName}, perteneciente al grado ${student.gradeLevel} (grupo ${student.groupName}), incurre presuntamente en la situación clasificada como ${situation.type} (Código: ${situation.code}) — "${situation.title}", consistente en: ${situation.description}.`

  return (
    <div className="bg-white text-slate-900 border border-slate-200 shadow-sm rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none max-w-3xl mx-auto font-serif">
      {/* Membrete institucional */}
      <div className="border-b-2 border-slate-900 p-4 sm:p-6 flex items-center justify-center">
        <img
          src="/institutional-header.png"
          alt="Institución Educativa Escuela Normal Superior del Nordeste - Yolombó Antioquia"
          className="w-full max-w-2xl h-auto object-contain mx-auto"
        />
      </div>

      <div className="p-6 sm:p-8 sm:pt-6">
        {/* Título del documento */}
        <div className="text-center mb-8">
          <h3 className="text-lg font-bold uppercase underline underline-offset-4 mb-2">
            Reporte de Novedad Disciplinaria
          </h3>
          <p className="text-sm text-slate-600 font-sans capitalize">
            {formattedDate} &bull; Hora: {formattedTime}
          </p>
        </div>

        {/* Datos del Estudiante */}
        <div className="mb-6 border border-slate-300 rounded bg-slate-50 p-4 font-sans text-sm">
          <h4 className="font-bold text-slate-700 uppercase mb-3 text-xs tracking-wider border-b border-slate-300 pb-1">
            Datos del Estudiante
          </h4>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            <div className="col-span-2">
              <span className="font-semibold text-slate-600">Nombre completo:</span>{' '}
              <span className="text-slate-900">{student.fullName}</span>
            </div>
            {student.documentId && (
              <div className="col-span-2 sm:col-span-1">
                <span className="font-semibold text-slate-600">Documento:</span>{' '}
                <span className="text-slate-900">{student.documentId}</span>
              </div>
            )}
            <div className="col-span-1">
              <span className="font-semibold text-slate-600">Grado:</span>{' '}
              <span className="text-slate-900">{student.gradeLevel}</span>
            </div>
            <div className="col-span-1">
              <span className="font-semibold text-slate-600">Grupo:</span>{' '}
              <span className="text-slate-900">{student.groupName}</span>
            </div>
          </div>
        </div>

        {/* Clasificación de la falta */}
        <div className="mb-6 font-sans">
          <h4 className="font-bold text-slate-900 mb-2 border-l-4 border-slate-900 pl-2">
            1. Clasificación Institucional
          </h4>
          <div className="pl-3 space-y-1 text-sm text-slate-700">
            <p><span className="font-semibold">Código:</span> {situation.code}</p>
            <p><span className="font-semibold">Tipo de Falta:</span> {situation.type}</p>
            <p><span className="font-semibold">Situación:</span> {situation.title}</p>
            {situation.manualReference && (
              <p><span className="font-semibold">Ref. Manual de Convivencia:</span> {situation.manualReference}</p>
            )}
          </div>
        </div>

        {/* Descripción oficial y de los hechos */}
        <div className="mb-6">
          <h4 className="font-bold text-slate-900 mb-2 border-l-4 border-slate-900 pl-2 font-sans">
            2. Relación de los Hechos
          </h4>
          <div className="pl-3 space-y-4">
            <p className="text-justify leading-relaxed">
              {reportText}
            </p>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded font-sans text-sm">
              <p className="font-semibold text-slate-700 mb-2 uppercase text-xs tracking-wider">
                Observaciones del Docente Remitente:
              </p>
              <p className="whitespace-pre-wrap text-slate-800 leading-relaxed text-justify">
                {teacherDescription || <span className="text-slate-400 italic">No se han ingresado observaciones.</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Descargos y Compromiso */}
        {(studentDefense || studentCommitment) && (
          <div className="mb-6">
            <h4 className="font-bold text-slate-900 mb-2 border-l-4 border-slate-900 pl-2 font-sans">
              3. Descargos y Compromiso del Estudiante
            </h4>
            <div className="pl-3 space-y-4">
              {studentDefense && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded font-sans text-sm">
                  <p className="font-semibold text-slate-700 mb-2 uppercase text-xs tracking-wider">
                    Descargos del Estudiante:
                  </p>
                  <p className="whitespace-pre-wrap text-slate-800 leading-relaxed text-justify">
                    {studentDefense}
                  </p>
                </div>
              )}
              {studentCommitment && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded font-sans text-sm">
                  <p className="font-semibold text-slate-700 mb-2 uppercase text-xs tracking-wider">
                    Compromiso Asumido:
                  </p>
                  <p className="whitespace-pre-wrap text-slate-800 leading-relaxed text-justify">
                    {studentCommitment}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Constancia de notificación */}
        <div className="mt-12 pt-6 border-t border-slate-300">
          <p className="text-sm text-justify leading-relaxed mb-16">
            Para constancia de lo anterior, y en cumplimiento del debido proceso establecido en el Manual de Convivencia, se firma el presente reporte. La firma del estudiante deja constancia de que tuvo conocimiento del reporte y de los hechos descritos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 gap-y-16">
            {/* Firma Docente */}
            <div className="text-center">
              <div className="border-b border-slate-400 w-4/5 mx-auto mb-2" />
              <p className="font-bold text-sm">Firma del Docente Remitente</p>
              <p className="text-xs text-slate-500 font-sans mt-1">Generado vía plataforma</p>
            </div>

            {/* Firma Estudiante */}
            <div className="text-center">
              {/* Espacio para la firma que se agregará en el último paso */}
              <div className="h-16 flex items-end justify-center mb-2">
                <div className="border-b border-slate-400 w-4/5" />
              </div>
              <p className="font-bold text-sm">Firma del Estudiante</p>
              <p className="text-xs text-slate-500 font-sans mt-1">{student.fullName}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
