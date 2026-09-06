'use client'

import React, { useState, useMemo } from 'react'
import {
  Search, HelpCircle, FileText, Send, LifeBuoy, BookOpen, Plus, FolderPlus
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ACADEMIC_SUBJECTS,
  INSTITUTIONAL_DOCS,
  INSTITUTION_INFO,
  type AcademicSubject,
  type InstitutionalDocumentItem,
  getMergedAcademicSubjects,
  getMergedInstitutionalSubjects
} from '../../domain/constants/knowledgeCatalog'
import { SubjectBentoCard } from '../components/SubjectBentoCard'
import { InstitutionalDocCard } from '../components/InstitutionalDocCard'
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal'
import { EditFolderModal } from '../components/EditFolderModal'
import { deleteFolder } from '../../application/documentActions'
import type { Document, DocFolder } from '../../domain/entities/Document'

interface CampusBasePortalScreenProps {
  onSelectSubject: (slug: string) => void
  onReadInstitutionalDoc: (docSlug: string) => void
  onDownloadInstitutionalDoc: (docSlug: string) => void
  onOpenSpotlight: () => void
  onFilterQuickTopic: (topic: string) => void
  dbDocuments?: Document[]
  dbFolders?: DocFolder[]
  userRole?: string
  onUploadDoc?: () => void
  onCreateFolder?: (targetSection?: 'academico' | 'institucional') => void
  currentUserId?: string | null
  onFolderDeleted?: (folderId: string) => void
  onFolderUpdated?: (updatedFolder: DocFolder) => void
  onRefreshData?: () => void
}

function isDocInSubject(
  docFolderId: string | null | undefined,
  subjectFolderId: string | undefined,
  allFolders: DocFolder[]
): boolean {
  if (!docFolderId || !subjectFolderId) return false
  if (docFolderId === subjectFolderId) return true

  let currentId: string | null = docFolderId
  const visited = new Set<string>()
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    if (currentId === subjectFolderId) return true
    const parent = allFolders.find(f => f.id === currentId)
    currentId = parent?.parentId || (parent as any)?.parent_id || null
  }
  return false
}

