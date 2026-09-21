'use client'

import { useState, useRef } from 'react'
import { UploadCloud, CheckCircle, FileCheck2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { AscXmlParser, AscParsedData } from '../../utils/AscXmlParser'
import { commitImportedSchedule } from '../importActions'

export function AscImportView() {
  const [isDragging, setIsDragging] = useState(false)
  const [parsedData, setParsedData] = useState<AscParsedData | null>(null)
  const [fileName, setFileName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xml')) {
      toast.error('Por favor sube un archivo XML de aSc TimeTables.')
      return
    }

    try {
      setIsProcessing(true)
      const text = await file.text()
      const data = AscXmlParser.parse(text)
      setParsedData(data)
      setFileName(file.name)
      toast.success(`Archivo procesado. Se encontraron ${data.slots.length} bloques.`)
    } catch (error: any) {
      toast.error('Error al analizar el XML: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePublish = async () => {
    if (!parsedData) return
    setIsProcessing(true)

    try {
      // Pasamos directamente la data parseada al action, que se encargará
      // del UPSERT masivo (Master Data) y la generación de la Carga Académica.
      const res = await commitImportedSchedule(parsedData, fileName)
      
      if (res.success) {
        toast.success(`Horario publicado correctamente y Carga Académica sincronizada.`)
        setParsedData(null)
        setFileName('')
      } else {
        toast.error('Error al publicar: ' + res.error)
      }
    } catch (e: any) {
      toast.error('Ocurrió un error inesperado al publicar.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (parsedData) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Archivo Analizado: {fileName}</h2>
              <p className="text-sm text-slate-500">
                La información del XML se utilizará como **Fuente de Verdad** (Master Data).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-center">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Docentes</h3>
              <p className="text-2xl font-bold text-emerald-600">{parsedData.teachers.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-center">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Materias</h3>
              <p className="text-2xl font-bold text-emerald-600">{parsedData.subjects.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-center">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Grupos</h3>
              <p className="text-2xl font-bold text-emerald-600">{parsedData.groups.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-center">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Bloques</h3>
              <p className="text-2xl font-bold text-emerald-600">{parsedData.slots.length}</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
             <button 
                onClick={() => { setParsedData(null); setFileName('') }}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
             >
               Cancelar
             </button>
             <button 
               onClick={handlePublish}
               disabled={isProcessing}
               className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
             >
               {isProcessing ? 'Sincronizando...' : 'Publicar y Sincronizar'} <ArrowRight className="h-4 w-4" />
             </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept=".xml" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          ref={fileInputRef}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
          <div className="p-4 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 text-blue-500">
            <UploadCloud className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              {isProcessing ? 'Analizando archivo...' : 'Importar Archivo Maestro (aSc XML)'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Arrastra aquí tu archivo <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">.xml</span>. Este será la única fuente de verdad para grupos, docentes y horarios.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

