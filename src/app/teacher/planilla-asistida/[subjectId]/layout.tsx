import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planilla Asistida | aulaEnsuny',
  description: 'Vista inmersiva de planilla asistida',
}

export default function PlanillaAsistidaStandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#0a0f1c] text-slate-900 dark:text-slate-100 relative flex flex-col">
      {/* Fondo sutil tipo puntos opcional */}
      <div
        className="absolute inset-0 z-0 opacity-[0.4] dark:opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />
      <main className="flex-1 relative z-10 flex flex-col min-h-0 h-full w-full">
        {children}
      </main>
    </div>
  )
}
