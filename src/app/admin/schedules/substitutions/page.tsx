import React from 'react'
import { FileUp, UserMinus, Clock, Info } from 'lucide-react'

export const metadata = {
  title: 'Sustituciones Diarias - aulaEnsuny',
}

export default function SubstitutionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserMinus className="h-6 w-6 text-amber-500" />
            Sustituciones y Ausencias
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión de novedades diarias a través de la importación desde aSc Substitutions.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6">
        <div className="flex gap-4">
          <Info className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">Próximamente: Integración con aSc Substitutions</h3>
            <p className="text-sm text-amber-800 dark:text-amber-400/80 mt-1">
              Esta sección está en preparación para soportar la importación del XML Diario de sustituciones. 
              En lugar de gestionar las ausencias manualmente, exportarás el reporte diario desde aSc Substitutions 
              y el sistema actualizará automáticamente el portal de los estudiantes para notificarles los cambios (horas libres, aulas reasignadas o reemplazos).
            </p>
          </div>
        </div>
      </div>

      {/* Mockup de Uploader */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-sm opacity-50 grayscale pointer-events-none">
        <FileUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Importar XML de Sustituciones</h3>
        <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
          Selecciona el archivo XML generado hoy por aSc Substitutions para actualizar la plataforma.
        </p>
        <button className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold">
          Seleccionar Archivo (Próximamente)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50 grayscale">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
           <h4 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-4">
             <UserMinus className="h-4 w-4" /> Docentes Ausentes Hoy
           </h4>
           <div className="space-y-3">
             <div className="animate-pulse flex gap-3 items-center">
               <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
               <div className="flex-1 space-y-2">
                 <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                 <div className="h-2 w-1/3 bg-slate-100 dark:bg-slate-800/50 rounded" />
               </div>
             </div>
             <div className="animate-pulse flex gap-3 items-center">
               <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
               <div className="flex-1 space-y-2">
                 <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                 <div className="h-2 w-1/3 bg-slate-100 dark:bg-slate-800/50 rounded" />
               </div>
             </div>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
           <h4 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-4">
             <Clock className="h-4 w-4" /> Impacto en Grupos
           </h4>
           <div className="space-y-3">
             <div className="animate-pulse flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
               <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
               <div className="h-3 w-1/3 bg-slate-300 dark:bg-slate-700 rounded" />
             </div>
             <div className="animate-pulse flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
               <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
               <div className="h-3 w-1/3 bg-slate-300 dark:bg-slate-700 rounded" />
             </div>
             <div className="animate-pulse flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
               <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
               <div className="h-3 w-1/3 bg-slate-300 dark:bg-slate-700 rounded" />
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}
