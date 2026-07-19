'use server'

import { createClient as createServerClient, createAdminClient } from '@/core/config/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Document, DocFolder } from '../domain/entities/Document'
import type { DocumentStatus } from '../domain/value-objects/DocumentStatus'
import { GoogleDriveGasService } from '@/modules/resources/infrastructure/drive/GoogleDriveGasService'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mapDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: (row.slug as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    driveFileId: (row.drive_file_id as string | null) ?? null,
    driveUrl: (row.drive_url as string | null) ?? null,
    mimeType: (row.mime_type as string | null) ?? null,
    fileSize: (row.file_size as number | null) ?? null,
    versionLabel: (row.version_label as string) ?? '1.0',
    isStarred: (row.is_starred as boolean) ?? false,
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
    color: (row.color as string | null) ?? null,
    createdBy: row.created_by as string,
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ─── Get All Folders ──────────────────────────────────────────────────────────
export async function getAllFolders(): Promise<{ data: DocFolder[]; error: string | null }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('doc_folders')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('[getAllFolders] Supabase error:', error)
      return { data: [], error: `Error al cargar carpetas: ${error.message}` }
    }
    return { data: (data ?? []).map(mapFolder), error: null }
  } catch (e: any) {
    console.error('[getAllFolders] Exception:', e)
    return { data: [], error: `Error al cargar carpetas: ${e?.message ?? String(e)}` }
  }
}

// ─── Log Activity Internals ──────────────────────────────────────────────────
async function logDocActivityInternal(
  supabase: any,
  userId: string,
  actionType: string,
  description: string
) {
  try {
    await supabase.from('doc_activity_logs').insert({
      user_id: userId,
      action_type: actionType,
      description: description
    })
  } catch (e) {
    console.error('Error al registrar actividad:', e)
  }
}

