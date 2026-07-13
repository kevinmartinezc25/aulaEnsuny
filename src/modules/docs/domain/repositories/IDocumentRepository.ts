import type { Document, DocFolder, DocumentVersion, DocTag } from '../entities/Document'
import type { DocumentStatus } from '../value-objects/DocumentStatus'

// ─── Repository Interface ──────────────────────────────────────────────────────

export interface CreateDocumentInput {
  title: string
  content?: string
  folderId?: string | null
  status?: DocumentStatus
  createdBy: string
}

export interface UpdateDocumentInput {
  title?: string
  content?: string
  folderId?: string | null
  status?: DocumentStatus
  isPublic?: boolean
  coverImageUrl?: string | null
  lastEditedBy: string
}

export interface CreateFolderInput {
  name: string
  parentId?: string | null
  createdBy: string
}

export interface SearchDocumentsInput {
  query: string
  status?: DocumentStatus
  tagIds?: string[]
  folderId?: string | null
  limit?: number
}

export interface IDocumentRepository {
  // Documents
  findById(id: string): Promise<Document | null>
  findAll(options?: { status?: DocumentStatus; folderId?: string }): Promise<Document[]>
  create(input: CreateDocumentInput): Promise<Document>
  update(id: string, input: UpdateDocumentInput): Promise<Document>
  delete(id: string): Promise<void>
  search(input: SearchDocumentsInput): Promise<Document[]>

  // Folders
  findFolderById(id: string): Promise<DocFolder | null>
  findAllFolders(): Promise<DocFolder[]>
  createFolder(input: CreateFolderInput): Promise<DocFolder>
  updateFolder(id: string, name: string): Promise<DocFolder>
  deleteFolder(id: string): Promise<void>

  // Versions
  findVersions(documentId: string): Promise<DocumentVersion[]>
  restoreVersion(documentId: string, versionNum: number, restoredBy: string): Promise<Document>

  // Tags
  findAllTags(): Promise<DocTag[]>
  createTag(name: string, color?: string): Promise<DocTag>
  addTagToDocument(documentId: string, tagId: string): Promise<void>
  removeTagFromDocument(documentId: string, tagId: string): Promise<void>

  // Public access
  findByPublicToken(token: string): Promise<Document | null>
  generatePublicLink(documentId: string): Promise<string>
}
