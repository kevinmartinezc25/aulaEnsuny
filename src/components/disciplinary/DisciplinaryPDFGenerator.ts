import { jsPDF } from 'jspdf'
import { DisciplinaryReport } from '@/modules/disciplinary/application/actions'

/**
 * Genera y descarga un PDF del reporte disciplinario.
 * Utiliza jsPDF (versión instalada).
 */
export async function generateDisciplinaryPDF(report: DisciplinaryReport) {
  const doc = new jsPDF()

  const margin = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  let currentY = 20

  const addText = (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right', maxWidth?: number }) => {
    doc.text(text, x, y, options)
  }

  // 1. Membrete
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  addText('INSTITUCIÓN EDUCATIVA AULAENSUNY', pageWidth / 2, currentY, { align: 'center' })
  
  currentY += 8
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  addText('REPORTE DE NOVEDAD DISCIPLINARIA', pageWidth / 2, currentY, { align: 'center' })

  currentY += 6
  doc.setFontSize(10)
  addText(`Fecha del reporte: ${report.reportDate} ${report.reportTime.substring(0, 5)}`, pageWidth / 2, currentY, { align: 'center' })

  currentY += 10
  doc.setLineWidth(0.5)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 10

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
  if (currentY > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage()
    currentY = 20
  }

  // 6. Firmas
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const constancia = doc.splitTextToSize('Para constancia de lo anterior, y en cumplimiento del debido proceso establecido en el Manual de Convivencia, se firma el presente reporte. La firma del estudiante deja constancia de que tuvo conocimiento del reporte y de los hechos descritos.', pageWidth - margin * 2)
  addText(constancia, margin, currentY)
  currentY += constancia.length * 5 + 20

  // Firma Docente
  doc.setLineWidth(0.3)
  doc.line(margin, currentY, margin + 60, currentY)
  
  // Firma Estudiante
  doc.line(pageWidth - margin - 60, currentY, pageWidth - margin, currentY)
  
  currentY += 5
  doc.setFont('helvetica', 'bold')
  addText('Firma Docente Remitente', margin + 30, currentY, { align: 'center' })
  addText('Firma del Estudiante', pageWidth - margin - 30, currentY, { align: 'center' })
  
  currentY += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  addText(report.teacherName, margin + 30, currentY, { align: 'center' })
  addText(report.studentFullName, pageWidth - margin - 30, currentY, { align: 'center' })

  // Insertar imagen de la firma del estudiante si existe
  if (report.studentSignatureUrl) {
    try {
      // Necesitamos asegurar que la URL sea pública para jsPDF o cargarla como data URI
      // En un caso real, esto sería una URL pública de Supabase Storage.
      // doc.addImage(report.studentSignatureUrl, 'PNG', pageWidth - margin - 55, currentY - 25, 50, 20)
    } catch (e) {
      console.warn('No se pudo cargar la imagen de la firma', e)
    }
  }

  // Guardar PDF
  doc.save(`Reporte_Convivencia_${report.studentFullName.replace(/\s+/g, '_')}_${report.reportDate}.pdf`)
}
