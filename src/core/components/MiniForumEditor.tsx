'use client'

import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false, 
  loading: () => <div className="h-32 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl border border-slate-200 dark:border-slate-700"></div> 
})

interface MiniForumEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

export function MiniForumEditor({ value, onChange, placeholder, minHeight = '140px' }: MiniForumEditorProps) {
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        ['link', 'image'],
        ['uppercase'],
        ['clean']
      ],
      handlers: {
        uppercase: function (this: any) {
          const range = this.quill.getSelection()
          if (range && range.length > 0) {
            const text = this.quill.getText(range.index, range.length)
            this.quill.deleteText(range.index, range.length)
            this.quill.insertText(range.index, text.toUpperCase())
            this.quill.setSelection(range.index, range.length)
          } else {
            toast.info('Selecciona un texto primero para convertirlo a mayúsculas')
          }
        },
        link: function (this: any) {
          const range = this.quill.getSelection()
          const hasSelection = range && range.length > 0
          const currentIndex = range ? range.index : Math.max(0, this.quill.getLength() - 1)
          const currentFormat = this.quill.getFormat(range || { index: currentIndex, length: 0 })
          const existingUrl = currentFormat.link || ''

          const inputUrl = window.prompt(
            'Ingresa la dirección web (ej: https://ejemplo.com):',
            existingUrl || 'https://'
          )
          if (inputUrl === null) return // usuario canceló

          const trimmed = inputUrl.trim()
          if (!trimmed || trimmed === 'https://' || trimmed === 'http://') {
            // Si se dejó vacío, elimina el formato de enlace
            if (hasSelection) {
              this.quill.format('link', false)
              toast.success('Enlace removido')
            }
            return
          }

          // Asegurar protocolo http:// o https:// para evitar enlaces relativos
          const finalUrl = (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) ? trimmed : `https://${trimmed}`

          if (hasSelection) {
            this.quill.format('link', finalUrl)
            toast.success('Enlace aplicado al texto seleccionado')
          } else {
            // Si no había texto seleccionado, solicitar el texto a mostrar o usar la URL
            const displayText = window.prompt('Texto a mostrar en el enlace (opcional):', finalUrl) || finalUrl
            this.quill.insertText(currentIndex, displayText, 'link', finalUrl)
            this.quill.setSelection(currentIndex + displayText.length, 0)
            toast.success('Enlace insertado correctamente')
          }
        }
      }
    }
  }), [])

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-250 dark:border-slate-700/80">
      <style dangerouslySetInnerHTML={{ __html: `
        .ql-snow .ql-toolbar button.ql-uppercase {
          width: auto !important;
          padding: 0 6px !important;
          font-weight: bold;
          font-size: 10px;
          color: #475569;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          margin-top: 2px;
          height: 20px;
          line-height: 18px;
        }
        .dark .ql-snow .ql-toolbar button.ql-uppercase {
          color: #cbd5e1;
          border-color: #475569;
        }
        .ql-snow .ql-toolbar button.ql-uppercase::after {
          content: "MAYÚS";
        }
        .ql-snow .ql-editor a {
          color: #2563eb !important;
          text-decoration: underline !important;
          cursor: pointer !important;
        }
        .dark .ql-snow .ql-editor a {
          color: #60a5fa !important;
        }
        .ql-snow .ql-tooltip {
          z-index: 50 !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid #e2e8f0 !important;
          background-color: #ffffff !important;
        }
        .dark .ql-snow .ql-tooltip {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #f1f5f9 !important;
        }
        .dark .ql-snow .ql-tooltip input[type="text"] {
          background-color: #0f172a !important;
          border-color: #475569 !important;
          color: #ffffff !important;
        }
      ` }} />
      <div 
        className="[&_.ql-toolbar]:border-none dark:[&_.ql-toolbar]:bg-slate-800/80 [&_.ql-container]:border-none dark:[&_.ql-container]:border-slate-700 [&_.ql-editor]:text-xs dark:[&_.ql-editor]:text-white [&_.ql-picker-label]:text-slate-700 dark:[&_.ql-picker-label]:text-slate-300 [&_.ql-stroke]:stroke-slate-700 dark:[&_.ql-stroke]:stroke-slate-300 [&_.ql-fill]:fill-slate-700 dark:[&_.ql-fill]:fill-slate-300 [&_.ql-snow_.ql-picker-options]:bg-white dark:[&_.ql-snow_.ql-picker-options]:bg-slate-800 dark:[&_.ql-snow_.ql-picker-options]:border-slate-700"
        style={{ '--editor-min-height': minHeight } as React.CSSProperties}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .ql-editor {
            min-height: var(--editor-min-height, 140px);
          }
        ` }} />
        <ReactQuill 
          theme="snow" 
          value={value} 
          onChange={onChange}
          modules={modules}
          placeholder={placeholder || "Escribe tu comentario o tema aquí..."}
        />
      </div>
    </div>
  )
}
