'use client'

import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Download, FileCode2, FileText, Loader2 } from 'lucide-react'
import { exportToMarkdown, exportToPDF, exportToWord } from '@/modules/docs/application/exportServices'

interface DocExportMenuProps {
  content: string
  title: string
}

export function DocExportMenu({ content, title }: DocExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState<'pdf' | 'docx' | 'md' | null>(null)

  const handleExport = async (type: 'pdf' | 'docx' | 'md') => {
    setWorking(type)
    try {
      if (type === 'pdf') await exportToPDF(content, title)
      if (type === 'docx') await exportToWord(content, title)
      if (type === 'md') exportToMarkdown(content, title)
    } finally {
      setWorking(null)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Exportar</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => void handleExport('pdf')}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {working === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={() => void handleExport('docx')}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {working === 'docx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode2 className="h-4 w-4" />}
              Exportar Word
            </button>
            <button
              type="button"
              onClick={() => void handleExport('md')}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {working === 'md' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode2 className="h-4 w-4" />}
              Exportar Markdown
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
