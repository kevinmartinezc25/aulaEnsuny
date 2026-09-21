'use client'

import React, { Suspense } from 'react'
import { PremiumScheduleViewer } from './components/PremiumScheduleViewer'

export default function SchedulesMainPage() {
  return (
    <div className="h-[calc(100vh-80px)] w-full">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Cargando horario...</div>}>
        <PremiumScheduleViewer />
      </Suspense>
    </div>
  )
}
