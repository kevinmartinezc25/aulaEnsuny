'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Users, 
  Clock, 
  CalendarDays, 
  Sparkles, 
  BookOpen, 
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  CalendarCheck2,
  ChevronRight,
  ClipboardList
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { StudentSubjectView, StudentScheduleResponse } from '@/modules/planilla-asistida/application/studentQueries'
import { StudentPortalDisciplinaryData } from '@/modules/disciplinary/application/studentDisciplinaryActions'
import { StudentAttendanceOverview } from '@/modules/planilla-asistida/application/studentAttendanceQueries'
import { StudentSubjectsClientView } from './StudentSubjectsClientView'
import { StudentDisciplinaryClientView } from './components/StudentDisciplinaryClientView'
import { StudentAttendanceClientView } from './components/StudentAttendanceClientView'
import DayTabsScheduleView from '@/components/schedule/DayTabsScheduleView'
import { formatCapitalizedWords } from '@/lib/utils'

interface AcademicPortalClientViewProps {
  session: PlanillaStudentSession
  subjects: StudentSubjectView[]
  scheduleData: StudentScheduleResponse
  disciplinaryData?: StudentPortalDisciplinaryData
  attendanceData?: StudentAttendanceOverview
  resolvedGrade?: string
  resolvedGroup?: string
  initialView?: string
}

type ActiveView = 'dashboard' | 'grades' | 'schedule' | 'disciplinary' | 'attendance'

