'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { FileText, Clock, CheckCircle2, XCircle, Calendar, GraduationCap } from 'lucide-react'
import { PermissionStatsSummary } from '../../domain/entities'

interface Props {
  stats: PermissionStatsSummary
  onFilterClick?: (status: string) => void
  activeFilter?: string
}

export function PermissionStatsCards({ stats, onFilterClick, activeFilter }: Props) {
  const cards = [
    {
      id: 'all',
      title: 'Total Solicitudes',
      count: stats.total,
      icon: FileText,
      color: 'blue',
      bgLight: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      borderActive: 'border-blue-500 ring-2 ring-blue-500/20',
    },
    {
      id: 'pending',
      title: 'En Trámite',
      count: stats.pending,
      icon: Clock,
      color: 'amber',
      bgLight: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      borderActive: 'border-amber-500 ring-2 ring-amber-500/20',
    },
    {
      id: 'approved',
      title: 'Aprobadas',
      count: stats.approved,
      icon: CheckCircle2,
      color: 'emerald',
      bgLight: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20',
    },
    {
      id: 'rejected',
      title: 'Rechazadas',
      count: stats.rejected,
      icon: XCircle,
      color: 'rose',
      bgLight: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
      borderActive: 'border-rose-500 ring-2 ring-rose-500/20',
    },
    {
      id: 'hours',
      title: 'Horas Afectadas',
      count: `${stats.totalHoursAffected}h`,
      icon: GraduationCap,
      color: 'indigo',
      bgLight: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
      borderActive: 'border-indigo-500',
      nonClickable: true,
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon
        const isActive = activeFilter === card.id
        const isClickable = !card.nonClickable && onFilterClick

        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => isClickable && onFilterClick(card.id)}
            className={`rounded-2xl p-4 bg-white dark:bg-slate-900 border transition-all duration-200 shadow-sm ${
              isActive ? card.borderActive : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700'
            } ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl ${card.bgLight}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {card.count}
              </span>
              {card.id === 'all' && (
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Reg.</span>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
