'use client'

import { useState, useRef } from 'react'
import { UploadCloud, FileCheck2, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AscXmlParser, AscParsedData } from '../../utils/AscXmlParser'
import { commitImportedSchedule, ScheduleImportMappings } from '../importActions'

interface ExistingTeacher {
  id: string
  full_name: string
  profile_id: string | null
  profile_name: string | null
  email: string | null
  is_academic_teacher?: boolean
}

interface PlatformProfile {
  id: string
  full_name: string
  profile_id: string
  profile_name: string | null
  email: string | null
  is_platform_profile?: boolean
}

interface ExistingGroup {
  id: string
  name: string
}

interface AscImportViewProps {
  initialTeachers: ExistingTeacher[]
  initialProfiles: PlatformProfile[]
  initialGroups: ExistingGroup[]
}

export function AscImportView({ initialTeachers, initialProfiles, initialGroups }: AscImportViewProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [parsedData, setParsedData] = useState<AscParsedData | null>(null)
  const [fileName, setFileName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'teachers' | 'groups'>('summary')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Las entidades vienen pre-cargadas desde el Server Component como props
  // initialTeachers = docentes ya en academic_teachers (pueden o no tener profile_id)
  // initialProfiles = perfiles con rol 'teacher' en la plataforma (Kevin Martínez, etc.)
  // La lista del combobox es exclusivamente los perfiles con rol 'teacher' en la plataforma
  // Esto evita duplicidad con los docentes académicos ya creados
  const allMappingOptions = [...initialProfiles].sort((a, b) => a.full_name.localeCompare(b.full_name))

  // Diccionarios de mapeo: xmlId -> dbId de academic_teachers
  const [teacherMappings, setTeacherMappings] = useState<Record<string, string>>({})
  const [groupMappings, setGroupMappings] = useState<Record<string, string>>({})

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

  // Función inteligente para sugerir coincidencia de docentes
  // Busca en la lista completa (academic_teachers + profiles de plataforma)
  const autoMatchTeacher = (xmlName: string): string => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    const cleanXml = norm(xmlName)
    const xmlTokens = cleanXml.split(/\s+/).filter(Boolean)

    // 1. Coincidencia exacta en academic_teachers
    const exact = allMappingOptions.find(t => norm(t.full_name) === cleanXml)
    if (exact) return exact.id

    // 2. Coincidencia si el perfil vinculado tiene el mismo nombre
    const profileMatch = allMappingOptions.find(t => t.profile_name && norm(t.profile_name) === cleanXml)
    if (profileMatch) return profileMatch.id

    // 3. Coincidencia parcial por tokens (ej: "KEVIN DAVID" ~ "Kevin Martínez" comparte token "kevin")
    const partial = allMappingOptions.find(t => {
      const dbTokens = norm(t.full_name).split(/\s+/).filter(Boolean)
      const common = xmlTokens.filter(tok => dbTokens.includes(tok))
      return common.length > 0 && common.some(c => c.length > 3)
    })
    if (partial) return partial.id

    return ''
  }

  // Función para sugerir coincidencia de grupos
  const autoMatchGroup = (xmlGroupName: string, groupsList: ExistingGroup[]): string => {
    const norm = (s: string) => s.toLowerCase().replace(/[\s\-_º°]/g, '').trim()
    const cleanXml = norm(xmlGroupName)

    const match = groupsList.find(g => norm(g.name) === cleanXml)
    return match ? match.id : ''
  }

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xml')) {
      toast.error('Por favor sube un archivo XML de aSc TimeTables.')
      return
    }

    try {
      setIsProcessing(true)

      // Leer respetando la codificación declarada en el archivo (windows-1252 o UTF-8)
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Error leyendo el archivo"))
        // Usamos windows-1252 para evitar caracteres de reemplazo 
        reader.readAsText(file, 'windows-1252')
      })

      const data = AscXmlParser.parse(text)
      setParsedData(data)
      setFileName(file.name)

      // Inicializar mapeos automáticos usando las props recibidas del servidor
      const initialTeacherMap: Record<string, string> = {}
      data.teachers.forEach(t => {
        const matchedId = autoMatchTeacher(t.name)
        if (matchedId) initialTeacherMap[t.id] = matchedId
      })
      setTeacherMappings(initialTeacherMap)

      const initialGroupMap: Record<string, string> = {}
      data.groups.forEach(g => {
        const matchedId = autoMatchGroup(g.name, initialGroups)
        if (matchedId) initialGroupMap[g.id] = matchedId
      })
      setGroupMappings(initialGroupMap)

      toast.success(`Archivo procesado. Se detectaron ${data.teachers.length} docentes y ${data.groups.length} grupos.`)
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
      const mappings: ScheduleImportMappings = {
        teachers: teacherMappings,
        groups: groupMappings
      }

      const res = await commitImportedSchedule(parsedData, fileName, mappings)
      
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
    const linkedTeachersCount = Object.keys(teacherMappings).filter(k => Boolean(teacherMappings[k])).length
    const linkedGroupsCount = Object.keys(groupMappings).filter(k => Boolean(groupMappings[k])).length

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cotejo de Horario: {fileName}</h2>
                <p className="text-sm text-slate-500">
                  Verifica y vincula los nombres del XML con los perfiles existentes para no duplicar docentes.
                </p>
              </div>
            </div>

            {/* Pestañas de Navegación */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTab === 'summary' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveTab('teachers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'teachers' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Docentes ({linkedTeachersCount}/{parsedData.teachers.length})
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'groups' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Grupos ({linkedGroupsCount}/{parsedData.groups.length})
              </button>
            </div>
          </div>

          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Docentes Detectados</h3>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{parsedData.teachers.length}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{linkedTeachersCount} vinculados</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Materias</h3>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{parsedData.subjects.length}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">con tildes corregidas</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Grupos</h3>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{parsedData.groups.length}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{linkedGroupsCount} vinculados</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Bloques de Horario</h3>
                  <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{parsedData.slots.length}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">horas de clase</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <span className="font-bold">Recomendación antes de publicar:</span> Ve a la pestaña{' '}
                  <button onClick={() => setActiveTab('teachers')} className="font-bold underline text-indigo-700 dark:text-indigo-300">
                    Docentes
                  </button>{' '}
                  para comprobar que los nombres del XML (por ejemplo <em>&ldquo;KEVIN DAVID&rdquo;</em>) queden vinculados a sus perfiles reales (<em>&ldquo;Kevin Martínez&rdquo;</em>).
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">
                Asocia cada docente que viene en el XML con el docente registrado en la plataforma. Si lo dejas en <em>(Crear nuevo docente)</em>, se creará un registro adicional sin vincular.
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[450px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 text-xs font-bold uppercase sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Nombre en XML (aSc)</th>
                      <th className="py-3 px-4">Abreviatura</th>
                      <th className="py-3 px-4">Vincular a Docente en Plataforma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedData.teachers.map(t => {
                      const selectedDbId = teacherMappings[t.id] || ''
                      const matchedTeacher = allMappingOptions.find(et => et.id === selectedDbId)
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                            {t.name}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono text-xs">
                            {t.short || '-'}
                          </td>
                          <td className="py-2.5 px-4">
                            <select
                              value={selectedDbId}
                              onChange={(e) => {
                                const val = e.target.value
                                setTeacherMappings(prev => ({ ...prev, [t.id]: val }))
                              }}
                              className="w-full max-w-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 px-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">(Crear nuevo docente sin vincular)</option>
                              {allMappingOptions.length === 0 && (
                                <option disabled>(No hay perfiles registrados en la plataforma)</option>
                              )}
                              {allMappingOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.full_name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">
                Los grupos del XML han sido normalizados a la convención estándar (ej. &ldquo;10-2&rdquo;). Confirma la vinculación con los grupos existentes en base de datos.
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[450px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 text-xs font-bold uppercase sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Grupo Normalizado (XML)</th>
                      <th className="py-3 px-4">Vincular a Grupo en Base de Datos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedData.groups.map(g => {
                      const selectedGrpId = groupMappings[g.id] || ''
                      return (
                        <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                            {g.name}
                          </td>
                          <td className="py-2.5 px-4">
                            <select
                              value={selectedGrpId}
                              onChange={(e) => {
                                const val = e.target.value
                                setGroupMappings(prev => ({ ...prev, [g.id]: val }))
                              }}
                              className="w-full max-w-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 px-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">(Crear nuevo grupo)</option>
                              {initialGroups.map(eg => (
                                <option key={eg.id} value={eg.id}>
                                  {eg.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button 
              onClick={() => { setParsedData(null); setFileName('') }}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handlePublish}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Sincronizando...
                </>
              ) : (
                <>
                  Publicar y Sincronizar Horario <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept=".xml,.txt" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          ref={fileInputRef}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
            <UploadCloud className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {isProcessing ? 'Analizando archivo...' : 'Cargar Horario Oficial (.xml)'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Arrastra tu archivo exportado desde aSc TimeTables. Podrás cotejar docentes y verificar nombres antes de aplicar los cambios.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


