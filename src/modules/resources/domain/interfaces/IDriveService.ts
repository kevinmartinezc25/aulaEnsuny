export interface IDriveUploadOptions {
  fileName: string
  mimeType: string
  fileBuffer: ArrayBuffer
  courseName: string
  moduleName?: string
}

export interface IDriveUploadResult {
  fileId: string
  webViewLink: string
  webContentLink?: string
}

export interface IDriveService {
  uploadFile(options: IDriveUploadOptions): Promise<IDriveUploadResult>
  deleteFile(fileId: string): Promise<void>
}
