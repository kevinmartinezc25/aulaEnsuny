'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  getAdministratorsList,
  getUserModulePermissions,
  saveUserModulePermissions
} from '@/modules/admin/application/actions'
import {
  type ModulePermission,
  type AdministratorUser,
  ALL_ADMIN_MODULES
} from '@/modules/admin/domain/modulePermissions'
import { toast } from 'sonner'
import {
  Shield,
  Save,
  ShieldAlert,
  Users,
  Globe,
  Sparkles,
  CheckCheck,
  XCircle,
  Search,
  BookOpen,
  Scale,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Info
} from 'lucide-react'

// Categorías del sistema para agrupar módulos
const SECTION_ORDER = [
  'Gestión Académica',
  'Gestión Institucional',
  'Planificación y Recursos',
  'Reportes y Analíticas',
  'Sistema'
]

// Plantillas predefinidas de perfiles institucionales
const ROLE_PRESETS = [
  {
    id: 'academic',
    name: 'Coordinación Académica',
    icon: BookOpen,
    description: 'Cursos, docentes, estudiantes, horarios, notas y permisos docentes.',
    badge: 'Docencia y Currículo',
    keys: [
      'teachers', 'students', 'courses', 'grade-levels',
      'schedules', 'evaluations', 'academic-registry',
      'academic-reports', 'permissions', 'institutional-agenda',
      'calendar', 'notifications'
    ]
  },
  {
    id: 'convivencia',
    name: 'Coordinación de Convivencia',
    icon: Scale,
    description: 'Seguimiento disciplinario, estudiantes, circulares y gobierno escolar.',
    badge: 'Bienestar y Disciplina',
    keys: [
      'students', 'disciplinary', 'elections',
      'institutional-agenda', 'calendar', 'notifications', 'docs'
    ]
  },
  {
    id: 'secretaria',
    name: 'Secretaría y Matrículas',
    icon: FileSpreadsheet,
    description: 'Registro escolar, usuarios, certificaciones y expedientes.',
    badge: 'Administración y Archivo',
    keys: [
      'students', 'users', 'academic-registry',
      'academic-reports', 'docs', 'resources', 'notifications'
    ]
  },
  {
    id: 'all',
    name: 'Acceso Integral',
    icon: CheckCircle2,
    description: 'Habilita todos los módulos administrativos sin restricciones.',
    badge: 'Sin Restricciones',
    keys: ALL_ADMIN_MODULES.map(m => m.key)
  }
]

