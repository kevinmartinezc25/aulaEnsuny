'use server'

import { createClient as createServerClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Document, DocFolder } from '../domain/entities/Document'
import type { DocumentStatus } from '../domain/value-objects/DocumentStatus'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mapDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: (row.slug as string | null) ?? null,
    content: (row.content as string) ?? '',
    contentHtml: (row.content_html as string | null) ?? null,
    folderId: (row.folder_id as string | null) ?? null,
    status: row.status as DocumentStatus,
    isPublic: (row.is_public as boolean) ?? false,
    publicToken: (row.public_token as string | null) ?? null,
    createdBy: row.created_by as string,
    lastEditedBy: (row.last_edited_by as string | null) ?? null,
    coverImageUrl: (row.cover_image_url as string | null) ?? null,
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    tags: (row.document_tag_relations as any[])
      ?.map((r: any) => r.doc_tags)
      .filter(Boolean) ?? [],
    folder: row.doc_folders as DocFolder | null ?? null,
    createdByProfile: row.profiles as any ?? undefined,
  }
}

function mapFolder(row: Record<string, unknown>): DocFolder {
  return {
    id: row.id as string,
    name: row.name as string,
    parentId: (row.parent_id as string | null) ?? null,
    createdBy: row.created_by as string,
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ─── Get All Folders ──────────────────────────────────────────────────────────
export async function getAllFolders(): Promise<{ data: DocFolder[]; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('doc_folders')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) return { data: [], error: error.message }
    return { data: (data ?? []).map(mapFolder), error: null }
  } catch (e) {
    return { data: [], error: 'Error al cargar carpetas' }
  }
}

// ─── Create Folder ────────────────────────────────────────────────────────────
export async function createFolder(
  name: string,
  parentId: string | null = null
): Promise<{ data: DocFolder | null; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'No autenticado' }

    const { data, error } = await supabase
      .from('doc_folders')
      .insert({ name: name.trim(), parent_id: parentId, created_by: user.id })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    revalidatePath('/admin/docs')
    revalidatePath('/teacher/docs')
    return { data: mapFolder(data), error: null }
  } catch (e) {
    return { data: null, error: 'Error al crear carpeta' }
  }
}

// ─── Update Folder ────────────────────────────────────────────────────────────
export async function updateFolder(
  id: string,
  name: string
): Promise<{ data: DocFolder | null; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('doc_folders')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    revalidatePath('/admin/docs')
    return { data: mapFolder(data), error: null }
  } catch (e) {
    return { data: null, error: 'Error al actualizar carpeta' }
  }
}

// ─── Delete Folder ────────────────────────────────────────────────────────────
export async function deleteFolder(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.from('doc_folders').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/docs')
    return { error: null }
  } catch (e) {
    return { error: 'Error al eliminar carpeta' }
  }
}

// ─── Get All Documents ────────────────────────────────────────────────────────
export async function getAllDocuments(options?: {
  status?: DocumentStatus
  folderId?: string | null
}): Promise<{ data: Document[]; error: string | null }> {
  try {
    const supabase = await createServerClient()
    let query = supabase
      .from('documents')
      .select(`
        *,
        document_tag_relations(doc_tags(*)),
        profiles!documents_created_by_fkey(first_name, last_name, avatar_url)
      `)
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })

    if (options?.status) query = query.eq('status', options.status)
    if (options?.folderId !== undefined) {
      if (options.folderId === null) query = query.is('folder_id', null)
      else query = query.eq('folder_id', options.folderId)
    }

    const { data, error } = await query
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []).map(mapDocument), error: null }
  } catch (e) {
    return { data: [], error: 'Error al cargar documentos' }
  }
}

// ─── Get Document By ID ───────────────────────────────────────────────────────
export async function getDocumentById(
  id: string
): Promise<{ data: Document | null; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        document_tag_relations(doc_tags(*)),
        doc_folders(*),
        profiles!documents_created_by_fkey(first_name, last_name, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error) return { data: null, error: error.message }
    return { data: mapDocument(data), error: null }
  } catch (e) {
    return { data: null, error: 'Documento no encontrado' }
  }
}

// ─── Create Document ──────────────────────────────────────────────────────────
export async function createDocument(input: {
  title: string
  folderId?: string | null
  status?: DocumentStatus
}): Promise<{ data: Document | null; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'No autenticado' }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: input.title.trim(),
        content: '',
        folder_id: input.folderId ?? null,
        status: input.status ?? 'draft',
        created_by: user.id,
        last_edited_by: user.id,
      })
      .select(`*, document_tag_relations(doc_tags(*))`)
      .single()

    if (error) return { data: null, error: error.message }
    revalidatePath('/admin/docs')
    revalidatePath('/teacher/docs')
    return { data: mapDocument(data), error: null }
  } catch (e) {
    return { data: null, error: 'Error al crear documento' }
  }
}

