// ─── Document Status Value Object ─────────────────────────────────────────────
export const DocumentStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus]

export const DocumentStatusLabel: Record<DocumentStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
}

export const DocumentStatusColor: Record<DocumentStatus, string> = {
  draft: 'amber',
  published: 'emerald',
  archived: 'slate',
}
