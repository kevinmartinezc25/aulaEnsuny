'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X, Download, ExternalLink, FileText, Loader2, AlertCircle, RefreshCw, Shield
} from 'lucide-react'
import {
  INSTITUTION_INFO,
  getDrivePreviewUrl,
  getDriveDirectDownloadUrl
} from '../../domain/constants/knowledgeCatalog'

interface DocumentReaderModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badgeText?: string
  contentSnippet?: string
  downloadUrl?: string
  driveFileId?: string
  authorOrResolution?: string
  onDownload?: () => void
}

export function DocumentReaderModal({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeText = 'Documento Oficial',
  contentSnippet,
  downloadUrl,
  driveFileId,
  authorOrResolution,
  onDownload,
}: DocumentReaderModalProps) {
  const [isLoadingIframe, setIsLoadingIframe] = useState(true)
  const [iframeError, setIframeError] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  // Resolve preview and download URLs
  const previewUrl = useMemo(() => {
    return getDrivePreviewUrl(downloadUrl || driveFileId || null)
  }, [downloadUrl, driveFileId])

  const directDownloadUrl = useMemo(() => {
    return getDriveDirectDownloadUrl(driveFileId || downloadUrl || null)
  }, [driveFileId, downloadUrl])

  const [prevDocKey, setPrevDocKey] = useState<string | null>(null)
  const currentDocKey = isOpen ? `${previewUrl || ''}-${downloadUrl || ''}` : null

  if (isOpen && currentDocKey !== prevDocKey) {
    setPrevDocKey(currentDocKey)
    setIsLoadingIframe(true)
    setIframeError(false)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload()
    } else if (directDownloadUrl) {
      window.open(directDownloadUrl, '_blank')
    } else if (previewUrl) {
      window.open(previewUrl, '_blank')
    }
  }

  const handleOpenExternal = () => {
    const targetUrl = previewUrl || directDownloadUrl || downloadUrl
    if (targetUrl) {
      window.open(targetUrl, '_blank')
    }
  }

  const handleReload = () => {
    setIsLoadingIframe(true)
    setIframeError(false)
    setIframeKey(prev => prev + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
      {/* Scrim / Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Reader Container */}
      <div className="relative w-full max-w-6xl h-[92vh] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-750 flex flex-col z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ── Top Header Control Bar ── */}
        <div className="h-14 px-4 sm:px-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {/* File Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {title}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0071e3] dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 shrink-0">
                  {badgeText}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {authorOrResolution || subtitle || INSTITUTION_INFO.shortName}
              </span>
            </div>
          </div>

          {/* Action Buttons: Reload, Open External, Download, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {previewUrl && (
              <button
                type="button"
                onClick={handleReload}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Recargar visor"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingIframe ? 'animate-spin' : ''}`} />
              </button>
            )}

            {(previewUrl || directDownloadUrl) && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all active:scale-[0.98]"
                title="Abrir en pestaña nueva de Google Drive"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Abrir en Drive</span>
              </button>
            )}

            {(directDownloadUrl || onDownload) && (
              <button
                type="button"
                onClick={handleDownloadClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#005bb5] text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                title="Descargar archivo original"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Descargar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Document View Canvas ── */}
        <div className="flex-1 w-full h-full relative bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden">
          {previewUrl ? (
            <div className="relative w-full h-full flex-1">
              {/* Loading Overlay */}
              {isLoadingIframe && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-xs transition-opacity duration-200">
                  <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-xs text-center">
                    <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Cargando documento original...
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Conectando con el visor seguro de Google Drive
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error State if iframe fails */}
              {iframeError && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
                  <div className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      Visualización externa requerida
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                      Tu navegador o políticas de seguridad impiden incrustar este documento directamente en este marco. Puedes abrirlo directamente o descargarlo.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleOpenExternal}
                        className="px-4 py-2 rounded-xl bg-[#0071e3] text-white text-xs font-semibold hover:bg-[#005bb5] transition-all"
                      >
                        Abrir en Google Drive
                      </button>
                      {directDownloadUrl && (
                        <button
                          onClick={handleDownloadClick}
                          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                          Descargar archivo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Real File Iframe */}
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media"
                title={title}
                onLoad={() => setIsLoadingIframe(false)}
                onError={() => {
                  setIsLoadingIframe(false)
                  setIframeError(true)
                }}
              />
            </div>
          ) : (
            /* Fallback Card for documents without an attached digital file */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-xl w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#0071e3] uppercase tracking-wider block">
                      {INSTITUTION_INFO.fullName}
                    </span>
                    <h2 className="text-xl font-bold tracking-tight mt-1">{title}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {INSTITUTION_INFO.academicCycle} • Yolombó, Antioquia
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#0071e3] shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {subtitle || 'Ficha informativa del documento oficial institucional.'}
                  </p>

                  {contentSnippet && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-sans text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Descripción / Contenido
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">{contentSnippet}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                    <span>{authorOrResolution || 'Escuela Normal Superior del Nordeste'}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Registro Institucional</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