// ─── Get Recent Activity ──────────────────────────────────────────────────────
export async function getRecentActivity(): Promise<{ data: any[]; error: string | null }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('doc_activity_logs')
      .select(`
        *,
        profiles(first_name, last_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(4)

    if (error) {
      console.error('[getRecentActivity] Supabase error:', error)
      return { data: [], error: null }
    }
    return { data: data ?? [], error: null }
  } catch (e: any) {
    console.error('[getRecentActivity] Exception:', e)
    return { data: [], error: null }
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

    // Registrar actividad
    const profile = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single()
    const userName = profile.data ? `${profile.data.first_name} ${profile.data.last_name}` : 'Usuario'
    await logDocActivityInternal(supabase, user.id, 'create_folder', `${userName} creó la categoría "${name.trim()}"`)

    revalidatePath('/admin/docs')
    revalidatePath('/teacher/docs')
    revalidatePath('/student/docs')
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'No autenticado' }

    const { data: oldFolder } = await supabase.from('doc_folders').select('name').eq('id', id).single()

    const { data, error } = await supabase
      .from('doc_folders')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error: error.message }

    // Registrar actividad
    const profile = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single()
    const userName = profile.data ? `${profile.data.first_name} ${profile.data.last_name}` : 'Usuario'
    await logDocActivityInternal(
      supabase,
      user.id,
      'update_folder',
      `${userName} renombró la categoría "${oldFolder?.name || 'Categoría'}" a "${name.trim()}"`
    )

    revalidatePath('/admin/docs')
    revalidatePath('/teacher/docs')
    revalidatePath('/student/docs')
    return { data: mapFolder(data), error: null }
  } catch (e) {
    return { data: null, error: 'Error al actualizar carpeta' }
  }
}

// ─── Update Folder Color ──────────────────────────────────────────────────────
export async function updateFolderColor(
  id: string,
  color: string | null
): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { error } = await supabase
      .from('doc_folders')
      .update({ color, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/admin/docs')
    revalidatePath('/teacher/docs')
    revalidatePath('/student/docs')
    revalidatePath('/docs')
    return { error: null }
  } catch (e) {
    return { error: 'Error al actualizar color de carpeta' }
  }
}

// ─── Delete Folder ────────────────────────────────────────────────────────────
export async function deleteFolder(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: folder } = await supabase.from('doc_folders').select('name').eq('id', id).single()

    const { error } = await supabase.from('doc_folders').delete().eq('id', id)
    if (error) return { error: error.message }

    // Registrar actividad
    const profile = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single()
    const userName = profile.data ? `${profile.data.first_name} ${profile.data.last_name}` : 'Usuario'
    await logDocActivityInternal(supabase, user.id, 'delete_folder', `${userName} eliminó la categoría "${folder?.name || 'Categoría'}"`)

    revalidatePath('/admin/docs')
    revalidatePath('/teacher/docs')
    revalidatePath('/student/docs')
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
    const supabase = createAdminClient()
    let query = supabase
      .from('documents')
      .select(`
        *,
        document_tag_relations(doc_tags(*)),
        doc_folders(*),
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
    if (error) {
      console.error('[getAllDocuments] Supabase error:', error)
      return { data: [], error: error.message }
    }
    return { data: (data ?? []).map(mapDocument), error: null }
  } catch (e: any) {
    console.error('[getAllDocuments] Exception:', e)
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
  description?: string | null
  folderId?: string | null
  status?: DocumentStatus
  base64File?: string | null
  fileName?: string | null
  mimeType?: string | null
  fileSize?: number | null
}): Promise<{ data: Document | null; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'No autenticado' }

    let driveFileId = null
    let driveUrl = null

    if (input.base64File && input.fileName && input.mimeType) {
      let categoryName = 'General'
      if (input.folderId) {
        const { data: folder } = await supabase
          .from('doc_folders')
          .select('name')
          .eq('id', input.folderId)
          .single()
        if (folder) categoryName = folder.name
      }

      const buffer = Buffer.from(input.base64File, 'base64')
      const fileBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
      const driveService = new GoogleDriveGasService()
      
      const uploadResult = await driveService.uploadFile({
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileBuffer: fileBuffer,
        courseName: 'Centro de Documentación',
        moduleName: categoryName
      })

      driveFileId = uploadResult.fileId
      driveUrl = uploadResult.webViewLink
    }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        folder_id: input.folderId ?? null,
        status: input.status ?? 'draft',
        drive_file_id: driveFileId,
        drive_url: driveUrl,
        mime_type: input.mimeType ?? null,
        file_size: input.fileSize ?? null,
        version_label: '1.0',
        created_by: user.id,
        last_edited_by: user.id,
        content: '',
      })
      .select(`
        *,
        document_tag_relations(doc_tags(*)),
        profiles!documents_created_by_fkey(first_name, last_name, avatar_url)
      `)
      .single()

    if (error) return { data: null, error: error.message }

    // Registrar actividad
    const profile = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single()
    const userName = profile.data ? `${profile.data.first_name} ${profile.data.last_name}` : 'Usuario'
    await logDocActivityInternal(supabase, user.id, 'create', `${userName} agregó el documento "${input.title}"`)

    revalidatePath('/admin/docs')
    revalidatePath('/teacher/docs')
    revalidatePath('/student/docs')
    return { data: mapDocument(data), error: null }
  } catch (e: any) {
    console.error('Error in createDocument:', e)
    return { data: null, error: e.message || 'Error al crear documento' }
  }
}

