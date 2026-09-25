'use client'

import React, { useState, useRef } from 'react'
import { FileUp, Calendar as CalendarIcon, Info, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { importDailyNovedadesXML, deleteDailyNovedades, checkDailyNovedadesCount } from '../novedadesActions'
import { AscXmlParser, AscParsedData } from '../../utils/AscXmlParser'
import DailyPreviewCanvas from './DailyPreviewCanvas'

interface ExistingTeacher {
  id: string
  full_name: string
  profile_id: string | null
  profile_name: string | null
  email: string | null
}

interface ExistingGroup {
  id: string
  name: string
}

interface NovedadesImportViewProps {
  initialTeachers?: ExistingTeacher[]
  initialGroups?: ExistingGroup[]
}

export function NovedadesImportView({ initialTeachers = [], initialGroups = [] }: NovedadesImportViewProps) {
  const [targetDate, setTargetDate] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'import' | 'preview'>('import')
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<AscParsedData | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [activeNovedades, setActiveNovedades] = useState<number | null>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [teacherMappings, setTeacherMappings] = useState<Record<string, string>>({})
  const [groupMappings, setGroupMappings] = useState<Record<string, string>>({})
  const [activeMappingTab, setActiveMappingTab] = useState<'summary' | 'teachers' | 'groups'>('summary')

  const autoMatchTeacher = (xmlName: string): string => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    const cleanXml = norm(xmlName)
    const xmlTokens = cleanXml.split(/\s+/).filter(Boolean)

    const exact = initialTeachers.find(t => norm(t.full_name) === cleanXml)
    if (exact) return exact.id

    const profileMatch = initialTeachers.find(t => t.profile_name && norm(t.profile_name) === cleanXml)
    if (profileMatch) return profileMatch.id

    const partial = initialTeachers.find(t => {
      const dbTokens = norm(t.full_name).split(/\s+/).filter(Boolean)
      const common = xmlTokens.filter(tok => dbTokens.includes(tok))
      return common.length > 0 && common.some(c => c.length > 3)
    })
    if (partial) return partial.id
    return ''
  }

  const autoMatchGroup = (xmlGroupName: string): string => {
    const norm = (s: string) => s.toLowerCase().replace(/[\s\-_º°]/g, '').trim()
    const cleanXml = norm(xmlGroupName)
    const match = initialGroups.find(g => norm(g.name) === cleanXml)
    return match ? match.id : ''
  }

  React.useEffect(() => {
    if (targetDate) {
      checkDailyNovedadesCount(targetDate).then(setActiveNovedades)
    } else {
      setActiveNovedades(0)
    }
  }, [targetDate])

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
      
      const initialTeacherMap: Record<string, string> = {}
      data.teachers.forEach(t => {
        const matchedId = autoMatchTeacher(t.name)
        if (matchedId) initialTeacherMap[t.id] = matchedId
      })
      setTeacherMappings(initialTeacherMap)

      const initialGroupMap: Record<string, string> = {}
      data.groups.forEach(g => {
        const matchedId = autoMatchGroup(g.name)
        if (matchedId) initialGroupMap[g.id] = matchedId
      })
      setGroupMappings(initialGroupMap)

      setActiveMappingTab('summary')
      toast.success(`Archivo procesado correctamente. Listo para revisar cotejos (${data.slots.length} clases detectadas).`)
    } catch (error: any) {
      toast.error('Error al parsear el archivo XML: ' + error.message)
    }
  }

  const handleImport = async () => {
    if (!parsedData || !targetDate) return

    try {
      setIsProcessing(true)
      const result = await importDailyNovedadesXML(parsedData, targetDate, { teachers: teacherMappings, groups: groupMappings })
      
      toast.success(`Novedad aplicada exitosamente: ${result.count} clases sobreescritas para el ${targetDate}.`)
      if (result.unmappedTeachers > 0 || result.unmappedSubjects > 0) {
        toast.warning(`Advertencia: Faltaron ${result.unmappedTeachers} docentes y ${result.unmappedSubjects} materias por mapear.`)
      }

      // Limpiar formulario tras éxito
      setParsedData(null)
      setFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      checkDailyNovedadesCount(targetDate).then(setActiveNovedades)
      
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
      setActiveNovedades(0)
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

      <div className={`mb-6 flex-col sm:flex-row gap-4 items-end bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm ${activeTab !== 'import' ? 'hidden md:flex' : 'flex'}`}>
        <div className="w-full max-w-sm">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between gap-2">
            <span>Fecha Objetivo</span>
            <div className="flex gap-2 items-center flex-wrap justify-end">
              {activeNovedades === 0 && (
                <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold border border-red-200 dark:border-red-800/50 animate-pulse">
                  Sin Novedades
                </span>
              )}
              {activeNovedades !== null && activeNovedades > 0 && (
                <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold border border-blue-200 dark:border-blue-800/50">
                  {activeNovedades} clases aplicadas
                </span>
              )}
              {targetDate && (
                <span className="text-emerald-600 dark:text-emerald-400 capitalize bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-md text-xs font-bold border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  Día: {getDayName(targetDate)}
                </span>
              )}
            </div>
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

          {parsedData && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm max-w-4xl mx-auto mt-6">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Lista de Cotejos (Mapeo)</h3>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button onClick={() => setActiveMappingTab('summary')} className={`px-3 py-1 text-xs font-bold rounded-lg ${activeMappingTab === 'summary' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600' : 'text-slate-500'}`}>Resumen</button>
                  <button onClick={() => setActiveMappingTab('teachers')} className={`px-3 py-1 text-xs font-bold rounded-lg ${activeMappingTab === 'teachers' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600' : 'text-slate-500'}`}>Docentes</button>
                  <button onClick={() => setActiveMappingTab('groups')} className={`px-3 py-1 text-xs font-bold rounded-lg ${activeMappingTab === 'groups' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600' : 'text-slate-500'}`}>Grupos</button>
                </div>
              </div>
              
              {activeMappingTab === 'summary' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center"><p className="text-xl font-bold text-emerald-600">{parsedData.teachers.length}</p><p className="text-xs text-slate-500">Docentes</p></div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center"><p className="text-xl font-bold text-blue-600">{parsedData.groups.length}</p><p className="text-xs text-slate-500">Grupos</p></div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center"><p className="text-xl font-bold text-purple-600">{parsedData.subjects.length}</p><p className="text-xs text-slate-500">Materias</p></div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center"><p className="text-xl font-bold text-orange-600">{parsedData.slots.length}</p><p className="text-xs text-slate-500">Clases detectadas</p></div>
                </div>
              )}

              {activeMappingTab === 'teachers' && (
                <div className="max-h-[300px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 text-xs font-bold sticky top-0">
                      <tr><th className="p-2">Nombre XML</th><th className="p-2">Docente Plataforma</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedData.teachers.map(t => (
                        <tr key={t.id}>
                          <td className="p-2 font-semibold">{t.name}</td>
                          <td className="p-2">
                            <select
                              value={teacherMappings[t.id] || ''}
                              onChange={e => setTeacherMappings(prev => ({ ...prev, [t.id]: e.target.value }))}
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 px-2 text-xs"
                            >
                              <option value="">(No mapear / Automático)</option>
                              {initialTeachers.map(opt => <option key={opt.id} value={opt.id}>{opt.full_name}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeMappingTab === 'groups' && (
                <div className="max-h-[300px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 text-xs font-bold sticky top-0">
                      <tr><th className="p-2">Grupo XML</th><th className="p-2">Grupo Plataforma</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedData.groups.map(g => (
                        <tr key={g.id}>
                          <td className="p-2 font-semibold">{g.name}</td>
                          <td className="p-2">
                            <select
                              value={groupMappings[g.id] || ''}
                              onChange={e => setGroupMappings(prev => ({ ...prev, [g.id]: e.target.value }))}
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 px-2 text-xs"
                            >
                              <option value="">(No mapear / Automático)</option>
                              {initialGroups.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
