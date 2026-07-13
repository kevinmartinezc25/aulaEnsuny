import nodemailer from 'nodemailer'

export interface EmailOptions {
  to: string
  subject: string
  html: string
}

export interface INotificationProvider {
  sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: any }>
}

// Implementación con SMTP
class SmtpNotificationProvider implements INotificationProvider {
  private transporter: nodemailer.Transporter | null = null

  private getTransporter() {
    if (this.transporter) return this.transporter

    // Cargar credenciales desde variables de entorno o usar una cuenta de pruebas
    const host = process.env.SMTP_HOST || 'smtp.mailtrap.io'
    const port = parseInt(process.env.SMTP_PORT || '2525')
    const user = process.env.SMTP_USER || ''
    const pass = process.env.SMTP_PASS || ''

    this.transporter = nodemailer.createTransport({
      host,
      port,
      auth: {
        user,
        pass
      }
    })

    return this.transporter
  }

  async sendEmail(options: EmailOptions) {
    try {
      const transporter = this.getTransporter()
      const from = process.env.EMAIL_FROM || 'aulaEnsuny <no-reply@ensuny.edu.co>'

      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html
      })

      console.log(`[SMTP] Correo enviado a ${options.to}. ID: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (err: any) {
      console.error('[SMTP] Error al enviar correo:', err)
      return { success: false, error: err }
    }
  }
}

// Mock Provider para desarrollo local / demostración
class MockNotificationProvider implements INotificationProvider {
  async sendEmail(options: EmailOptions) {
    console.log(`=========================================`)
    console.log(`[EMAIL MOCK] Para: ${options.to}`)
    console.log(`[EMAIL MOCK] Asunto: ${options.subject}`)
    console.log(`[EMAIL MOCK] Contenido HTML:\n${options.html}`)
    console.log(`=========================================`)
    return { success: true, messageId: `mock-id-${Date.now()}` }
  }
}

// Fábrica desacoplada para obtener el proveedor de notificaciones
export function getNotificationProvider(): INotificationProvider {
  const providerType = process.env.NOTIFICATION_PROVIDER || 'mock'
  if (providerType === 'smtp') {
    return new SmtpNotificationProvider()
  }
  return new MockNotificationProvider()
}
