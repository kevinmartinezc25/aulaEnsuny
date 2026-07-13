'use client'

import React, { useEffect, useState } from 'react'
import { getAdminModulePermissions, saveAdminModulePermissions, ModulePermission } from '@/modules/admin/application/actions'
import { toast } from 'sonner'
import { Shield, Save, ShieldAlert } from 'lucide-react'

export default function SuperAdminModulesPage() {
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadPermissions() {
      try {
        const data = await getAdminModulePermissions()
        setPermissions(data)
      } catch (err) {
        toast.error('Error al cargar permisos de módulos')
      } finally {
        setLoading(false)
      }
    }
    loadPermissions()
  }, [])

  const handleToggle = (key: string) => {
    setPermissions(prev =>
      prev.map(p => (p.module_key === key ? { ...p, is_enabled: !p.is_enabled } : p))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = permissions.map(p => ({
        module_key: p.module_key,
        is_enabled: p.is_enabled
      }))
      const res = await saveAdminModulePermissions(payload)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Permisos de módulos actualizados correctamente.')
      }
    } catch (err) {
      toast.error('Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900 dark:border-white"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-left pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span>Gestión de Módulos (SuperAdmin)</span>
          </h1>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
            Activa o desactiva qué secciones del panel de administración están disponibles para los administradores.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-bold shadow-md cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-amber-50/50 border border-amber-100/50 dark:bg-amber-950/10 dark:border-amber-900/30">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-medium">
            <strong>Nota de Seguridad:</strong> Desactivar un módulo ocultará la opción de la barra lateral del Administrador. Los módulos fundamentales del sistema no se pueden restringir para el SuperAdmin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {permissions.map(perm => (
            <div
              key={perm.module_key}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                perm.is_enabled
                  ? 'border-blue-100 bg-blue-50/10 dark:border-blue-950/20'
                  : 'border-slate-100 bg-slate-50/30 dark:border-slate-850/20'
              }`}
            >
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{perm.module_name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-550 font-semibold uppercase mt-0.5 tracking-wider">
                  Clave: {perm.module_key}
                </p>
              </div>

              <button
                onClick={() => handleToggle(perm.module_key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  perm.is_enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    perm.is_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
