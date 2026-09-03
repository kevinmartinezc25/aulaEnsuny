import { jsPDF } from 'jspdf'
import { DisciplinaryReport } from '@/modules/disciplinary/application/actions'

async function loadBase64Image(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof window === 'undefined') return null
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0)
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: img.naturalWidth,
          height: img.naturalHeight
        })
      }
      img.onerror = () => resolve(null)
      img.src = url
    } catch {
      resolve(null)
    }
  })
}

/**
 * Genera y descarga un PDF del reporte disciplinario.
 * Utiliza jsPDF con el membrete oficial institucional.
 */
export async function generateDisciplinaryPDF(report: DisciplinaryReport) {
  const doc = new jsPDF()

  const margin = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  let currentY = 14

  const addText = (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right', maxWidth?: number }) => {
    doc.text(text, x, y, options)
  }

  // 1. Membrete Institucional con Logos Oficiales
  const headerImg = await loadBase64Image('/institutional-header.png')
  if (headerImg) {
    const imgWidth = pageWidth - margin * 2
    const imgHeight = (headerImg.height / headerImg.width) * imgWidth
    doc.addImage(headerImg.dataUrl, 'PNG', margin, currentY, imgWidth, imgHeight)
    currentY += imgHeight + 4
  } else {
    // Fallback tipográfico institucional si la imagen no está disponible
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    addText('INSTITUCIÓN EDUCATIVA ESCUELA NORMAL SUPERIOR DEL NORDESTE', pageWidth / 2, currentY, { align: 'center' })

    currentY += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    addText('YOLOMBÓ – ANTIOQUIA | DANE 105890001331 | NIT 811.019.740-8', pageWidth / 2, currentY, { align: 'center' })
    currentY += 6
  }

  currentY += 4
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  addText('REPORTE DE NOVEDAD DISCIPLINARIA', pageWidth / 2, currentY, { align: 'center' })

  currentY += 5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  addText(`Fecha del reporte: ${report.reportDate} | Hora: ${report.reportTime.substring(0, 5)}`, pageWidth / 2, currentY, { align: 'center' })

  currentY += 8
  doc.setLineWidth(0.5)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 8

  // 2. Datos del Estudiante
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  addText('Datos del Estudiante', margin, currentY)
  currentY += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  
  doc.setFont('helvetica', 'bold')
  addText('Nombre:', margin, currentY)
  doc.setFont('helvetica', 'normal')
  addText(report.studentFullName, margin + 25, currentY)
  currentY += 6

  if (report.studentDocument) {
    doc.setFont('helvetica', 'bold')
    addText('Documento:', margin, currentY)
    doc.setFont('helvetica', 'normal')
    addText(report.studentDocument, margin + 25, currentY)
    currentY += 6
  }

  doc.setFont('helvetica', 'bold')
  addText('Grado:', margin, currentY)
  doc.setFont('helvetica', 'normal')
  addText(report.studentGrade, margin + 25, currentY)
  
  doc.setFont('helvetica', 'bold')
  addText('Grupo:', margin + 60, currentY)
  doc.setFont('helvetica', 'normal')
  addText(report.studentGroup, margin + 75, currentY)
  currentY += 12

  // 3. Clasificación de la Falta
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  addText('Clasificación Institucional', margin, currentY)
  currentY += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  addText('Código:', margin, currentY)
  doc.setFont('helvetica', 'normal')
  addText(report.situationSnapshot.code, margin + 20, currentY)
  
  doc.setFont('helvetica', 'bold')
  addText('Tipo:', margin + 60, currentY)
  doc.setFont('helvetica', 'normal')
  addText(report.situationSnapshot.type, margin + 72, currentY)
  currentY += 6

  doc.setFont('helvetica', 'bold')
  addText('Situación:', margin, currentY)
  doc.setFont('helvetica', 'normal')
  
  const titleLines = doc.splitTextToSize(report.situationSnapshot.title, pageWidth - margin * 2 - 25)
  addText(titleLines, margin + 25, currentY)
  currentY += titleLines.length * 5 + 6

  // 4. Relación de los Hechos (Generado)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  addText('Relación de los Hechos', margin, currentY)
  currentY += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  
  const generatedLines = doc.splitTextToSize(report.generatedReport, pageWidth - margin * 2)
  addText(generatedLines, margin, currentY)
  currentY += generatedLines.length * 5 + 6

  // 5. Observaciones del docente
  doc.setFont('helvetica', 'bold')
  addText('Observaciones del Docente:', margin, currentY)
  currentY += 6

  doc.setFont('helvetica', 'normal')
  const teacherLines = doc.splitTextToSize(report.teacherDescription || 'Sin observaciones.', pageWidth - margin * 2)
  addText(teacherLines, margin, currentY)
  currentY += teacherLines.length * 5 + 15

  // Revisar salto de página para las firmas
  if (currentY > doc.internal.pageSize.getHeight() - 65) {
    doc.addPage()
    currentY = 20
  }

  // 6. Firmas
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  const constancia = doc.splitTextToSize(
    'Para constancia de lo anterior, y en cumplimiento del debido proceso establecido en el Manual de Convivencia, se firma el presente reporte. La firma del estudiante deja constancia de que tuvo conocimiento del reporte y de los hechos descritos.',
    pageWidth - margin * 2
  )
  addText(constancia, margin, currentY)
  currentY += constancia.length * 4.5 + 24

  const colWidth = 65
  const teacherX = margin
  const studentX = pageWidth - margin - colWidth

  // ── Firma del Docente (Como se agregó en Permisos Docentes) ──
  doc.setFont('times', 'italic')
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  addText(report.teacherName, teacherX + colWidth / 2, currentY - 3, { align: 'center' })

  // Línea docente
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.4)
  doc.line(teacherX, currentY, teacherX + colWidth, currentY)

  // Textos descriptivos docente
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  addText('DOCENTE REMITENTE', teacherX + colWidth / 2, currentY + 5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  addText(report.teacherName, teacherX + colWidth / 2, currentY + 9, { align: 'center' })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  addText('Firma y Radicación Digital en aulaEnsuny', teacherX + colWidth / 2, currentY + 13, { align: 'center' })

  // ── Firma del Estudiante (Obtenida de Constancia de Firma) ──
  if (report.studentSignatureUrl) {
    try {
      const sigImg = await loadBase64Image(report.studentSignatureUrl)
      if (sigImg) {
        doc.addImage(sigImg.dataUrl, 'PNG', studentX + (colWidth - 45) / 2, currentY - 20, 45, 18)
      } else if (report.studentSignatureUrl.startsWith('data:')) {
        doc.addImage(report.studentSignatureUrl, 'PNG', studentX + (colWidth - 45) / 2, currentY - 20, 45, 18)
      }
    } catch (e) {
      console.warn('No se pudo cargar la imagen de la firma del estudiante:', e)
    }
  }

  // Línea estudiante
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.4)
  doc.line(studentX, currentY, studentX + colWidth, currentY)

  // Textos descriptivos estudiante
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  addText('ESTUDIANTE NOTIFICADO', studentX + colWidth / 2, currentY + 5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  addText(report.studentFullName, studentX + colWidth / 2, currentY + 9, { align: 'center' })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  addText(
    report.studentSignatureUrl ? 'Firma manuscrita presencial verificada' : 'Pendiente de firma presencial',
    studentX + colWidth / 2,
    currentY + 13,
    { align: 'center' }
  )
  doc.setTextColor(15, 23, 42)

  // Guardar PDF
  doc.save(`Reporte_Convivencia_${report.studentFullName.replace(/\s+/g, '_')}_${report.reportDate}.pdf`)
}
