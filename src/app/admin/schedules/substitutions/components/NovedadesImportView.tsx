'use client'

import React, { useState, useRef } from 'react'
import { FileUp, Calendar as CalendarIcon, Info, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { importDailyNovedadesXML, deleteDailyNovedades } from '../novedadesActions'
import { AscXmlParser, AscParsedData } from '../../utils/AscXmlParser'
import DailyPreviewCanvas from './DailyPreviewCanvas'

export function NovedadesImportView() {
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState<'import' | 'preview'>('import')
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<AscParsedData | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xml')) {
      toast.error('Por favor, selecciona un archivo XML exportado desde aSc TimeTables.')
      return
    }

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Error leyendo el archivo"))
        reader.readAsText(file, 'windows-1252')
      })

      const data = AscXmlParser.parse(text)
      setParsedData(data)
      setFileName(file.name)
      toast.success(`Archivo procesado correctamente. Listo para importar novedades (${data.slots.length} clases detectadas).`)
    } catch (error: any) {
      toast.error('Error al parsear el archivo XML: ' + error.message)
    }
  }

  const handleImport = async () => {
    if (!parsedData || !targetDate) return

    try {
      setIsProcessing(true)
      const result = await importDailyNovedadesXML(parsedData, targetDate)
      
      toast.success(`Novedad aplicada exitosamente: ${result.count} clases sobreescritas para el ${targetDate}.`)
      if (result.unmappedTeachers > 0 || result.unmappedSubjects > 0) {
        toast.warning(`Advertencia: Faltaron ${result.unmappedTeachers} docentes y ${result.unmappedSubjects} materias por mapear.`)
      }

      // Limpiar formulario tras éxito
      setParsedData(null)
      setFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const promptDelete = () => {
    if (!targetDate) return
    setIsDeleteModalOpen(true)
  }

  const executeDelete = async () => {
    setIsDeleteModalOpen(false)
    try {
      setIsProcessing(true)
      await deleteDailyNovedades(targetDate)
      toast.success(`Se ha restablecido el horario normal para el ${targetDate}.`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const getDayName = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(`${dateStr}T12:00:00Z`)
    return new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-amber-500" />
            Horario (Novedades)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sobrescribe temporalmente el horario institucional mediante la carga de un XML de aSc Substitutions para un día específico.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px mb-4">
        <button 
          onClick={() => setActiveTab('import')} 
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'import' ? 'border-[#1F4E31] dark:border-emerald-500 text-[#1F4E31] dark:text-emerald-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Importar Novedad
        </button>
        <button 
          onClick={() => setActiveTab('preview')} 
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'preview' ? 'border-[#1F4E31] dark:border-emerald-500 text-[#1F4E31] dark:text-emerald-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Vista Previa del Día
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-end bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="w-full max-w-sm">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span>Fecha Objetivo</span>
            {targetDate && (
              <span className="text-emerald-600 dark:text-emerald-400 capitalize bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-md text-xs font-bold border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                Día: {getDayName(targetDate)}
              </span>
            )}
          </label>
          <input 
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            disabled={isProcessing}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {activeTab === 'import' ? (
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6">
            <div className="flex gap-4">
              <Info className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">¿Cómo funciona?</h3>
                <p className="text-sm text-amber-800 dark:text-amber-400/80 mt-1">
                  Selecciona la fecha objetivo. Al cargar el archivo XML de aSc TimeTables, el sistema extraerá únicamente las clases de ese día de la semana 
                  (ej: si eliges un martes, se extraerá el día 2 del XML) y reemplazará el horario normal solo durante esa fecha.
                  Al finalizar el día, todos volverán a su horario habitual automáticamente.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 text-center shadow-sm max-w-2xl mx-auto">
            <div className="mb-6 text-left">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Archivo XML de aSc TimeTables
            </label>
          
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 transition-colors ${
              parsedData 
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' 
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer'
            }`}
          >
            <input 
              type="file" 
              accept=".xml" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <FileUp className={`h-10 w-10 ${parsedData ? 'text-emerald-500' : 'text-slate-400'}`} />
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {parsedData ? (
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{fileName}</span>
                ) : (
                  <>Haz clic para buscar el archivo XML <br/><span className="text-xs opacity-75">(Debe contener la programación de clases)</span></>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleImport}
            disabled={!parsedData || !targetDate || isProcessing}
            className="w-full flex items-center justify-center gap-2 bg-[#1F4E31] dark:bg-emerald-600 hover:bg-[#153622] dark:hover:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Procesando e importando novedades...</>
            ) : (
              <>Aplicar Horario de Novedades <ArrowRight className="h-5 w-5" /></>
            )}
          </button>
          
          <button
            onClick={promptDelete}
            disabled={!targetDate || isProcessing}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 font-semibold py-3.5 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-200 dark:border-red-900/50"
          >
            {isProcessing ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Restaurando...</>
            ) : (
              <>Restablecer horario (Eliminar novedades)</>
            )}
          </button>
        </div>
          </div>
        </div>
      ) : (
        <DailyPreviewCanvas targetDate={targetDate} />
      )}

      {/* Modal de confirmación */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              ¿Eliminar Novedades?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
              Estás a punto de borrar todas las modificaciones del día <span className="font-bold text-slate-900 dark:text-slate-200">{targetDate}</span>. El horario volverá a su programación regular. ¿Deseas continuar?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
