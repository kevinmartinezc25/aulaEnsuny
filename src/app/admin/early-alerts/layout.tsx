import React from 'react'
import { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Matriz de Alertas Tempranas | aulaEnsuny',
  description: 'Matriz de estudiantes con bajo rendimiento',
}

export default function EarlyAlertsStandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col print:block print:h-auto print:min-h-0 print:bg-white print:text-black">

      <main className="flex-1 overflow-hidden flex flex-col relative print:block print:overflow-visible print:static">
        {children}
      </main>
    </div>
  )
}
