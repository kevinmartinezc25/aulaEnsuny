'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, Save, AlertCircle, CheckCircle2,
  UserCheck, ShieldAlert, FileText, PenTool, LayoutDashboard, Users
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { createClient } from '@/core/config/supabase/client'
import { StudentRef, DisciplinarySituation, createDisciplinaryReport, getStudentDisciplinaryHistory, getTeacherAssignedGroups } from '@/modules/disciplinary/application/actions'
import { getSituations } from '@/modules/disciplinary/application/situationsActions'
import { StudentSearchField } from '@/components/disciplinary/StudentSearchField'
import { SituationSearchField } from '@/components/disciplinary/SituationSearchField'
import { ReportPreviewDocument } from '@/components/disciplinary/ReportPreviewDocument'
import { SignatureCanvas, SignatureCanvasRef } from '@/components/disciplinary/SignatureCanvas'
import { ConfidentialityModal } from '@/components/disciplinary/ConfidentialityModal'

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { num: 1, label: 'Estudiante', icon: UserCheck },
    { num: 2, label: 'Situación', icon: ShieldAlert },
    { num: 3, label: 'Descripción', icon: FileText },
    { num: 4, label: 'Vista Previa', icon: LayoutDashboard },
    { num: 5, label: 'Firma', icon: PenTool },
  ]

  return (
    <div className="flex items-center justify-between relative max-w-3xl mx-auto mb-8 px-2 sm:px-0">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0" />
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full z-0 transition-all duration-500" 
        style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
      />
      
      {steps.map((step) => {
        const Icon = step.icon
        const isActive = step.num === currentStep
        const isPast = step.num < currentStep
        
        return (
          <div key={step.num} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
              isActive 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : isPast
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}>
              {isPast ? <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" /> : <Icon className="h-5 w-5 sm:h-6 sm:w-6" />}
            </div>
            <span className={`text-[10px] sm:text-xs font-semibold hidden sm:block ${
              isActive ? 'text-blue-600 dark:text-blue-400' : isPast ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400'
            }`}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function DisciplinaryReportFormScreen() {
  const router = useRouter()
  
  // ── ESTADO DEL FORMULARIO ──────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1)
  const [student, setStudent] = useState<StudentRef | null>(null)
  const [situation, setSituation] = useState<DisciplinarySituation | null>(null)
  const [description, setDescription] = useState('')
  const [studentDefense, setStudentDefense] = useState('')
  const [studentCommitment, setStudentCommitment] = useState('')
  const signatureRef = useRef<SignatureCanvasRef>(null)
  
  // ── ESTADO DE DATOS EXTERNOS ───────────────────────────────────────────────
  const [situations, setSituations] = useState<DisciplinarySituation[]>([])
  const [history, setHistory] = useState<any>(null) // StudentDisciplinaryHistory
  const [historyLoading, setHistoryLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [showConfidentiality, setShowConfidentiality] = useState(true)
  const [teacherGroups, setTeacherGroups] = useState<{id: string, name: string, level: string}[]>([])
  const [selectedGroupName, setSelectedGroupName] = useState<string>('')
  const [groupsLoading, setGroupsLoading] = useState(true)

  // Cargar catálogo de situaciones activas al inicio
  useEffect(() => {
    async function loadSituations() {
      const data = await getSituations({ activeOnly: true })
      setSituations(data)
    }
    loadSituations()
  }, [])
  
  // Cargar grupos del docente
  useEffect(() => {
    async function loadGroups() {
      const groups = await getTeacherAssignedGroups()
      setTeacherGroups(groups)
      setGroupsLoading(false)
    }
    loadGroups()
  }, [])

  // Cargar historial del estudiante al seleccionarlo
  useEffect(() => {
    async function loadHistory() {
      if (!student) {
        setHistory(null)
        return
      }
      setHistoryLoading(true)
      const data = await getStudentDisciplinaryHistory(
        student.source === 'profile' ? student.id : undefined,
        student.source === 'directory' ? student.id : undefined
      )
      setHistory(data)
      setHistoryLoading(false)
    }
    loadHistory()
  }, [student])

  // ── NAVEGACIÓN ENTRE PASOS ─────────────────────────────────────────────────
  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 1:
        if (!student) {
          toast.error('Debe seleccionar un estudiante')
          return false
        }
        return true
      case 2:
        if (!situation) {
          toast.error('Debe seleccionar una situación')
          return false
        }
        return true
      case 3:
        if (description.trim().length < 20) {
          toast.error('La descripción debe ser más detallada (mínimo 20 caracteres)')
          return false
        }
        return true
      case 4:
        return true
      case 5:
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 5) as Step)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1) as Step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── ENVÍO DEL FORMULARIO ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep(3)) return // Validar hasta el paso 3
    if (!student || !situation) return
    
    // Validar firma (al menos un intento)
    const sigEmpty = signatureRef.current?.isEmpty()
    if (sigEmpty) {
      toast.error('El estudiante debe firmar el reporte para continuar')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('Guardando reporte y firma...')

    try {
      const signatureDataUrl = signatureRef.current?.getDataURL()
      let signatureUrl: string | undefined

      // Subir firma a Supabase Storage si existe
      if (signatureDataUrl) {
        const supabase = createClient()
        // Convertir dataURL a Blob
        const blob = await (await fetch(signatureDataUrl)).blob()
        const fileName = `signature_${student.id}_${Date.now()}.png`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(fileName, blob, { contentType: 'image/png' })
          
        if (uploadError) {
          console.error('Error uploading signature:', uploadError)
          toast.warning('El reporte se guardará, pero hubo un problema al guardar la imagen de la firma.', { id: toastId })
        } else {
          // Obtener URL pública (asumiendo que es necesario, si el bucket es privado se usa signed URL luego)
          const { data: { publicUrl } } = supabase.storage
            .from('signatures')
            .getPublicUrl(fileName)
          signatureUrl = publicUrl
        }
      }

      // Generar texto final
      const reportText = `El/la estudiante ${student.fullName}, perteneciente al grado ${student.gradeLevel} (grupo ${student.groupName}), incurre presuntamente en la situación clasificada como ${situation.type} (Código: ${situation.code}) — "${situation.title}", consistente en: ${situation.description}.`

      const result = await createDisciplinaryReport({
        student,
        situationId: situation.id,
        situationSnapshot: {
          code: situation.code,
          type: situation.type,
          title: situation.title,
          description: situation.description,
          manualReference: situation.manualReference,
        },
        teacherDescription: description.trim(),
        studentDefense: studentDefense.trim(),
        studentCommitment: studentCommitment.trim(),
        generatedReport: reportText,
        studentSignatureUrl: signatureUrl,
        signatureConfirmed: true, // Si llegamos aquí, la firma fue hecha
      })

      if (!result.success) throw new Error(result.error)

      toast.success('Reporte disciplinario guardado exitosamente', { id: toastId })
      router.push(`/teacher/disciplinary/${result.reportId}`)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el reporte', { id: toastId })
      setIsSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER DE PASOS
  // ─────────────────────────────────────────────────────────────────────────

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Paso 1: Seleccionar Estudiante
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Busca al estudiante involucrado. Filtra por tus grupos asignados.
              </p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" /> Grupo Asignado
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedGroupName}
                    onChange={(e) => {
                      setSelectedGroupName(e.target.value)
                      setStudent(null)
                    }}
                    disabled={groupsLoading || teacherGroups.length === 0}
                    className="w-full sm:w-1/2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <option value="">Todos mis grupos</option>
                    {teacherGroups.map(g => (
                      <option key={g.id} value={g.name}>{g.name} ({g.level})</option>
                    ))}
                  </select>
                  {groupsLoading && <span className="text-xs text-slate-500">Cargando grupos...</span>}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Buscar Estudiante
                </label>
                <StudentSearchField
                  value={student}
                  onChange={setStudent}
                  groupName={selectedGroupName || undefined}
                />
              </div>
            </div>

            {historyLoading && (
              <div className="animate-pulse bg-slate-100 dark:bg-slate-800 h-32 rounded-xl" />
            )}

            {history && student && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Antecedentes Disciplinarios
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{history.totalReports}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Reportes</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{history.tipoI}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tipo I</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{history.tipoII}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tipo II</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{history.tipoIII}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tipo III</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Paso 2: Tipificar la Situación
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Selecciona la situación del Manual de Convivencia que se ajusta a los hechos.
              </p>
            </div>
            
            <SituationSearchField
              situations={situations}
              value={situation}
              onChange={setSituation}
            />
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Paso 3: Descripción de los Hechos
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Describe detalladamente cómo ocurrieron los hechos. Esta información es crucial para el debido proceso.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1 text-sm">💡 Guía de redacción:</h4>
              <ul className="list-disc pl-5 text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>Sé objetivo y claro, evitando juicios de valor.</li>
                <li>Menciona fechas, horas y lugares específicos si es posible.</li>
                <li>Nombra a otros involucrados si los hay.</li>
                <li>Describe las acciones concretas observadas.</li>
              </ul>
            </div>

            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ejemplo: Durante la clase de matemáticas a las 10:30 am, el estudiante..."
                className="w-full h-32 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
              />
              <div className="absolute bottom-3 right-3 text-xs text-slate-400 font-mono">
                {description.length} caracteres
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 mt-4">
                Descargos del Estudiante (Opcional)
              </h3>
              <div className="relative">
                <textarea
                  value={studentDefense}
                  onChange={(e) => setStudentDefense(e.target.value)}
                  placeholder="Versión de los hechos según el estudiante..."
                  className="w-full h-24 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 mt-4">
                Compromiso Final (Opcional)
              </h3>
              <div className="relative">
                <textarea
                  value={studentCommitment}
                  onChange={(e) => setStudentCommitment(e.target.value)}
                  placeholder="Compromiso asumido por el estudiante frente a la situación..."
                  className="w-full h-24 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                />
              </div>
            </div>
          </motion.div>
        )

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Paso 4: Vista Previa del Documento
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Verifica que la información sea correcta antes de proceder a la firma.
                </p>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 p-2 sm:p-8 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <ReportPreviewDocument
                student={student}
                situation={situation}
                teacherDescription={description}
                studentDefense={studentDefense}
                studentCommitment={studentCommitment}
                date={new Date()}
              />
            </div>
          </motion.div>
        )

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Paso 5: Firma del Estudiante
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Solicita al estudiante que firme el reporte. Esto garantiza el debido proceso y la notificación de la situación.
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                  Yo, <span className="font-bold text-slate-900 dark:text-white">{student?.fullName}</span>, firmo el presente documento en señal de notificación sobre la novedad disciplinaria reportada.
                </p>
              </div>

              <SignatureCanvas ref={signatureRef} />
              
              <div className="flex gap-4 justify-center pt-8">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg w-full justify-center sm:w-auto"
                >
                  {isSubmitting ? (
                    'Guardando...'
                  ) : (
                    <>
                      <Save className="h-5 w-5" /> Guardar Reporte Definitivo
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <ConfidentialityModal 
        isOpen={showConfidentiality} 
        onAccept={() => setShowConfidentiality(false)} 
      />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Encabezado */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/teacher/disciplinary"
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Nuevo Reporte Disciplinario
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Registra una novedad de convivencia siguiendo el debido proceso
            </p>
          </div>
        </div>

        {/* Indicador de pasos */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6">
          <StepIndicator currentStep={step} />

          {/* Contenido del paso actual */}
          <div className="mt-8 min-h-[400px]">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </div>
        </div>

        {/* Controles de navegación inferiores (excepto paso 5) */}
        {step < 5 && (
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors ${
                step === 1 
                  ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                  : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800'
              }`}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all"
            >
              Continuar <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
