import { IDriveService } from '../../domain/interfaces/IDriveService'
import { IResourceRepository } from '../../domain/interfaces/IResourceRepository'
import { Resource } from '../../domain/entities/Resource'

export class UploadPdfUseCase {
  constructor(
    private driveService: IDriveService,
    private resourceRepository: IResourceRepository
  ) {}

  async execute(params: {
    fileName: string
    fileBuffer: ArrayBuffer
    mimeType: string
    fileSize: number
    courseId: string
    courseName: string
    moduleId?: string
    moduleName?: string
    title: string
    description?: string
    uploadedBy: string
  }): Promise<Resource> {
    // 1. Validaciones
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
    ]
    if (!allowedMimeTypes.includes(params.mimeType)) {
      throw new Error(`Tipo de archivo no permitido: ${params.mimeType}. Solo se permiten PDF, imágenes, Word y PowerPoint.`)
    }
    if (params.fileSize > 50 * 1024 * 1024) { // 50MB limit (Google Apps Script)
      throw new Error('El archivo excede el límite de 50MB.')
    }

    // 2. Subida a Google Drive
    const driveResult = await this.driveService.uploadFile({
      fileName: params.fileName,
      mimeType: params.mimeType,
      fileBuffer: params.fileBuffer,
      courseName: params.courseName,
      moduleName: params.moduleName
    })

    // 3. Guardar metadatos en Supabase
    const resource: Resource = {
      title: params.title,
      description: params.description,
      driveFileId: driveResult.fileId,
      driveUrl: driveResult.webViewLink,
      driveDownloadUrl: driveResult.webContentLink,
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      courseId: params.courseId,
      moduleId: params.moduleId,
      uploadedBy: params.uploadedBy
    }

    const savedResource = await this.resourceRepository.save(resource)
    return savedResource
  }
}
