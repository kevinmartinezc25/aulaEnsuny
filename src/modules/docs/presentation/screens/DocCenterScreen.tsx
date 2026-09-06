'use client'

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/core/config/supabase/client'
import { logout } from '@/modules/auth/application/actions'

// Domain & Actions
import type { Document, DocFolder, DocTag } from '@/modules/docs/domain/entities/Document'
import { getAllFolders, getAllDocuments, getAllTags } from '@/modules/docs/application/documentActions'

// Catalog
import {
  ACADEMIC_SUBJECTS,
  INSTITUTIONAL_DOCS,
  type AcademicSubject,
  type InstitutionalDocumentItem,
  type VisualCardResource,
  SAMPLE_VISUAL_RESOURCES,
  INSTITUTION_INFO,
  getDriveDirectDownloadUrl,
  getMergedAcademicSubjects,
  getMergedInstitutionalSubjects
} from '../../domain/constants/knowledgeCatalog'

// Cupertino Components
import { CupertinoHeader } from '../components/CupertinoHeader'
import { SpotlightSearchModal } from '../components/SpotlightSearchModal'
import { DocumentReaderModal } from '../components/DocumentReaderModal'
import { CampusBasePortalScreen } from './CampusBasePortalScreen'
import { SubjectStudioScreen } from './SubjectStudioScreen'
import { CreateFolderModal } from '../components/CreateFolderModal'

interface DocCenterScreenProps {
  userRole: 'admin' | 'superadmin' | 'teacher' | 'student' | 'guest'
}

