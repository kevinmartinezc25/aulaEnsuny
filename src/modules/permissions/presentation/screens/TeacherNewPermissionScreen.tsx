'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, CalendarCheck } from 'lucide-react'
import { PermissionWizardForm } from '../components/PermissionWizardForm'
import {
  getTeacherPermissionProfile,
  getPermissionTypes,
  getTeacherAcademicCourses
} from '../../application/actions'
import { TeacherSnapshot, PermissionType } from '../../domain/entities'

export function TeacherNewPermissionScreen() {
  const [loading, setLoading] = useState(true)
  const [teacher, setTeacher] = useState<TeacherSnapshot | null>(null)
  const [types, setTypes] = useState<PermissionType[]>([])
  const [courses, setCourses] = useState<Array<{ id: string; title: string; subject: string; gradeLevel: string; groupName: string }>>([])

  useEffect(() => {
    async function loadData() {
      try {
        const [profileData, typesData, coursesData] = await Promise.all([
          getTeacherPermissionProfile(),
          getPermissionTypes(),
          getTeacherAcademicCourses()
        ])
        setTeacher(profileData)
        setTypes(typesData)
        setCourses(coursesData)
      } catch (e) {
        console.error('Error al cargar datos del formulario:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading || !teacher || types.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs">Cargando datos institucionales...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Estilo Apple */}
      <div>
        <Link
          href="/teacher/permissions"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-all duration-100 active:scale-95 mb-3.5 border border-slate-200/60 dark:border-white/5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Volver a Mis Solicitudes</span>
        </Link>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs shrink-0">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Nueva Solicitud de Permiso
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Diligencie el formulario por pasos para radicar su permiso o licencia institucional.
            </p>
          </div>
        </div>
      </div>

      <PermissionWizardForm
        teacher={teacher}
        availableTypes={types}
        availableCourses={courses}
      />
    </div>
  )
}
