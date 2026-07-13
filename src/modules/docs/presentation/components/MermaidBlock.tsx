'use client'

import React, { useEffect, useRef, useState } from 'react'
import { mergeAttributes, Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'

function MermaidBlockNode({ node, updateAttributes, selected }: NodeViewProps) {
  const [code, setCode] = useState(node.attrs.code || '')
  const [isEditing, setIsEditing] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [mermaidLib, setMermaidLib] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 10)}`)

  useEffect(() => {
    setCode(node.attrs.code || '')
  }, [node.attrs.code])

  useEffect(() => {
    let mounted = true
    const loadMermaid = async () => {
      const mermaidModule = await import('mermaid')
      if (!mounted) return
      const instance = mermaidModule.default
      instance.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default' })
      setMermaidLib(instance)
    }

    void loadMermaid()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (isEditing || !containerRef.current || !code.trim() || !mermaidLib) return

    const renderDiagram = async () => {
      try {
        const { svg } = await mermaidLib.render(idRef.current, code)
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
        }
        setRenderError(null)
      } catch (error) {
        setRenderError(error instanceof Error ? error.message : 'No se pudo renderizar el diagrama')
      }
    }

    void renderDiagram()
  }, [code, isEditing, mermaidLib])

  const handleCodeChange = (value: string) => {
    setCode(value)
    updateAttributes({ code: value })
  }

  return (
    <NodeViewWrapper
      className={`my-4 rounded-2xl border bg-slate-50/80 dark:bg-slate-900/70 p-3 shadow-sm transition-colors ${selected ? 'border-blue-400 shadow-blue-100 dark:shadow-blue-950/40' : 'border-slate-200 dark:border-slate-800'}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Mermaid
          </span>
          {renderError && (
            <span className="text-[11px] text-rose-500">{renderError}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(v => !v)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {isEditing ? 'Vista previa' : 'Editar'}
        </button>
      </div>

      {isEditing ? (
        <textarea
          value={code}
          onChange={e => handleCodeChange(e.target.value)}
          rows={8}
          className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          placeholder="graph TD\nA[Inicio] --> B[Fin]"
        />
      ) : (
        <div ref={containerRef} className="min-h-[120px] rounded-xl border border-dashed border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-950/40" />
      )}
    </NodeViewWrapper>
  )
}

export const MermaidBlockExtension = Node.create({
  name: 'mermaidBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      code: {
        default: 'graph TD\nA[Inicio] --> B[Fin]',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid-block"]',
        getAttrs: element => ({
          code: element.getAttribute('data-code') || '',
        }),
      },
    ]
  },

  renderHTML({ node }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'mermaid-block', 'data-code': node.attrs.code }, { class: 'my-4' }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockNode)
  },
})
