'use client'

import React from 'react'
import DayTabsScheduleView from '@/components/schedule/DayTabsScheduleView'
import { StudentDashboardScheduleResponse } from '@/modules/students/application/scheduleActions'
import StaticScheduleGrid from '@/app/teacher/schedule/components/StaticScheduleGrid'

export function StudentScheduleClient({ initialData }: { initialData: StudentDashboardScheduleResponse }) {
  const context = {
    title: 'Mi Horario',
    subtitle: initialData.groupName || 'Sin grupo',
    type: 'student' as const
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px] lg:h-[600px] flex-1 w-full flex flex-col relative">
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