export function AcademicPortalClientView({
  session,
  subjects,
  scheduleData,
  disciplinaryData,
  attendanceData,
  resolvedGrade,
  resolvedGroup,
  initialView = 'dashboard'
}: AcademicPortalClientViewProps) {
  const [activeView, setActiveView] = useState<ActiveView>(initialView as ActiveView)

  // Formatear nombre del estudiante con Primera Letra en Mayúscula en cada palabra
  const studentDisplayName = formatCapitalizedWords(session.fullName) || session.fullName


  // Resolver Grado y Grupo de forma consistente
  const rawGrade = session.gradeLevel || ''
  const resolvedGroupName = scheduleData.groupName || session.groupName || ''
  
  // Deducir grado a partir de las materias si no viene en sesión
  const gradeFromSubjects = subjects && subjects.length > 0 && subjects[0]?.grade !== undefined
    ? (subjects[0].grade === 0 ? 'Nivelatorio' : subjects[0].grade === 12 ? 'PFC-12' : subjects[0].grade === 13 ? 'PFC-13' : `${subjects[0].grade}°`)
    : ''
  
  let gradeDisplay = resolvedGrade || rawGrade || gradeFromSubjects
  if (!gradeDisplay && resolvedGroupName.includes('-')) {
    gradeDisplay = resolvedGroupName.split('-')[0].trim()
  }
  if (gradeDisplay && !gradeDisplay.includes('°') && !isNaN(Number(gradeDisplay))) {
    const num = Number(gradeDisplay)
    if (num === 0) gradeDisplay = 'Nivelatorio'
    else if (num === 12) gradeDisplay = 'PFC-12'
    else if (num === 13) gradeDisplay = 'PFC-13'
    else gradeDisplay = `${gradeDisplay}°`
  }
  if (!gradeDisplay) {
    gradeDisplay = 'Registrado'
  }

  // Grupo oficial a mostrar
  let groupDisplay = resolvedGroup || resolvedGroupName || 'Sin grupo asignado'
  if (!resolvedGroup && resolvedGroupName && !resolvedGroupName.includes('-') && gradeDisplay && gradeDisplay !== 'Registrado') {
    groupDisplay = `${gradeDisplay}-${resolvedGroupName}`
  }

  const academicYear = session.academicYear || new Date().getFullYear().toString()
  const jornada = session.jornada || 'Mañana'
  const reportsCount = disciplinaryData?.reports?.length || 0

  const portalCards = [
    {
      id: 'grades' as const,
      title: 'Calificaciones',
      description: 'Desempeño y logros',
      icon: ClipboardList,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      cardClass: 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800',
      arrowBg: 'bg-emerald-100/60 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300',
      onClick: () => setActiveView('grades')
    },
    {
      id: 'schedule' as const,
      title: 'Horario',
      description: 'Clases y horarios',
      icon: Calendar,
      iconBg: 'bg-blue-50 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400',
      cardClass: 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800',
      arrowBg: 'bg-slate-50 dark:bg-slate-800 text-slate-400',
      onClick: () => setActiveView('schedule')
    },
    {
      id: 'disciplinary' as const,
      title: 'Convivencia',
      description: 'Seguimiento institucional',
      icon: Users,
      iconBg: 'bg-purple-50 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400',
      cardClass: 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800',
      arrowBg: 'bg-slate-50 dark:bg-slate-800 text-slate-400',
      onClick: () => setActiveView('disciplinary')
    },
    {
      id: 'attendance' as const,
      title: 'Asistencia Escolar',
      description: 'Registro de asistencia',
      icon: CalendarCheck2,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400',
      cardClass: 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800',
      arrowBg: 'bg-slate-50 dark:bg-slate-800 text-slate-400',
      onClick: () => setActiveView('attendance')
    }
  ]

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-200">
      {/* ── Barra de Navegación Secundaria si está en subvista ── */}
      {activeView !== 'dashboard' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center pb-3 border-b border-slate-200/80 dark:border-slate-800"
        >
          <button
            onClick={() => setActiveView('dashboard')}
            className="group inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border-2 border-emerald-500/30 hover:border-emerald-500/60 text-xs sm:text-sm font-extrabold text-[#1F4E31] dark:text-emerald-300 shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-1" />
            <span>Volver al Menú Principal</span>
          </button>
        </motion.div>
      )}

      {/* ── Vista Principal: Menú del Portal ── */}
      {activeView === 'dashboard' && (
        <div className="space-y-4 sm:space-y-7">
          {/* Cabecera y Tarjeta de Identidad */}
          <div className="space-y-6">
            <div className="px-2">
              <h1 className="text-[28px] sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-1">
                Consulta Académica
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Consulta tu información institucional
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[20px] p-4 sm:p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mx-2 sm:mx-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                    {studentDisplayName}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-[13px] mt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span>{groupDisplay}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 hidden sm:block"></span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-400">Estudiante Regular</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 sm:gap-6 pl-16 sm:pl-0">
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Documento</span>
                  <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">{session.documentId}</span>
                </div>
                <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden sm:block"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Año Lectivo</span>
                  <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">{session.academicYear || new Date().getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Cuadrícula de Tarjetas Académicas ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 px-2 sm:px-0">
            {portalCards.map((card, idx) => {
              const Icon = card.icon
              return (
                <motion.div
                  key={card.id}
                  onClick={card.onClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      card.onClick()
                    }
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * (idx + 1), type: 'spring', damping: 24, stiffness: 240 }}
                  className={`group relative flex flex-col justify-between rounded-[24px] p-4 sm:p-5 cursor-pointer shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-300 active:scale-[0.98] ${card.cardClass}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${card.iconBg}`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
                    </div>
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors group-hover:bg-slate-200 dark:group-hover:bg-slate-700 ${card.arrowBg}`}>
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                      {card.title}
                    </h2>
                    <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-[13px] text-slate-500 dark:text-slate-400 leading-snug truncate sm:whitespace-normal">
                      {card.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Subvista 1: Calificaciones ── */}
      {activeView === 'grades' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <StudentSubjectsClientView
            subjects={subjects}
            studentName={studentDisplayName}
          />
        </motion.div>
      )}

      {/* ── Subvista 2: Mi Horario ── */}
      {activeView === 'schedule' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {!scheduleData.hasGroup ? (
            <div className="rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                Sin matrícula académica vigente
              </h3>
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 max-w-md mx-auto">
                No encontramos un grupo oficial asignado a tu registro en este momento. Comunícate con la coordinación académica de la institución.
              </p>
            </div>
          ) : !scheduleData.isPublished ? (
            <div className="rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                El horario de tu grupo aún no ha sido publicado
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                El grupo <strong className="text-slate-700 dark:text-slate-300">{groupDisplay}</strong> no tiene un horario oficial publicado en el sistema para este período.
              </p>
            </div>
          ) : (
            <div className="w-full">
              <DayTabsScheduleView
                schedule={scheduleData.schedule}
                context={{
                  title: `Horario del Grupo ${groupDisplay}`,
                  subtitle: `Jornada ${jornada} · Año lectivo ${academicYear}`,
                  type: 'student'
                }}
                isPublished={scheduleData.isPublished}
                hideGroupBadge={true}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* ── Subvista 3: Convivencia Escolar (Solo Lectura) ── */}
      {activeView === 'disciplinary' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <StudentDisciplinaryClientView
            summary={disciplinaryData?.summary || {
              totalReports: 0,
              tipoI: 0,
              tipoII: 0,
              tipoIII: 0,
              openCases: 0,
              closedCases: 0,
              recentReports: []
            }}
            reports={disciplinaryData?.reports || []}
            studentName={studentDisplayName}
            groupName={groupDisplay}
          />
        </motion.div>
      )}

      {/* ── Subvista 4: Asistencia Escolar y Trazabilidad de Fechas ── */}
      {activeView === 'attendance' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <StudentAttendanceClientView
            attendanceData={attendanceData || {
              summary: {
                totalSubjects: 0,
                totalSessions: 0,
                totalAttended: 0,
                totalTardy: 0,
                totalUnjustified: 0,
                totalExcused: 0,
                overallPercentage: 100
              },
              subjects: []
            }}
            studentName={studentDisplayName}
            groupName={groupDisplay}
            resolvedGrade={gradeDisplay}
          />
        </motion.div>
      )}
    </div>
  )
}
