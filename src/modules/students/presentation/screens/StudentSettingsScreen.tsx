'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Bell, Palette, UploadCloud, Save, CheckCircle } from 'lucide-react'
import { createClient } from '@/core/config/supabase/client'

export function StudentSettingsScreen() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'appearance'>('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Profile fields state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [grade, setGrade] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadProfile() {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                         process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      // 1. Verificar si hay sesión demo activa en la cookie (solo en modo demo)
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) return parts.pop()?.split(';').shift()
        return null
      }

      if (isDemoMode) {
        const demoCookie = getCookie('aulaensuny-demo-session')
        if (demoCookie) {
          try {
            const session = JSON.parse(decodeURIComponent(demoCookie))
            setFirstName(session.first_name || '')
            setLastName(session.last_name || '')
            setEmail(session.email || '')
            setGrade(session.grade_level ? `Grado ${session.grade_level}` : 'Grado 10°')
            setBio(session.bio || '')
            setAvatarUrl(session.avatar_url || '')
            setLoading(false)
            return
          } catch (e) {
            console.error(e)
          }
        }
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setEmail(user.email || '')
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profile) {
            setFirstName(profile.first_name || '')
            setLastName(profile.last_name || '')
            setGrade(profile.grade_level ? `Grado ${profile.grade_level}` : 'Grado 10°')
            setAvatarUrl(profile.avatar_url || '')
            setBio(user.user_metadata?.bio || '')
          } else {
            setFirstName(user.user_metadata?.first_name || '')
            setLastName(user.user_metadata?.last_name || '')
            setGrade(user.user_metadata?.grade_level ? `Grado ${user.user_metadata?.grade_level}` : 'Grado 10°')
            setAvatarUrl(user.user_metadata?.avatar_url || '')
            setBio(user.user_metadata?.bio || '')
          }
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('El archivo supera el límite de 2MB')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    // 1. Guardar en modo Demo
    if (isDemoMode) {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) return parts.pop()?.split(';').shift()
        return null
      }

      const demoCookie = getCookie('aulaensuny-demo-session')
      if (demoCookie) {
        try {
          const session = JSON.parse(decodeURIComponent(demoCookie))
          const updated = {
            ...session,
            first_name: firstName,
            last_name: lastName,
            bio: bio,
            avatar_url: avatarUrl
          }
          document.cookie = `aulaensuny-demo-session=${encodeURIComponent(JSON.stringify(updated))}; path=/; max-age=${60 * 60 * 24}`
          
          setIsSaving(false)
          setShowSuccess(true)
          setTimeout(() => {
            setShowSuccess(false)
            window.location.reload()
          }, 1000)
          return
        } catch (e) {
          console.error(e)
          setIsSaving(false)
          return
        }
      }
      setIsSaving(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Actualizar metadatos de auth
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            first_name: firstName,
            last_name: lastName,
            bio: bio,
            avatar_url: avatarUrl
          }
        })

        // Actualizar tabla profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            avatar_url: avatarUrl
          })
          .eq('id', user.id)

        if (authError || profileError) {
          console.error('Error al guardar perfil:', authError || profileError)
          alert('Error al guardar perfil: ' + (authError?.message || profileError?.message))
        } else {
          setShowSuccess(true)
          setTimeout(() => {
            setShowSuccess(false)
            window.location.reload()
          }, 1000)
        }
      }
    } catch (err) {
      console.error('Error al guardar perfil:', err)
      alert('Error inesperado al guardar perfil.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Configuración de Cuenta
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Administra tu perfil, preferencias y ajustes de seguridad.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Menu */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              }`}
            >
              <User className="h-4 w-4" /> Mi Perfil
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                activeTab === 'security'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              }`}
            >
              <Lock className="h-4 w-4" /> Seguridad
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                activeTab === 'notifications'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              }`}
            >
              <Bell className="h-4 w-4" /> Notificaciones
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                activeTab === 'appearance'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              }`}
            >
              <Palette className="h-4 w-4" /> Apariencia
            </button>
          </nav>
        </div>

        {/* Form Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900 overflow-hidden"
            >
              <div className="p-6 sm:p-8 space-y-8">
                {/* Avatar Upload */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative h-24 w-24 shrink-0 rounded-full border-4 border-white shadow-lg dark:border-slate-800 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={`${firstName} ${lastName}`}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full rounded-full flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {firstName ? firstName[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-transform hover:scale-105"
                    >
                      <UploadCloud className="h-4 w-4" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Foto de Perfil</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Sube una imagen cuadrada. El formato debe ser JPG, PNG o GIF (Max. 2MB).
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/60" />

                {/* Form Fields */}
                {loading ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        <div className="h-12 w-full rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        <div className="h-12 w-full rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        <div className="h-12 w-full rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        <div className="h-12 w-full rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        <div className="h-28 w-full rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nombres</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Apellidos</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Correo Electrónico</label>
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      />
                      <p className="text-xs text-slate-400 mt-1">El correo institucional no puede modificarse.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Grado / Grupo</label>
                      <input
                        type="text"
                        value={grade}
                        readOnly
                        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sobre Mí (Biografía)</label>
                      <textarea
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Escribe algo interesante sobre ti..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all resize-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800/60 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                  {showSuccess && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4" /> Guardado correctamente
                    </motion.div>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {isSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar Perfil
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900 overflow-hidden"
            >
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Lock className="h-5 w-5 text-slate-400" /> Cambiar Contraseña
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Asegúrate de usar una contraseña larga y segura para proteger tu cuenta.
                  </p>
                </div>
                
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contraseña actual</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nueva contraseña</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirmar nueva contraseña</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800/60 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                  {showSuccess && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4" /> Contraseña actualizada
                    </motion.div>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {isSaving ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div> : <Save className="h-4 w-4" />}
                  Actualizar Contraseña
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900 overflow-hidden"
            >
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="h-5 w-5 text-slate-400" /> Preferencias de Notificación
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Elige qué notificaciones deseas recibir en tu correo o navegador.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'n1', title: 'Nuevas Calificaciones', desc: 'Avisarme cuando un profesor haya calificado mi tarea.', defaultChecked: true },
                    { id: 'n2', title: 'Recordatorios de Tareas', desc: 'Avisarme 24 horas antes de que venza el plazo de entrega.', defaultChecked: true },
                    { id: 'n3', title: 'Anuncios del Curso', desc: 'Avisarme cuando el profesor publique una noticia o anuncio global.', defaultChecked: true },
                    { id: 'n4', title: 'Resumen Semanal', desc: 'Recibir un resumen de mi rendimiento cada domingo por correo.', defaultChecked: false },
                  ].map((notif) => (
                    <div key={notif.id} className="flex items-start justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800/60 dark:bg-slate-800/30">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{notif.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{notif.desc}</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                        <input type="checkbox" className="peer sr-only" defaultChecked={notif.defaultChecked} />
                        <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-slate-700"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800/60 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                  {showSuccess && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4" /> Preferencias guardadas
                    </motion.div>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {isSaving ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div> : <Save className="h-4 w-4" />}
                  Guardar Preferencias
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'appearance' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900 overflow-hidden"
            >
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Palette className="h-5 w-5 text-slate-400" /> Apariencia Visual
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Personaliza cómo se ve la plataforma en tu dispositivo.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="rounded-2xl border-2 border-blue-500 bg-blue-50 p-4 cursor-pointer dark:bg-blue-900/20">
                    <div className="h-20 rounded-xl bg-white shadow-sm border border-slate-200 mb-3 flex flex-col p-2 gap-2">
                      <div className="h-3 w-3/4 rounded bg-slate-200"></div>
                      <div className="h-3 w-1/2 rounded bg-slate-100"></div>
                    </div>
                    <p className="text-center font-bold text-blue-700 dark:text-blue-400 text-sm">Tema Claro</p>
                  </div>
                  <div className="rounded-2xl border-2 border-transparent bg-slate-50 p-4 hover:border-slate-200 cursor-pointer dark:bg-slate-800 dark:hover:border-slate-700">
                    <div className="h-20 rounded-xl bg-slate-900 shadow-sm border border-slate-700 mb-3 flex flex-col p-2 gap-2">
                      <div className="h-3 w-3/4 rounded bg-slate-700"></div>
                      <div className="h-3 w-1/2 rounded bg-slate-800"></div>
                    </div>
                    <p className="text-center font-bold text-slate-600 dark:text-slate-300 text-sm">Tema Oscuro</p>
                  </div>
                  <div className="rounded-2xl border-2 border-transparent bg-slate-50 p-4 hover:border-slate-200 cursor-pointer dark:bg-slate-800 dark:hover:border-slate-700 flex flex-col justify-center">
                    <div className="text-center text-slate-400 mb-2">💻</div>
                    <p className="text-center font-bold text-slate-600 dark:text-slate-300 text-sm">Sincronizar con el Sistema</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
