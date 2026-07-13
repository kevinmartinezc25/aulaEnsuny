'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Heading from '@tiptap/extension-heading'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import MathExtension from '@tiptap/extension-mathematics'
import { common, createLowlight } from 'lowlight'
import {
  Bold, Italic, Strikethrough, Code, Link2, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote,
  Minus, Table2, Video as YoutubeIcon, Highlighter, Undo, Redo, Sigma, Workflow,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { MermaidBlockExtension } from './MermaidBlock'

const lowlight = createLowlight(common)

function ToolbarBtn({
  onClick, isActive, title, children, disabled,
}: {
  onClick: () => void
  isActive?: boolean
  title: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={`rounded-lg p-1.5 text-sm transition-colors ${isActive
        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'} disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
}

interface TiptapEditorProps {
  content: string
  onChange: (markdown: string) => void
  placeholder?: string
  editable?: boolean
  autoFocus?: boolean
}

export function TiptapEditor({
  content, onChange, placeholder = 'Comienza a escribir…', editable = true, autoFocus = false,
}: TiptapEditorProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({ placeholder }),
      Heading.configure({ levels: [1, 2, 3] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: false, allowBase64: true }),
      Youtube.configure({ controls: true, nocookie: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline dark:text-blue-400' } }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      HorizontalRule,
      CodeBlockLowlight.configure({ lowlight }),
      MathExtension,
      MermaidBlockExtension,
    ],
    content,
    editable,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[calc(100vh-280px)] py-4 px-2',
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const addYoutube = useCallback(() => {
    if (!editor || !youtubeUrl.trim()) return
    editor.commands.setYoutubeVideo({ src: youtubeUrl })
    setYoutubeUrl('')
    setShowYoutubeInput(false)
  }, [editor, youtubeUrl])

  const setLink = useCallback(() => {
    if (!editor) return
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().setLink({ href: linkUrl }).run()
    setLinkUrl('')
    setShowLinkInput(false)
  }, [editor, linkUrl])

  const insertMath = useCallback(() => {
    if (!editor) return
    const latex = window.prompt('Escribe la expresión LaTeX', 'E = mc^2')
    if (!latex?.trim()) return

    const asBlock = window.confirm('¿Insertar como bloque de ecuación?')
    if (asBlock) {
      editor.chain().focus().insertBlockMath({ latex }).run()
      return
    }

    editor.chain().focus().insertInlineMath({ latex }).run()
  }, [editor])

  const insertMermaid = useCallback(() => {
    if (!editor) return
    const code = window.prompt('Escribe el diagrama Mermaid', 'graph TD\nA[Inicio] --> B[Fin]')
    if (!code?.trim()) return
    editor.chain().focus().insertContent({ type: 'mermaidBlock', attrs: { code } }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="flex h-full flex-col">
      {editable && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-white/95 px-4 py-2 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Deshacer" disabled={!editor.can().undo()}>
            <Undo className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Rehacer" disabled={!editor.can().redo()}>
            <Redo className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Encabezado 1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Encabezado 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Encabezado 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Negrita"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Cursiva"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Tachado"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Código inline"
          >
            <Code className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            title="Resaltado"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Alinear izquierda"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Centrar"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Alinear derecha"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Lista"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Lista numerada"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="Checklist"
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Cita"
          >
            <Quote className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Bloque de código"
          >
            <Code className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            title="Insertar tabla"
          >
            <Table2 className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Separador"
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn onClick={insertMath} title="Insertar ecuación">
            <Sigma className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={insertMermaid} title="Insertar diagrama Mermaid">
            <Workflow className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Divider />

          <div className="relative">
            <ToolbarBtn onClick={() => setShowLinkInput(s => !s)} isActive={editor.isActive('link')} title="Enlace">
              <Link2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <AnimatePresence>
              {showLinkInput && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-0 top-full z-50 mt-1 flex min-w-64 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                >
                  <input
                    autoFocus
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setLink()}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    onClick={setLink}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    OK
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <ToolbarBtn onClick={() => setShowYoutubeInput(s => !s)} title="Video de YouTube">
              <YoutubeIcon className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <AnimatePresence>
              {showYoutubeInput && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-0 top-full z-50 mt-1 flex min-w-72 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                >
                  <input
                    autoFocus
                    value={youtubeUrl}
                    onChange={e => setYoutubeUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addYoutube()}
                    placeholder="URL de YouTube…"
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-red-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    onClick={addYoutube}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Insertar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {editable && (
        <BubbleMenu editor={editor}>
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-800 bg-slate-900 px-1.5 py-1 shadow-xl dark:border-slate-200 dark:bg-white">
            {[
              { cmd: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), icon: <Bold className="h-3.5 w-3.5" />, title: 'Negrita' },
              { cmd: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), icon: <Italic className="h-3.5 w-3.5" />, title: 'Cursiva' },
              { cmd: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), icon: <Strikethrough className="h-3.5 w-3.5" />, title: 'Tachado' },
              { cmd: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive('highlight'), icon: <Highlighter className="h-3.5 w-3.5" />, title: 'Resaltar' },
              { cmd: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code'), icon: <Code className="h-3.5 w-3.5" />, title: 'Código' },
            ].map((btn, i) => (
              <button
                key={i}
                onMouseDown={e => { e.preventDefault(); btn.cmd() }}
                title={btn.title}
                className={`rounded-lg p-1.5 text-xs transition-colors ${btn.active ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white dark:text-slate-600 dark:hover:bg-slate-100 dark:hover:text-slate-900'}`}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </BubbleMenu>
      )}

      <div className="flex-1 overflow-y-auto px-6 md:px-16 lg:px-24">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
