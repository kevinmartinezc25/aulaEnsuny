'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import DayTabsScheduleView from '@/components/schedule/DayTabsScheduleView'
import { StudentDashboardScheduleResponse } from '@/modules/students/application/scheduleActions'
import StaticScheduleGrid from '@/app/teacher/schedule/components/StaticScheduleGrid'

export function StudentScheduleClient({ initialData }: { initialData: StudentDashboardScheduleResponse }) {
  const currentYear = new Date().getFullYear()
  const context = {
    title: `Horario del Grupo ${initialData.groupName || 'No asignado'}`,
    subtitle: `Año lectivo ${currentYear}`,
    type: 'student' as const
  }

  return (
    <div className="w-[90%] sm:w-full max-w-4xl mx-auto pt-2 sm:pt-3 pb-6 space-y-2.5 sm:space-y-3 px-0 sm:px-4">
      <div>
        <Link 
          href="/student/dashboard" 
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Portal</span>
        </Link>
      </div>

      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mi Horario de Clases</h1>
        
        {initialData.hasGroup ? (
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Horario oficial para {initialData.groupName}
          </p>
        ) : initialData.directoryGradeLevel || initialData.directoryGroupName ? (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Atención: Tu perfil indica que perteneces al grado {initialData.directoryGradeLevel || 'N/A'} - grupo {initialData.directoryGroupName || 'N/A'}, pero este grupo no fue encontrado en el sistema de horarios.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Contacta con administración para verificar cómo se registró tu grado y grupo.
            </p>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            No se encontró un grupo oficial asignado a tu perfil.
          </p>
        )}
      </div>

      <div className="lg:bg-white dark:lg:bg-slate-900 lg:rounded-2xl lg:border lg:border-slate-200 dark:lg:border-slate-800 lg:shadow-sm overflow-hidden min-h-[500px] lg:h-[600px] flex-1 w-full flex flex-col relative">
        {initialData.groupId && initialData.isPublished ? (
          <StaticScheduleGrid 
            entityType="group"
            entityId={initialData.groupId}
            entityName={initialData.groupName}
            hideGroupBadge={true}
            disablePrint={true}
          />
        ) : (
          <DayTabsScheduleView 
            schedule={initialData.schedule}
            context={context}
            isPublished={initialData.isPublished}
            error={initialData.error}
          />
        )}
      </div>
    </div>
  )
}
