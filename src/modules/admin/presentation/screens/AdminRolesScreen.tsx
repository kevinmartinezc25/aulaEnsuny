'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Check, X, ShieldAlert, UserCheck, AlertCircle, Key
} from 'lucide-react'

interface RolePermission {
  module: string
  action: string
  key: string
  allowed: boolean
}

interface RoleInfo {
  id: string
  name: string
  title: string
  description: string
  permissions: RolePermission[]
}

export function AdminRolesScreen() {
  const [selectedRole, setSelectedRole] = useState<string>('admin')

  const rolesData: RoleInfo[] = [
    {
      id: 'admin',
      name: 'administrator',
      title: 'Administrador General',
      description: 'Acceso total sin restricciones a la configuración escolar, matrículas y auditoría del sistema.',
      permissions: [
        { module: 'Usuarios', action: 'Crear, editar y eliminar perfiles', key: 'crud_users', allowed: true },
        { module: 'Cursos', action: 'Crear y reasignar asignaturas', key: 'crud_courses', allowed: true },
        { module: 'Calificaciones', action: 'Ver y auditar libro central de notas', key: 'audit_grades', allowed: true },
        { module: 'Calendario', action: 'Crear eventos globales del colegio', key: 'manage_calendar', allowed: true },
        { module: 'Configuraciones', action: 'Modificar NIT, rector y accesos de seguridad', key: 'manage_settings', allowed: true },
        { module: 'Roles', action: 'Modificar y reasignar privilegios de roles', key: 'manage_roles', allowed: true }
      ]
    },
    {
      id: 'teacher',
      name: 'teacher',
      title: 'Docente Pedagógico',
      description: 'Encargado de la creación de contenido de cursos, calificación de evaluaciones y retroalimentación.',
      permissions: [
        { module: 'Usuarios', action: 'Crear, editar y eliminar perfiles', key: 'crud_users', allowed: false },
        { module: 'Cursos', action: 'Crear y reasignar asignaturas', key: 'crud_courses', allowed: false },
        { module: 'Calificaciones', action: 'Ver y auditar libro central de notas', key: 'audit_grades', allowed: true },
        { module: 'Calendario', action: 'Crear eventos globales del colegio', key: 'manage_calendar', allowed: true },
        { module: 'Configuraciones', action: 'Modificar NIT, rector y accesos de seguridad', key: 'manage_settings', allowed: false },
        { module: 'Roles', action: 'Modificar y reasignar privilegios de roles', key: 'manage_roles', allowed: false }
      ]
    },
    {
      id: 'student',
      name: 'student',
      title: 'Estudiante Matriculado',
      description: 'Acceso a cursos asignados, realización de evaluaciones en línea y visor personal de notas.',
      permissions: [
        { module: 'Usuarios', action: 'Crear, editar y eliminar perfiles', key: 'crud_users', allowed: false },
        { module: 'Cursos', action: 'Crear y reasignar asignaturas', key: 'crud_courses', allowed: false },
        { module: 'Calificaciones', action: 'Ver y auditar libro central de notas', key: 'audit_grades', allowed: false },
        { module: 'Calendario', action: 'Crear eventos globales del colegio', key: 'manage_calendar', allowed: false },
        { module: 'Configuraciones', action: 'Modificar NIT, rector y accesos de seguridad', key: 'manage_settings', allowed: false },
        { module: 'Roles', action: 'Modificar y reasignar privilegios de roles', key: 'manage_roles', allowed: false }
      ]
    }
  ]

  const activeRole = rolesData.find(r => r.id === selectedRole) || rolesData[0]

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Roles y Permisos
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Visualiza los privilegios y accesos predeterminados de cada rol en la plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Selector de Roles Lateral */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="font-bold text-xs text-slate-450 uppercase mb-2">Selección de Rol</h3>
          {rolesData.map(role => {
            const isSelected = role.id === selectedRole
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-100 hover:border-slate-200 bg-white dark:border-slate-800/60 dark:bg-slate-900 text-slate-700 dark:text-slate-350'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className={`h-4.5 w-4.5 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span className="font-bold text-xs">{role.title}</span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed font-semibold">{role.description.slice(0, 75)}...</p>
              </button>
            )
          })}

          <div className="bg-blue-50/40 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl flex gap-3 text-xs mt-6">
            <Key className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="font-bold text-blue-800 dark:text-blue-400">Permisos por Defecto</p>
              <p className="text-blue-700 dark:text-blue-500/80 font-medium mt-0.5 leading-relaxed">
                El control de permisos se gestiona directamente en las políticas RLS de Supabase. Esto asegura integridad absoluta a nivel API.
              </p>
            </div>
          </div>
        </div>

        {/* Tabla de Privilegios */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Matriz de Accesos para {activeRole.title}</h3>
              <p className="text-xs text-slate-455 mt-0.5">Control granular asignado a nivel de bases de datos y vistas.</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-850">
              <table className="w-full text-xs text-left text-slate-550 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-[10px] text-slate-450 uppercase font-bold border-b border-slate-100 dark:border-slate-850">
                  <tr>
                    <th className="px-5 py-3.5">Módulo / Ámbito</th>
                    <th className="px-5 py-3.5">Acción Permitida</th>
                    <th className="px-5 py-3.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {activeRole.permissions.map(perm => (
                    <tr key={perm.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {perm.module}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-550 dark:text-slate-400">
                        {perm.action}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {perm.allowed ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-650">
                            <X className="h-4.5 w-4.5" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex gap-3 text-xs mt-6">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-400">Privilegios Críticos</p>
              <p className="text-amber-700 dark:text-amber-500 font-medium mt-0.5 leading-relaxed">
                Modificar estos permisos requiere cambiar la política PostgreSQL de Supabase. Modifique con precaución para evitar brechas de seguridad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
