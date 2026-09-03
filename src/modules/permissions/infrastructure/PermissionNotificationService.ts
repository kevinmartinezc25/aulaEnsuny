import { getNotificationProvider } from '@/modules/institutional-agenda/infrastructure/NotificationProvider'
import { PermissionRequest } from '../domain/entities'

export class PermissionNotificationService {
  /**
   * Notificación cuando el docente radica una nueva solicitud.
   * El Rector tiene rol de SuperAdmin; tanto el rol SuperAdmin como el rol Admin
   * reciben la notificación de las solicitudes de permisos de los docentes.
   */
  static async notifyNewRequestSubmitted(request: PermissionRequest, directEmails?: string[]) {
    const provider = getNotificationProvider()
    let recipients: string[] = directEmails || []

    if (recipients.length === 0) {
      try {
        const { createAdminClient } = await import('@/core/config/supabase/server')
        const adminClient = createAdminClient()
        const { data: profiles } = await adminClient
          .from('profiles')
          .select('email, roles!inner(name)')
          .in('roles.name', ['superadmin', 'admin'])

        if (profiles && profiles.length > 0) {
          recipients = profiles.map(p => p.email).filter(Boolean)
        }
      } catch (e) {
        console.warn('Error al consultar directivos:', e)
      }
    }

    if (recipients.length === 0) {
      recipients = [
        process.env.RECTOR_EMAIL || 'admin@ensuny.edu.co',
        'superadmin_alt@ensuny.edu.co'
      ]
    }

    const uniqueRecipients = Array.from(new Set(recipients))

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px;">Nueva Solicitud de Permiso Docente</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Radicado: <strong>${request.requestNumber}</strong></p>
        </div>
        <div style="padding: 24px;">
          <p>Estimados Directivos (Rectoría y Administración),</p>
          <p>El docente <strong>${request.teacherSnapshot.fullName}</strong> ha registrado una nueva solicitud institucional que requiere revisión:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b; width: 40%;"><strong>Tipo de permiso:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${request.typeSnapshot.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;"><strong>Fecha(s):</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${request.startDate} ${request.startDate !== request.endDate ? `al ${request.endDate}` : ''}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;"><strong>Jornada:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${request.isFullDay ? 'Jornada Completa' : `${request.startTime} - ${request.endTime}`}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;"><strong>Afecta clases:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${request.affectsAcademicDuty ? 'Sí (' + request.academicImpact.length + ' clases afectadas)' : 'No'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; vertical-align: top;"><strong>Motivo:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${request.reason}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/permissions/${request.id}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Revisar Expediente en aulaEnsuny
            </a>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Escuela Normal Superior del Nordeste — Sistema Integrado aulaEnsuny
        </div>
      </div>
    `

    // Enviar a cada destinatario
    for (const email of uniqueRecipients) {
      await provider.sendEmail({
        to: email,
        subject: `Nueva solicitud de permiso — ${request.requestNumber}`,
        html,
      })
    }

    return { success: true }
  }

  /**
   * Notificación cuando Rectoría aprueba y pasa a Coordinación
   */
  static async notifyApprovedByRector(request: PermissionRequest, coordEmail?: string) {
    const provider = getNotificationProvider()
    const targetEmail = coordEmail || process.env.COORD_EMAIL || 'coordinacion@ensuny.edu.co'

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4338ca, #6366f1); padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px;">Permiso Aprobado por Rectoría — Cobertura Requerida</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Radicado: <strong>${request.requestNumber}</strong></p>
        </div>
        <div style="padding: 24px;">
          <p>Estimada Coordinación Académica,</p>
          <p>La solicitud de permiso del docente <strong>${request.teacherSnapshot.fullName}</strong> ha sido <strong>aprobada por Rectoría</strong> y se encuentra pendiente de revisión académica y asignación de cobertura institucional.</p>
          
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px;">
            <p style="margin: 0 0 8px 0;"><strong>Clases / Grupos afectados:</strong> ${request.academicImpact.length}</p>
            <p style="margin: 0 0 8px 0;"><strong>¿Deja actividades?:</strong> ${request.leavesStudentActivities ? 'Sí' : 'No'}</p>
            ${request.rectorNotes ? `<p style="margin: 0; color: #334155;"><strong>Observación de Rectoría:</strong> ${request.rectorNotes}</p>` : ''}
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/permissions/${request.id}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Gestionar Cobertura y Aprobación
            </a>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Escuela Normal Superior del Nordeste — Sistema Integrado aulaEnsuny
        </div>
      </div>
    `

    return provider.sendEmail({
      to: targetEmail,
      subject: `Permiso aprobado por Rectoría para revisión académica — ${request.requestNumber}`,
      html,
    })
  }

  /**
   * Notificación de resolución final al docente (Aprobada definitivamente)
   */
  static async notifyTeacherFinalApproval(request: PermissionRequest) {
    const provider = getNotificationProvider()
    const targetEmail = request.teacherSnapshot.email

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px;">✅ Solicitud de Permiso Aprobada</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Radicado: <strong>${request.requestNumber}</strong></p>
        </div>
        <div style="padding: 24px;">
          <p>Apreciado(a) <strong>${request.teacherSnapshot.fullName}</strong>,</p>
          <p>Le informamos que su solicitud de permiso ha sido <strong>aprobada satisfactoriamente</strong> por Rectoría y Coordinación Académica.</p>
          
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #065f46;">
            <p style="margin: 0 0 6px 0;"><strong>Vigencia:</strong> ${request.startDate} ${request.startDate !== request.endDate ? `hasta ${request.endDate}` : ''}</p>
            <p style="margin: 0 0 6px 0;"><strong>Jornada:</strong> ${request.isFullDay ? 'Jornada completa' : `${request.startTime} a ${request.endTime}`}</p>
            <p style="margin: 0;"><strong>Código de Verificación:</strong> <code>${request.verificationCode.substring(0, 16).toUpperCase()}</code></p>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Ya puede ingresar a su panel institucional en aulaEnsuny para descargar su <strong>Constancia Oficial en PDF</strong> con firmas y sellos digitales.
          </p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/teacher/permissions/${request.id}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Descargar Constancia Oficial
            </a>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Escuela Normal Superior del Nordeste — Sistema Integrado aulaEnsuny
        </div>
      </div>
    `

    return provider.sendEmail({
      to: targetEmail,
      subject: `Permiso Aprobado — ${request.requestNumber}`,
      html,
    })
  }

  /**
   * Notificación cuando la solicitud es devuelta para corrección
   */
  static async notifyTeacherCorrectionRequired(request: PermissionRequest, correctionNotes: string) {
    const provider = getNotificationProvider()
    const targetEmail = request.teacherSnapshot.email

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #d97706, #f59e0b); padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px;">⚠️ Solicitud Devuelta para Corrección</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Radicado: <strong>${request.requestNumber}</strong></p>
        </div>
        <div style="padding: 24px;">
          <p>Apreciado(a) <strong>${request.teacherSnapshot.fullName}</strong>,</p>
          <p>Rectoría ha revisado su solicitud y requiere que realice algunos ajustes antes de continuar con el trámite:</p>
          
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 16px 0; font-size: 14px; color: #92400e;">
            <strong>Observaciones de Rectoría:</strong><br/>
            ${correctionNotes}
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Por favor ingrese a aulaEnsuny, aplique las correcciones solicitadas y reenvíe la solicitud para su respectiva aprobación.
          </p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/teacher/permissions/${request.id}" style="display: inline-block; background: #d97706; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Editar y Corregir Solicitud
            </a>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Escuela Normal Superior del Nordeste — Sistema Integrado aulaEnsuny
        </div>
      </div>
    `

    return provider.sendEmail({
      to: targetEmail,
      subject: `Acción requerida: Solicitud devuelta para corrección — ${request.requestNumber}`,
      html,
    })
  }

  /**
   * Notificación cuando la solicitud es rechazada
   */
  static async notifyTeacherRejected(request: PermissionRequest, rejectionReason: string, rejectedBy: string) {
    const provider = getNotificationProvider()
    const targetEmail = request.teacherSnapshot.email

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #e11d48, #f43f5e); padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px;">Solicitud de Permiso no Aprobada</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Radicado: <strong>${request.requestNumber}</strong></p>
        </div>
        <div style="padding: 24px;">
          <p>Apreciado(a) <strong>${request.teacherSnapshot.fullName}</strong>,</p>
          <p>Le comunicamos que su solicitud de permiso ha sido <strong>rechazada</strong> por ${rejectedBy}.</p>
          
          <div style="background: #fff1f2; border-left: 4px solid #f43f5e; padding: 16px; border-radius: 4px; margin: 16px 0; font-size: 14px; color: #9f1239;">
            <strong>Motivo del rechazo:</strong><br/>
            ${rejectionReason}
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/teacher/permissions/${request.id}" style="display: inline-block; background: #e11d48; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Ver Detalles en el Expediente
            </a>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Escuela Normal Superior del Nordeste — Sistema Integrado aulaEnsuny
        </div>
      </div>
    `

    return provider.sendEmail({
      to: targetEmail,
      subject: `Notificación de solicitud de permiso rechazada — ${request.requestNumber}`,
      html,
    })
  }
}
