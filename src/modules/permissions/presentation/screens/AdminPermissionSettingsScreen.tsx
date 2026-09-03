'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Settings,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Save,
  X,
  FileText,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { PermissionType } from '../../domain/entities'
import { getPermissionTypes } from '../../application/actions'
import { savePermissionTypeConfig, togglePermissionTypeStatus } from '../../application/adminActions'

export function AdminPermissionSettingsScreen() {
  const [types, setTypes] = useState<PermissionType[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<PermissionType | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    requiresAttachment: false,
    affectsClasses: true,
    active: true,
    sortOrder: 0
  })

  const loadTypes = async () => {
    setLoading(true)
    try {
      const data = await getPermissionTypes()
      setTypes(data)
    } catch {
      toast.error('Error al cargar tipos de permisos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTypes()
  }, [])

  const handleOpenModal = (typeToEdit?: PermissionType) => {
    if (typeToEdit) {
      setEditingType(typeToEdit)
      setFormData({
        code: typeToEdit.code,
        name: typeToEdit.name,
        description: typeToEdit.description || '',
        requiresAttachment: typeToEdit.requiresAttachment,
        affectsClasses: typeToEdit.affectsClasses,
        active: typeToEdit.active,
        sortOrder: typeToEdit.sortOrder || 0
      })
    } else {
      setEditingType(null)
      setFormData({
        code: '',
        name: '',
        description: '',
        requiresAttachment: false,
        affectsClasses: true,
        active: true,
        sortOrder: types.length + 1
      })
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await savePermissionTypeConfig({
        id: editingType?.id,
        code: formData.code,
        name: formData.name,
        description: formData.description,
        requiresAttachment: formData.requiresAttachment,
        affectsClasses: formData.affectsClasses,
        active: formData.active,
        sortOrder: Number(formData.sortOrder)
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Tipo de permiso guardado correctamente')
        setIsModalOpen(false)
        loadTypes()
      }
    } catch {
      toast.error('Error al guardar tipo de permiso')
    }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const res = await togglePermissionTypeStatus(id, !current)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Tipo de permiso ${!current ? 'activado' : 'desactivado'}`)
        loadTypes()
      }
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/permissions"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a Permisos Docentes</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>⚙️ Configuración de Tipos de Permisos</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personalice el catálogo de permisos, obligatoriedad de soportes y afectación académica institucional.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Nuevo Tipo de Permiso</span>
          </button>
        </div>
      </div>

      {/* Lista de tipos de permisos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <p className="text-xs">Cargando catálogo...</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {types.map((type) => (
              <div
                key={type.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {type.name}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {type.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        type.active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {type.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {type.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{type.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        type.requiresAttachment
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {type.requiresAttachment ? 'Soporte obligatorio' : 'Soporte opcional'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        type.affectsClasses
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {type.affectsClasses ? 'Afecta jornada regular' : 'No suele afectar clases'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleActive(type.id, type.active)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {type.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleOpenModal(type)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Editar configuración"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Crear / Editar Tipo de Permiso */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-800/40">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingType ? 'Editar Tipo de Permiso' : 'Nuevo Tipo de Permiso'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre visible *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cita médica especialista"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Código identificador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: CITA_MEDICA"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descripción u orientación para el docente
                </label>
                <textarea
                  rows={2}
                  placeholder="Indique cuándo aplica este permiso y qué debe justificar..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiresAttachment}
                    onChange={e => setFormData({ ...formData, requiresAttachment: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Exigir adjunto de soporte documental obligatorio
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.affectsClasses}
                    onChange={e => setFormData({ ...formData, affectsClasses: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Suele afectar la jornada académica regular
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Activo para solicitudes de docentes
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Guardar Configuración
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