export function CampusBasePortalScreen({
  onSelectSubject,
  onReadInstitutionalDoc,
  onDownloadInstitutionalDoc,
  onOpenSpotlight,
  onFilterQuickTopic,
  dbDocuments = [],
  dbFolders = [],
  userRole,
  onUploadDoc,
  onCreateFolder,
  currentUserId,
  onFolderDeleted,
  onFolderUpdated,
  onRefreshData,
}: CampusBasePortalScreenProps) {
  const [activeFilterPill, setActiveFilterPill] = useState('all')
  const [deleteTargetFolder, setDeleteTargetFolder] = useState<AcademicSubject | null>(null)
  const [editTargetFolder, setEditTargetFolder] = useState<AcademicSubject | null>(null)

  const filterPills = [
    { id: 'all', label: 'Todas las áreas' },
    { id: 'secundaria', label: 'Básica y Media' },
    { id: 'pfc', label: 'Formación Docente (PFC)' },
    { id: 'normativa', label: 'Normativa Institucional' },
  ]

  // Fusionar las áreas fijas con las carpetas creadas dinámicamente en la BD
  const allSubjects = useMemo(() => {
    return getMergedAcademicSubjects(dbFolders)
  }, [dbFolders])

  // Fusionar las carpetas institucionales fijas con las de la BD
  const institutionalSubjects = useMemo(() => {
    return getMergedInstitutionalSubjects(dbFolders)
  }, [dbFolders])

  // Filter subjects based on pill
  const displayedSubjects = useMemo(() => {
    return allSubjects.filter(subj => {
      if (activeFilterPill === 'normativa') return false
      if (activeFilterPill === 'pfc') return subj.slug === 'pfc'
      if (activeFilterPill === 'secundaria') return subj.slug !== 'pfc'
      return true
    })
  }, [allSubjects, activeFilterPill])

  // Confirm delete folder handler (solo para el autor)
  const handleConfirmDeleteFolder = async () => {
    if (!deleteTargetFolder) return
    const folderIdToDelete = deleteTargetFolder.dbFolderId || deleteTargetFolder.id
    const { error } = await deleteFolder(folderIdToDelete)
    if (error) {
      toast.error('Error al eliminar carpeta', { description: error })
      return
    }
    toast.success(`Carpeta "${deleteTargetFolder.title}" eliminada exitosamente`)
    setDeleteTargetFolder(null)
    if (onFolderDeleted) onFolderDeleted(folderIdToDelete)
    if (onRefreshData) onRefreshData()
  }

  // Get real count of documents for each subject folder in DB
  const getSubjectDocCount = (subject: AcademicSubject) => {
    return dbDocuments.filter(doc => {
      if (subject.dbFolderId && isDocInSubject(doc.folderId, subject.dbFolderId, dbFolders)) {
        return true
      }
      const folderName = doc.folder?.name?.toLowerCase() || ''
      const titleLower = doc.title.toLowerCase()
      const slugLower = subject.slug.toLowerCase()
      return folderName.includes(slugLower) || titleLower.includes(slugLower)
    }).length
  }

  return (
    <div className="w-full flex flex-col gap-10 sm:gap-14">
      {/* ── HERO SPOTLIGHT SEARCH SECTION ── */}
      <section className="flex flex-col items-center text-center pt-2 sm:pt-4 pb-2">
        {/* Welcome Headlines (No cycle badge as requested) */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white max-w-3xl mb-2.5">
          Portal de Conocimiento Escolar
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mb-6 leading-relaxed">
          Consulta planes de aula, mallas curriculares, proyectos pedagógicos y documentos oficiales de la Escuela
          Normal Superior del Nordeste.
        </p>

        {/* Spotlight Search Bar */}
        <div className="w-full max-w-2xl relative group">
          <div
            onClick={onOpenSpotlight}
            className="relative flex items-center bg-white dark:bg-slate-900 rounded-full shadow-xs subtle-border hover:shadow-md hover:shadow-[#0071e3]/10 transition-all duration-200 p-1 cursor-pointer focus-within:ring-2 focus-within:ring-[#0071e3]"
          >
            <div className="pl-3.5 pr-2 text-slate-400 flex items-center justify-center">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-[#0071e3] transition-colors" />
            </div>

            <div className="w-full py-2 text-xs sm:text-sm text-slate-400 text-left select-none truncate pr-2">
              Buscar materias, documentos, proyectos, PEI o manual...
            </div>

            <div className="hidden sm:flex items-center gap-1 mr-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 select-none">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center justify-center flex-wrap gap-1.5 mt-3">
            {filterPills.map(pill => {
              const isActive = activeFilterPill === pill.id
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    setActiveFilterPill(pill.id)
                    if (pill.id === 'normativa') {
                      const el = document.getElementById('institucional')
                      if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-[0.97] cursor-pointer ${
                    isActive
                      ? 'bg-[#0071e3] text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {pill.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION: ACADEMIC KNOWLEDGE CATEGORIES GRID (UNIFORM DIMENSIONS, 30% SMALLER) ── */}
      <section className="flex flex-col gap-4" id="academico">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Áreas de Conocimiento
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
              {displayedSubjects.length} Áreas
            </span>
          </div>

          {(userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && onCreateFolder && (
            <button
              onClick={() => onCreateFolder('academico')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#005bb5] text-white text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Crear Carpeta</span>
            </button>
          )}
        </div>

        {/* Uniform 5-col Grid: All cards strictly identical size */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {displayedSubjects.map(subject => (
            <SubjectBentoCard
              key={subject.id}
              subject={subject}
              onClick={onSelectSubject}
              documentsCount={getSubjectDocCount(subject)}
              currentUserId={currentUserId}
              userRole={userRole}
              onEdit={(subj) => setEditTargetFolder(subj)}
              onDelete={(subj) => setDeleteTargetFolder(subj)}
            />
          ))}
        </div>
      </section>

      {/* ── SECTION: INSTITUTIONAL GOVERNANCE DOCUMENTS ── */}
      <section className="flex flex-col gap-4" id="institucional">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Documentos Institucionales
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                {institutionalSubjects.length} Carpetas
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Marco normativo, horizonte pedagógico y acuerdos de la Escuela Normal Superior del Nordeste.
            </p>
          </div>

          {(userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && onCreateFolder && (
            <button
              onClick={() => onCreateFolder('institucional')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#005bb5] text-white text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer self-start sm:self-auto shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Crear Carpeta</span>
            </button>
          )}
        </div>

        {/* Uniform Grid of Institutional Folders (same dynamic as Áreas de Conocimiento) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {institutionalSubjects.map(subject => (
            <SubjectBentoCard
              key={subject.id}
              subject={subject}
              onClick={onSelectSubject}
              documentsCount={getSubjectDocCount(subject)}
              currentUserId={currentUserId}
              userRole={userRole}
              onEdit={(subj) => setEditTargetFolder(subj)}
              onDelete={(subj) => setDeleteTargetFolder(subj)}
            />
          ))}
        </div>
      </section>

      {/* ── SECTION: PEDAGOGICAL ASSISTANCE STRIP ── */}
      <section
        className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 subtle-border flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-[#0071e3] shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              ¿Requieres un documento específico o acompañamiento?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Coordinación académica y biblioteca escolar atienden las solicitudes de la comunidad educativa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
          <a
            href="mailto:coordinacion@ensuny.edu.co?subject=Solicitud%20de%20Documento%20Académico"
            className="px-3.5 py-2 rounded-xl bg-[#0071e3] hover:bg-[#005bb5] text-white text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
          >
            Solicitar Material
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="w-full pt-6 pb-10 border-t border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {INSTITUTION_INFO.shortName}
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <span>© 2025 Todos los derechos reservados.</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium">
          <button
            onClick={() => onSelectSubject('pei')}
            className="hover:text-[#0071e3] dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            PEI
          </button>
          <button
            onClick={() => onSelectSubject('manual-convivencia')}
            className="hover:text-[#0071e3] dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            Manual de Convivencia
          </button>
          <button
            onClick={() => onSelectSubject('siee')}
            className="hover:text-[#0071e3] dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            SIEE
          </button>
          <button
            onClick={() => onSelectSubject('formatos')}
            className="hover:text-[#0071e3] dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            Formatos
          </button>
        </nav>
      </footer>

      {/* Confirm Delete Folder Modal for Author */}
      {deleteTargetFolder && (
        <ConfirmDeleteModal
          isOpen={!!deleteTargetFolder}
          onClose={() => setDeleteTargetFolder(null)}
          onConfirm={handleConfirmDeleteFolder}
          title="Eliminar Carpeta de Área"
          itemName={deleteTargetFolder.title}
          itemType="carpeta"
        />
      )}

      {/* Edit Folder Modal for Author */}
      {editTargetFolder && (
        <EditFolderModal
          isOpen={!!editTargetFolder}
          onClose={() => setEditTargetFolder(null)}
          folderId={editTargetFolder.dbFolderId || editTargetFolder.id}
          currentName={editTargetFolder.title}
          currentDescription={editTargetFolder.description}
          onUpdated={(updated) => {
            if (onFolderUpdated) onFolderUpdated(updated)
            if (onRefreshData) onRefreshData()
          }}
        />
      )}
    </div>
  )
}
