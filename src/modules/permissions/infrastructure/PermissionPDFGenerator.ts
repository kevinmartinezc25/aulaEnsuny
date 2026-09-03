import { jsPDF } from 'jspdf'
import { PermissionRequest, PERMISSION_STATUS_LABELS } from '../domain/entities'
import { formatPermissionDateRange } from '../presentation/utils/dateUtils'

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

export async function generatePermissionPDF(request: PermissionRequest) {
  const doc = new jsPDF()
  const margin = 18
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let currentY = 14

  const addText = (text: string | string[], x: number, y: number, options?: { align?: 'left' | 'center' | 'right'; maxWidth?: number }) => {
    doc.text(text, x, y, options)
  }

  const checkPageBreak = (spaceNeeded: number) => {
    if (currentY + spaceNeeded > pageHeight - 20) {
      doc.addPage()
      currentY = 20
    }
  }

  // ── 1. Membrete Institucional con Logos ────────────────────────
  const headerImg = await loadBase64Image('/institutional-header.png')
  if (headerImg) {
    const imgWidth = pageWidth - margin * 2
    const imgHeight = (headerImg.height / headerImg.width) * imgWidth
    doc.addImage(headerImg.dataUrl, 'PNG', margin, currentY, imgWidth, imgHeight)
    currentY += imgHeight + 4
  } else {
    // Fallback tipográfico institucional si la imagen no está disponible
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42) // Slate 900
    addText('INSTITUCIÓN EDUCATIVA ESCUELA NORMAL SUPERIOR DEL NORDESTE', pageWidth / 2, currentY, { align: 'center' })

    currentY += 5
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139) // Slate 500
    addText('YOLOMBÓ – ANTIOQUIA | DANE 105890001331 | NIT 811.019.740-8', pageWidth / 2, currentY, { align: 'center' })
    currentY += 6
  }

  currentY += 7
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 58, 138) // Blue 900
  addText('CONSTANCIA OFICIAL DE PERMISO DOCENTE', pageWidth / 2, currentY, { align: 'center' })

  currentY += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  addText(`Radicado Oficial: ${request.requestNumber} | Emisión: ${new Date().toLocaleDateString('es-CO')}`, pageWidth / 2, currentY, { align: 'center' })

  currentY += 8
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.4)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 8

  // ── 2. Información del Docente ─────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  addText('1. INFORMACIÓN DEL DOCENTE SOLICITANTE', margin, currentY)
  currentY += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  addText('Nombre completo:', margin, currentY)
  doc.setFont('helvetica', 'normal')
  addText(request.teacherSnapshot.fullName, margin + 35, currentY)

  doc.setFont('helvetica', 'bold')
  addText('Documento:', pageWidth / 2 + 10, currentY)
  doc.setFont('helvetica', 'normal')
  addText(request.teacherSnapshot.document || 'No registrado', pageWidth / 2 + 35, currentY)
  currentY += 5

  doc.setFont('helvetica', 'bold')
  addText('Correo institucional:', margin, currentY)
  doc.setFont('helvetica', 'normal')
  addText(request.teacherSnapshot.email, margin + 35, currentY)

  doc.setFont('helvetica', 'bold')
  addText('Cargo / Rol:', pageWidth / 2 + 10, currentY)
  doc.setFont('helvetica', 'normal')
  addText(request.teacherSnapshot.role === 'teacher' ? 'Docente de Aula' : request.teacherSnapshot.role, pageWidth / 2 + 35, currentY)
  currentY += 5

  if (request.teacherSnapshot.mainSubject || request.teacherSnapshot.campus) {
    if (request.teacherSnapshot.mainSubject) {
      doc.setFont('helvetica', 'bold')
      addText('Área / Asignatura:', margin, currentY)
      doc.setFont('helvetica', 'normal')
      addText(request.teacherSnapshot.mainSubject, margin + 35, currentY)
    }
    if (request.teacherSnapshot.campus) {
      doc.setFont('helvetica', 'bold')
      addText('Sede:', pageWidth / 2 + 10, currentY)
      doc.setFont('helvetica', 'normal')
      addText(request.teacherSnapshot.campus, pageWidth / 2 + 35, currentY)
    }
    currentY += 7
  } else {
    currentY += 2
  }

  // ── 3. Detalles del Permiso ────────────────────────────────────
  currentY += 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  addText('2. DETALLES DEL PERMISO', margin, currentY)
  currentY += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  addText('Tipo de permiso:', margin, currentY)
  doc.setFont('helvetica', 'normal')
  addText(request.typeSnapshot.name, margin + 35, currentY)

  doc.setFont('helvetica', 'bold')
  addText('Estado institucional:', pageWidth / 2 + 10, currentY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(request.status === 'approved' ? 16 : 220, request.status === 'approved' ? 149 : 38, request.status === 'approved' ? 74 : 38)
  addText(PERMISSION_STATUS_LABELS[request.status], pageWidth / 2 + 45, currentY)
  doc.setTextColor(15, 23, 42)
  currentY += 5

  doc.setFont('helvetica', 'bold')
  addText('Periodo concedido:', margin, currentY)
  doc.setFont('helvetica', 'normal')
  const periodText = formatPermissionDateRange(request.startDate, request.endDate)
  addText(periodText, margin + 35, currentY)

  doc.setFont('helvetica', 'bold')
  addText('Jornada:', pageWidth / 2 + 10, currentY)
  doc.setFont('helvetica', 'normal')
  addText(request.isFullDay ? 'Jornada Completa' : `${request.startTime || ''} a ${request.endTime || ''}`, pageWidth / 2 + 35, currentY)
  currentY += 6

  doc.setFont('helvetica', 'bold')
  addText('Motivo / Justificación:', margin, currentY)
  currentY += 4.5
  doc.setFont('helvetica', 'normal')
  const reasonLines = doc.splitTextToSize(request.reason, pageWidth - margin * 2)
  addText(reasonLines, margin, currentY)
  currentY += reasonLines.length * 4.5 + 4

  // ── 4. Afectación y Cobertura Académica ────────────────────────
  if (request.affectsAcademicDuty && request.academicImpact && request.academicImpact.length > 0) {
    checkPageBreak(35)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    addText('3. IMPACTO ACADÉMICO Y COBERTURA INSTITUCIONAL', margin, currentY)
    currentY += 5

    doc.setFontSize(8)
    // Encabezado de tabla
    doc.setFillColor(241, 245, 249)
    doc.rect(margin, currentY, pageWidth - margin * 2, 6, 'F')
    doc.setFont('helvetica', 'bold')
    addText('Fecha', margin + 2, currentY + 4)
    addText('Grado / Grupo', margin + 30, currentY + 4)
    addText('Asignatura', margin + 60, currentY + 4)
    addText('Horas', margin + 105, currentY + 4)
    addText('Docente Reemplazo (Cobertura)', margin + 120, currentY + 4)
    currentY += 7

    doc.setFont('helvetica', 'normal')
    request.academicImpact.forEach((item, idx) => {
      checkPageBreak(8)
      const cov = request.coveragePlan?.find(c => c.academicItemIndex === idx)
      addText(item.date || request.startDate, margin + 2, currentY)
      addText(item.gradeGroup || item.courseName, margin + 30, currentY)
      addText(item.subject, margin + 60, currentY)
      addText(`${item.hoursCount}h`, margin + 108, currentY)
      addText(cov?.substituteTeacherName || 'Asignación institucional', margin + 120, currentY)
      currentY += 5
    })
    currentY += 3
  }

  // ── 5. Plan de Contingencia / Actividades ──────────────────────
  if (request.leavesStudentActivities && request.studentActivities && request.studentActivities.length > 0) {
    checkPageBreak(25)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    addText('4. PLAN DE CONTINUIDAD ACADÉMICA (ACTIVIDADES DEJADAS)', margin, currentY)
    currentY += 5

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    request.studentActivities.forEach((act) => {
      checkPageBreak(12)
      doc.setFont('helvetica', 'bold')
      addText(`• Grupo: ${act.groupName} — ${act.title}`, margin + 2, currentY)
      currentY += 4
      doc.setFont('helvetica', 'normal')
      const instLines = doc.splitTextToSize(`Instrucciones: ${act.instructions}`, pageWidth - margin * 2 - 4)
      addText(instLines, margin + 5, currentY)
      currentY += instLines.length * 4 + 2
    })
    currentY += 3
  }

  // ── 6. Cuadro de Firmas y Aprobaciones Digitales ───────────────
  checkPageBreak(50)
  currentY += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  addText('5. CONSTANCIA DE REVISIÓN Y APROBACIÓN INSTITUCIONAL', margin, currentY)
  currentY += 6

  const boxWidth = (pageWidth - margin * 2 - 10) / 2
  const boxHeight = 35

  // Caja Rectoría
  doc.setFillColor(248, 250, 252)
  doc.rect(margin, currentY, boxWidth, boxHeight, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(margin, currentY, boxWidth, boxHeight, 'S')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  addText('RECTORÍA INSTITUCIONAL', margin + 4, currentY + 6)
  doc.setFont('helvetica', 'normal')
  addText(`Aprobado por: ${request.rectorName || 'Rector Institucional'}`, margin + 4, currentY + 12)
  addText(`Fecha/Hora: ${request.rectorApprovalDate ? new Date(request.rectorApprovalDate).toLocaleString('es-CO') : 'Registrado en sistema'}`, margin + 4, currentY + 17)
  doc.setFont('helvetica', 'italic')
  addText('Firma y validación digital registrada en aulaEnsuny', margin + 4, currentY + 23)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(16, 185, 129)
  addText('✓ APROBACIÓN CONFORME', margin + 4, currentY + 29)

  // Caja Coordinación Académica
  doc.setTextColor(30, 41, 59)
  doc.setFillColor(248, 250, 252)
  doc.rect(margin + boxWidth + 10, currentY, boxWidth, boxHeight, 'F')
  doc.rect(margin + boxWidth + 10, currentY, boxWidth, boxHeight, 'S')

  doc.setFont('helvetica', 'bold')
  addText('COORDINACIÓN ACADÉMICA', margin + boxWidth + 14, currentY + 6)
  doc.setFont('helvetica', 'normal')
  addText(`Aprobado por: ${request.coordinatorName || 'Coordinación Académica'}`, margin + boxWidth + 14, currentY + 12)
  addText(`Fecha/Hora: ${request.coordinatorApprovalDate ? new Date(request.coordinatorApprovalDate).toLocaleString('es-CO') : 'Registrado en sistema'}`, margin + boxWidth + 14, currentY + 17)
  doc.setFont('helvetica', 'italic')
  addText('Verificación de cobertura y continuidad académica', margin + boxWidth + 14, currentY + 23)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(16, 185, 129)
  addText('✓ APROBACIÓN CONFORME', margin + boxWidth + 14, currentY + 29)

  currentY += boxHeight + 10

  // ── 7. Código de Verificación y Pie de Página ───────────────────
  checkPageBreak(25)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 5

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  addText(`CÓDIGO ÚNICO DE VERIFICACIÓN INSTITUCIONAL: ${request.verificationCode.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' })
  currentY += 4
  doc.setFont('helvetica', 'normal')
  addText('Documento generado digitalmente por aulaEnsuny. La autenticidad de esta constancia puede ser verificada en la secretaría académica de la institución.', pageWidth / 2, currentY, { align: 'center' })

  // Descarga del PDF
  const filename = `Constancia_Permiso_${request.requestNumber}_${request.teacherSnapshot.fullName.replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}
