'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FileText, Clock, CheckCircle2, XCircle, GraduationCap } from 'lucide-react'
import { PermissionStatsSummary } from '../../domain/entities'

interface Props {
  stats: PermissionStatsSummary
  onFilterClick?: (status: string) => void
  activeFilter?: string
}

export function PermissionStatsCards({ stats, onFilterClick, activeFilter }: Props) {
  const shouldReduceMotion = useReducedMotion()

  const cards = [
    {
      id: 'all',
      title: 'Total Solicitudes',
      count: stats.total,
      icon: FileText,
      color: 'blue',
      bgLight: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-500/20',
      borderActive: 'border-blue-500 ring-2 ring-blue-500/20 shadow-md shadow-blue-500/10',
    },
    {
      id: 'pending',
      title: 'En Trámite',
      count: stats.pending,
      icon: Clock,
      color: 'amber',
      bgLight: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20',
      borderActive: 'border-amber-500 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/10',
    },
    {
      id: 'approved',
      title: 'Aprobadas',
      count: stats.approved,
      icon: CheckCircle2,
      color: 'emerald',
      bgLight: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20',
      borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10',
    },
    {
      id: 'rejected',
      title: 'Rechazadas',
      count: stats.rejected,
      icon: XCircle,
      color: 'rose',
      bgLight: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-500/20',
      borderActive: 'border-rose-500 ring-2 ring-rose-500/20 shadow-md shadow-rose-500/10',
    },
    {
      id: 'hours',
      title: 'Horas Afectadas',
      count: `${stats.totalHoursAffected}h`,
      icon: GraduationCap,
      color: 'indigo',
      bgLight: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 border border-indigo-500/20',
      borderActive: 'border-indigo-500',
      nonClickable: true,
    },
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
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              damping: 24,
              stiffness: 260,
              delay: shouldReduceMotion ? 0 : idx * 0.04,
            }}
            onClick={() => isClickable && onFilterClick(card.id)}
            className={`relative rounded-2xl sm:rounded-[22px] p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border transition-all duration-200 overflow-hidden ${
              isActive
                ? `${card.borderActive} bg-white dark:bg-slate-900`
                : 'border-white/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-slate-300/80 dark:hover:border-white/20'
            } ${
              isClickable
                ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] duration-100 ease-out'
                : ''
            }`}
          >
            {/* Línea de luz especular superior */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl shrink-0 ${card.bgLight}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
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
