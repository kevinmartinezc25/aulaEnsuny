'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  GraduationCap, 
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
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanillaStudentSession } from '@/modules/planilla-asistida/application/studentAuthActions'
import { StudentSubjectView, StudentScheduleResponse } from '@/modules/planilla-asistida/application/studentQueries'
import { StudentSubjectsClientView } from './StudentSubjectsClientView'
import DayTabsScheduleView from '@/components/schedule/DayTabsScheduleView'

interface AcademicPortalClientViewProps {
  session: PlanillaStudentSession
  subjects: StudentSubjectView[]
  scheduleData: StudentScheduleResponse
  resolvedGrade?: string
  resolvedGroup?: string
}

type ActiveView = 'dashboard' | 'grades' | 'schedule'

export function AcademicPortalClientView({
  session,
  subjects,
  scheduleData,
  resolvedGrade,
  resolvedGroup
}: AcademicPortalClientViewProps) {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')

  // Resolver Grado y Grupo de forma consistente
  const rawGrade = session.gradeLevel || ''
  const resolvedGroupName = scheduleData.groupName || session.groupName || ''
  
  // Deducir grado a partir de las materias si no viene en sesión
  const gradeFromSubjects = subjects && subjects.length > 0 && subjects[0]?.grade ? `${subjects[0].grade}°` : ''
  
  let gradeDisplay = resolvedGrade || rawGrade || gradeFromSubjects
  if (!gradeDisplay && resolvedGroupName.includes('-')) {
    gradeDisplay = resolvedGroupName.split('-')[0].trim()
  }
  if (gradeDisplay && !gradeDisplay.includes('°') && !isNaN(Number(gradeDisplay))) {
    gradeDisplay = `${gradeDisplay}°`
  }
  if (!gradeDisplay) {
    gradeDisplay = 'Registrado'
  }

  // Grupo oficial a mostrar: Si solo era un número (ej "1") y tenemos grado (ej "10°"), combinarlos como "10°-1"
  let groupDisplay = resolvedGroup || resolvedGroupName || 'Sin grupo asignado'
  if (resolvedGroupName && !resolvedGroupName.includes('-') && gradeDisplay && gradeDisplay !== 'Registrado') {
    groupDisplay = `${gradeDisplay}-${resolvedGroupName}`
  }

  const academicYear = session.academicYear || new Date().getFullYear().toString()
  const jornada = session.jornada || 'Mañana'

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* ── Barra de Navegación Secundaria si está en subvista ── */}
      {activeView !== 'dashboard' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800"
        >
          <button
            onClick={() => setActiveView('dashboard')}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-[#1F4E31] dark:hover:text-emerald-400 shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-1" />
            <span>Volver al Menú Principal</span>
          </button>

          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {activeView === 'grades' ? 'Calificaciones' : 'Mi Horario'}
          </span>
        </motion.div>
      )}

      {/* ── Vista Principal: Menú del Portal ── */}
      {activeView === 'dashboard' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Cabecera de Identidad Académica */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-emerald-950/20 p-6 sm:p-8 border border-emerald-500/20 dark:border-emerald-500/10 shadow-sm"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 w-60 h-60 rounded-full bg-emerald-500/10 blur-[80px]" />

            <div className="relative z-10 flex flex-col items-center justify-center text-center gap-5 sm:gap-6">
              <div className="space-y-3 flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#1F4E31] dark:text-emerald-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Portal de Consulta Académica</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {session.fullName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Estudiante regular · Documento No. <span className="font-semibold text-slate-700 dark:text-slate-200">{session.documentId}</span>
                </p>
              </div>

              {/* Fichas informativas de matrícula (Grupo, Jornada, Año) */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5" suppressHydrationWarning>
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
                  <Users className="h-4 w-4 text-[#1F4E31] dark:text-emerald-400" />
                  <span>Grupo Matriculado: <strong className="text-slate-900 dark:text-white">{groupDisplay}</strong></span>
                </div>

                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
                  <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span>Jornada: <strong className="text-slate-900 dark:text-white">{jornada}</strong></span>
                </div>

                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
                  <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Año Lectivo: <strong className="text-slate-900 dark:text-white">{academicYear}</strong></span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Dos Tarjetas Principales (Grid Móvil: Vertical / Desktop: 2 columnas) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Tarjeta 1: CALIFICACIONES */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, type: 'spring', damping: 24, stiffness: 240 }}
              className="group relative flex flex-col justify-between rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-none hover:border-emerald-500/40 transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-[#1F4E31] dark:text-emerald-400 group-hover:scale-105 transition-transform duration-200">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Calificaciones
                  </h2>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Consulta tus resultados académicos por período, área, asignatura y logro.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    {subjects.length > 0
                      ? `${subjects.length} asignaturas registradas para consulta`
                      : 'Sin materias asignadas aún'}
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  onClick={() => setActiveView('grades')}
                  className="w-full h-12 rounded-2xl bg-[#1F4E31] hover:bg-[#183e27] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-950/15 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>Consultar Calificaciones</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </motion.div>

            {/* Tarjeta 2: MI HORARIO */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring', damping: 24, stiffness: 240 }}
              className="group relative flex flex-col justify-between rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-none hover:border-emerald-500/40 transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 flex items-center justify-center text-teal-700 dark:text-teal-400 group-hover:scale-105 transition-transform duration-200">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Mi Horario
                  </h2>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Consulta el horario correspondiente al grupo en el que estás matriculado.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span className={`inline-block w-2 h-2 rounded-full ${scheduleData.isPublished ? 'bg-teal-500' : 'bg-amber-500'}`} />
                  <span>
                    {scheduleData.isPublished
                      ? `Horario oficial disponible para ${groupDisplay}`
                      : 'El horario de tu grupo aún no está publicado'}
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  onClick={() => setActiveView('schedule')}
                  className="w-full h-12 rounded-2xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-950/15 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>Ver Horario</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </motion.div>
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
            studentName={session.fullName}
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
    </div>
  )
}
