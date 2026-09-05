'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ChevronRight,
  ChevronLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  FileText,
  PenTool,
  LayoutDashboard,
  Users,
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { createClient } from '@/core/config/supabase/client'
import {
  StudentRef,
  DisciplinarySituation,
  StudentDisciplinaryHistory,
  createDisciplinaryReport,
  getStudentDisciplinaryHistory,
  getTeacherAssignedGroups
} from '@/modules/disciplinary/application/actions'
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
// COMPONENTES AUXILIARES: STEP INDICATOR ESTILO APPLE
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
    <div className="relative max-w-3xl mx-auto mb-8 px-2 sm:px-4">
      {/* Línea de progreso de fondo */}
      <div className="absolute left-6 right-6 top-5 sm:top-6 -translate-y-1/2 h-1 bg-slate-200/80 dark:bg-slate-800 rounded-full z-0" />
      {/* Línea de progreso activa con resorte */}
      <motion.div
        className="absolute left-6 top-5 sm:top-6 -translate-y-1/2 h-1 bg-blue-600 dark:bg-blue-500 rounded-full z-0"
        initial={false}
        animate={{ width: `calc(${((currentStep - 1) / 4) * 100}% - 12px)` }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      />

      <div className="flex items-center justify-between relative z-10">
        {steps.map((step) => {
          const Icon = step.icon
          const isActive = step.num === currentStep
          const isPast = step.num < currentStep

          return (
            <div key={step.num} className="flex flex-col items-center gap-1.5">
              <div
                className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center border transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                    : isPast
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-white/10 text-slate-400'
                }`}
              >
                {isPast ? (
                  <CheckCircle2 className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                ) : (
                  <Icon className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                )}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-semibold hidden sm:block ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : isPast
                    ? 'text-slate-600 dark:text-slate-400'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function DisciplinaryReportFormScreen() {
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()

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
  const [history, setHistory] = useState<StudentDisciplinaryHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showConfidentiality, setShowConfidentiality] = useState(true)
  const [teacherGroups, setTeacherGroups] = useState<{ id: string; name: string; level: string }[]>([])
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
        if (studentDefense.trim().length < 5) {
          toast.error('Debe registrar los descargos del estudiante')
          return false
        }
        if (studentCommitment.trim().length < 5) {
          toast.error('Debe registrar el compromiso final del estudiante')
          return false
        }
        return true
      case 4:
        return true
      case 5:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5) as Step)
    }
  }

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1) as Step)
  }

  // ── GUARDADO DEFINITIVO ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!student || !situation) {
      toast.error('Faltan datos obligatorios para el reporte')
      return
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error('La firma del estudiante es obligatoria')
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
        const blob = await (await fetch(signatureDataUrl)).blob()
        const fileName = `signature_${student.id}_${Date.now()}.png`

        const { error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(fileName, blob, { contentType: 'image/png' })

        if (uploadError) {
          console.error('Error uploading signature:', uploadError)
          toast.warning('El reporte se guardará, pero hubo un problema al guardar la imagen de la firma.', { id: toastId })
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from('signatures').getPublicUrl(fileName)
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
        signatureConfirmed: true,
      })

      if (!result.success) throw new Error(result.error)

      toast.success('Reporte disciplinario guardado exitosamente', { id: toastId })
      router.push(`/teacher/disciplinary/${result.reportId}`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al guardar el reporte'
      toast.error(msg, { id: toastId })
      setIsSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER DE PASOS CON SPRING PHYSICS
  // ─────────────────────────────────────────────────────────────────────────

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260, mass: 0.8 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
                Paso 1: Seleccionar Estudiante
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Busca al estudiante involucrado. Puedes filtrar rápidamente por tus grupos asignados.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>Filtrar por Grupo Asignado</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedGroupName}
                    onChange={(e) => {
                      setSelectedGroupName(e.target.value)
                      setStudent(null)
                    }}
                    disabled={groupsLoading || teacherGroups.length === 0}
                    className="w-full sm:w-1/2 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="">Todos mis grupos</option>
                    {teacherGroups.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name} ({g.level})
                      </option>
                    ))}
                  </select>
                  {groupsLoading && <span className="text-xs text-slate-400">Cargando grupos...</span>}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
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
              <div className="animate-pulse bg-slate-100 dark:bg-slate-800 h-28 rounded-2xl" />
            )}

            {history && student && (
              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xs">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>Historial Convivencial del Estudiante</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-100/70 dark:bg-slate-800/60 p-3 rounded-xl text-center">
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{history.totalReports}</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Reportes</p>
                  </div>
                  <div className="bg-blue-500/10 p-3 rounded-xl text-center border border-blue-500/20">
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{history.tipoI}</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tipo I</p>
                  </div>
                  <div className="bg-amber-500/10 p-3 rounded-xl text-center border border-amber-500/20">
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{history.tipoII}</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tipo II</p>
                  </div>
                  <div className="bg-red-500/10 p-3 rounded-xl text-center border border-red-500/20">
                    <p className="text-xl font-bold text-red-700 dark:text-red-400">{history.tipoIII}</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tipo III</p>
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
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260, mass: 0.8 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
                Paso 2: Tipificar la Situación
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Selecciona la situación del Manual de Convivencia que se ajusta a los hechos observados.
              </p>
            </div>

            <SituationSearchField situations={situations} value={situation} onChange={setSituation} />
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260, mass: 0.8 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <span>Paso 3: Descripción de los Hechos</span>
                <span className="text-red-500 text-sm">*</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Describe detalladamente cómo ocurrieron los hechos para garantizar el debido proceso pedagógico.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1 text-xs sm:text-sm flex items-center gap-1.5">
                <Info className="h-4 w-4" />
                <span>Guía de redacción objetiva:</span>
              </h4>
              <ul className="list-disc pl-5 text-xs text-blue-700 dark:text-blue-300/90 space-y-0.5">
                <li>Sé objetivo y descriptivo, evitando calificativos o juicios de valor.</li>
                <li>Menciona fecha, hora aproximada y lugar de los hechos.</li>
                <li>Identifica testigos o personas involucradas si las hubo.</li>
              </ul>
            </div>

            {/* Hechos observados */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Relato de los Hechos *
              </label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ejemplo: Durante la jornada escolar a las 10:30 am, en el pasillo central..."
                  className="w-full h-32 p-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-100/60 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs sm:text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all duration-150"
                />
                <div className="absolute bottom-2.5 right-3 text-[11px] text-slate-400 font-mono">
                  {description.length} caracteres
                </div>
              </div>
            </div>

            {/* Descargos */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Descargos del Estudiante *
              </label>
              <div className="relative">
                <textarea
                  value={studentDefense}
                  onChange={(e) => setStudentDefense(e.target.value)}
                  placeholder="Versión libre de los hechos manifestada por el estudiante..."
                  className="w-full h-24 p-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-100/60 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs sm:text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all duration-150"
                />
              </div>
            </div>

            {/* Compromiso */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Compromiso Pedagógico Final *
              </label>
              <div className="relative">
                <textarea
                  value={studentCommitment}
                  onChange={(e) => setStudentCommitment(e.target.value)}
                  placeholder="Compromiso formativo asumido por el estudiante frente a la situación..."
                  className="w-full h-24 p-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-100/60 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs sm:text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all duration-150"
                />
              </div>
            </div>
          </motion.div>
        )

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260, mass: 0.8 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
                Paso 4: Vista Previa del Documento
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Verifica que la información redactada sea exacta y completa antes de proceder a la firma.
              </p>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/80 p-3 sm:p-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
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
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260, mass: 0.8 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
                Paso 5: Firma del Estudiante
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Solicita al estudiante que estampe su firma en el panel digital para constancia de notificación.
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-4 bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-2xl text-center">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Yo, <span className="font-bold text-slate-900 dark:text-white">{student?.fullName}</span>, firmo el presente documento en señal de notificación y conocimiento sobre la novedad disciplinaria registrada.
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white dark:bg-slate-900 p-2 shadow-xs">
                <SignatureCanvas ref={signatureRef} />
              </div>

              <div className="flex gap-4 justify-center pt-4">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-950/20 transition-all active:scale-[0.98] duration-100 ease-out disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full justify-center sm:w-auto cursor-pointer"
                >
                  {isSubmitting ? (
                    'Guardando...'
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Guardar Reporte Definitivo</span>
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
      <ConfidentialityModal isOpen={showConfidentiality} onAccept={() => setShowConfidentiality(false)} />
      <div className="min-h-screen bg-[#fbfbfd] dark:bg-slate-950 pb-20 text-left transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
          {/* Encabezado con botón de volver */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/teacher/disciplinary"
              className="flex items-center justify-center h-10 w-10 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-slate-500 hover:text-slate-900 dark:hover:text-white backdrop-blur-xl shadow-xs active:scale-95 duration-100 transition-all cursor-pointer"
              title="Volver al listado"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Nuevo Reporte Disciplinario
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Registra una novedad de convivencia siguiendo el debido proceso institucional
              </p>
            </div>
          </div>

          {/* Tarjeta translúcida del formulario */}
          <div className="relative rounded-[28px] border border-white/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl p-5 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.03)] mb-6 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/20 to-transparent" />

            <StepIndicator currentStep={step} />

            {/* Contenido animado del paso */}
            <div className="mt-6 min-h-[380px]">
              <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
            </div>
          </div>

          {/* Controles de navegación inferiores (Pasos 1 a 4) */}
          {step < 5 && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all active:scale-95 duration-100 ${
                  step === 1
                    ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed border border-transparent'
                    : 'text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 dark:text-slate-200 dark:bg-slate-900 dark:border-white/10 dark:hover:bg-slate-800 shadow-xs cursor-pointer'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-900/15 active:scale-[0.98] duration-100 ease-out transition-all cursor-pointer"
              >
                <span>Continuar</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
