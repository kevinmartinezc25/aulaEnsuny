'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
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

  if (loading || !teacher) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs">Cargando datos institucionales...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <Link
          href="/teacher/permissions"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a Mis Solicitudes</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Nueva Solicitud de Permiso
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Diligencie el formulario por pasos para radicar su permiso institucional.
        </p>
      </div>

      <PermissionWizardForm
        teacher={teacher}
        availableTypes={types}
        availableCourses={courses}
      />
    </div>
  )
}
