'use client'

import React from 'react'
import {
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Send,
  FilePlus,
  ShieldAlert,
  UserCheck,
  CalendarCheck
} from 'lucide-react'
import { PermissionRequestHistory, PERMISSION_STATUS_LABELS } from '../../domain/entities'

interface Props {
  history: PermissionRequestHistory[]
}

export function PermissionTimeline({ history }: Props) {
  if (!history || history.length === 0) {
    return (
      <div className="py-6 text-center text-slate-400 text-sm">
        No hay registros en la línea de tiempo aún.
      </div>
    )
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FilePlus className="h-4 w-4 text-slate-500" />
      case 'submitted':
        return <Send className="h-4 w-4 text-blue-600" />
      case 'rector_approved':
        return <UserCheck className="h-4 w-4 text-indigo-600" />
      case 'coord_approved':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />
      case 'rector_rejected':
      case 'coord_rejected':
        return <XCircle className="h-4 w-4 text-rose-600" />
      case 'rector_returned':
        return <RotateCcw className="h-4 w-4 text-amber-600" />
      case 'cancelled':
        return <ShieldAlert className="h-4 w-4 text-zinc-500" />
      default:
        return <Clock className="h-4 w-4 text-slate-500" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'submitted':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
      case 'rector_approved':
        return 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
      case 'coord_approved':
        return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
      case 'rector_rejected':
      case 'coord_rejected':
        return 'border-rose-500 bg-rose-50 dark:bg-rose-950/40'
      case 'rector_returned':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-950/40'
      default:
        return 'border-slate-300 bg-slate-50 dark:bg-slate-800'
    }
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {history.map((item, idx) => {
        const dateObj = new Date(item.createdAt)
        const dateStr = dateObj.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
        const timeStr = dateObj.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit'
        })

        return (
          <div key={item.id || idx} className="relative group">
            {/* Dot / Icon */}
            <div
              className={`absolute -left-[30px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white dark:bg-slate-900 ${getActionColor(
                item.action
              )} shadow-sm`}
            >
              {getActionIcon(item.action)}
            </div>

            {/* Content card */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-3.5 shadow-sm transition-all hover:border-slate-200 dark:hover:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {PERMISSION_STATUS_LABELS[item.toStatus] || item.toStatus}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    por <strong>{item.changedByName || 'Usuario'}</strong>
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {dateStr} — {timeStr}
                </span>
              </div>

              {item.notes && (
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg mt-2 border border-slate-100 dark:border-slate-800/60">
                  {item.notes}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