function DocCenterScreenInner({ userRole }: DocCenterScreenProps) {
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)

  // ─── Theme Synchronization ──────────────────────────────────────────────────
  useEffect(() => {
    const syncTheme = () => {
      const theme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (theme === 'dark' || (!theme && prefersDark)) {
        setIsDark(true)
        document.documentElement.classList.add('dark')
      } else {
        setIsDark(false)
        document.documentElement.classList.remove('dark')
      }
    }
    syncTheme()
    window.addEventListener('theme-changed', syncTheme)
    return () => window.removeEventListener('theme-changed', syncTheme)
  }, [])

  const toggleTheme = () => {
    const isDarkNow = document.documentElement.classList.toggle('dark')
    setIsDark(isDarkNow)
    localStorage.setItem('theme', isDarkNow ? 'dark' : 'light')
    window.dispatchEvent(new Event('theme-changed'))
  }

  // ─── User Profile State ─────────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<{
    firstName: string
    lastName: string
    roleLabel: string
    avatarUrl?: string | null
  }>({
    firstName: userRole === 'student' ? 'Valeria' : userRole === 'teacher' ? 'Prof. Carlos' : userRole === 'admin' ? 'Coordinador' : 'Invitado',
    lastName: userRole === 'student' ? 'Restrepo' : userRole === 'teacher' ? 'Mendoza' : 'Académico',
    roleLabel: userRole === 'student' ? 'Estudiante • Grado 11°' : userRole === 'teacher' ? 'Docente Titular' : userRole === 'admin' ? 'Administrador' : 'Visitante',
  })

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id)
        const meta = data.user.user_metadata || {}
        const fn = meta.first_name || meta.firstName || userProfile.firstName
        const ln = meta.last_name || meta.lastName || userProfile.lastName
        setUserProfile({
          firstName: fn,
          lastName: ln,
          roleLabel: userRole === 'student' ? 'Estudiante • Normalista' : userRole === 'teacher' ? 'Docente • ENSUNY' : 'Administrador',
          avatarUrl: meta.avatar_url || null,
        })
      }
    })
  }, [userRole])

  const handleLogout = async () => {
    try {
      const result = await logout()
      if (result?.success) {
        router.replace('/login')
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      router.replace('/login')
    }
  }

  // ─── Data State (Folders, Documents, Tags) ──────────────────────────────────
  const [folders, setFolders] = useState<DocFolder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [tags, setTags] = useState<DocTag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [foldersRes, docsRes, tagsRes] = await Promise.all([
      getAllFolders(),
      getAllDocuments(),
      getAllTags(),
    ])

    setFolders(foldersRes.data || [])
    setTags(tagsRes.data || [])

    // Guests and students only see published items
    const docs = docsRes.data || []
    const visibleDocs = userRole === 'student' || userRole === 'guest'
      ? docs.filter(d => d.status === 'published')
      : docs
    setDocuments(visibleDocs)
    setIsLoading(false)
  }, [userRole])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Navigation & View Flow State ───────────────────────────────────────────
  // Key requirement: User clicks visual card -> opens subpage with visual cards!
  const searchParams = useSearchParams()
  const areaFromUrl = searchParams.get('area')

  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState<string | null>(areaFromUrl)
  const [currentView, setCurrentView] = useState<'portal' | 'subject'>(areaFromUrl ? 'subject' : 'portal')

  // Sync state when URL query changes
  useEffect(() => {
    if (areaFromUrl) {
      setSelectedSubjectSlug(areaFromUrl)
      setCurrentView('subject')
    } else {
      setSelectedSubjectSlug(null)
      setCurrentView('portal')
    }
  }, [areaFromUrl])

  const [createFolderTarget, setCreateFolderTarget] = useState<'academico' | 'institucional'>('academico')

  const allSubjects = useMemo(() => {
    return [
      ...getMergedAcademicSubjects(folders),
      ...getMergedInstitutionalSubjects(folders)
    ]
  }, [folders])

  const selectedSubject = useMemo(() => {
    const slug = selectedSubjectSlug || areaFromUrl
    if (!slug) return null
    return allSubjects.find(s => s.slug === slug || s.id === slug || s.dbFolderId === slug) || null
  }, [selectedSubjectSlug, areaFromUrl, allSubjects])

  // Navigation handlers
  const handleSelectSubject = (slug: string) => {
    setSelectedSubjectSlug(slug)
    setCurrentView('subject')
    window.history.pushState({}, '', `?area=${slug}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBackToPortal = () => {
    setCurrentView('portal')
    setSelectedSubjectSlug(null)
    window.history.pushState({}, '', window.location.pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ─── Modals State ───────────────────────────────────────────────────────────
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false)
  const [activeReaderDoc, setActiveReaderDoc] = useState<{
    title: string
    subtitle?: string
    badgeText?: string
    contentSnippet?: string
    downloadUrl?: string
    driveFileId?: string
    authorOrResolution?: string
  } | null>(null)

  // Global Command+K Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSpotlightOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ─── Actions for Institutional Documents ────────────────────────────────────
  const handleReadInstitutionalDoc = (slug: string) => {
    const doc = INSTITUTIONAL_DOCS.find(d => d.slug === slug)
    if (!doc) return
    const matchingDoc = documents.find(d => d.id === doc.dbDocId || (doc.dbFolderId && d.folderId === doc.dbFolderId))
    const realUrl = matchingDoc?.driveUrl || doc.pdfUrl

    setActiveReaderDoc({
      title: doc.title,
      subtitle: doc.description,
      badgeText: doc.statusBadge,
      authorOrResolution: doc.versionResolution,
      contentSnippet: matchingDoc?.description || doc.description,
      downloadUrl: realUrl,
      driveFileId: matchingDoc?.driveFileId || undefined,
    })
  }

  const handleDownloadInstitutionalDoc = (slug: string) => {
    const doc = INSTITUTIONAL_DOCS.find(d => d.slug === slug)
    if (!doc) return
    const matchingDoc = documents.find(d => d.id === doc.dbDocId || (doc.dbFolderId && d.folderId === doc.dbFolderId))
    const directUrl = getDriveDirectDownloadUrl(matchingDoc?.driveFileId || matchingDoc?.driveUrl || doc.pdfUrl)

    if (directUrl) {
      toast.success(`Iniciando descarga: ${doc.title}`, {
        description: 'El archivo oficial se descargará directamente en tu equipo.',
      })
      window.open(directUrl, '_blank')
    } else {
      toast.info(`El documento "${doc.title}" aún no tiene un archivo digital adjunto en el repositorio.`)
    }
  }

  // ─── Actions for Visual Resources ───────────────────────────────────────────
  const handleReadVisualResource = (resource: VisualCardResource) => {
    setActiveReaderDoc({
      title: resource.title,
      subtitle: resource.description,
      badgeText: `${resource.category.toUpperCase()} • ${resource.gradeText}`,
      authorOrResolution: `${resource.authorName} (${resource.authorRole}) • ${resource.termText}`,
      contentSnippet: resource.description || `Documento pedagógico oficial de la ENSUNY.`,
      downloadUrl: resource.downloadUrl,
      driveFileId: resource.driveFileId,
    })
  }

  const handleDownloadVisualResource = (resource: VisualCardResource) => {
    const directUrl = getDriveDirectDownloadUrl(resource.driveFileId || resource.downloadUrl)
    if (directUrl) {
      toast.success(`Iniciando descarga: ${resource.title}`, {
        description: `Tamaño estimado: ${resource.fileSizeText} (${resource.fileType.toUpperCase()})`,
      })
      window.open(directUrl, '_blank')
    } else {
      toast.error('No se encontró enlace de descarga para este archivo')
    }
  }

  const [isCreateRootFolderOpen, setIsCreateRootFolderOpen] = useState(false)

  const handleUploadDoc = (folderId: string, folderName: string) => {
    const currentPath = window.location.pathname + window.location.search
    const query = new URLSearchParams({
      folderId,
      folderName,
      backUrl: currentPath
    }).toString()
    if (userRole === 'teacher') router.push(`/teacher/docs/upload?${query}`)
    else if (userRole === 'admin') router.push(`/admin/docs/upload?${query}`)
  }

  const handleFolderCreated = (newFolder: DocFolder) => {
    setFolders(prev => [...prev, newFolder])
    loadData()
  }

  return (
    <div className="min-h-screen w-full bg-[#faf8fe] dark:bg-[#12141a] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#0071e3]/20 selection:text-[#0059b5] transition-colors duration-200">
      {/* Cupertino Sticky Header */}
      <CupertinoHeader
        userRole={userRole}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        userName={`${userProfile.firstName} ${userProfile.lastName}`}
        userSubtext={userProfile.roleLabel}
        avatarUrl={userProfile.avatarUrl}
        currentView={currentView}
        onBackToPortal={handleBackToPortal}
        subjectTitle={selectedSubject?.title}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {currentView === 'portal' ? (
          <CampusBasePortalScreen
            onSelectSubject={handleSelectSubject}
            onReadInstitutionalDoc={handleReadInstitutionalDoc}
            onDownloadInstitutionalDoc={handleDownloadInstitutionalDoc}
            onOpenSpotlight={() => setIsSpotlightOpen(true)}
            onFilterQuickTopic={(topic) => {
              if (topic === 'solicitud') {
                window.location.href = 'mailto:coordinacion@ensuny.edu.co?subject=Solicitud%20de%20Material%20Pedagógico'
              }
            }}
            dbDocuments={documents}
            dbFolders={folders}
            userRole={userRole}
            currentUserId={currentUserId}
            onCreateFolder={(target) => {
              setCreateFolderTarget(target || 'academico')
              setIsCreateRootFolderOpen(true)
            }}
            onFolderDeleted={(deletedFolderId) => {
              setFolders(prev => prev.filter(f => f.id !== deletedFolderId))
              loadData()
            }}
            onFolderUpdated={(updated) => {
              setFolders(prev => prev.map(f => f.id === updated.id ? updated : f))
              loadData()
            }}
            onRefreshData={loadData}
          />
        ) : selectedSubject ? (
          <SubjectStudioScreen
            subject={selectedSubject}
            onBackToPortal={handleBackToPortal}
            onOpenReader={handleReadVisualResource}
            onDownloadResource={handleDownloadVisualResource}
            userRole={userRole}
            currentUserId={currentUserId}
            onUploadDoc={handleUploadDoc}
            onFolderCreated={handleFolderCreated}
            onFolderDeleted={(deletedFolderId) => {
              setFolders(prev => prev.filter(f => f.id !== deletedFolderId))
              loadData()
            }}
            onFolderUpdated={(updated) => {
              setFolders(prev => prev.map(f => f.id === updated.id ? updated : f))
              loadData()
            }}
            onDocDeleted={(deletedDocId) => {
              setDocuments(prev => prev.filter(d => d.id !== deletedDocId))
              loadData()
            }}
            onRefreshData={loadData}
            dbDocuments={documents}
            allFolders={folders}
          />
        ) : (
          <CampusBasePortalScreen
            onSelectSubject={handleSelectSubject}
            onReadInstitutionalDoc={handleReadInstitutionalDoc}
            onDownloadInstitutionalDoc={handleDownloadInstitutionalDoc}
            onOpenSpotlight={() => setIsSpotlightOpen(true)}
            onFilterQuickTopic={(topic) => {
              if (topic === 'solicitud') {
                window.location.href = 'mailto:coordinacion@ensuny.edu.co?subject=Solicitud%20de%20Material%20Pedagógico'
              }
            }}
            dbDocuments={documents}
            dbFolders={folders}
            userRole={userRole}
            currentUserId={currentUserId}
            onCreateFolder={(target) => {
              setCreateFolderTarget(target || 'academico')
              setIsCreateRootFolderOpen(true)
            }}
            onFolderDeleted={(deletedFolderId) => {
              setFolders(prev => prev.filter(f => f.id !== deletedFolderId))
              loadData()
            }}
            onFolderUpdated={(updated) => {
              setFolders(prev => prev.map(f => f.id === updated.id ? updated : f))
              loadData()
            }}
            onRefreshData={loadData}
          />
        )}
      </main>

      {/* ⌘K Spotlight Search Modal */}
      <SpotlightSearchModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        onSelectSubject={handleSelectSubject}
        onSelectDoc={handleReadInstitutionalDoc}
        onOpenResourceReader={handleReadVisualResource}
        dbDocuments={documents}
        allSubjects={allSubjects}
      />

      {/* "Leer en línea" Document Reader Modal */}
      {activeReaderDoc && (
        <DocumentReaderModal
          isOpen={!!activeReaderDoc}
          onClose={() => setActiveReaderDoc(null)}
          title={activeReaderDoc.title}
          subtitle={activeReaderDoc.subtitle}
          badgeText={activeReaderDoc.badgeText}
          contentSnippet={activeReaderDoc.contentSnippet}
          authorOrResolution={activeReaderDoc.authorOrResolution}
          downloadUrl={activeReaderDoc.downloadUrl}
          driveFileId={activeReaderDoc.driveFileId}
          onDownload={() => {
            const directUrl = getDriveDirectDownloadUrl(activeReaderDoc.driveFileId || activeReaderDoc.downloadUrl)
            if (directUrl) {
              toast.success(`Descargando: ${activeReaderDoc.title}`)
              window.open(directUrl, '_blank')
            } else {
              toast.error('No se encontró archivo para descargar')
            }
          }}
        />
      )}

      {/* Root Category Creation Modal */}
      <CreateFolderModal
        isOpen={isCreateRootFolderOpen}
        onClose={() => setIsCreateRootFolderOpen(false)}
        parentFolderId={createFolderTarget === 'institucional' ? '87c212dc-b724-49ec-a36b-e5b6eae82416' : '3359b9b6-f96c-466a-8d26-ca7522e6e5b4'}
        parentFolderName={createFolderTarget === 'institucional' ? 'Documentos Institucionales' : 'Áreas Académicas'}
        onCreated={handleFolderCreated}
      />
    </div>
  )
}

export function DocCenterScreen(props: DocCenterScreenProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#faf8fe] dark:bg-[#12141a] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#0071e3] border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <DocCenterScreenInner {...props} />
    </Suspense>
  )
}
