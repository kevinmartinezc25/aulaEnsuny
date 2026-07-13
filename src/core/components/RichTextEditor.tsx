'use client'

import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false, 
  loading: () => <div className="h-64 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl border border-slate-200 dark:border-slate-700"></div> 
})

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'clean']
    ],
  }), [])

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl [&_.ql-toolbar]:border-slate-200 dark:[&_.ql-toolbar]:border-slate-700 dark:[&_.ql-toolbar]:bg-slate-800 [&_.ql-container]:border-slate-200 dark:[&_.ql-container]:border-slate-700 [&_.ql-editor]:min-h-[350px] dark:[&_.ql-editor]:text-white [&_.ql-picker-label]:text-slate-700 dark:[&_.ql-picker-label]:text-slate-300 [&_.ql-stroke]:stroke-slate-700 dark:[&_.ql-stroke]:stroke-slate-300 [&_.ql-fill]:fill-slate-700 dark:[&_.ql-fill]:fill-slate-300 [&_.ql-snow_.ql-picker-options]:bg-white dark:[&_.ql-snow_.ql-picker-options]:bg-slate-800 dark:[&_.ql-snow_.ql-picker-options]:border-slate-700">
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={onChange}
        modules={modules}
        placeholder={placeholder || "Escribe el contenido aquí..."}
      />
    </div>
  )
}
