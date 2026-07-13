import { IDriveService } from '../../domain/interfaces/IDriveService'
import { IResourceRepository } from '../../domain/interfaces/IResourceRepository'

export class DeleteResourceUseCase {
  constructor(
    private resourceRepository: IResourceRepository,
    private driveService: IDriveService
  ) {}

  async execute(resourceId: string): Promise<void> {
    const resource = await this.resourceRepository.findById(resourceId)
    if (!resource) {
      throw new Error('Recurso no encontrado.')
    }

    if (resource.driveFileId && resource.driveFileId !== 'link') {
      await this.driveService.deleteFile(resource.driveFileId)
    }

    await this.resourceRepository.delete(resourceId)
  }
}