export default function SuperAdminModulesPage() {
  const [admins, setAdmins] = useState<AdministratorUser[]>([])
  const [selectedAdminId, setSelectedAdminId] = useState<string>('global')
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')

  // Cargar lista de administradores
  useEffect(() => {
    async function loadAdmins() {
      try {
        const list = await getAdministratorsList()
        setAdmins(list)
      } catch (err) {
        console.error('Error al cargar administradores:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAdmins()
  }, [])

  // Cargar permisos según el administrador seleccionado
  useEffect(() => {
    async function loadPerms() {
      setLoadingPerms(true)
      try {
        // En modo demo en cliente, intentar leer de localStorage primero
        if (typeof window !== 'undefined') {
          const localKey = `aulaensuny-module-perms-${selectedAdminId}`
          const stored = localStorage.getItem(localKey)
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              if (Array.isArray(parsed) && parsed.length > 0) {
                setPermissions(parsed)
                setLoadingPerms(false)
                return
              }
            } catch (e) {}
          }
        }

        const data = await getUserModulePermissions(selectedAdminId)
        setPermissions(data)
      } catch (err) {
        toast.error('Error al cargar permisos del administrador')
      } finally {
        setLoadingPerms(false)
      }
    }
    loadPerms()
  }, [selectedAdminId])

  // Administrador actualmente activo en el selector
  const currentAdmin = useMemo(() => {
    if (selectedAdminId === 'global') return null
    return admins.find(a => a.id === selectedAdminId) || null
  }, [selectedAdminId, admins])

  // Toggle individual de módulo
  const handleToggle = (key: string) => {
    setPermissions(prev =>
      prev.map(p => (p.module_key === key ? { ...p, is_enabled: !p.is_enabled } : p))
    )
  }

  // Toggle de toda una sección
  const handleToggleSection = (sectionName: string, enableAll: boolean) => {
    setPermissions(prev =>
      prev.map(p => (p.section === sectionName ? { ...p, is_enabled: enableAll } : p))
    )
  }

  // Aplicar plantilla rápida
  const handleApplyPreset = (presetKeys: string[]) => {
    const keySet = new Set(presetKeys)
    setPermissions(prev =>
      prev.map(p => ({
        ...p,
        is_enabled: keySet.has(p.module_key)
      }))
    )
    toast.success('Plantilla aplicada. Recuerde guardar los cambios.')
  }

  // Activar / Desactivar todos
  const handleToggleAll = (enable: boolean) => {
    setPermissions(prev => prev.map(p => ({ ...p, is_enabled: enable })))
  }

  // Guardar configuración
  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = permissions.map(p => ({
        module_key: p.module_key,
        is_enabled: p.is_enabled
      }))

      // Persistir en servidor / base de datos
      const res = await saveUserModulePermissions(selectedAdminId, payload)
      
      // Persistir en localStorage para modo demo / respuesta instantánea
      if (typeof window !== 'undefined') {
        localStorage.setItem(`aulaensuny-module-perms-${selectedAdminId}`, JSON.stringify(permissions))
        window.dispatchEvent(new CustomEvent('module-permissions-updated', { detail: { userId: selectedAdminId } }))
      }

      if (res?.error) {
        toast.error(res.error)
      } else {
        const targetName = currentAdmin ? currentAdmin.name : 'Predeterminados Globales'
        toast.success(`Permisos actualizados para: ${targetName}`)
      }
    } catch (err) {
      toast.error('Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  // Módulos agrupados por sección filtrados por búsqueda
  const groupedModules = useMemo(() => {
    const query = searchFilter.toLowerCase().trim()
    const filtered = query
      ? permissions.filter(p =>
          p.module_name.toLowerCase().includes(query) ||
          p.module_key.toLowerCase().includes(query) ||
          (p.section && p.section.toLowerCase().includes(query))
        )
      : permissions

    const groups: { [key: string]: ModulePermission[] } = {}
    SECTION_ORDER.forEach(sec => {
      groups[sec] = []
    })

    filtered.forEach(item => {
      const sec = item.section || 'Gestión Académica'
      if (!groups[sec]) groups[sec] = []
      groups[sec].push(item)
    })

    return groups
  }, [permissions, searchFilter])

  // Conteo de módulos habilitados
  const enabledCount = useMemo(() => {
    return permissions.filter(p => p.is_enabled).length
  }, [permissions])

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900 dark:border-white"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-left pb-20">
      {/* Encabezado Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
              <Shield className="h-6 w-6" />
            </div>
            <span>Gestión de Módulos por Administrador</span>
          </h1>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-1.5 max-w-3xl">
            Control de accesos para los roles directivos y coordinadores. Asigna qué secciones del panel están habilitadas para cada administrador o ajusta la plantilla global.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loadingPerms}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 self-start sm:self-auto"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>

      {/* Selector de Administrador */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Seleccionar Administrador a Configurar</span>
          </label>
          <span className="text-xs text-slate-400">
            {admins.length} administradores disponibles
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Opción Global / Predeterminada */}
          <button
            type="button"
            onClick={() => setSelectedAdminId('global')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              selectedAdminId === 'global'
                ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                selectedAdminId === 'global'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                <Globe className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Configuración Predeterminada
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  Plantilla para nuevos admins
                </p>
              </div>
            </div>
            {selectedAdminId === 'global' && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500"></span>
            )}
          </button>

          {/* Tarjetas de Administradores Registrados */}
          {admins.map(admin => {
            const isSelected = selectedAdminId === admin.id
            const initials = admin.name
              .split(' ')
              .map(n => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()

            return (
              <button
                key={admin.id}
                type="button"
                onClick={() => setSelectedAdminId(admin.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  }`}>
                    {initials || 'AD'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {admin.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {admin.email}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500"></span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Barra de Estado y Plantillas Rápidas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-6">
        {/* Ficha del Administrador Seleccionado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {currentAdmin ? currentAdmin.name[0] : '🌐'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentAdmin ? currentAdmin.name : 'Configuración Predeterminada Global'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  {currentAdmin ? 'Administrador Específico' : 'Regla General'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentAdmin ? currentAdmin.email : 'Aplica a cualquier admin sin personalización'} • <strong>{enabledCount} de {permissions.length}</strong> módulos habilitados
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Activar Todos</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
              <span>Desactivar Todos</span>
            </button>
          </div>
        </div>

        {/* Plantillas Rápidas (Presets) */}
        <div>
          <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Plantillas Rápidas de Roles Institucionales</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ROLE_PRESETS.map(preset => {
              const Icon = preset.icon
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.keys)}
                  className="p-3.5 rounded-2xl border border-slate-200/70 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 dark:border-slate-800 dark:bg-slate-850/20 dark:hover:bg-blue-950/20 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs group-hover:scale-105 transition-transform">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{preset.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                    {preset.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Barra de Búsqueda y Filtro */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Buscar módulo por nombre, clave o categoría (ej. Permisos, Docentes, Convivencia)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Alerta de Seguridad / Información */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 dark:bg-amber-950/15 dark:border-amber-900/30">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-medium">
            <strong>Privilegios del Administrador:</strong> Al deshabilitar un módulo, este desaparecerá de la barra de navegación del usuario seleccionado y quedará protegido contra accesos no autorizados. El SuperAdmin conserva acceso permanente a todo el sistema.
          </p>
        </div>

        {/* Listado de Módulos Agrupados */}
        {loadingPerms ? (
          <div className="py-12 flex items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {SECTION_ORDER.map(sectionTitle => {
              const modules = groupedModules[sectionTitle] || []
              if (modules.length === 0) return null

              const allEnabled = modules.every(m => m.is_enabled)
              const someEnabled = modules.some(m => m.is_enabled)

              return (
                <div key={sectionTitle} className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {sectionTitle}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {modules.filter(m => m.is_enabled).length} / {modules.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSection(sectionTitle, !allEnabled)}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {allEnabled ? 'Desactivar sección' : 'Activar toda la sección'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modules.map(perm => (
                      <div
                        key={perm.module_key}
                        className={`flex items-start justify-between p-4 rounded-2xl border transition-all ${
                          perm.is_enabled
                            ? 'border-blue-200/80 bg-blue-50/15 dark:border-blue-900/40 dark:bg-blue-950/10'
                            : 'border-slate-200/70 bg-slate-50/40 dark:border-slate-800/60 dark:bg-slate-900/40 opacity-70'
                        }`}
                      >
                        <div className="space-y-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {perm.module_name}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-150 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {perm.module_key}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                            {perm.description || ALL_ADMIN_MODULES.find(m => m.key === perm.module_key)?.description || 'Acceso al módulo funcional'}
                          </p>
                        </div>

                        <button
                          type="button"
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
