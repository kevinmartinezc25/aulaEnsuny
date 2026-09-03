'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  User,
  Calendar,
  Clock,
  FileText,
  Upload,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  HelpCircle,
  Paperclip,
  Check,
  AlertCircle,
  X,
  Plus,
  Trash2
} from 'lucide-react'
import {
  PermissionType,
  TeacherSnapshot,
  AcademicImpactItem,
  StudentActivityPlan
} from '../../domain/entities'
import { AcademicImpactSelector } from './AcademicImpactSelector'
import { createPermissionRequest } from '../../application/actions'
import { formatPermissionDateRange } from '../utils/dateUtils'

interface Props {
  teacher: TeacherSnapshot
  availableTypes: PermissionType[]
  availableCourses: Array<{ id: string; title: string; subject: string; gradeLevel: string; groupName: string }>
}

export function PermissionWizardForm({ teacher, availableTypes, availableCourses }: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 2: Tipo
  const [selectedTypeId, setSelectedTypeId] = useState(availableTypes[0]?.id || '')

  // Step 3: Fechas y Horario
  const todayStr = new Date().toISOString().split('T')[0]
  const [isSingleDay, setIsSingleDay] = useState(true)
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [isFullDay, setIsFullDay] = useState(true)
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('13:00')

  // Step 4: Motivo y Soportes
  const [reason, setReason] = useState('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [attachmentName, setAttachmentName] = useState<string | null>(null)

  // Step 5: Afectación Académica
  const [affectsDuty, setAffectsDuty] = useState(false)
  const [impactItems, setImpactItems] = useState<AcademicImpactItem[]>([])

  // Step 6: Plan de Contingencia
  const [leavesActivities, setLeavesActivities] = useState(false)
  const [activityTitle, setActivityTitle] = useState('')
  const [activityGroup, setActivityGroup] = useState('')
  const [activityInstructions, setActivityInstructions] = useState('')
  const [activitiesList, setActivitiesList] = useState<StudentActivityPlan[]>([])

  const selectedType = availableTypes.find(t => t.id === selectedTypeId) || availableTypes[0]

  useEffect(() => {
    if (isSingleDay) {
      setEndDate(startDate)
    }
  }, [startDate, isSingleDay])

  const daysInAdvance = useMemo(() => {
    if (!startDate) return 0
    const start = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    start.setHours(0, 0, 0, 0)
    return Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }, [startDate])

  const handleAddActivityToList = () => {
    if (!activityTitle.trim()) {
      toast.error('Indique el título o tema de la actividad')
      return
    }
    if (!activityInstructions.trim()) {
      toast.error('Indique las instrucciones detalladas de la actividad')
      return
    }
    const newAct: StudentActivityPlan = {
      id: `act-${Date.now()}`,
      title: activityTitle.trim(),
      groupName: activityGroup.trim() || (impactItems[0]?.gradeGroup || 'General'),
      instructions: activityInstructions.trim()
    }
    setActivitiesList(prev => [...prev, newAct])
    setActivityTitle('')
    setActivityInstructions('')
    toast.success('Actividad añadida al plan de contingencia')
  }

  const handleRemoveActivityFromList = (idx: number) => {
    setActivitiesList(prev => prev.filter((_, i) => i !== idx))
  }

  const steps = [
    { num: 1, label: 'Docente', icon: User },
    { num: 2, label: 'Tipo', icon: FileText },
    { num: 3, label: 'Fechas', icon: Calendar },
    { num: 4, label: 'Motivo y Soporte', icon: Upload },
    { num: 5, label: 'Impacto Académico', icon: GraduationCap },
    { num: 6, label: 'Plan de Actividades', icon: BookOpen },
    { num: 7, label: 'Resumen y Envío', icon: CheckCircle2 },
  ]

  const handleNext = () => {
    // Validaciones por paso
    if (currentStep === 2 && !selectedTypeId) {
      toast.error('Debe seleccionar un tipo de permiso institucional')
      return
    }

    if (currentStep === 3) {
      if (!startDate || !endDate) {
        toast.error('Debe especificar las fechas de inicio y finalización')
        return
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.error('La fecha de inicio no puede ser posterior a la fecha final')
        return
      }
      if (!isFullDay && (!startTime || !endTime)) {
        toast.error('Debe indicar la hora de inicio y finalización de la jornada parcial')
        return
      }
    }

    if (currentStep === 4) {
      if (!reason || reason.trim().length < 10) {
        toast.error('El motivo o descripción debe tener al menos 10 caracteres')
        return
      }
      if (selectedType?.requiresAttachment && !attachmentName && !attachmentFile) {
        toast.error(`El tipo de permiso "${selectedType.name}" requiere adjuntar soporte documental obligatorio.`)
        return
      }
    }

    // Paso 5: Indicar clases o grupos específicos es opcional
    // El docente puede marcar si afecta o no, y añadir clases si lo desea

    if (currentStep === 6) {
      if (leavesActivities && activitiesList.length === 0 && (!activityTitle || !activityInstructions)) {
        toast.error('Indique el título e instrucciones de la actividad dejada para los estudiantes.')
        return
      }
      if (leavesActivities && activitiesList.length === 0 && activityTitle && activityInstructions) {
        // Auto-agregar la actividad redactada
        setActivitiesList([
          {
            title: activityTitle,
            groupName: activityGroup || (impactItems[0]?.gradeGroup || 'General'),
            instructions: activityInstructions
          }
        ])
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, 7))
  }

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar extensiones permitidas
      const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (!validExtensions.includes(ext)) {
        toast.error('Formato no permitido. Solo se aceptan archivos PDF, JPG, PNG, DOC y DOCX.')
        return
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error('El archivo excede el tamaño máximo permitido (15 MB).')
        return
      }
      setAttachmentFile(file)
      setAttachmentName(file.name)
      toast.success(`Archivo adjuntado: ${file.name}`)
    }
  }

  const handleSubmit = async (isDraft = false) => {
    setIsSubmitting(true)
    try {
      const finalActivities = leavesActivities
        ? activitiesList.length > 0
          ? activitiesList
          : activityTitle
          ? [{ title: activityTitle, groupName: activityGroup || 'General', instructions: activityInstructions }]
          : []
        : []

      const res = await createPermissionRequest({
        typeId: selectedTypeId,
        startDate,
        endDate,
        isFullDay,
        startTime: !isFullDay ? startTime : undefined,
        endTime: !isFullDay ? endTime : undefined,
        reason: reason.trim(),
        attachmentName,
        attachmentUrl: attachmentName ? `https://storage.ensuny.edu.co/permissions/${attachmentName}` : null,
        attachmentType: attachmentName?.split('.').pop()?.toLowerCase() || null,
        affectsAcademicDuty: affectsDuty,
        academicImpact: affectsDuty ? impactItems : [],
        leavesStudentActivities: leavesActivities,
        studentActivities: finalActivities,
        isDraft,
      })

      if (res.error) {
        toast.error(res.error)
        return
      }

      if (isDraft) {
        toast.success('Borrador guardado correctamente')
        router.push('/teacher/permissions')
      } else {
        toast.success(`Solicitud enviada correctamente. Radicado: ${res.requestNumber}`)
        router.push(`/teacher/permissions/${res.id}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar la solicitud.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de progreso por pasos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2 pb-2 sm:pb-0 custom-scrollbar">
          {steps.map((step) => {
            const Icon = step.icon
            const isCompleted = currentStep > step.num
            const isCurrent = currentStep === step.num

            return (
              <div
                key={step.num}
                onClick={() => isCompleted && setCurrentStep(step.num)}
                className={`flex items-center gap-2 shrink-0 ${
                  isCompleted ? 'cursor-pointer' : ''
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Paso {step.num}</p>
                  <p
                    className={`text-xs font-bold truncate max-w-[100px] ${
                      isCurrent
                        ? 'text-blue-600 dark:text-blue-400'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
                {step.num < steps.length && (
                  <div
                    className={`hidden lg:block w-6 h-0.5 mx-1 ${
                      currentStep > step.num ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tarjeta del Paso Actual */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <AnimatePresence mode="wait">
          {/* ── PASO 1: INFORMACIÓN DEL DOCENTE ── */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  1. Información del Docente Solicitante
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Estos datos se cargan automáticamente desde su perfil institucional en aulaEnsuny. No es necesario digitarlos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Nombre Completo
                  </label>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{teacher.fullName}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Correo Institucional
                  </label>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{teacher.email}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Cargo / Rol
                  </label>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {teacher.role === 'teacher' ? 'Docente de Aula' : teacher.role}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Área / Asignatura Principal
                  </label>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{teacher.mainSubject || 'Asignaturas Varias'}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Sede Institucional
                  </label>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{teacher.campus || 'Sede Principal'}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Documento de Identidad
                  </label>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{teacher.document || 'No registrado'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                <span>Datos institucionales verificados. Presione Continuar para seleccionar el tipo de permiso.</span>
              </div>
            </motion.div>
          )}

          {/* ── PASO 2: TIPO DE PERMISO ── */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  2. Tipo de Permiso Institucional
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Seleccione la modalidad de permiso correspondiente. Las opciones son configuradas por la administración.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableTypes.map((type) => {
                  const isSelected = selectedTypeId === type.id
                  return (
                    <div
                      key={type.id}
                      onClick={() => setSelectedTypeId(type.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {type.name}
                        </span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {type.description || 'Permiso reglamentario institucional.'}
                      </p>
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {type.requiresAttachment && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold">
                            Requiere soporte obligatorio
                          </span>
                        )}
                        {type.affectsClasses && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold">
                            Afecta clases
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── PASO 3: FECHAS Y HORARIO ── */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  3. Fechas y Horario del Permiso
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Indique la duración y las horas en que se ausentará de la jornada escolar.
                </p>
              </div>

              {/* Selector de Un solo día vs Rango */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSingleDay(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isSingleDay
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Un solo día
                </button>
                <button
                  type="button"
                  onClick={() => setIsSingleDay(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    !isSingleDay
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Varios días (Rango)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isSingleDay ? 'Fecha del permiso *' : 'Fecha de inicio *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {!isSingleDay && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Fecha de finalización *
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      min={startDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Alerta de anticipación institucional (8 días) */}
              {daysInAdvance < 8 && (
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 max-w-xl">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-300">
                    <strong className="font-semibold block mb-0.5">Aviso de Anticipación Reglamentaria</strong>
                    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                      La fecha seleccionada se encuentra a {daysInAdvance <= 0 ? '0' : daysInAdvance} día(s) calendario. El reglamento institucional establece radicar las solicitudes con al menos <strong>8 días de anticipación</strong> para la planeación académica.
                    </p>
                  </div>
                </div>
              )}

              {/* Selector de Jornada Completa vs Parcial */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Modalidad de horario:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFullDay(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isFullDay
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Jornada completa
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullDay(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      !isFullDay
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Jornada parcial (por horas)
                  </button>
                </div>

                {!isFullDay && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Hora de inicio
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Hora de finalización
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── PASO 4: MOTIVO Y SOPORTES ── */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  4. Motivo de la Solicitud y Documento de Soporte
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Describe de manera clara el motivo de la solicitud y adjunte los soportes requeridos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Descripción / Motivo de la solicitud *
                </label>
                <textarea
                  rows={4}
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Describe de manera clara y suficiente el motivo institucional o particular de su solicitud..."
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Mínimo 10 caracteres. Esta justificación será revisada por Rectoría.
                </p>
              </div>

              {/* Adjunto de Soporte */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Documento de Soporte
                  </label>
                  {selectedType?.requiresAttachment ? (
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      Obligatorio para {selectedType.name}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Opcional</span>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-800/30 text-center hover:bg-slate-50 transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-2">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {attachmentName ? attachmentName : 'Haga clic o arrastre su archivo de soporte aquí'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Formatos permitidos: PDF, JPG, PNG, DOC, DOCX (Máximo 15 MB)
                  </p>
                  {attachmentName && (
                    <div className="flex items-center gap-2 mt-3 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold">
                      <Check className="h-3.5 w-3.5" />
                      <span>{attachmentName}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAttachmentFile(null)
                          setAttachmentName(null)
                        }}
                        className="p-1 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PASO 5: INFORMACIÓN ACADÉMICA AFECTADA ── */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  5. Información Académica Afectada
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Indique si la ausencia afecta horas de clase presenciales. Seleccionar las clases o grupos específicos es opcional según lo requiera.
                </p>
              </div>

              <AcademicImpactSelector
                affectsDuty={affectsDuty}
                onChangeAffectsDuty={setAffectsDuty}
                impactItems={impactItems}
                onChangeImpactItems={setImpactItems}
                availableCourses={availableCourses}
                defaultDate={startDate}
              />
            </motion.div>
          )}

          {/* ── PASO 6: PLAN DE CONTINGENCIA ACADÉMICA ── */}
          {currentStep === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  6. Plan de Contingencia Académica
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Para asegurar la continuidad del aprendizaje, puede dejar talleres o actividades asignadas a sus estudiantes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  ¿Deja actividades o talleres para los estudiantes?
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button
                    type="button"
                    onClick={() => setLeavesActivities(false)}
                    className={`py-2.5 px-4 rounded-xl text-sm font-medium border text-center transition-all cursor-pointer ${
                      !leavesActivities
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    No deja actividades
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeavesActivities(true)}
                    className={`py-2.5 px-4 rounded-xl text-sm font-medium border text-center transition-all cursor-pointer ${
                      leavesActivities
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Sí, deja actividades
                  </button>
                </div>
              </div>

              {leavesActivities && (
                <div className="space-y-4">
                  {/* Lista de Actividades Agregadas */}
                  {activitiesList.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Actividades Registradas ({activitiesList.length})
                        </label>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ {activitiesList.length} actividad(es) en el plan
                        </span>
                      </div>

                      <div className="space-y-2">
                        {activitiesList.map((act, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold text-[10px]">
                                  Grupo: {act.groupName}
                                </span>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {act.title}
                                </h4>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                                {act.instructions}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveActivityFromList(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Eliminar actividad"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formulario para agregar una o más actividades */}
                  <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                        {activitiesList.length === 0 ? 'Registrar Actividad o Taller' : '+ Agregar Otra Actividad (Otro Grupo o Taller)'}
                      </span>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400">
                        Puede añadir múltiples actividades
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Grupo o Curso Destinatario *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 10°-1, 9°-2..."
                          value={activityGroup}
                          onChange={e => setActivityGroup(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                        />
                        {availableCourses.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {Array.from(new Set(availableCourses.map(c => c.groupName))).slice(0, 4).map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setActivityGroup(g)}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50"
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Título o Tema de la Actividad *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Taller práctico de Cinemática y Movimiento Uniforme"
                          value={activityTitle}
                          onChange={e => setActivityTitle(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Instrucciones Detalladas para los Estudiantes *
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Describa el paso a paso que deben seguir los estudiantes en el aula o de forma virtual..."
                        value={activityInstructions}
                        onChange={e => setActivityInstructions(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddActivityToList}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Agregar esta actividad a la lista</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── PASO 7: RESUMEN DE LA SOLICITUD ── */}
          {currentStep === 7 && (
            <motion.div
              key="step-7"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  7. Resumen de la Solicitud de Permiso
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Revise minuciosamente la información antes de enviar. Una vez radicada, Rectoría recibirá la notificación inmediata.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 font-semibold block">Docente:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{teacher.fullName}</span>
                    <span className="text-slate-500 block text-[11px]">{teacher.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Tipo de Permiso:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{selectedType.name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 font-semibold block">Fechas / Vigencia:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatPermissionDateRange(startDate, endDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Horario:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {isFullDay ? 'Jornada Completa' : `${startTime} a ${endTime}`}
                    </span>
                  </div>
                </div>

                <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block mb-1">Motivo:</span>
                  <p className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                    {reason}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 font-semibold block">Afecta jornada académica:</span>
                    <span className={`font-bold ${affectsDuty ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {affectsDuty ? `Sí (${impactItems.length} clases)` : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Soporte adjunto:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {attachmentName ? attachmentName : 'Ninguno adjuntado'}
                    </span>
                  </div>
                </div>

                {affectsDuty && impactItems.length > 0 && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-2">Clases afectadas:</span>
                    <div className="space-y-1.5">
                      {impactItems.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <span>Grupo {item.gradeGroup} — {item.subject}</span>
                          <span className="font-bold text-blue-600">{item.hoursCount}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {leavesActivities && (activitiesList.length > 0 || activityTitle) && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-2">
                      Plan de Actividades / Talleres para Estudiantes:
                    </span>
                    <div className="space-y-2">
                      {(activitiesList.length > 0
                        ? activitiesList
                        : [{ title: activityTitle, groupName: activityGroup || 'General', instructions: activityInstructions }]
                      ).map((act, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                            <span>{act.title}</span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 text-[10px]">
                              Grupo: {act.groupName}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2">
                            {act.instructions}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botones de navegación del Wizard */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                {currentStep === 7 ? 'Editar solicitud' : 'Atrás'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Continuar</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar Borrador</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Enviando...' : 'Enviar solicitud'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
