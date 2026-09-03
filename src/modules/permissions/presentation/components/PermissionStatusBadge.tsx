'use client'

import React from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileEdit,
  Send,
  UserCheck,
  ShieldCheck
} from 'lucide-react'
import { PermissionStatus, PERMISSION_STATUS_LABELS, PERMISSION_STATUS_COLORS } from '../../domain/entities'

interface Props {
  status: PermissionStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function PermissionStatusBadge({ status, size = 'md', showIcon = true }: Props) {
  const colors = PERMISSION_STATUS_COLORS[status] || PERMISSION_STATUS_COLORS.submitted
  const label = PERMISSION_STATUS_LABELS[status] || status

  const getIcon = () => {
    switch (status) {
      case 'draft':
        return <FileEdit className="h-3.5 w-3.5" />
      case 'submitted':
        return <Send className="h-3.5 w-3.5" />
      case 'reviewing_rector':
        return <Clock className="h-3.5 w-3.5 animate-pulse" />
      case 'approved_rector':
        return <UserCheck className="h-3.5 w-3.5" />
      case 'reviewing_coordinator':
        return <Clock className="h-3.5 w-3.5" />
      case 'approved':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      case 'rejected':
        return <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
      case 'returned_correction':
        return <RotateCcw className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
      case 'cancelled':
        return <AlertTriangle className="h-3.5 w-3.5" />
      default:
        return <ShieldCheck className="h-3.5 w-3.5" />
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2 font-semibold',
  }[size]

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${colors.border} ${colors.bg} ${colors.text} ${sizeClasses}`}
    >
      {showIcon && getIcon()}
      <span>{label}</span>
    </span>
  )
}
