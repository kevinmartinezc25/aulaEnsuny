'use client'

import TurndownService from 'turndown'
import { saveAs } from 'file-saver'
import katex from 'katex'

const turndownService = new TurndownService({ headingStyle: 'atx' })

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'documento'
}

function prepareExportHtml(html: string) {
  const container = document.createElement('div')
  container.innerHTML = html

  container.querySelectorAll('[data-latex]').forEach(element => {
    const latex = element.getAttribute('data-latex')
    if (!latex) return

    try {
      const isBlock = element.tagName === 'DIV'
      const rendered = katex.renderToString(latex, {
        displayMode: isBlock,
        throwOnError: false,
      })
      element.innerHTML = rendered
    } catch {
      element.textContent = latex
    }
  })

  container.querySelectorAll('[data-type="mermaid-block"]').forEach(element => {
    const code = element.getAttribute('data-code')
    if (!code) return
    const pre = document.createElement('pre')
    pre.textContent = code
    element.replaceWith(pre)
  })

  return container.innerHTML
}

export async function exportToPDF(html: string, title: string) {
  const { default: html2pdf } = await import('html2pdf.js')

  const printable = document.createElement('div')
  printable.style.background = 'white'
  printable.style.color = '#0f172a'
  printable.style.padding = '24px'
  printable.innerHTML = prepareExportHtml(html)

  await html2pdf()
    .set({
      margin: [12, 12, 12, 12],
      filename: `${slugify(title)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(printable)
    .save()
}

export function exportToWord(html: string, title: string) {
  const content = prepareExportHtml(html)
  const document = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
      h1, h2, h3 { color: #0f172a; }
      pre { background: #f8fafc; padding: 12px; border-radius: 8px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #cbd5e1; padding: 6px; }
    </style>
  </head>
  <body>${content}</body>
</html>`

  const blob = new Blob([document], { type: 'application/msword' })
  saveAs(blob, `${slugify(title)}.doc`)
}

export function exportToMarkdown(html: string, title: string) {
  const container = document.createElement('div')
  container.innerHTML = html
  const markdown = turndownService.turndown(container.innerHTML)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })

  saveAs(blob, `${slugify(title)}.md`)
}
