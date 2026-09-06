'use client'

import {
  Terminal, Leaf, Calculator, FlaskConical, HeartHandshake, Globe, Activity,
  ChevronRight, FileText, BookOpen, Languages, Palette, GraduationCap, Trash2, Pencil,
  ShieldCheck, ScrollText, ClipboardList
} from 'lucide-react'
import type { AcademicSubject } from '../../domain/constants/knowledgeCatalog'

interface SubjectBentoCardProps {
  subject: AcademicSubject
  onClick: (slug: string) => void
  documentsCount?: number
  currentUserId?: string | null
  userRole?: string
  onEdit?: (subject: AcademicSubject) => void
  onDelete?: (subject: AcademicSubject) => void
}

export function SubjectBentoCard({
  subject,
  onClick,
  documentsCount = 0,
  currentUserId,
  userRole,
  onEdit,
  onDelete,
}: SubjectBentoCardProps) {
  const isPrivileged = userRole === 'admin' || userRole === 'superadmin'
  const isAuthor = !!(currentUserId && subject.createdBy && currentUserId === subject.createdBy)
  const canManage = isPrivileged || isAuthor
  const getSubjectIcon = () => {
    switch (subject.iconName) {
      case 'terminal':
        return <Terminal className="w-4 h-4 text-[#0071e3]" />
      case 'psychiatry':
        return <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      case 'square_foot':
        return <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      case 'science':
        return <FlaskConical className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
      case 'volunteer_activism':
        return <HeartHandshake className="w-4 h-4 text-slate-600 dark:text-slate-400" />
      case 'public':
        return <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case 'sports_volleyball':
        return <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      case 'book_open':
      case 'menu_book':
        return <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      case 'languages':
        return <Languages className="w-4 h-4 text-sky-600 dark:text-sky-400" />
      case 'palette':
        return <Palette className="w-4 h-4 text-pink-600 dark:text-pink-400" />
      case 'graduation_cap':
        return <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
      case 'gavel':
        return <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
      case 'grading':
        return <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      case 'file_text':
        return <ScrollText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      default:
        return <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
    }
  }

  return (
    <div
      onClick={() => onClick(subject.slug)}
      className={`rounded-xl p-3.5 border ${subject.subtleBgLight} ${subject.subtleBorderLight} subtle-card-hover flex flex-col justify-between cursor-pointer h-full min-h-[165px] transition-all group select-none`}
    >
      <div>
        {/* Top Header with Icon & Category Badge */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-2xs flex items-center justify-center border border-black/5 dark:border-white/5">
            {getSubjectIcon()}
          </div>

          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5">
            {subject.categoryBadge}
          </span>
        </div>

        {/* Title & Description - 30% more compact */}
        <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-[#0071e3] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {subject.title}
        </h3>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
          {subject.description}
        </p>
      </div>

      {/* Footer Strip with Real Count and Arrow */}
      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between mt-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <FileText className="w-3 h-3 text-slate-400" />
          <span>{documentsCount} {documentsCount === 1 ? 'documento' : 'documentos'}</span>
        </span>

        <div className="flex items-center gap-1">
          {canManage && onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(subject)
              }}
              title="Editar carpeta"
              className="p-1 rounded-full text-slate-400 hover:text-[#0071e3] hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {canManage && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(subject)
              }}
              title="Eliminar carpeta"
              className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-6 h-6 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:bg-[#0071e3] group-hover:text-white transition-all shadow-2xs">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  )
}
