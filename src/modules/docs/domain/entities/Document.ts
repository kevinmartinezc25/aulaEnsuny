import type { DocumentStatus } from '../value-objects/DocumentStatus'

// ─── Document Entity ──────────────────────────────────────────────────────────
export interface Document {
  id: string
  title: string
  slug: string | null
  description: string | null
  driveFileId: string | null
  driveUrl: string | null
  mimeType: string | null
  fileSize: number | null
  versionLabel: string
  isStarred: boolean
  content: string
  contentHtml: string | null
  folderId: string | null
  status: DocumentStatus
  isPublic: boolean
  publicToken: string | null
  createdBy: string
  lastEditedBy: string | null
  coverImageUrl: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  // Relations (populated optionally)
  tags?: DocTag[]
  folder?: DocFolder | null
  createdByProfile?: { firstName: string; lastName: string; avatarUrl?: string | null }
}

export interface DocTag {
  id: string
  name: string
  color: string
}

export interface DocFolder {
  id: string
  name: string
  parentId: string | null
  color: string | null
  createdBy: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  // UI helpers
  children?: DocFolder[]
  documents?: Document[]
  isExpanded?: boolean
}

export interface DocumentVersion {
  id: string
  documentId: string
  versionNum: number
  title: string
  content: string
  savedBy: string
  changeNote: string | null
  createdAt: string
  savedByProfile?: { firstName: string; lastName: string }
}

export interface CourseDocumentRef {
  id: string
  courseId: string
  documentId: string
  addedBy: string
  createdAt: string
}
