'use client'

import React, { useState } from 'react'
import { FileText, Download, ExternalLink, X, Loader2 } from 'lucide-react'

interface PdfViewerProps {
  title: string
  driveUrl: string
  driveDownloadUrl?: string
  onClose?: () => void
  isModal?: boolean
}

export function PdfViewer({ title, driveUrl, driveDownloadUrl, onClose, isModal = false }: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true)

  const handleDownload = () => {
    if (driveDownloadUrl) {
      window.open(driveDownloadUrl, '_blank')
    }
  }

  const handleOpenExternal = () => {
    if (driveUrl) {
      window.open(driveUrl, '_blank')
    }
  }

  const content = (
    <div className={`flex flex-col bg-slate-900 ${isModal ? 'w-full h-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10' : 'w-full h-[600px] rounded-2xl overflow-hidden'}`}>
      
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="font-medium text-sm truncate text-white">{title}</h3>
        </div>
        
        <div className="flex items-center gap-1 shrink-0 ml-4">
          <button 
            onClick={handleOpenExternal}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Abrir en nueva pestaña"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          {driveDownloadUrl && (
            <button 
              onClick={handleDownload}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Descargar PDF"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          {isModal && onClose && (
            <>
              <div className="w-px h-4 bg-slate-800 mx-2" />
              <button 
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 transition-colors"
                title="Cerrar visor"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Iframe Container */}
      <div className="relative flex-1 bg-slate-800/50">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Cargando visualizador de Google Drive...</p>
          </div>
        )}
        <iframe
          src={driveUrl}
          className="absolute inset-0 w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          allow="autoplay"
          title={title}
        />
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full h-full max-w-6xl">
          {content}
        </div>
      </div>
    )
  }

  return content
}
