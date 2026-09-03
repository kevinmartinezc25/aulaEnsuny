'use client'

import React from 'react'

export interface InstitutionalReportHeaderProps {
  /**
   * Título principal del documento (ej. "CONSTANCIA OFICIAL DE PERMISO DOCENTE", "REPORTE DE NOVEDAD DISCIPLINARIA")
   */
  documentTitle?: string
  /**
   * Subtítulo o descripción breve complementaria
   */
  documentSubtitle?: string
  /**
   * Código o número de radicado consecutivo oficial (ej. "PER-2026-0001", "DISC-2026-0045")
   */
  radicadoNumber?: string
  /**
   * Fecha de emisión o vigencia
   */
  date?: Date | string
  /**
   * Hora opcional
   */
  time?: string
  /**
   * Si debe mostrar la barra de metadatos (fecha, radicado, hora)
   */
  showMeta?: boolean
  /**
   * Estilo visual del membrete
   */
  variant?: 'formal' | 'compact' | 'clean'
  /**
   * Ruta opcional para sobreescribir el logo / membrete
   */
  logoSrc?: string
  /**
   * Clases CSS adicionales para el contenedor principal
   */
  className?: string
}

export function InstitutionalReportHeader({
  documentTitle,
  documentSubtitle,
  radicadoNumber,
  date,
  time,
  showMeta = true,
  variant = 'formal',
  logoSrc = '/institutional-header.png',
  className = ''
}: InstitutionalReportHeaderProps) {
  // Formateo de fecha si se provee
  let formattedDate = ''
  if (date) {
    if (typeof date === 'string') {
      formattedDate = date
    } else if (date instanceof Date) {
      formattedDate = date.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  return (
    <header
      className={`w-full bg-white text-slate-900 select-none print:bg-white print:text-black ${className}`}
      data-testid="institutional-report-header"
    >
      {/* ── 1. Membrete con Logos Oficiales ── */}
      <div
        className={`w-full flex items-center justify-center ${
          variant === 'compact'
            ? 'p-2 sm:p-3 border-b border-slate-300'
            : variant === 'clean'
            ? 'p-2 sm:p-4'
            : 'p-4 sm:p-6 border-b-2 border-slate-900 print:border-b-2 print:border-black'
        }`}
      >
        <img
          src={logoSrc}
          alt="Institución Educativa Escuela Normal Superior del Nordeste - Yolombó Antioquia"
          className={`w-full object-contain mx-auto transition-all ${
            variant === 'compact' ? 'max-w-xl max-h-20' : 'max-w-2xl max-h-28'
          }`}
          loading="eager"
        />
      </div>

      {/* ── 2. Título y Metadatos Institucionales ── */}
      {(documentTitle || showMeta) && (
        <div className="pt-4 pb-2 text-center px-4">
          {documentTitle && (
            <h2
              className={`font-bold uppercase tracking-wide text-slate-900 print:text-black ${
                variant === 'compact'
                  ? 'text-base underline underline-offset-4 mb-1'
                  : 'text-lg sm:text-xl underline underline-offset-6 mb-2'
              }`}
            >
              {documentTitle}
            </h2>
          )}

          {documentSubtitle && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 print:text-slate-700 italic max-w-2xl mx-auto mb-2 font-serif">
              {documentSubtitle}
            </p>
          )}

          {showMeta && (radicadoNumber || formattedDate || time) && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-600 print:text-slate-700 font-sans mt-1">
              {radicadoNumber && (
                <span className="font-bold text-slate-900 print:text-black bg-slate-100 print:bg-transparent px-2 py-0.5 rounded border border-slate-300 print:border-none">
                  Radicado: {radicadoNumber}
                </span>
              )}
              {formattedDate && (
                <span className="capitalize">
                  {formattedDate}
                </span>
              )}
              {time && (
                <span>
                  &bull; Hora: {time}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  )
}
