'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, Plus, Search, Filter, Edit, Power, PowerOff, 
  ChevronLeft, AlertTriangle, ShieldAlert, Loader2, Save
} from 'lucide-react'
import { toast } from 'sonner'
import { DisciplinarySituation } from '@/modules/disciplinary/application/actions'
import { 
  getSituations, createSituation, 
  updateSituation, toggleSituationActive 
} from '@/modules/disciplinary/application/situationsActions'

export function AdminSituationsCatalogScreen() {
  const router = useRouter()
  
  const [situations, setSituations] = useState<DisciplinarySituation[]>([])
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'Tipo I' | 'Tipo II' | 'Tipo III' | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modal de edición / creación
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSituation, setEditingSituation] = useState<DisciplinarySituation | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'Tipo I' as 'Tipo I' | 'Tipo II' | 'Tipo III',
    title: '',
    description: '',
    manualReference: '',
    category: '',
    sortOrder: 0
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getSituations({ activeOnly: false }) // Admin ve todas
      setSituations(data)
    } catch (error) {
      console.error('Error cargando situaciones:', error)
      toast.error('Error al cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // ── HANDLERS ───────────────────────────────────────────────────────────
  const filteredSituations = situations.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || s.type === typeFilter
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? s.active : !s.active)
    return matchSearch && matchType && matchStatus
  })

  const handleOpenModal = (situation?: DisciplinarySituation) => {
    if (situation) {
      setEditingSituation(situation)
      setFormData({
        code: situation.code,
        type: situation.type,
        title: situation.title,
        description: situation.description,
        manualReference: situation.manualReference || '',
        category: situation.category || '',
        sortOrder: situation.sortOrder
      })
    } else {
      setEditingSituation(null)
      setFormData({
        code: '',
        type: 'Tipo I',
        title: '',
        description: '',
        manualReference: '',
        category: '',
        sortOrder: 0
      })
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validación básica
    if (!formData.code || !formData.title || !formData.description) {
      toast.error('Código, Título y Descripción son obligatorios')
      return
    }

    setIsSaving(true)
    const toastId = toast.loading('Guardando situación...')

    try {
      if (editingSituation) {
        const res = await updateSituation(editingSituation.id, formData)
        if (res.success) {
          toast.success('Situación actualizada', { id: toastId })
          await loadData()
          setIsModalOpen(false)
        } else {
          toast.error(res.error || 'Error al actualizar', { id: toastId })
        }
      } else {
        const res = await createSituation(formData)
        if (res.success) {
          toast.success('Situación creada', { id: toastId })
          await loadData()
          setIsModalOpen(false)
        } else {
          toast.error(res.error || 'Error al crear', { id: toastId })
        }
      }
    } catch (error) {
      toast.error('Error inesperado', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const res = await toggleSituationActive(id, !currentActive)
    if (res.success) {
      toast.success(`Situación ${!currentActive ? 'activada' : 'desactivada'}`)
      setSituations(situations.map(s => s.id === id ? { ...s, active: !currentActive } : s))
    } else {
      toast.error(res.error || 'Error al cambiar estado')
    }
  }

  // ── RENDER COMPONENTES ─────────────────────────────────────────────────
  const TypeBadge = ({ type }: { type: string }) => {
    const colors = {
      'Tipo I': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
      'Tipo II': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
      'Tipo III': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
    }
    const colorClass = colors[type as keyof typeof colors] || 'bg-slate-100 text-slate-700'
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
        {type}
      </span>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/disciplinary"
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              Catálogo de Situaciones
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Administra las faltas del Manual de Convivencia Institucional.
            </p>
          </div>
        </div>
        
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" />
          Nueva Situación
        </button>
      </div>

      {/* ── FILTROS Y TABLA ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden flex flex-col">
        
        {/* Filtros */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto min-w-[280px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">Tipos (Todos)</option>
              <option value="Tipo I">Tipo I</option>
              <option value="Tipo II">Tipo II</option>
              <option value="Tipo III">Tipo III</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">Estado (Todos)</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : filteredSituations.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No hay situaciones registradas que coincidan con la búsqueda.
            </div>
          ) : (
            filteredSituations.map(situation => (
              <div key={situation.id} className={`p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${!situation.active ? 'opacity-60 grayscale' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="font-mono text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {situation.code}
                    </span>
                    <TypeBadge type={situation.type} />
                    {!situation.active && (
                      <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded">INACTIVA</span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">{situation.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {situation.description}
                  </p>
                  {situation.manualReference && (
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      Manual: {situation.manualReference}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <button
                    onClick={() => handleOpenModal(situation)}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit className="h-4 w-4" /> <span className="sm:hidden">Editar</span>
                  </button>
                  <button
                    onClick={() => handleToggleActive(situation.id, situation.active)}
                    className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      situation.active 
                        ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/30'
                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
                    }`}
                  >
                    {situation.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    <span className="sm:hidden">{situation.active ? 'Desactivar' : 'Activar'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MODAL FORMULARIO ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isSaving && setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-full"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingSituation ? 'Editar Situación' : 'Nueva Situación'}
                </h3>
              </div>
              
              <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Código <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="text"
                        placeholder="Ej: T2-001"
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tipo <span className="text-red-500">*</span></label>
                      <select 
                        required
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
                      >
                        <option value="Tipo I">Tipo I (Leves)</option>
                        <option value="Tipo II">Tipo II (Graves)</option>
                        <option value="Tipo III">Tipo III (Gravísimas)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Título / Nombre Corto <span className="text-red-500">*</span></label>
                    <input 
                      required
                      type="text"
                      placeholder="Ej: Evasión de clases"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Descripción oficial <span className="text-red-500">*</span></label>
                    <textarea 
                      required
                      placeholder="Descripción textual según el Manual de Convivencia..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:ring-2 focus:ring-blue-500 h-28 resize-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ref. Manual (Opcional)</label>
                      <input 
                        type="text"
                        placeholder="Ej: Art. 34, Num. 2"
                        value={formData.manualReference}
                        onChange={e => setFormData({ ...formData, manualReference: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Orden (Opcional)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        value={formData.sortOrder}
                        onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => !isSaving && setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
