import { IDriveService, IDriveUploadOptions, IDriveUploadResult } from '../../domain/interfaces/IDriveService'

export class MockGoogleDriveService implements IDriveService {
  async uploadFile(options: IDriveUploadOptions): Promise<IDriveUploadResult> {
    console.log(`[MockGoogleDrive] Creating folder path: aulaEnsuny/Cursos/${options.courseName}${options.moduleName ? `/${options.moduleName}` : ''}`)
    console.log(`[MockGoogleDrive] Uploading file: ${options.fileName} (${options.fileBuffer.byteLength} bytes)`)
    
    // Simulate network delay to feel like a real file upload
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Return fake Google Drive data
    return {
      fileId: `mock_drive_id_${Date.now()}`,
      // Use a sample public PDF URL so the iframe actually renders a PDF for testing
      webViewLink: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      webContentLink: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    console.log(`[MockGoogleDrive] Deleting file: ${fileId}`)
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}
