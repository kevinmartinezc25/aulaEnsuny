'use client'

import React, { useState, useEffect } from 'react'
import { Award, UserCheck, ShieldCheck, CheckCircle2, FileText, ExternalLink, Play, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { 
  getElections, checkVoterStatus, submitVote, getCandidates, getDebates,
  Election, Candidate, Debate
} from '@/modules/elections/application/actions'

export default function StudentElectionsPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [selectedElectionId, setSelectedElectionId] = useState<string>('')
  
  // Status states
  const [voterStatus, setVoterStatus] = useState<{ enabled: boolean; hasVoted: boolean; tableId?: string } | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [debates, setDebates] = useState<Debate[]>([])
  
  // Voting flow state
  const [step, setStep] = useState<'validate' | 'tarjeton' | 'voted'>('validate')
  const [identityConfirmed, setIdentityConfirmed] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null) // null = Voto en Blanco
  
  // Candidate detail modal
  const [selectedCandidateForPlan, setSelectedCandidateForPlan] = useState<Candidate | null>(null)

  // Loading indicator
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadElections()
  }, [])

  useEffect(() => {
    if (selectedElectionId) {
      loadElectionData(selectedElectionId)
    }
  }, [selectedElectionId])

  async function loadElections() {
    const list = await getElections()
    // Filtramos solo elecciones activas
    const activeList = list.filter(e => e.status === 'active')
    setElections(activeList)
    if (activeList.length > 0) {
      setSelectedElectionId(activeList[0].id)
    } else {
      setLoading(false)
    }
  }

  async function loadElectionData(id: string) {
    setLoading(true)
    const [status, cList, dList] = await Promise.all([
      checkVoterStatus(id),
      getCandidates(id),
      getDebates(id)
    ])
    setVoterStatus(status)
    setCandidates(cList)
    setDebates(dList)
    
    if (status.hasVoted) {
      setStep('voted')
    } else {
      setStep('validate')
    }
    setLoading(false)
  }

  async function handleConfirmIdentity() {
    if (!identityConfirmed) {
      toast.error('Por favor confirma la declaración de identidad para continuar')
      return
    }
    setStep('tarjeton')
  }

  async function handleVoteSubmission() {
    if (!selectedElectionId) return

    const selectedName = selectedCandidateId === null 
      ? 'Voto en Blanco' 
      : candidates.find(c => c.id === selectedCandidateId)?.student_name || 'Candidato Seleccionado'

    if (confirm(`¿Estás seguro de registrar tu voto por: "${selectedName}"? Esta acción es irreversible.`)) {
      setLoading(true)
      const res = await submitVote(selectedElectionId, selectedCandidateId, voterStatus?.tableId || null)
      setLoading(false)
      
      if (res.success) {
        toast.success('¡Tu voto ha sido registrado exitosamente!')
        setStep('voted')
        if (voterStatus) {
          setVoterStatus({ ...voterStatus, hasVoted: true })
        }
      } else {
        toast.error(res.error || 'Error al enviar el voto')
      }
    }
  }

  function handleDownloadCertificate() {
    // Simular generación de certificado
    toast.success('Descargando tu Certificado de Participación Electoral en PDF...')
    
    const docText = `
      CERTIFICADO DE PARTICIPACIÓN ELECTORAL
      -------------------------------------
      El LMS aulaEnsuny certifica que el estudiante ha ejercido
      exitosamente su derecho al voto en el proceso democrático:
      
      Elección: ${elections.find(e => e.id === selectedElectionId)?.name}
      Fecha: ${new Date().toLocaleString()}
      Código de Transacción: ${Math.random().toString(36).substring(2, 15).toUpperCase()}
      
      ¡Gracias por construir democracia escolar!
    `
    const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Certificado_Votacion_${selectedElectionId}.txt`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent animate-spin rounded-full mx-auto"></div>
          <p className="text-slate-500 text-sm font-semibold">Cargando cabina de votación...</p>
        </div>
      </div>
    )
  }

  if (elections.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl text-center space-y-4 shadow-sm">
        <Award className="h-16 w-16 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">No hay elecciones activas</h2>
        <p className="text-sm text-slate-400">En este momento no hay ningún proceso de votación o simulacro habilitado para tu perfil académico.</p>
      </div>
    )
  }

  const currentElection = elections.find(e => e.id === selectedElectionId)

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 text-xs font-bold rounded-full uppercase tracking-wider">
            {currentElection?.type === 'simulation' ? 'Simulacro Electoral' : 'Elección Oficial'}
          </span>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white mt-2">{currentElection?.name}</h1>
          <p className="text-slate-400 text-sm mt-1">{currentElection?.description}</p>
        </div>
        
        {elections.length > 1 && (
          <select 
            value={selectedElectionId} 
            onChange={(e) => setSelectedElectionId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            {elections.map(el => (
              <option key={el.id} value={el.id}>{el.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* --- STEP 1: VALIDATION --- */}
      {step === 'validate' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm space-y-6 max-w-xl mx-auto">
          <div className="text-center space-y-2">
            <UserCheck className="h-12 w-12 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Confirmación de Identidad</h2>
            <p className="text-xs text-slate-400">Verifica que tus datos corresponden antes de ingresar a la cabina digital.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm space-y-2">
            <p className="text-slate-500">Asegúrate de que tus datos escolares son correctos. De lo contrario, contacta a un jurado de mesa.</p>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
            <input 
              type="checkbox" 
              id="confirm" 
              checked={identityConfirmed}
              onChange={(e) => setIdentityConfirmed(e.target.checked)}
              className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500" 
            />
            <label htmlFor="confirm" className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">
              Confirmo que ejerceré mi derecho al voto de manera voluntaria, libre y secreta en este proceso.
            </label>
          </div>

          <button
            onClick={handleConfirmIdentity}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all dark:bg-white dark:text-slate-900"
          >
            Ingresar al Tarjetón Digital
          </button>
        </div>
      )}

      {/* --- STEP 2: TARJETON DIGITAL --- */}
      {step === 'tarjeton' && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Tarjetón Electoral Digital</h2>
            <p className="text-sm text-slate-400">Selecciona el candidato de tu preferencia. Haz clic sobre la casilla y presiona "Registrar Voto".</p>
          </div>

          {/* Candidates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map(c => {
              const isSelected = selectedCandidateId === c.id
              return (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedCandidateId(c.id)}
                  className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between h-[340px] relative ${
                    isSelected 
                      ? 'border-emerald-600 ring-4 ring-emerald-50 dark:ring-emerald-950/20' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-4xl font-extrabold text-slate-200 dark:text-slate-800 tracking-tight">
                        #{c.number}
                      </span>
                      <input 
                        type="radio" 
                        name="tarjeton" 
                        checked={isSelected}
                        onChange={() => setSelectedCandidateId(c.id)}
                        className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                      />
                    </div>

                    {/* Candidate photo */}
                    <div className="h-24 w-24 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-400 mx-auto">
                      {c.photo_url ? (
                        <img src={c.photo_url} className="h-full w-full object-cover" alt={c.student_name} />
                      ) : 'FOTO'}
                    </div>

                    <div className="text-center space-y-0.5">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{c.student_name}</h4>
                      <p className="text-xs text-slate-400">Grado {c.student_grade}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCandidateForPlan(c)
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> Plan de Gobierno
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Voto en Blanco Card */}
            <div 
              onClick={() => setSelectedCandidateId(null)}
              className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between h-[340px] relative ${
                selectedCandidateId === null 
                  ? 'border-emerald-600 ring-4 ring-emerald-50 dark:ring-emerald-950/20' 
                  : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <span className="text-4xl font-extrabold text-slate-200 dark:text-slate-800">00</span>
                  <input 
                    type="radio" 
                    name="tarjeton" 
                    checked={selectedCandidateId === null}
                    onChange={() => setSelectedCandidateId(null)}
                    className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                  />
                </div>

                <div className="h-24 w-24 rounded-2xl bg-slate-50 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center font-bold text-slate-400 mx-auto">
                  ○
                </div>

                <div className="text-center">
                  <h4 className="font-bold text-slate-950 dark:text-white text-base">Voto en Blanco</h4>
                  <p className="text-xs text-slate-400 mt-1">Opción democrática libre</p>
                </div>
              </div>
            </div>
          </div>

          {/* Voting Action */}
          <div className="flex justify-center pt-8">
            <button
              onClick={handleVoteSubmission}
              className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base transition-all dark:bg-white dark:text-slate-900"
            >
              Registrar Voto
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 3: VOTED / SUCCESS SCREEN --- */}
      {step === 'voted' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm text-center space-y-6 max-w-xl mx-auto">
          <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">¡Votación Completada!</h2>
            <p className="text-sm text-slate-400">Tu participación ha sido registrada con éxito en el sistema auditado. El proceso garantiza el anonimato de tu elección.</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <button
              onClick={handleDownloadCertificate}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 text-sm transition-all"
            >
              <FileText className="h-4 w-4" /> Descargar Certificado
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: CANDIDATE GOVERNMENT PLAN --- */}
      {selectedCandidateForPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-100 dark:border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-950 dark:text-white">Plan de Gobierno</h3>
                <p className="text-xs text-slate-400 mt-1">Candidato #{selectedCandidateForPlan.number} - {selectedCandidateForPlan.student_name}</p>
              </div>
              <button 
                onClick={() => setSelectedCandidateForPlan(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase">Resumen de Campaña</p>
                <p>{selectedCandidateForPlan.proposal || 'No registrada'}</p>
              </div>

              {selectedCandidateForPlan.video_url && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Video de Presentación</p>
                  <div className="aspect-video w-full bg-slate-100 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-200">
                    <a 
                      href={selectedCandidateForPlan.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 flex items-center justify-center text-white hover:bg-black/50 transition-colors gap-2 font-bold"
                    >
                      <Play className="h-8 w-8 fill-white" /> Ver Video de Campaña
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
