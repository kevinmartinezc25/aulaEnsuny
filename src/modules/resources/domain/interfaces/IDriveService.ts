export interface IDriveUploadOptions {
  fileName: string
  mimeType: string
  fileBuffer: ArrayBuffer
  courseName?: string
  moduleName?: string
  targetFolderId?: string
  context?: 'courses' | 'docs'
}

export interface IDriveUploadResult {
  fileId: string
  webViewLink: string
  webContentLink?: string
}

export interface IDriveFolderResult {
  folderId: string
  folderUrl: string
}

export interface IDriveService {
  uploadFile(options: IDriveUploadOptions): Promise<IDriveUploadResult>
  deleteFile(fileId: string): Promise<void>
  createFolder(folderName: string, parentFolderId?: string, context?: 'courses' | 'docs'): Promise<IDriveFolderResult>
  renameFolder(folderId: string, newName: string): Promise<void>
  deleteFolder(folderId: string): Promise<void>
  moveFile(fileId: string, targetFolderId: string): Promise<void>
}

