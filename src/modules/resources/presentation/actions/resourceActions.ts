'use server'

import { UploadPdfUseCase } from '../../application/useCases/uploadPdfUseCase'
import { DeleteResourceUseCase } from '../../application/useCases/deleteResourceUseCase'
import { GoogleDriveGasService } from '../../infrastructure/drive/GoogleDriveGasService'
import { SupabaseResourceRepository } from '../../infrastructure/supabase/SupabaseResourceRepository'

export async function uploadPdfAction(formData: FormData) {
  try {
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const courseId = formData.get('courseId') as string
    const courseName = formData.get('courseName') as string
    const moduleId = formData.get('moduleId') as string | null
    const moduleName = formData.get('moduleName') as string | null
    const uploadedBy = formData.get('uploadedBy') as string

    if (!file || !title || !courseId || !uploadedBy) {
      throw new Error('Faltan campos obligatorios.')
    }

    const fileBuffer = await file.arrayBuffer()

    // Configuración Clean Architecture
    const driveService = new GoogleDriveGasService()
    const resourceRepository = new SupabaseResourceRepository()
    const useCase = new UploadPdfUseCase(driveService, resourceRepository)

    // Ejecutar el caso de uso
    const resource = await useCase.execute({
      fileName: file.name,
      fileBuffer,
      mimeType: file.type,
      fileSize: file.size,
      courseId,
      courseName,
      moduleId: moduleId || undefined,
      moduleName: moduleName || undefined,
      title,
      description,
      uploadedBy
    })

    return { success: true, resource }
  } catch (error: any) {
    console.error('Upload Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteResourceAction(resourceId: string) {
  try {
    const resourceRepository = new SupabaseResourceRepository()
    const driveService = new GoogleDriveGasService()
    const useCase = new DeleteResourceUseCase(resourceRepository, driveService)

    await useCase.execute(resourceId)
    return { success: true }
  } catch (error: any) {
    console.error('Delete Resource Error:', error)
    return { success: false, error: error.message }
  }
}