// ─── Update Document ──────────────────────────────────────────────────────────
export async function updateDocument(
  id: string,
  input: {
    title?: string
    description?: string | null
    folderId?: string | null
    status?: DocumentStatus
    isPublic?: boolean
    base64File?: string | null
    fileName?: string | null
    mimeType?: string | null
    fileSize?: number | null
    isStarred?: boolean
  }
): Promise<{ data: Document | null; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'No autenticado' }

    const { data: oldDoc, error: getErr } = await supabase
      .from('documents')
      .select('drive_file_id, version_label, title, folder_id')
      .eq('id', id)
      .single()

    if (getErr || !oldDoc) return { data: null, error: 'Documento no encontrado' }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_edited_by: user.id,
    }
    if (input.title !== undefined) updatePayload.title = input.title.trim()
    if (input.description !== undefined) updatePayload.description = input.description?.trim() ?? null
    if (input.folderId !== undefined) updatePayload.folder_id = input.folderId
    if (input.status !== undefined) updatePayload.status = input.status
    if (input.isPublic !== undefined) updatePayload.is_public = input.isPublic
    if (input.isStarred !== undefined) updatePayload.is_starred = input.isStarred

    let newDriveFileId = oldDoc.drive_file_id
    let newDriveUrl = null
    let newVersionLabel = oldDoc.version_label || '1.0'

    if (input.base64File && input.fileName && input.mimeType) {
      let categoryName = 'General'
      const targetFolderId = input.folderId !== undefined ? input.folderId : oldDoc.folder_id
      if (targetFolderId) {
        const { data: folder } = await supabase
          .from('doc_folders')
          .select('name')
          .eq('id', targetFolderId)
          .single()
        if (folder) categoryName = folder.name
      }

      const buffer = Buffer.from(input.base64File, 'base64')
      const fileBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
      const driveService = new GoogleDriveGasService()

      const uploadResult = await driveService.uploadFile({
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileBuffer: fileBuffer,
        courseName: 'Centro de Documentación',
        moduleName: categoryName
      })

      newDriveFileId = uploadResult.fileId
      newDriveUrl = uploadResult.webViewLink

      if (oldDoc.drive_file_id) {
        try {
          await driveService.deleteFile(oldDoc.drive_file_id)
        } catch (driveErr) {
          console.error('Error al eliminar archivo de Drive:', driveErr)
        }
      }

      try {
        const prevVer = parseFloat(oldDoc.version_label || '1.0')
        newVersionLabel = (isNaN(prevVer) ? 1.0 : prevVer + 0.1).toFixed(1)
      } catch {
        newVersionLabel = '1.1'
      }

      updatePayload.drive_file_id = newDriveFileId
      updatePayload.drive_url = newDriveUrl
      updatePayload.mime_type = input.mimeType
      updatePayload.file_size = input.fileSize
      updatePayload.version_label = newVersionLabel
    }

    const { data, error } = await supabase
      .from('documents')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        *,
        document_tag_relations(doc_tags(*)),
        profiles!documents_created_by_fkey(first_name, last_name, avatar_url)
      `)
      .single()

    if (error) return { data: null, error: error.message }

    // Registrar actividad
    const profile = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single()
    const userName = profile.data ? `${profile.data.first_name} ${profile.data.last_name}` : 'Usuario'
    
    let actionDesc = `${userName} actualizó el documento "${data.title}"`
    if (input.base64File) {
      actionDesc = `${userName} actualizó el archivo de "${data.title}" a la versión ${newVersionLabel}`
    } else if (input.isStarred !== undefined) {
      actionDesc = input.isStarred
        ? `${userName} marcó como favorito el documento "${data.title}"`
        : `${userName} quitó de favoritos el documento "${data.title}"`
    }
    await logDocActivityInternal(supabase, user.id, 'update', actionDesc)

    revalidatePath('/admin/docs')
    revalidatePath(`/admin/docs/${id}`)
    revalidatePath('/teacher/docs')
    revalidatePath('/student/docs')
    return { data: mapDocument(data), error: null }
  } catch (e: any) {
    return { data: null, error: e.message || 'Error al actualizar documento' }
  }
}

// ─── Delete Document ──────────────────────────────────────────────────────────
export async function deleteDocument(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: doc, error: getErr } = await supabase
      .from('documents')
      .select('title, drive_file_id')
      .eq('id', id)
      .single()

    if (getErr || !doc) return { error: 'Documento no encontrado' }

    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) return { error: error.message }

    if (doc.drive_file_id) {
      try {
        const driveService = new GoogleDriveGasService()
        await driveService.deleteFile(doc.drive_file_id)
      } catch (driveErr) {
        console.error('Error al eliminar de Drive:', driveErr)
      }
    }

    // Registrar actividad
    const profile = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single()
    const userName = profile.data ? `${profile.data.first_name} ${profile.data.last_name}` : 'Usuario'
    await logDocActivityInternal(supabase, user.id, 'delete', `${userName} eliminó el documento "${doc.title}"`)

    revalidatePath('/admin/docs')
    revalidatePath('/teacher/docs')
    revalidatePath('/student/docs')
    return { error: null }
  } catch (e) {
    return { error: 'Error al eliminar documento' }
  }
}

// ─── Toggle Star Document ──────────────────────────────────────────────────────
export async function toggleStarDocument(
  id: string,
  isStarred: boolean
): Promise<{ data: Document | null; error: string | null }> {
  return updateDocument(id, { isStarred })
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
      .select(`*, document_tag_relations(doc_tags(*)), doc_folders(*)`)
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
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('doc_tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('[getAllTags] Supabase error:', error)
      return { data: [], error: error.message }
    }
    return { data: data ?? [], error: null }
  } catch (e: any) {
    console.error('[getAllTags] Exception:', e)
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

// ─── Reorder Folder ───────────────────────────────────────────────────────────
export async function reorderFolder(
  folderId: string,
  direction: 'up' | 'down'
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    // 1. Get the details of the folder we want to move
    const { data: folder, error: getErr } = await supabase
      .from('doc_folders')
      .select('parent_id, sort_order')
      .eq('id', folderId)
      .single()

    if (getErr || !folder) return { success: false, error: 'Carpeta no encontrada' }

    const parentId = folder.parent_id
    const currentOrder = folder.sort_order ?? 0

    // 2. Get all sibling folders at the same level, ordered by sort_order
    let query = supabase
      .from('doc_folders')
      .select('id, sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (parentId === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', parentId)
    }

    const { data: siblings, error: sibErr } = await query
    if (sibErr || !siblings) return { success: false, error: 'Error al obtener carpetas hermanas' }

    // 3. Find the position index of our target folder
    const targetIdx = siblings.findIndex(s => s.id === folderId)
    if (targetIdx === -1) return { success: false, error: 'Carpeta no encontrada en la jerarquía' }

    // 4. Identify the folder to swap with
    let swapIdx = -1
    if (direction === 'up') {
      swapIdx = targetIdx - 1
    } else if (direction === 'down') {
      swapIdx = targetIdx + 1
    }

    if (swapIdx < 0 || swapIdx >= siblings.length) {
      // Nothing to swap with (already first or last)
      return { success: true, error: null }
    }

    const swapFolder = siblings[swapIdx]
    const newOrderForTarget = swapFolder.sort_order ?? 0
    const newOrderForSwap = currentOrder

    // Swap the sort_orders! If they are equal, assign different ones.
    const finalTargetOrder = newOrderForTarget === newOrderForSwap
      ? newOrderForTarget + (direction === 'up' ? -1 : 1)
      : newOrderForTarget

    // 5. Update both folders
    const [targetUpdate, swapUpdate] = await Promise.all([
      supabase.from('doc_folders').update({ sort_order: finalTargetOrder }).eq('id', folderId),
      supabase.from('doc_folders').update({ sort_order: newOrderForSwap }).eq('id', swapFolder.id)
    ])

    if (targetUpdate.error) return { success: false, error: targetUpdate.error.message }
    if (swapUpdate.error) return { success: false, error: swapUpdate.error.message }

    revalidatePath('/admin/docs')
    revalidatePath('/teacher/docs')
    revalidatePath('/student/docs')
    revalidatePath('/docs')

    return { success: true, error: null }
  } catch (e) {
    return { success: false, error: 'Error al reordenar la carpeta' }
  }
}

