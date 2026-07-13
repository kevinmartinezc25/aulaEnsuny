'use client'

import React, { useState, useEffect } from 'react'
import { Award, ShieldAlert, FileText, CheckCircle2, RefreshCw, Users } from 'lucide-react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import { 
  getElections, getElectionTables, getElectionVoters, getJurors, getElectionResults,
  submitAssistedVote, getCandidates, getTableVotesCount,
  Election, ElectionTable, Voter, Juror, ElectionResultsSummary, Candidate
} from '@/modules/elections/application/actions'

export default function JurorElectionsPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [selectedElectionId, setSelectedElectionId] = useState<string>('')
   const [assignedTable, setAssignedTable] = useState<ElectionTable | null>(null)
  const [voters, setVoters] = useState<Voter[]>([])
  const [results, setResults] = useState<ElectionResultsSummary | null>(null)
  const [votedCount, setVotedCount] = useState<number>(0)
  
  // Assisted Voting Cabin states
  const [isAssistedCabinOpen, setIsAssistedCabinOpen] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [assistedSuccess, setAssistedSuccess] = useState(false)
  
  // Custom confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [candidateToConfirm, setCandidateToConfirm] = useState<Candidate | null>(null)
  const [activeVoterForAssisted, setActiveVoterForAssisted] = useState<Voter | null>(null)

  const [loading, setLoading] = useState(true)
  const [incidents, setIncidents] = useState<string[]>([])
  const [newIncident, setNewIncident] = useState('')

  useEffect(() => {
    loadElections()
  }, [])

  useEffect(() => {
    if (selectedElectionId) {
      loadJurorData(selectedElectionId)
    }
  }, [selectedElectionId])

  async function loadElections() {
    const list = await getElections()
    const activeList = list.filter(e => e.status === 'active')
    setElections(activeList)
    if (activeList.length > 0) {
      setSelectedElectionId(activeList[0].id)
    } else {
      setLoading(false)
    }
  }

  async function loadJurorData(electionId: string, silent = false) {
    if (!silent) setLoading(true)
    
    // 1. Obtener datos de jurados, mesas y candidatos
    const [tables, allJurors, allVoters, resSummary, cList] = await Promise.all([
      getElectionTables(electionId),
      getJurors(electionId),
      getElectionVoters(electionId),
      getElectionResults(electionId),
      getCandidates(electionId)
    ])

    setCandidates(cList)

    let votesCount = 0

    // Nota: en una sesión real compararíamos con el ID de usuario activo
    // Para simplificar y permitir pruebas rápidas de jurados, asumimos que este jurado 
    // tiene acceso al monitoreo de la primera mesa disponible
    if (tables.length > 0) {
      const firstTable = tables[0]
      setAssignedTable(firstTable)
      
      // Filtrar votantes asignados a los grados de esta mesa
      const tableGrades = firstTable.enabled_grades || []
      const filteredVoters = allVoters.filter(v => {
        const sg = (v.student_grade || '').trim().toLowerCase()
        return tableGrades.some(tg => {
          const cleanTg = tg.trim().toLowerCase()
          return sg.startsWith(cleanTg) || cleanTg.startsWith(sg)
        })
      })
      setVoters(filteredVoters)

      // Obtener cantidad de votos reales en la urna de esta mesa
      votesCount = await getTableVotesCount(firstTable.id)
    } else {
      setAssignedTable(null)
      setVoters([])
    }

    setVotedCount(votesCount)
    setResults(resSummary)
    if (!silent) setLoading(false)
  }

  function handleAddIncident(e: React.FormEvent) {
    e.preventDefault()
    if (!newIncident.trim()) return
    const time = new Date().toLocaleTimeString()
    setIncidents([`[${time}] ${newIncident.trim()}`, ...incidents])
    setNewIncident('')
    toast.success('Incidencia registrada')
  }

  function handleGeneratePartialAct() {
    toast.success('Generando acta de mesa...')
    
    const doc = new jsPDF()
    const electionName = elections.find(e => e.id === selectedElectionId)?.name || ''
    const tableName = assignedTable?.name || 'Mesa 01'
    const dateStr = new Date().toLocaleString()
    const partPct = voters.length > 0 ? ((votedCount / voters.length) * 100).toFixed(1) : 0

    // Header styling
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(16, 185, 129) // emerald-500
    doc.text('ACTA ELECTORAL PARCIAL - MESA DE JURADOS', 20, 25)

    doc.setDrawColor(226, 232, 240) // border slate-200
    doc.line(20, 30, 190, 30)

    // Details block
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(51, 65, 85) // slate-700
    doc.text(`Elección: ${electionName}`, 20, 42)
    doc.text(`Mesa: ${tableName}`, 20, 50)
    doc.text(`Fecha y Hora de Cierre Parcial: ${dateStr}`, 20, 58)

    doc.line(20, 65, 190, 65)

    // Censo block
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('CENSO DE MESA', 20, 75)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Total Habilitados en Mesa: ${voters.length}`, 20, 85)
    doc.text(`Total Votos Registrados en Mesa: ${votedCount}`, 20, 93)
    doc.text(`Porcentaje de Participación: ${partPct}%`, 20, 101)

    doc.line(20, 108, 190, 108)

    // Incidents block
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('INCIDENCIAS REGISTRADAS', 20, 118)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    let yPos = 128
    if (incidents.length > 0) {
      incidents.forEach((inc) => {
        // Wrap text to avoid overflow
        const splitText = doc.splitTextToSize(inc, 160)
        doc.text(splitText, 20, yPos)
        yPos += splitText.length * 6
      })
    } else {
      doc.text('Sin novedades registradas.', 20, yPos)
      yPos += 10
    }

    doc.line(20, yPos, 190, yPos)
    yPos += 15

    // Signatures block
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Firmas Jurados de Mesa:', 20, yPos)
    
    yPos += 25
    doc.line(20, yPos, 85, yPos)
    doc.line(110, yPos, 175, yPos)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Firma Jurado 1', 20, yPos + 5)
    doc.text('Firma Jurado 2', 110, yPos + 5)

    // Save the PDF
    doc.save(`Acta_Parcial_Mesa_${tableName}.pdf`)
    toast.success('Acta Parcial en PDF descargada')
  }

  function handleAssistedVote() {
    const candidate = selectedCandidateId === null 
      ? null 
      : candidates.find(c => c.id === selectedCandidateId) || null

    setCandidateToConfirm(candidate)
    setShowConfirmModal(true)
  }

  async function executeAssistedVote() {
    if (!selectedElectionId || !assignedTable) return
    setShowConfirmModal(false)

    const studentId = activeVoterForAssisted?.student_id || null

    const res = await submitAssistedVote(selectedElectionId, selectedCandidateId, assignedTable.id, studentId)
    if (res.success) {
      toast.success('Voto asistido registrado')
      setAssistedSuccess(true)
      setTimeout(() => {
        setAssistedSuccess(false)
        setSelectedCandidateId(null)
        setCandidateToConfirm(null)
        setActiveVoterForAssisted(null)
        loadJurorData(selectedElectionId, true) // Recargar silenciosamente sin spinner
      }, 2000)
    } else {
      toast.error(res.error || 'Error al registrar voto asistido')
      setCandidateToConfirm(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent animate-spin rounded-full mx-auto"></div>
          <p className="text-slate-500 text-sm font-semibold">Cargando panel de jurados...</p>
        </div>
      </div>
    )
  }

  if (elections.length === 0 || !assignedTable) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl text-center space-y-4 shadow-sm">
        <Award className="h-16 w-16 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Sin asignaciones de jurado</h2>
        <p className="text-sm text-slate-400">Actualmente no estás asignado como jurado en ninguna mesa de votación para elecciones activas.</p>
      </div>
    )
  }


  const participationPct = voters.length > 0 ? ((votedCount / voters.length) * 100).toFixed(1) : 0

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" /> Panel de Jurados de Mesa
          </h1>
          <p className="text-slate-500 text-sm mt-1">Supervisión, registro de incidencias y control del censo en tu mesa de votación.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-500">Elección Activa:</span>
          <select 
            value={selectedElectionId} 
            onChange={(e) => setSelectedElectionId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            {elections.map(el => (
              <option key={el.id} value={el.id}>{el.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mesa Asignada</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
              {assignedTable.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Grados: {assignedTable.enabled_grades?.join(', ')}</p>
          </div>
          <Award className="h-10 w-10 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-xl" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Censo de Mesa</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
              {votedCount} / {voters.length} Votaron
            </h3>
            <p className="text-xs text-slate-400 mt-1">Participación: {participationPct}%</p>
          </div>
          <Users className="h-10 w-10 text-blue-500 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-xl" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Reportar Acta</p>
            <button 
              onClick={handleGeneratePartialAct}
              className="mt-2 flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs dark:bg-white dark:text-slate-900"
            >
              <FileText className="h-3.5 w-3.5" /> Descargar Acta Parcial
            </button>
          </div>
          <FileText className="h-10 w-10 text-purple-500 bg-purple-50 dark:bg-purple-950/20 p-2 rounded-xl" />
        </div>
      </div>

      {/* Cabina de Asistencia Electoral */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">Cabina de Asistencia Electoral</h4>
            <p className="text-xs text-slate-400 mt-0.5">Permite abrir la cabina de votación en esta máquina para alumnos que no posean perfil en la plataforma o requieran ayuda física (se tacha en la lista física de papel).</p>
          </div>
          <button
            onClick={() => {
              setSelectedCandidateId(null)
              setIsAssistedCabinOpen(true)
            }}
            disabled={voters.length > 0 && voters.length - votedCount <= 0}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Users className="h-4 w-4" /> {voters.length > 0 && voters.length - votedCount <= 0 ? 'Mesa Completada' : 'Abrir Cabina de Asistencia'}
          </button>
        </div>
      </div>

      {/* Registro de Incidencias */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-500" /> Registro de Incidencias
        </h3>
        
        <form onSubmit={handleAddIncident} className="space-y-3">
          <textarea
            value={newIncident}
            onChange={(e) => setNewIncident(e.target.value)}
            placeholder="Describa el incidente ocurrido en la mesa..."
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white"
            required
          />
          <button 
            type="submit"
            className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 text-xs dark:bg-white dark:text-slate-900"
          >
            Reportar Novedad
          </button>
        </form>

        <div className="space-y-2 max-h-[200px] overflow-y-auto pt-2">
          {incidents.map((inc, idx) => (
            <div key={idx} className="p-2 bg-rose-50/50 dark:bg-rose-950/10 text-rose-800 dark:text-rose-300 rounded-xl text-xs">
              {inc}
            </div>
          ))}
          {incidents.length === 0 && <p className="text-xs text-slate-400">Sin incidencias reportadas en la jornada.</p>}
        </div>
      </div>

      {/* Votantes de esta Mesa */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Votantes de esta Mesa</h3>
          <button 
            onClick={() => loadJurorData(selectedElectionId)}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refrescar Censo
          </button>
        </div>

        <div className="overflow-x-auto max-h-[350px]">
          <table className="w-full text-left text-sm text-slate-500">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 sticky top-0">
              <tr>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Grado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {voters.map(v => (
                <tr key={v.id}>
                  <td className="px-6 py-3 font-semibold text-slate-800 dark:text-white">{v.student_name}</td>
                  <td className="px-6 py-3 font-bold text-slate-500">{v.student_grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assisted Voting Cabin Overlay */}
      {isAssistedCabinOpen && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50 overflow-y-auto p-8 flex flex-col justify-between">
          <div className="max-w-4xl mx-auto w-full space-y-8 pb-16">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-600 dark:bg-amber-950/20 text-xs font-bold rounded-full uppercase tracking-wider">
                    Cabina Asistida - Mesa {assignedTable?.name}
                  </span>
                  {activeVoterForAssisted && (
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-950/20 text-xs font-bold rounded-full uppercase tracking-wider">
                      Votante: {activeVoterForAssisted.student_name}
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                    Votaron: {votedCount}/{voters.length} | Faltan: {voters.length - votedCount}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                  Por favor selecciona tu opción de voto en la pantalla
                </h2>
              </div>
              <button 
                onClick={() => setIsAssistedCabinOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 hover:bg-slate-50"
              >
                Cerrar Cabina
              </button>
            </div>


            {voters.length > 0 && voters.length - votedCount <= 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl text-center space-y-6 max-w-md mx-auto shadow-xl my-auto animate-in fade-in zoom-in-95 duration-200">
                <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto animate-bounce" />
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">Jornada Electoral Concluida</h3>
                  <p className="text-sm text-slate-400 font-medium">
                    Todos los votantes habilitados de esta mesa ({voters.length}/{voters.length}) han registrado su voto con éxito.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                  La cabina digital de esta mesa se encuentra bloqueada automáticamente para evitar registros adicionales.
                </div>
              </div>
            ) : assistedSuccess ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl text-center space-y-4 max-w-md mx-auto shadow-xl">
                <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">¡Voto Registrado!</h3>
                <p className="text-sm text-slate-400">Su voto ha sido contabilizado con éxito en el sistema. Registre su firma física en la lista de papel antes de retirarse.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {candidates.map(c => {
                    const isSelected = selectedCandidateId === c.id
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => setSelectedCandidateId(c.id)}
                        className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between h-[300px] relative ${
                          isSelected 
                            ? 'border-emerald-600 ring-4 ring-emerald-50 dark:ring-emerald-950/20' 
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <span className="text-4xl font-extrabold text-slate-200 dark:text-slate-850">
                              #{c.number}
                            </span>
                            <input 
                              type="radio" 
                              name="assisted_tarjeton" 
                              checked={isSelected}
                              onChange={() => setSelectedCandidateId(c.id)}
                              className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                            />
                          </div>

                          <div className="h-24 w-24 rounded-2xl bg-slate-105 overflow-hidden flex items-center justify-center font-bold text-slate-400 mx-auto">
                            {c.photo_url ? (
                              <img src={c.photo_url} className="h-full w-full object-cover" alt={c.student_name} />
                            ) : 'FOTO'}
                          </div>

                          <div className="text-center">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{c.student_name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Grado {c.student_grade}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div 
                    onClick={() => setSelectedCandidateId(null)}
                    className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between h-[300px] relative ${
                      selectedCandidateId === null 
                        ? 'border-emerald-600 ring-4 ring-emerald-50 dark:ring-emerald-950/20' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <span className="text-4xl font-extrabold text-slate-200 dark:text-slate-850">00</span>
                        <input 
                          type="radio" 
                          name="assisted_tarjeton" 
                          checked={selectedCandidateId === null}
                          onChange={() => setSelectedCandidateId(null)}
                          className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                        />
                      </div>

                      <div className="h-24 w-24 rounded-2xl bg-slate-50 border border-dashed border-slate-250 dark:border-slate-800 flex items-center justify-center font-bold text-slate-400 mx-auto">
                        ○
                      </div>

                      <div className="text-center">
                        <h4 className="font-bold text-slate-950 dark:text-white text-sm">Voto en Blanco</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Opción democrática libre</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-8">
                  <button
                    onClick={handleAssistedVote}
                    className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base transition-all dark:bg-white dark:text-slate-900"
                  >
                    Registrar Voto Asistido
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Assisted Vote */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto text-emerald-600">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirmar Voto Asistido</h3>
              <p className="text-xs text-slate-400">
                ¿Confirmar registro de voto asistido en mesa <span className="font-semibold text-slate-700 dark:text-slate-200">{assignedTable?.name}</span> para:
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mt-2">
                <span className="text-sm font-extrabold text-slate-800 dark:text-white">
                  {candidateToConfirm === null 
                    ? 'Voto en Blanco' 
                    : candidateToConfirm.student_name}
                </span>
                {candidateToConfirm !== null && (
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    Candidato #{candidateToConfirm.number} - Grado {candidateToConfirm.student_grade}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setCandidateToConfirm(null)
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={executeAssistedVote}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10"
              >
                Confirmar Voto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
