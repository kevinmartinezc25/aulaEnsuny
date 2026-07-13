'use client'

import React, { useState, useEffect } from 'react'
import { 
  Award, Plus, Edit2, Trash2, Users, ClipboardList, CheckCircle, BarChart2, 
  UserCheck, Layers, RefreshCw, UploadCloud, AlertCircle, FileText, ChevronRight, Play, Eye
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { 
  getElections, createOrUpdateElection, deleteElection,
  getCandidates, createOrUpdateCandidate, deleteCandidate,
  getElectionTables, createOrUpdateElectionTable, deleteElectionTable,
  getJurors, assignJuror, removeJuror,
  getElectionVoters, importVoters,
  getElectionResults, resetElectionResults,
  getEligibleUsers, Election, Candidate, ElectionTable, Juror, Voter, ElectionResultsSummary
} from '@/modules/elections/application/actions'

export default function AdminElectionsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'procesos' | 'candidatos' | 'mesas' | 'jurados' | 'votantes' | 'resultados'>('dashboard')
  const [elections, setElections] = useState<Election[]>([])
  const [selectedElectionId, setSelectedElectionId] = useState<string>('')
  
  // Data loading states
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [tables, setTables] = useState<ElectionTable[]>([])
  const [jurors, setJurors] = useState<Juror[]>([])
  const [voters, setVoters] = useState<Voter[]>([])
  const [results, setResults] = useState<ElectionResultsSummary | null>(null)
  
  // Form modal states
  const [isElectionModalOpen, setIsElectionModalOpen] = useState(false)
  const [editingElection, setEditingElection] = useState<Partial<Election> | null>(null)
  
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<Partial<Candidate> | null>(null)

  const [isTableModalOpen, setIsTableModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Partial<ElectionTable> | null>(null)

  const [eligibleStudents, setEligibleStudents] = useState<any[]>([])
  const [eligibleStaff, setEligibleStaff] = useState<any[]>([])
  
  // Voter import state
  const [csvText, setCsvText] = useState('')
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<any>(null)
  
  // Juror assignment state
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [selectedTableIdForJuror, setSelectedTableIdForJuror] = useState('')

  // Load elections & users initial
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load election specific details
  useEffect(() => {
    if (selectedElectionId) {
      loadElectionDetails(selectedElectionId)
    }
  }, [selectedElectionId])

  async function loadInitialData() {
    const list = await getElections()
    setElections(list)
    if (list.length > 0) {
      setSelectedElectionId(list[0].id)
    }
    
    const { students, staff } = await getEligibleUsers()
    setEligibleStudents(students)
    setEligibleStaff(staff)
  }

  async function loadElectionDetails(id: string) {
    const [cData, tData, jData, vData, rData] = await Promise.all([
      getCandidates(id),
      getElectionTables(id),
      getJurors(id),
      getElectionVoters(id),
      getElectionResults(id)
    ])
    setCandidates(cData)
    setTables(tData)
    setJurors(jData)
    setVoters(vData)
    setResults(rData)
  }

  // --- ELECTION HANDLERS ---
  async function handleSaveElection(e: React.FormEvent) {
    e.preventDefault()
    if (!editingElection?.name || !editingElection.start_date || !editingElection.end_date) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }
    const res = await createOrUpdateElection(editingElection)
    if (res.success) {
      toast.success('Proceso electoral guardado correctamente')
      setIsElectionModalOpen(false)
      loadInitialData()
    } else {
      toast.error(`Error: ${res.error}`)
    }
  }

  async function handleDeleteElection(id: string) {
    if (confirm('¿Estás seguro de eliminar este proceso electoral? Esto borrará todos los datos asociados.')) {
      const res = await deleteElection(id)
      if (res.success) {
        toast.success('Elección eliminada')
        loadInitialData()
      } else {
        toast.error(`Error: ${res.error}`)
      }
    }
  }

  // --- CANDIDATE HANDLERS ---
  async function handleSaveCandidate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCandidate?.student_id || !editingCandidate.number) {
      toast.error('Selecciona un estudiante y asigna un número electoral')
      return
    }
    const res = await createOrUpdateCandidate({
      ...editingCandidate,
      election_id: selectedElectionId
    })
    if (res.success) {
      toast.success('Candidato registrado')
      setIsCandidateModalOpen(false)
      loadElectionDetails(selectedElectionId)
    } else {
      toast.error(`Error: ${res.error}`)
    }
  }

  async function handleDeleteCandidate(id: string) {
    if (confirm('¿Eliminar a este candidato?')) {
      const res = await deleteCandidate(id)
      if (res.success) {
        toast.success('Candidato eliminado')
        loadElectionDetails(selectedElectionId)
      } else {
        toast.error(res.error)
      }
    }
  }

  // --- TABLES HANDLERS ---
  async function handleSaveTable(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTable?.name) return
    const res = await createOrUpdateElectionTable({
      ...editingTable,
      election_id: selectedElectionId
    })
    if (res.success) {
      toast.success('Mesa de votación guardada')
      setIsTableModalOpen(false)
      loadElectionDetails(selectedElectionId)
    } else {
      toast.error(res.error)
    }
  }

  async function handleDeleteTable(id: string) {
    if (confirm('¿Eliminar esta mesa?')) {
      const res = await deleteElectionTable(id)
      if (res.success) {
        toast.success('Mesa eliminada')
        loadElectionDetails(selectedElectionId)
      } else {
        toast.error(res.error)
      }
    }
  }

  // --- JUROR HANDLERS ---
  async function handleAssignJuror(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStaffId || !selectedTableIdForJuror) return
    const res = await assignJuror(selectedStaffId, selectedTableIdForJuror)
    if (res.success) {
      toast.success('Jurado asignado correctamente')
      loadElectionDetails(selectedElectionId)
    } else {
      toast.error(res.error)
    }
  }

  async function handleRemoveJuror(id: string) {
    if (confirm('¿Remover este jurado de la mesa?')) {
      const res = await removeJuror(id)
      if (res.success) {
        toast.success('Jurado removido')
        loadElectionDetails(selectedElectionId)
      } else {
        toast.error(res.error)
      }
    }
  }

  // --- IMPORT VOTERS ---
  async function handleImportVoters(e: React.FormEvent) {
    e.preventDefault()
    if (!excelFile) {
      toast.error('Por favor selecciona un archivo Excel (.xlsx, .xls o .csv)')
      return
    }

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt?.target?.result
        if (!bstr) return
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws) as Array<any>

        if (data.length === 0) {
          toast.error('El archivo Excel está vacío.')
          return
        }

        const rows = data.map(item => {
          const findVal = (prefixes: string[]) => {
            const key = Object.keys(item).find(k => prefixes.some(p => k.toLowerCase().includes(p.toLowerCase())))
            return key ? String(item[key]).trim() : ''
          }

          return {
            Documento: findVal(['documento', 'id', 'identificacion', 'doc']),
            Nombres: findVal(['nombre', 'first_name']),
            Apellidos: findVal(['apellido', 'last_name']),
            Correo: findVal(['correo', 'email', 'mail']),
            Grado: findVal(['grado', 'grade', 'curso'])
          }
        }).filter(r => r.Documento && r.Nombres && r.Correo && r.Grado)

        if (rows.length === 0) {
          toast.error('No se encontraron registros con las columnas requeridas (Documento, Nombres, Apellidos, Correo, Grado).')
          return
        }

        toast.loading('Procesando importación masiva...')
        const res = await importVoters(selectedElectionId, rows)
        toast.dismiss()
        
        if (res.success) {
          toast.success(`Importación finalizada. Procesados: ${res.processed}`)
          setImportResult(res)
          loadElectionDetails(selectedElectionId)
        } else {
          toast.error('Error al importar votantes')
        }
      } catch (err: any) {
        toast.error(`Error al analizar el archivo: ${err.message}`)
      }
    }
    reader.readAsBinaryString(excelFile)
  }

  function handleDownloadTemplate() {
    const templateData = [
      {
        "Documento": "10001",
        "Nombres": "Juan Carlos",
        "Apellidos": "Perez Gomez",
        "Grado": "10°A"
      },
      {
        "Documento": "10002",
        "Nombres": "Maria Camila",
        "Apellidos": "Rodriguez Diaz",
        "Grado": "11°B"
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Votantes")
    XLSX.writeFile(wb, "Plantilla_Importacion_Votantes.xlsx")
    toast.success("Plantilla descargada correctamente")
  }

  // --- RESTART SIMULATION ---
  async function handleResetElection() {
    if (confirm('¡ATENCIÓN! Estás a punto de reiniciar esta elección. Todos los votos serán borrados y los votantes podrán volver a participar. ¿Deseas continuar?')) {
      const res = await resetElectionResults(selectedElectionId)
      if (res.success) {
        toast.success('Elección reiniciada correctamente')
        loadElectionDetails(selectedElectionId)
      } else {
        toast.error(res.error)
      }
    }
  }

  const selectedElection = elections.find(el => el.id === selectedElectionId)

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Award className="h-8 w-8 text-emerald-600" /> Elecciones Institucionales
          </h1>
          <p className="text-slate-500 mt-1">Gestión, control y analíticas de procesos electorales y simulacros escolares.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedElectionId} 
            onChange={(e) => setSelectedElectionId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            {elections.map(el => (
              <option key={el.id} value={el.id}>{el.name} ({el.type === 'simulation' ? 'Simulacro' : 'Oficial'})</option>
            ))}
          </select>
          <button 
            onClick={() => {
              setEditingElection({
                name: '',
                description: '',
                start_date: new Date().toISOString().slice(0, 16),
                end_date: new Date().toISOString().slice(0, 16),
                status: 'draft',
                type: 'official',
                show_realtime_results: true
              })
              setIsElectionModalOpen(true)
            }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm font-bold text-white transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" /> Nuevo Proceso
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto gap-2">
        {(['dashboard', 'procesos', 'candidatos', 'mesas', 'jurados', 'votantes', 'resultados'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-semibold capitalize border-b-2 transition-all ${
              activeTab === tab 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* --- TAB: DASHBOARD / SUMMARY --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Habilitados</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                    {results?.totalVotersHabilitados || 0}
                  </h3>
                </div>
                <Users className="h-10 w-10 text-blue-500 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-xl" />
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Votos Emitidos</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                    {results?.totalVotes || 0}
                  </h3>
                </div>
                <CheckCircle className="h-10 w-10 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-xl" />
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Participación</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                    {results?.participationPercentage || 0}%
                  </h3>
                </div>
                <BarChart2 className="h-10 w-10 text-purple-500 bg-purple-50 dark:bg-purple-950/20 p-2 rounded-xl" />
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Abstención</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                    {results?.abstencionPercentage || 0}%
                  </h3>
                </div>
                <AlertCircle className="h-10 w-10 text-rose-500 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-xl" />
              </div>
            </div>

            {/* Dashboard details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Candidatos Registrados ({candidates.length})</h3>
                <div className="space-y-4">
                  {candidates.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                          {c.photo_url ? <img src={c.photo_url} className="h-full w-full rounded-full object-cover" /> : c.number}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{c.student_name}</p>
                          <p className="text-xs text-slate-400">Grado {c.student_grade} | Tarjetón #{c.number}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full dark:bg-blue-900/10">Habilitado</span>
                    </div>
                  ))}
                  {candidates.length === 0 && <p className="text-sm text-slate-400">No hay candidatos.</p>}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Mesas de Votación ({tables.length})</h3>
                <div className="space-y-4">
                  {tables.map(t => {
                    const tableJurors = jurors.filter(j => j.table_id === t.id)
                    return (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.name}</p>
                          <p className="text-xs text-slate-400">Grados: {t.enabled_grades?.join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 font-medium">Jurados: {tableJurors.length}</p>
                        </div>
                      </div>
                    )
                  })}
                  {tables.length === 0 && <p className="text-sm text-slate-400">No hay mesas.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: PROCESOS (ELECTIONS CRUD) --- */}
        {activeTab === 'procesos' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Procesos Electorales</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-500">
                <thead className="text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Inicio</th>
                    <th className="px-6 py-4">Cierre</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {elections.map(el => (
                    <tr key={el.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white">{el.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          el.type === 'simulation' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10'
                        }`}>
                          {el.type === 'simulation' ? 'Simulacro' : 'Oficial'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          el.status === 'active' ? 'bg-green-50 text-green-600' : el.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {el.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{new Date(el.start_date).toLocaleString()}</td>
                      <td className="px-6 py-4">{new Date(el.end_date).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {el.type === 'simulation' && (
                          <button onClick={handleResetElection} title="Reiniciar Elección" className="text-amber-600 hover:bg-amber-50 p-2 rounded-lg">
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setEditingElection(el)
                            setIsElectionModalOpen(true)
                          }} 
                          className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteElection(el.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB: CANDIDATOS --- */}
        {activeTab === 'candidatos' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Candidatos Registrados</h3>
              <button 
                onClick={() => {
                  setEditingCandidate({
                    election_id: selectedElectionId,
                    student_id: '',
                    number: '',
                    proposal: '',
                    photo_url: '',
                    presentation: '',
                    objectives: '',
                    proposals: '',
                    goals: '',
                    video_url: ''
                  })
                  setIsCandidateModalOpen(true)
                }}
                className="flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold dark:bg-white dark:text-slate-900"
              >
                <Plus className="h-4 w-4" /> Nuevo Candidato
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map(c => (
                <div key={c.id} className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 relative group">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-slate-200 border-2 border-emerald-500 overflow-hidden flex items-center justify-center text-xl font-bold">
                      {c.photo_url ? <img src={c.photo_url} className="h-full w-full object-cover" /> : c.number}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-lg">{c.student_name}</h4>
                      <p className="text-xs text-slate-400">Tarjetón #{c.number} | Grado {c.student_grade}</p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                    <strong>Propuesta:</strong> {c.proposal}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        setEditingCandidate(c)
                        setIsCandidateModalOpen(true)
                      }} 
                      className="text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg text-xs font-semibold"
                    >
                      Editar
                    </button>
                    <button onClick={() => handleDeleteCandidate(c.id)} className="text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-xs font-semibold">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: MESAS (TABLES) --- */}
        {activeTab === 'mesas' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Mesas de Votación</h3>
              <button 
                onClick={() => {
                  setEditingTable({
                    election_id: selectedElectionId,
                    name: '',
                    enabled_grades: []
                  })
                  setIsTableModalOpen(true)
                }}
                className="flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold dark:bg-white dark:text-slate-900"
              >
                <Plus className="h-4 w-4" /> Nueva Mesa
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tables.map(t => (
                <div key={t.id} className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-800 dark:text-white text-lg mb-2">{t.name}</h4>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Grados Asignados</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.enabled_grades?.map(g => (
                        <span key={g} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 text-xs rounded-full font-semibold">{g}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        setEditingTable(t)
                        setIsTableModalOpen(true)
                      }} 
                      className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 p-2 rounded-lg text-xs font-semibold"
                    >
                      Editar
                    </button>
                    <button onClick={() => handleDeleteTable(t.id)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 p-2 rounded-lg text-xs font-semibold">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: JURADOS --- */}
        {activeTab === 'jurados' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 lg:col-span-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Asignar Jurado</h3>
              <form onSubmit={handleAssignJuror} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Docente / Personal</label>
                  <select 
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                  >
                    <option value="">Seleccionar personal...</option>
                    {eligibleStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Mesa de Votación</label>
                  <select 
                    value={selectedTableIdForJuror}
                    onChange={(e) => setSelectedTableIdForJuror(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                  >
                    <option value="">Seleccionar mesa...</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-sm transition-all dark:bg-white dark:text-slate-900"
                >
                  Asignar Jurado
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Jurados Asignados</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">Correo</th>
                      <th className="px-6 py-4">Mesa</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {jurors.map(j => (
                      <tr key={j.id}>
                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white">{j.juror_name}</td>
                        <td className="px-6 py-4">{j.juror_email}</td>
                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-350">{j.table_name}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleRemoveJuror(j.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: VOTANTES (EXCEL IMPORT) --- */}
        {activeTab === 'votantes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Importar Votantes</h3>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
                >
                  Descargar Plantilla
                </button>
              </div>
              <p className="text-xs text-slate-400">Selecciona o arrastra el archivo de Excel (.xlsx, .xls o .csv) que contiene el censo electoral. Cabeceras recomendadas: <strong>Documento, Nombres, Apellidos, Correo, Grado</strong></p>
              
              <form onSubmit={handleImportVoters} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setExcelFile(e.target.files ? e.target.files[0] : null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {excelFile ? excelFile.name : 'Haz clic o arrastra tu archivo aquí'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Soporta Excel o CSV</p>
                </div>

                <button 
                  type="submit"
                  disabled={!excelFile}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-sm dark:bg-white dark:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UploadCloud className="h-4 w-4" /> Procesar Excel
                </button>
              </form>

              {importResult && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl text-xs space-y-1">
                  <p><strong>Resultados del Procesamiento:</strong></p>
                  <p>Total procesados: {importResult.processed}</p>
                  <p>Nuevos creados: {importResult.newCount}</p>
                  <p>Actualizados: {importResult.updatedCount}</p>
                  {importResult.errors?.length > 0 && (
                    <div className="text-red-600 dark:text-red-400 pt-2 font-bold">
                      <p>Errores ({importResult.errors.length}):</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {importResult.errors.slice(0, 3).map((err: string, idx: number) => <li key={idx}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Censo Electoral / Votantes ({voters.length})</h3>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3">Nombre</th>
                      <th className="px-6 py-3">Correo</th>
                      <th className="px-6 py-3">Grado</th>
                      <th className="px-6 py-3 text-right">¿Ya Votó?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {voters.map(v => (
                      <tr key={v.id}>
                        <td className="px-6 py-3 font-semibold text-slate-800 dark:text-white">{v.student_name}</td>
                        <td className="px-6 py-3">{v.student_email}</td>
                        <td className="px-6 py-3 font-bold text-slate-500">{v.student_grade}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            v.has_voted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {v.has_voted ? 'SÍ' : 'NO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: RESULTADOS & ANALÍTICAS --- */}
        {activeTab === 'resultados' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Resultados de Votación</h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">
                  Corte: {new Date().toLocaleTimeString()}
                </span>
              </div>

              {/* Podium display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8 pb-4">
                {/* 2nd Place */}
                {results?.candidatesResults[1] && (
                  <div className="flex flex-col items-center space-y-3 order-2 md:order-1">
                    <div className="h-16 w-16 rounded-full bg-slate-200 border-2 border-slate-300 overflow-hidden flex items-center justify-center font-bold">
                      {results.candidatesResults[1].photo_url ? (
                        <img src={results.candidatesResults[1].photo_url} className="h-full w-full object-cover" />
                      ) : '🥈'}
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 w-full p-4 rounded-t-2xl text-center border-t border-slate-200 dark:border-slate-700 min-h-[140px] flex flex-col justify-center">
                      <span className="text-2xl">🥈</span>
                      <p className="font-bold text-slate-800 dark:text-white text-sm mt-1">{results.candidatesResults[1].name}</p>
                      <p className="text-xs text-slate-400">Votos: {results.candidatesResults[1].votes}</p>
                      <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold mt-1">{results.candidatesResults[1].percentage}%</p>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {results?.candidatesResults[0] && (
                  <div className="flex flex-col items-center space-y-3 order-1 md:order-2">
                    <div className="h-20 w-20 rounded-full bg-slate-200 border-4 border-amber-400 overflow-hidden flex items-center justify-center font-bold">
                      {results.candidatesResults[0].photo_url ? (
                        <img src={results.candidatesResults[0].photo_url} className="h-full w-full object-cover" />
                      ) : '🥇'}
                    </div>
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 w-full p-6 rounded-t-2xl text-center border-t-2 border-amber-400 min-h-[180px] flex flex-col justify-center">
                      <span className="text-3xl">🥇</span>
                      <p className="font-bold text-slate-800 dark:text-white text-base mt-1">{results.candidatesResults[0].name}</p>
                      <p className="text-xs text-slate-500">Votos: {results.candidatesResults[0].votes}</p>
                      <p className="text-amber-600 dark:text-amber-400 text-lg font-bold mt-2">{results.candidatesResults[0].percentage}%</p>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {results?.candidatesResults[2] && (
                  <div className="flex flex-col items-center space-y-3 order-3 md:order-3">
                    <div className="h-14 w-14 rounded-full bg-slate-200 border-2 border-amber-600 overflow-hidden flex items-center justify-center font-bold">
                      {results.candidatesResults[2].photo_url ? (
                        <img src={results.candidatesResults[2].photo_url} className="h-full w-full object-cover" />
                      ) : '🥉'}
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 w-full p-4 rounded-t-2xl text-center border-t border-slate-200 dark:border-slate-700 min-h-[120px] flex flex-col justify-center">
                      <span className="text-xl">🥉</span>
                      <p className="font-bold text-slate-800 dark:text-white text-sm mt-1">{results.candidatesResults[2].name}</p>
                      <p className="text-xs text-slate-400">Votos: {results.candidatesResults[2].votes}</p>
                      <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold mt-1">{results.candidatesResults[2].percentage}%</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Flat list of all results */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                <h4 className="font-bold text-slate-800 dark:text-white mb-4">Consolidado General</h4>
                <div className="space-y-3">
                  {results?.candidatesResults.map((c, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-5">#{index + 1}</span>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{c.name}</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm font-bold">
                        <span className="text-slate-400">{c.votes} {c.votes === 1 ? 'voto' : 'votos'}</span>
                        <span className="text-slate-800 dark:text-white w-12 text-right">{c.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- MODAL: ELECTION --- */}
      {isElectionModalOpen && editingElection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingElection.id ? 'Editar Elección' : 'Nuevo Proceso Electoral'}
            </h3>
            <form onSubmit={handleSaveElection} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nombre</label>
                <input 
                  type="text"
                  value={editingElection.name || ''}
                  onChange={(e) => setEditingElection({...editingElection, name: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Descripción</label>
                <textarea
                  value={editingElection.description || ''}
                  onChange={(e) => setEditingElection({...editingElection, description: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Tipo</label>
                  <select
                    value={editingElection.type || 'official'}
                    onChange={(e) => setEditingElection({...editingElection, type: e.target.value as any})}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                  >
                    <option value="official">Oficial</option>
                    <option value="simulation">Simulacro</option>
                    <option value="survey">Encuesta</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Estado</label>
                  <select
                    value={editingElection.status || 'draft'}
                    onChange={(e) => setEditingElection({...editingElection, status: e.target.value as any})}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                  >
                    <option value="draft">Borrador</option>
                    <option value="active">Activo</option>
                    <option value="closed">Cerrado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Fecha Inicio</label>
                  <input 
                    type="datetime-local"
                    value={editingElection.start_date ? editingElection.start_date.slice(0, 16) : ''}
                    onChange={(e) => setEditingElection({...editingElection, start_date: new Date(e.target.value).toISOString()})}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Fecha Cierre</label>
                  <input 
                    type="datetime-local"
                    value={editingElection.end_date ? editingElection.end_date.slice(0, 16) : ''}
                    onChange={(e) => setEditingElection({...editingElection, end_date: new Date(e.target.value).toISOString()})}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="show_realtime_results"
                  checked={editingElection.show_realtime_results !== false}
                  onChange={(e) => setEditingElection({...editingElection, show_realtime_results: e.target.checked})}
                />
                <label htmlFor="show_realtime_results" className="text-sm text-slate-700 dark:text-slate-350">Mostrar resultados en tiempo real</label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsElectionModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-850 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-sm dark:bg-white dark:text-slate-900"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CANDIDATE --- */}
      {isCandidateModalOpen && editingCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingCandidate.id ? 'Editar Candidato' : 'Registrar Candidato'}
            </h3>
            <form onSubmit={handleSaveCandidate} className="space-y-4">
              {!editingCandidate.id && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Estudiante</label>
                  <select 
                    value={editingCandidate.student_id || ''}
                    onChange={(e) => setEditingCandidate({...editingCandidate, student_id: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                    required
                  >
                    <option value="">Selecciona el estudiante...</option>
                    {eligibleStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Grado {s.grade})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Número en Tarjetón</label>
                <input 
                  type="text"
                  value={editingCandidate.number || ''}
                  onChange={(e) => setEditingCandidate({...editingCandidate, number: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Resumen Propuesta</label>
                <textarea
                  value={editingCandidate.proposal || ''}
                  onChange={(e) => setEditingCandidate({...editingCandidate, proposal: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">URL Fotografía</label>
                <input 
                  type="text"
                  value={editingCandidate.photo_url || ''}
                  onChange={(e) => setEditingCandidate({...editingCandidate, photo_url: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">URL Video Campaña (YouTube)</label>
                <input 
                  type="text"
                  value={editingCandidate.video_url || ''}
                  onChange={(e) => setEditingCandidate({...editingCandidate, video_url: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-850 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-sm dark:bg-white dark:text-slate-900"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: TABLE (MESA) --- */}
      {isTableModalOpen && editingTable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingTable.id ? 'Editar Mesa' : 'Nueva Mesa de Votación'}
            </h3>
            <form onSubmit={handleSaveTable} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nombre</label>
                <input 
                  type="text"
                  value={editingTable.name || ''}
                  onChange={(e) => setEditingTable({...editingTable, name: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Grados Habilitados (Separados por coma)</label>
                <input 
                  type="text"
                  value={editingTable.enabled_grades?.join(', ') || ''}
                  onChange={(e) => setEditingTable({...editingTable, enabled_grades: e.target.value.split(',').map(s => s.trim())})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
                  placeholder="10°A, 10°B, 11°A"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsTableModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-850 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-sm dark:bg-white dark:text-slate-900"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
