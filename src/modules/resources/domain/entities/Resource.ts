export interface Resource {
  id?: string
  title: string
  description?: string
  driveFileId: string
  driveUrl: string
  driveDownloadUrl?: string
  mimeType: string
  fileSize: number
  courseId: string
  moduleId?: string
  uploadedBy: string
  createdAt?: string
}
