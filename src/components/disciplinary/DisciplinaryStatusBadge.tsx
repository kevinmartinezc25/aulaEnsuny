import React from 'react'
import { ReportStatus } from '@/modules/disciplinary/application/actions'
import { FileText, Eye, AlertCircle, CheckCircle2, Archive, LucideIcon } from 'lucide-react'

interface Props {
  status: ReportStatus
  className?: string
  showIcon?: boolean
}

export function DisciplinaryStatusBadge({ status, className = '', showIcon = true }: Props) {
  let label = ''
  let colorClass = ''
  let Icon: LucideIcon = FileText

  switch (status) {
    case 'registered':
      label = 'Registrado'
      colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
      Icon = FileText
      break
    case 'reviewing':
      label = 'En revisión'
      colorClass = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
      Icon = Eye
      break
    case 'following':
      label = 'En seguimiento'
      colorClass = 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
      Icon = AlertCircle
      break
    case 'closed':
      label = 'Cerrado'
      colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
      Icon = CheckCircle2
      break
    case 'archived':
      label = 'Archivado'
      colorClass = 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600/50'
      Icon = Archive
      break
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass} ${className}`}>
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}
