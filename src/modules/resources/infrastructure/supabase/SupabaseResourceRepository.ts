import { createClient } from '@/core/config/supabase/server'
import { IResourceRepository } from '../../domain/interfaces/IResourceRepository'
import { Resource } from '../../domain/entities/Resource'

export class SupabaseResourceRepository implements IResourceRepository {
  async save(resource: Resource): Promise<Resource> {
    const supabase = await createClient()
    const dbData = {
      title: resource.title,
      description: resource.description,
      drive_file_id: resource.driveFileId,
      drive_url: resource.driveUrl,
      drive_download_url: resource.driveDownloadUrl,
      mime_type: resource.mimeType,
      file_size: resource.fileSize,
      course_id: resource.courseId,
      module_id: resource.moduleId,
      uploaded_by: resource.uploadedBy
    }

    const { data, error } = await supabase
      .from('resources')
      .insert(dbData)
      .select()
      .single()

    if (error) throw new Error(`Supabase error: ${error.message}`)

    return this.mapToDomain(data)
  }

  async findById(id: string): Promise<Resource | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return this.mapToDomain(data)
  }

  async findByCourse(courseId: string): Promise<Resource[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data.map(this.mapToDomain)
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)
    if (error) throw new Error(`Supabase error: ${error.message}`)
  }

  private mapToDomain(dbData: any): Resource {
    return {
      id: dbData.id,
      title: dbData.title,
      description: dbData.description,
      driveFileId: dbData.drive_file_id,
      driveUrl: dbData.drive_url,
      driveDownloadUrl: dbData.drive_download_url,
      mimeType: dbData.mime_type,
      fileSize: dbData.file_size,
      courseId: dbData.course_id,
      moduleId: dbData.module_id,
      uploadedBy: dbData.uploaded_by,
      createdAt: dbData.created_at
    }
  }
}
