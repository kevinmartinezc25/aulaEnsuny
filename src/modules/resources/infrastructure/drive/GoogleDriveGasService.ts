import { IDriveService, IDriveUploadOptions, IDriveUploadResult, IDriveFolderResult } from '../../domain/interfaces/IDriveService'

export class GoogleDriveGasService implements IDriveService {
  private gasUrl = process.env.GOOGLE_DRIVE_GAS_URL || ''
  private securityToken = process.env.GOOGLE_DRIVE_SECURITY_TOKEN || ''

  async uploadFile(options: IDriveUploadOptions): Promise<IDriveUploadResult> {
    if (!this.gasUrl || this.gasUrl.includes('PEGAR_AQUI') || this.gasUrl.includes('TU_SCRIPT_ID')) {
      throw new Error('La variable de entorno GOOGLE_DRIVE_GAS_URL no está configurada correctamente.')
    }

    console.log(`[GoogleDriveGAS] Iniciando subida: ${options.fileName} (${options.fileBuffer.byteLength} bytes)`)
    console.log(`[GoogleDriveGAS] Contexto: ${options.context || 'courses'} | targetFolderId: ${options.targetFolderId || 'default'}`)

    // Convertir el buffer a Base64 para enviarlo por HTTP POST
    const buffer = Buffer.from(options.fileBuffer)
    const base64File = buffer.toString('base64')

    const payload = JSON.stringify({
      token: this.securityToken,
      action: 'upload',
      context: options.context || 'courses',
      fileName: options.fileName,
      mimeType: options.mimeType,
      base64: base64File,
      courseName: options.courseName,
      moduleName: options.moduleName,
      targetFolderId: options.targetFolderId,
      docsFolderId: process.env.GOOGLE_DRIVE_DOCS_FOLDER_ID || ''
    })

    const response = await this.sendRequest(payload, 'subida de archivo')
    const rawText = await response.text()

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
      webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.fileId}/preview`,
      webContentLink: result.webContentLink || `https://drive.google.com/uc?export=download&id=${result.fileId}`
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!fileId) {
      console.warn('[GoogleDriveGAS] deleteFile llamado sin fileId')
      return
    }

    const payload = JSON.stringify({
      token: this.securityToken,
      action: 'delete',
      fileId
    })

    const response = await this.sendRequest(payload, 'eliminación de archivo')
    const rawText = await response.text()

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

  async createFolder(
    folderName: string,
    parentFolderId?: string,
    context: 'courses' | 'docs' = 'docs'
  ): Promise<IDriveFolderResult> {
    const payload = JSON.stringify({
      token: this.securityToken,
      action: 'createFolder',
      context,
      folderName,
      parentFolderId: parentFolderId || (context === 'docs' ? process.env.GOOGLE_DRIVE_DOCS_FOLDER_ID : undefined),
      docsFolderId: process.env.GOOGLE_DRIVE_DOCS_FOLDER_ID || ''
    })

    console.log(`[GoogleDriveGAS] Creando carpeta en Drive: "${folderName}" (contexto: ${context}, parent: ${parentFolderId || 'raíz'})`)

    const response = await this.sendRequest(payload, 'creación de carpeta')
    const rawText = await response.text()

    let result: { success: boolean; folderId?: string; folderUrl?: string; error?: string }
    try {
      result = JSON.parse(rawText)
    } catch {
      throw new Error(`La respuesta de Google Apps Script no es JSON válido al crear carpeta: ${rawText.substring(0, 300)}`)
    }

    if (!result.success || !result.folderId) {
      throw new Error(`Error al crear carpeta en Google Drive: ${result.error || 'Sin identificador retornado'}`)
    }

    console.log(`[GoogleDriveGAS] ✅ Carpeta creada en Drive: ${result.folderId}`)

    return {
      folderId: result.folderId,
      folderUrl: result.folderUrl || `https://drive.google.com/drive/folders/${result.folderId}`
    }
  }

  async renameFolder(folderId: string, newName: string): Promise<void> {
    if (!folderId) return

    const payload = JSON.stringify({
      token: this.securityToken,
      action: 'renameFolder',
      folderId,
      newName
    })

    const response = await this.sendRequest(payload, 'renombrar carpeta')
    const rawText = await response.text()

    let result: { success: boolean; error?: string }
    try {
      result = JSON.parse(rawText)
    } catch {
      throw new Error(`La respuesta de Google Apps Script no es JSON válido al renombrar carpeta: ${rawText.substring(0, 300)}`)
    }

    if (!result.success) {
      throw new Error(`Error al renombrar carpeta en Google Drive: ${result.error || 'Error desconocido'}`)
    }

    console.log(`[GoogleDriveGAS] Carpeta renombrada en Drive: ${folderId} -> "${newName}"`)
  }

  async deleteFolder(folderId: string): Promise<void> {
    if (!folderId) return

    const payload = JSON.stringify({
      token: this.securityToken,
      action: 'deleteFolder',
      folderId
    })

    const response = await this.sendRequest(payload, 'eliminar carpeta')
    const rawText = await response.text()

    let result: { success: boolean; error?: string }
    try {
      result = JSON.parse(rawText)
    } catch {
      throw new Error(`La respuesta de Google Apps Script no es JSON válido al eliminar carpeta: ${rawText.substring(0, 300)}`)
    }

    if (!result.success) {
      throw new Error(`Error al eliminar carpeta en Google Drive: ${result.error || 'Error desconocido'}`)
    }

    console.log(`[GoogleDriveGAS] Carpeta enviada a papelera en Drive: ${folderId}`)
  }

  async moveFile(fileId: string, targetFolderId: string): Promise<void> {
    if (!fileId || !targetFolderId) return

    const payload = JSON.stringify({
      token: this.securityToken,
      action: 'moveFile',
      fileId,
      targetFolderId
    })

    const response = await this.sendRequest(payload, 'mover archivo')
    const rawText = await response.text()

    let result: { success: boolean; error?: string }
    try {
      result = JSON.parse(rawText)
    } catch {
      throw new Error(`La respuesta de Google Apps Script no es JSON válido al mover archivo: ${rawText.substring(0, 300)}`)
    }

    if (!result.success) {
      throw new Error(`Error al mover archivo en Google Drive: ${result.error || 'Error desconocido'}`)
    }

    console.log(`[GoogleDriveGAS] Archivo ${fileId} movido exitosamente a carpeta ${targetFolderId}`)
  }

  private async sendRequest(payload: string, operationName: string): Promise<Response> {
    if (!this.gasUrl || this.gasUrl.includes('PEGAR_AQUI') || this.gasUrl.includes('TU_SCRIPT_ID')) {
      throw new Error('La variable de entorno GOOGLE_DRIVE_GAS_URL no está configurada correctamente.')
    }

    let response: Response
    try {
      response = await fetch(this.gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
        redirect: 'follow',
      })
    } catch (fetchError: any) {
      console.error(`[GoogleDriveGAS] Error de red en ${operationName}:`, fetchError)
      throw new Error(`Error de red al contactar Google Apps Script (${operationName}): ${fetchError.message}`)
    }

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} en ${operationName} desde Google Apps Script`)
    }

    return response
  }
}

