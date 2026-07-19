import { IDriveService, IDriveUploadOptions, IDriveUploadResult } from '../../domain/interfaces/IDriveService'

export class GoogleDriveGasService implements IDriveService {
  private gasUrl = process.env.GOOGLE_DRIVE_GAS_URL || ''
  private securityToken = process.env.GOOGLE_DRIVE_SECURITY_TOKEN || ''

  async uploadFile(options: IDriveUploadOptions): Promise<IDriveUploadResult> {
    if (!this.gasUrl || this.gasUrl.includes('PEGAR_AQUI') || this.gasUrl.includes('TU_SCRIPT_ID')) {
      throw new Error('La variable de entorno GOOGLE_DRIVE_GAS_URL no está configurada correctamente.')
    }

    console.log(`[GoogleDriveGAS] Iniciando subida: ${options.fileName} (${options.fileBuffer.byteLength} bytes)`)
    console.log(`[GoogleDriveGAS] URL del proxy: ${this.gasUrl}`)

    // Convertir el buffer a Base64 para enviarlo por HTTP POST
    const buffer = Buffer.from(options.fileBuffer)
    const base64File = buffer.toString('base64')

    const payload = JSON.stringify({
      token: this.securityToken,
      fileName: options.fileName,
      mimeType: options.mimeType,
      base64: base64File,
      courseName: options.courseName,
      moduleName: options.moduleName,
      docsFolderId: process.env.GOOGLE_DRIVE_DOCS_FOLDER_ID || ''
    })

    // Google Apps Script devuelve una redirección 302 antes del endpoint real.
    // Debemos seguir la redirección manualmente con follow: 'follow'.
    // En algunos casos, el POST se convierte en GET tras el redirect, por lo que
    // necesitamos hacer la llamada con redirect: 'follow' explícito.
    let response: Response
    try {
      response = await fetch(this.gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
        redirect: 'follow', // Seguir la redirección 302 de GAS
      })
    } catch (fetchError: any) {
      console.error('[GoogleDriveGAS] Error en el fetch:', fetchError)
      throw new Error(`Error de red al contactar Google Apps Script: ${fetchError.message}`)
    }

    console.log(`[GoogleDriveGAS] HTTP Status: ${response.status} ${response.statusText}`)

    // Leer el cuerpo de la respuesta como texto para diagnosticar errores HTML de Google
    const rawText = await response.text()
    console.log(`[GoogleDriveGAS] Respuesta raw (primeros 500 chars): ${rawText.substring(0, 500)}`)

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} del proxy GAS: ${rawText.substring(0, 200)}`)
    }

    let result: { success: boolean; fileId?: string; webViewLink?: string; webContentLink?: string; error?: string }
    try {
      result = JSON.parse(rawText)
    } catch {
      throw new Error(`La respuesta de Google Apps Script no es JSON válido. Respuesta recibida: ${rawText.substring(0, 300)}`)
    }

    if (!result.success) {
      throw new Error(`Error en la subida a Drive: ${result.error}`)
    }

    console.log(`[GoogleDriveGAS] ✅ Archivo subido exitosamente. fileId: ${result.fileId}`)

    return {
      fileId: result.fileId!,
      webViewLink: `https://drive.google.com/file/d/${result.fileId}/preview`,
      webContentLink: `https://drive.google.com/uc?export=download&id=${result.fileId}`
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.gasUrl || this.gasUrl.includes('PEGAR_AQUI') || this.gasUrl.includes('TU_SCRIPT_ID')) {
      throw new Error('La variable de entorno GOOGLE_DRIVE_GAS_URL no está configurada correctamente para eliminación de archivos.')
    }

    if (!fileId) {
      console.warn('[GoogleDriveGAS] deleteFile llamado sin fileId')
      return
    }

    const payload = JSON.stringify({
      token: this.securityToken,
      action: 'delete',
      fileId
    })

    let response: Response
    try {
      response = await fetch(this.gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload,
        redirect: 'follow'
      })
    } catch (fetchError: any) {
      console.error('[GoogleDriveGAS] Error en el fetch de eliminación:', fetchError)
      throw new Error(`Error de red al contactar Google Apps Script para eliminar archivo: ${fetchError.message}`)
    }

    const rawText = await response.text()
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} al eliminar archivo de Drive: ${rawText.substring(0, 200)}`)
    }

    let result: { success: boolean; error?: string }
    try {
      result = JSON.parse(rawText)
    } catch {
      throw new Error(`La respuesta de Google Apps Script no es JSON válido en la eliminación. Respuesta recibida: ${rawText.substring(0, 300)}`)
    }

    if (!result.success) {
      throw new Error(`Error en la eliminación de Drive: ${result.error || 'Sin detalles'}`)
    }

    console.log(`[GoogleDriveGAS] Archivo eliminado de Drive: ${fileId}`)
  }
}
