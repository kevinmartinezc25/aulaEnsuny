'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, Save, AlertCircle, Plus, Trash2, Book, GraduationCap, 
  Calculator, BarChart3, Calendar, Lock, Video, Trophy, Smartphone, 
  AlertTriangle
} from 'lucide-react'
import { getCourseSettings, saveCourseSettings, CourseSettings, CourseGradeCategory } from '../../application/teacherActions'
import { regenerateCourseJoinCode } from '../../application/joinRequestsActions'

const SETTINGS_TABS = [
  { id: 'general', label: 'Información General', icon: Book },
  { id: 'academic', label: 'Información Académica', icon: GraduationCap },
  { id: 'evaluation', label: 'Sistema de Evaluación', icon: Calculator },
  { id: 'scale', label: 'Escala de Desempeño', icon: BarChart3 },
  { id: 'calendar', label: 'Config. Académica', icon: Calendar },
  { id: 'access', label: 'Config. de Acceso', icon: Lock },
  { id: 'media', label: 'Multimedia', icon: Video },
  { id: 'gamification', label: 'Gamificación', icon: Trophy },
  { id: 'student_ux', label: 'Exp. Estudiante', icon: Smartphone },
  { id: 'advanced', label: 'Avanzado', icon: AlertTriangle },
]

export function TeacherCourseSettingsScreen({ courseId }: { courseId: string }) {
  const [activeTab, setActiveTab] = useState('general')
  const [, setSettings] = useState<CourseSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Local state for the form (we will expand this later)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState<CourseGradeCategory[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [joinEnabled, setJoinEnabled] = useState(true)
  const [requireTeacherApproval, setRequireTeacherApproval] = useState(true)
  const [regeneratingCode, setRegeneratingCode] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getCourseSettings(courseId)
        setSettings(data)
        setTitle(data.title)
        setDescription(data.description)
        setCategories(data.categories)
        setJoinCode(data.joinCode)
        setJoinEnabled(data.joinEnabled)
        setRequireTeacherApproval(data.requireTeacherApproval)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [courseId])

  // --- Functions ---
  const handleAddCategory = () => {
    setCategories([...categories, { id: `cat_new_${Date.now()}`, name: 'Nueva Categoría', weight: 0 }])
  }

  const handleUpdateCategory = (id: string, field: keyof CourseGradeCategory, value: string | number) => {
    setCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, [field]: value } : cat
    ))
  }

  const handleRemoveCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id))
  }

  const totalWeight = categories.reduce((sum, cat) => sum + (Number(cat.weight) || 0), 0)
  const isValidWeight = totalWeight === 100

  const handleRegenerateCode = async () => {
    setRegeneratingCode(true)
    try {
      const newCode = await regenerateCourseJoinCode(courseId)
      setJoinCode(newCode)
    } catch (err) {
      console.error(err)
    } finally {
      setRegeneratingCode(false)
    }
  }

  const handleSave = async () => {
    if (!isValidWeight) return
    setSaving(true)
    try {
      await saveCourseSettings(courseId, {
        title,
        description,
        categories,
        joinCode,
        joinEnabled,
        requireTeacherApproval
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl pb-12">
      {/* Cabecera */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Configuración del Curso
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ajusta los detalles generales y el sistema de evaluación independiente.
            </p>
            {joinCode ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                <span>Código de acceso</span>
                <span className="font-mono tracking-[0.2em]">{joinCode}</span>
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Global Save Button */}
        <button
          onClick={handleSave}
          disabled={!isValidWeight || saving}
          className={`flex w-full md:w-auto items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all ${
            isValidWeight && !saving 
              ? 'bg-[#1F4E31] hover:bg-[#153823] active:scale-[0.98] shadow-sm' 
              : 'bg-slate-300 cursor-not-allowed dark:bg-slate-700'
          }`}
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Guardar Cambios</span>
        </button>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Sidebar Nav */}
        <nav className="flex w-full overflow-x-auto pb-2 md:pb-0 md:flex-col gap-1 md:w-64 flex-shrink-0 hide-scrollbar">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex whitespace-nowrap items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#1F4E31] dark:text-[#388E59]' : ''}`} />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Content Area */}
        <div className="flex-1 w-full rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-slate-800/60 dark:bg-slate-900 min-h-[500px]">
          
          <AnimatePresence mode="wait">
            
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Información General</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Configuraciones básicas del curso.</p>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre de la materia</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1F4E31] focus:bg-white focus:ring-4 focus:ring-[#1F4E31]/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Descripción completa</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1F4E31] focus:bg-white focus:ring-4 focus:ring-[#1F4E31]/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Código de invitación</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1F4E31] focus:bg-white focus:ring-4 focus:ring-[#1F4E31]/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                        placeholder="Ej. TEC10A-7F9KQ"
                      />
                      <button
                        type="button"
                        onClick={handleRegenerateCode}
                        disabled={regeneratingCode}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
                      >
                        {regeneratingCode ? '...' : 'Regenerar'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Grado/Nivel académico</label>
                      <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#1F4E31] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white">
                        <option>10º Grado</option>
                        <option>11º Grado</option>
                        <option>Universitario</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estado</label>
                      <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#1F4E31] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white">
                        <option>Activo</option>
                        <option>Borrador</option>
                        <option>Finalizado</option>
                      </select>
                    </div>
                  </div>
                  
                </div>
              </motion.div>
            )}

            {activeTab === 'evaluation' && (
              <motion.div
                key="evaluation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sistema de Evaluación</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ponderaciones independientes del curso.</p>
                  </div>
                  <button 
                    onClick={handleAddCategory}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nueva categoría
                  </button>
                </div>
                
                <div className="space-y-3">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => handleUpdateCategory(cat.id, 'name', e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium outline-none transition-all focus:border-[#1F4E31] focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                        placeholder="Ej. Quizzes"
                      />
                      <div className="relative w-28 sm:w-32">
                        <input
                          type="number"
                          value={cat.weight}
                          onChange={(e) => handleUpdateCategory(cat.id, 'weight', Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-[#1F4E31] outline-none transition-all focus:border-[#1F4E31] focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-[#388E59]"
                          min="0"
                          max="100"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">%</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveCategory(cat.id)}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Validation Banner */}
                <div className={`mt-6 flex flex-col gap-2 rounded-xl p-5 border ${isValidWeight ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-900/30' : 'bg-amber-50 border-amber-100 dark:bg-amber-500/5 dark:border-amber-900/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {!isValidWeight && <AlertCircle className={`h-5 w-5 ${isValidWeight ? '' : 'text-amber-600 dark:text-amber-500'}`} />}
                      <span className={`text-sm font-semibold ${isValidWeight ? 'text-slate-700 dark:text-slate-300' : 'text-amber-800 dark:text-amber-500'}`}>
                        Total Ponderación
                      </span>
                    </div>
                    <span className={`text-2xl font-bold ${isValidWeight ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500'}`}>
                      {totalWeight}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 mt-2">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        totalWeight === 100 ? 'bg-emerald-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(totalWeight, 100)}%` }}
                    />
                  </div>
                  
                  {!isValidWeight && (
                    <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-500">
                      ⚠️ Las ponderaciones deben sumar exactamente 100% para poder guardar los cambios.
                    </p>
                  )}
                </div>

              </motion.div>
            )}

            {activeTab === 'academic' && (
              <motion.div
                key="academic"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Información Académica</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Detalles administrativos del curso.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Docente responsable</label>
                    <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1F4E31] focus:bg-white focus:ring-4 focus:ring-[#1F4E31]/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white" placeholder="Nombre del docente" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Área académica</label>
                    <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#1F4E31] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white">
                      <option>Matemáticas</option>
                      <option>Ciencias</option>
                      <option>Humanidades</option>
                      <option>Tecnología</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Intensidad horaria (semanal)</label>
                    <input type="number" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1F4E31] focus:bg-white focus:ring-4 focus:ring-[#1F4E31]/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white" placeholder="Ej. 4" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Periodo académico</label>
                    <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#1F4E31] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white">
                      <option>Primer Semestre</option>
                      <option>Segundo Semestre</option>
                      <option>Anual</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Año lectivo</label>
                    <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1F4E31] focus:bg-white focus:ring-4 focus:ring-[#1F4E31]/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white" defaultValue="2026" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'scale' && (
              <motion.div
                key="scale"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Escala de Desempeño</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Configuración de los rangos de calificación.</p>
                </div>
                
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Nivel</th>
                        <th className="px-6 py-4 font-semibold">Rango</th>
                        <th className="px-6 py-4 font-semibold text-right">Color</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[
                        { nivel: 'Superior', rango: '4.6 - 5.0', color: 'bg-emerald-500' },
                        { nivel: 'Alto', rango: '4.0 - 4.5', color: 'bg-blue-500' },
                        { nivel: 'Básico', rango: '3.0 - 3.9', color: 'bg-amber-500' },
                        { nivel: 'Bajo', rango: '1.0 - 2.9', color: 'bg-red-500' },
                      ].map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.nivel}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.rango}</td>
                          <td className="px-6 py-4 text-right">
                            <div className={`inline-block h-4 w-4 rounded-full ${item.color}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <button className="text-sm font-medium text-[#1F4E31] hover:underline dark:text-[#388E59]">
                    Personalizar rangos
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configuración Académica</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Fechas y calendarios del curso.</p>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha de inicio</label>
                      <input type="date" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1F4E31] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha de finalización</label>
                      <input type="date" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1F4E31] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha límite de actividades globales</label>
                      <input type="date" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1F4E31] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Habilitar calendario</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Mostrar eventos y entregas en el calendario del estudiante.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" defaultChecked />
                      <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#1F4E31] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-slate-700"></div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'access' && (
              <motion.div
                key="access"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configuración de Acceso</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Privacidad y disponibilidad del curso.</p>
                </div>
                
                <div className="space-y-3">
                  {[
                    { title: 'Curso Público', desc: 'Cualquier estudiante registrado puede ver e inscribirse.', checked: false },
                    { title: 'Requiere inscripción', desc: 'El docente debe aprobar las solicitudes de acceso.', checked: true },
                    { title: 'Permitir acceso al finalizar', desc: 'Los estudiantes pueden ver el material después de cerrado el curso.', checked: true },
                    { title: 'Mostrar progreso a estudiantes', desc: 'Los estudiantes pueden ver su avance en %.', checked: true },
                  ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{setting.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{setting.desc}</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="peer sr-only" defaultChecked={setting.checked} />
                        <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#1F4E31] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-slate-700"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'media' && (
              <motion.div
                key="media"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configuración Multimedia</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Opciones de archivos y contenido embebido.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'Habilitar videos de YouTube', desc: 'Permite incrustar videos externos en las lecciones.', checked: true },
                    { title: 'Habilitar visor de PDFs', desc: 'Muestra PDFs directamente en la plataforma.', checked: true },
                    { title: 'Habilitar descargas', desc: 'Permitir descargar el material (diapositivas, documentos).', checked: false },
                  ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{setting.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{setting.desc}</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="peer sr-only" defaultChecked={setting.checked} />
                        <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#1F4E31] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-slate-700"></div>
                      </label>
                    </div>
                  ))}

                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tamaño máximo de archivos (MB)</label>
                    <select className="w-full sm:w-1/2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#1F4E31] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white">
                      <option>10 MB</option>
                      <option>50 MB</option>
                      <option>100 MB</option>
                      <option>Ilimitado</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'gamification' && (
              <motion.div
                key="gamification"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gamificación</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Activa dinámicas para motivar a los estudiantes.</p>
                </div>
                
                <div className="space-y-3">
                  {[
                    { title: 'Activar Logros', desc: 'Otorga puntos por completar módulos a tiempo.', checked: true },
                    { title: 'Activar Insignias', desc: 'Medallas especiales por destacar en quizzes o parciales.', checked: true },
                    { title: 'Progreso Visual', desc: 'Barra de experiencia y subida de niveles.', checked: true },
                    { title: 'Ranking (Leaderboard)', desc: 'Muestra un podio anónimo o público de los mejores.', checked: false },
                  ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{setting.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{setting.desc}</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="peer sr-only" defaultChecked={setting.checked} />
                        <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#1F4E31] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-slate-700"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'student_ux' && (
              <motion.div
                key="student_ux"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Experiencia del Estudiante</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Qué datos visualizan los alumnos en su panel.</p>
                </div>
                
                <div className="space-y-3">
                  {[
                    { title: 'Mostrar progreso', desc: 'Porcentaje de módulos completados.', checked: true },
                    { title: 'Mostrar porcentajes', desc: 'Ver la nota exacta de cada actividad (ej. 4.8).', checked: true },
                    { title: 'Mostrar desempeño', desc: 'Ver el concepto cualitativo (Superior, Alto, etc).', checked: true },
                    { title: 'Mostrar promedio acumulado', desc: 'El estudiante puede ver su nota definitiva en tiempo real.', checked: false },
                  ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{setting.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{setting.desc}</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="peer sr-only" defaultChecked={setting.checked} />
                        <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#1F4E31] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-slate-700"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'advanced' && (
              <motion.div
                key="advanced"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-red-600 dark:text-red-500">Configuración Avanzada</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Acciones destructivas o irreversibles (Zona de peligro).</p>
                </div>
                
                <div className="space-y-4">
                  {[
                    { title: 'Duplicar curso', desc: 'Crea una copia exacta del curso (sin estudiantes inscritos).', btn: 'Duplicar', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700' },
                    { title: 'Exportar contenido', desc: 'Descarga un paquete ZIP con todo el material subido.', btn: 'Exportar', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700' },
                    { title: 'Reiniciar progreso', desc: 'Elimina las notas de todos los estudiantes (Irreversible).', btn: 'Reiniciar', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-500 dark:hover:bg-amber-500/30' },
                    { title: 'Archivar curso', desc: 'El curso desaparecerá del listado activo pero se guardará.', btn: 'Archivar', color: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-500 dark:hover:bg-red-500/30' },
                    { title: 'Eliminar curso', desc: 'Borra absolutamente todos los datos del curso (Irreversible).', btn: 'Eliminar', color: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700' },
                  ].map((setting, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-red-100/50 p-4 dark:border-red-900/20">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{setting.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{setting.desc}</p>
                      </div>
                      <button className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${setting.color}`}>
                        {setting.btn}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      
      {/* Hide Scrollbar CSS injection (Tailwind utility shortcut if not defined globally) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}
