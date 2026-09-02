'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Check } from 'lucide-react'

interface Props {
  isOpen: boolean
  onAccept: () => void
}

export function ConfidentialityModal({ isOpen, onAccept }: Props) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6 text-amber-600 dark:text-amber-500">
              <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Tratamiento de Confidencialidad
              </h2>
            </div>
            
            <div className="space-y-4 text-slate-600 dark:text-slate-300">
              <p>
                Al registrar un nuevo reporte disciplinario, usted está manejando información sensible relacionada con menores de edad. Es su deber profesional mantener absoluta reserva sobre los hechos y los estudiantes involucrados, garantizando el derecho a la intimidad y el debido proceso.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-sm border border-slate-100 dark:border-slate-700">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Marco Legal (Colombia)</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Ley Estatutaria 1581 de 2012:</strong> Disposiciones generales para la Protección de Datos Personales. Especial protección a los datos de niños, niñas y adolescentes (Art. 7).
                  </li>
                  <li>
                    <strong>Ley 1098 de 2006 (Código de la Infancia y la Adolescencia):</strong> Artículo 33. Derecho a la intimidad. Los niños, las niñas y los adolescentes tienen derecho a la intimidad personal, mediante la protección contra toda injerencia arbitraria o ilegal en su vida privada.
                  </li>
                  <li>
                    <strong>Ley 1620 de 2013:</strong> Sistema Nacional de Convivencia Escolar y mitigación de la violencia escolar.
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={onAccept}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all"
              >
                <Check className="h-5 w-5" />
                Comprendo y Acepto
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
