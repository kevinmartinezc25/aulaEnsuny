import { Resource } from '../entities/Resource'

export interface IResourceRepository {
  save(resource: Resource): Promise<Resource>
  findById(id: string): Promise<Resource | null>
  findByCourse(courseId: string): Promise<Resource[]>
  delete(id: string): Promise<void>
}