// ─── Update Document ──────────────────────────────────────────────────────────
export async function updateDocument(
  id: string,
  input: {
    title?: string
    content?: string
    folderId?: string | null
    status?: DocumentStatus
    isPublic?: boolean
  }
): Promise<{ data: Document | null; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'No autenticado' }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_edited_by: user.id,
    }
    if (input.title !== undefined) updatePayload.title = input.title.trim()
    if (input.content !== undefined) updatePayload.content = input.content
    if (input.folderId !== undefined) updatePayload.folder_id = input.folderId
    if (input.status !== undefined) updatePayload.status = input.status
    if (input.isPublic !== undefined) updatePayload.is_public = input.isPublic

    const { data, error } = await supabase
      .from('documents')
      .update(updatePayload)
      .eq('id', id)
      .select(`*, document_tag_relations(doc_tags(*))`)
      .single()

    if (error) return { data: null, error: error.message }
    revalidatePath('/admin/docs')
    revalidatePath(`/admin/docs/${id}`)
    revalidatePath('/teacher/docs')
    return { data: mapDocument(data), error: null }
  } catch (e) {
    return { data: null, error: 'Error al actualizar documento' }
  }
}

// ─── Delete Document ──────────────────────────────────────────────────────────
export async function deleteDocument(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/docs')
    revalidatePath('/teacher/docs')
    return { error: null }
  } catch (e) {
    return { error: 'Error al eliminar documento' }
  }
}

// ─── Search Documents ─────────────────────────────────────────────────────────
export async function searchDocuments(
  query: string,
  options?: { status?: DocumentStatus; limit?: number }
): Promise<{ data: Document[]; error: string | null }> {
  try {
    const supabase = await createServerClient()
    let q = supabase
      .from('documents')
      .select(`*, document_tag_relations(doc_tags(*))`)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(options?.limit ?? 20)

    if (options?.status) q = q.eq('status', options.status)

    const { data, error } = await q
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []).map(mapDocument), error: null }
  } catch (e) {
    return { data: [], error: 'Error en búsqueda' }
  }
}

// ─── Get Document Versions ────────────────────────────────────────────────────
export async function getDocumentVersions(
  documentId: string
): Promise<{ data: any[]; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('document_versions')
      .select(`*, profiles!document_versions_saved_by_fkey(first_name, last_name)`)
      .eq('document_id', documentId)
      .order('version_num', { ascending: false })

    if (error) return { data: [], error: error.message }
    return { data: data ?? [], error: null }
  } catch (e) {
    return { data: [], error: 'Error al cargar versiones' }
  }
}

// ─── Restore Document Version ─────────────────────────────────────────────────
export async function restoreDocumentVersion(
  documentId: string,
  versionId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    // Get version content
    const { data: version, error: vErr } = await supabase
      .from('document_versions')
      .select('title, content')
      .eq('id', versionId)
      .single()

    if (vErr || !version) return { error: 'Versión no encontrada' }

    // Restore to document
    const { error } = await supabase
      .from('documents')
      .update({
        title: version.title,
        content: version.content,
        last_edited_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (error) return { error: error.message }
    revalidatePath(`/admin/docs/${documentId}`)
    return { error: null }
  } catch (e) {
    return { error: 'Error al restaurar versión' }
  }
}

// ─── Get All Tags ─────────────────────────────────────────────────────────────
export async function getAllTags(): Promise<{ data: any[]; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('doc_tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) return { data: [], error: error.message }
    return { data: data ?? [], error: null }
  } catch (e) {
    return { data: [], error: 'Error al cargar etiquetas' }
  }
}

// ─── Create Tag ───────────────────────────────────────────────────────────────
export async function createTag(
  name: string,
  color: string = '#6366f1'
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('doc_tags')
      .insert({ name: name.trim(), color })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (e) {
    return { data: null, error: 'Error al crear etiqueta' }
  }
}

// ─── Toggle Tag on Document ───────────────────────────────────────────────────
export async function toggleDocumentTag(
  documentId: string,
  tagId: string,
  add: boolean
): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerClient()
    if (add) {
      const { error } = await supabase
        .from('document_tag_relations')
        .insert({ document_id: documentId, tag_id: tagId })
      if (error && !error.message.includes('duplicate')) return { error: error.message }
    } else {
      const { error } = await supabase
        .from('document_tag_relations')
        .delete()
        .eq('document_id', documentId)
        .eq('tag_id', tagId)
      if (error) return { error: error.message }
    }
    revalidatePath(`/admin/docs/${documentId}`)
    return { error: null }
  } catch (e) {
    return { error: 'Error al actualizar etiquetas' }
  }
}

// ─── Generate Public Link ─────────────────────────────────────────────────────
export async function generatePublicLink(
  documentId: string
): Promise<{ token: string | null; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const token = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase
      .from('documents')
      .update({ public_token: token, is_public: true })
      .eq('id', documentId)

    if (error) return { token: null, error: error.message }
    revalidatePath(`/admin/docs/${documentId}`)
    return { token, error: null }
  } catch (e) {
    return { token: null, error: 'Error al generar enlace público' }
  }
}

// ─── Revoke Public Link ───────────────────────────────────────────────────────
export async function revokePublicLink(documentId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('documents')
      .update({ public_token: null, is_public: false })
      .eq('id', documentId)

    if (error) return { error: error.message }
    revalidatePath(`/admin/docs/${documentId}`)
    return { error: null }
  } catch (e) {
    return { error: 'Error al revocar enlace' }
  }
}
