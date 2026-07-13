'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building, Settings, Shield, Save, Loader2, CheckCircle, RefreshCw, AlertTriangle
} from 'lucide-react'

export function AdminSettingsScreen() {
  const [activeTab, setActiveTab] = useState<'general' | 'system' | 'security'>('general')
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Form State
  const [schoolInfo, setSchoolInfo] = useState({
    name: '',
    nit: '',
    rector: '',
    contactEmail: '',
    contactPhone: '',
    academicYear: ''
  })

  const [systemInfo, setSystemInfo] = useState({
    allowExternalRegister: false,
    demoModeActive: false,
    maintenanceMode: false,
    googleDriveIntegration: false
  })

  const [securityInfo, setSecurityInfo] = useState({
    minPasswordLength: 8,
    requireMfa: false,
    sessionTimeout: 60 // minutos
  })

  // Cargar configuraciones al montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSchool = localStorage.getItem('schoolInfo')
      const storedSystem = localStorage.getItem('systemInfo')
      const storedSecurity = localStorage.getItem('securityInfo')

      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (storedSchool) {
        try { setSchoolInfo(JSON.parse(storedSchool)) } catch(e){}
      } else if (isDemoMode) {
        setSchoolInfo({
          name: 'Colegio Campestre Ensuny',
          nit: '901.458.732-5',
          rector: 'Dr. Fernando Restrepo',
          contactEmail: 'rectoria@ensuny.edu.co',
          contactPhone: '+57 (601) 456-7890',
          academicYear: '2026'
        })
      }

      if (storedSystem) {
        try { setSystemInfo(JSON.parse(storedSystem)) } catch(e){}
      } else if (isDemoMode) {
        setSystemInfo({
          allowExternalRegister: false,
          demoModeActive: true,
          maintenanceMode: false,
          googleDriveIntegration: true
        })
      }

      if (storedSecurity) {
        try { setSecurityInfo(JSON.parse(storedSecurity)) } catch(e){}
      } else if (isDemoMode) {
        setSecurityInfo({
          minPasswordLength: 8,
          requireMfa: false,
          sessionTimeout: 60
        })
      }
    }
  }, [])

  const handleSave = () => {
    setIsSaving(true)
    
    // Guardar en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('schoolInfo', JSON.stringify(schoolInfo))
      localStorage.setItem('systemInfo', JSON.stringify(systemInfo))
      localStorage.setItem('securityInfo', JSON.stringify(securityInfo))
    }

    setTimeout(() => {
      setIsSaving(false)
      setSuccessMsg('Configuraciones guardadas y actualizadas con éxito en el sistema.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, 600)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Configuración General
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Modifica los parámetros institucionales, integraciones y reglas de seguridad del LMS.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4.5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 shadow-sm"
        >
          {isSaving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Save className="h-4.5 w-4.5" />}
          <span>Guardar Cambios</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-55 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        {[
          { id: 'general', name: 'Información Institucional', icon: Building },
          { id: 'system', name: 'Preferencias del Sistema', icon: Settings },
          { id: 'security', name: 'Seguridad y Accesos', icon: Shield }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Identidad Escolar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1.5">Nombre de la Institución</label>
                <input
                  type="text"
                  value={schoolInfo.name}
                  onChange={e => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1.5">NIT / Identificación Tributaria</label>
                <input
                  type="text"
                  value={schoolInfo.nit}
                  onChange={e => setSchoolInfo({ ...schoolInfo, nit: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1.5">Rector / Director General</label>
                <input
                  type="text"
                  value={schoolInfo.rector}
                  onChange={e => setSchoolInfo({ ...schoolInfo, rector: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1.5">Año Lectivo Actual</label>
                <input
                  type="text"
                  value={schoolInfo.academicYear}
                  onChange={e => setSchoolInfo({ ...schoolInfo, academicYear: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1.5">Correo Electrónico de Contacto</label>
                <input
                  type="email"
                  value={schoolInfo.contactEmail}
                  onChange={e => setSchoolInfo({ ...schoolInfo, contactEmail: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1.5">Teléfono Institucional</label>
                <input
                  type="text"
                  value={schoolInfo.contactPhone}
                  onChange={e => setSchoolInfo({ ...schoolInfo, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Comportamiento y Preferencias</h3>
            <div className="space-y-4 text-xs font-semibold">
              <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Permitir Registro de Externos</p>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">Permite a estudiantes y docentes registrarse sin invitación del admin.</p>
                </div>
                <input
                  type="checkbox"
                  checked={systemInfo.allowExternalRegister}
                  onChange={e => setSystemInfo({ ...systemInfo, allowExternalRegister: e.target.checked })}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Modo Demostración Activo</p>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">Prioriza datos estáticos enriquecidos (Mock) cuando no hay conexión local.</p>
                </div>
                <input
                  type="checkbox"
                  checked={systemInfo.demoModeActive}
                  onChange={e => setSystemInfo({ ...systemInfo, demoModeActive: e.target.checked })}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Modo Mantenimiento</p>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">Bloquea temporalmente el acceso general al LMS para estudiantes y docentes.</p>
                </div>
                <input
                  type="checkbox"
                  checked={systemInfo.maintenanceMode}
                  onChange={e => setSystemInfo({ ...systemInfo, maintenanceMode: e.target.checked })}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Políticas de Acceso y Datos</h3>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1.5">Longitud Mínima de Contraseña</label>
                  <input
                    type="number"
                    value={securityInfo.minPasswordLength}
                    onChange={e => setSecurityInfo({ ...securityInfo, minPasswordLength: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase mb-1.5">Tiempo de Expiración de Sesión (Minutos)</label>
                  <input
                    type="number"
                    value={securityInfo.sessionTimeout}
                    onChange={e => setSecurityInfo({ ...securityInfo, sessionTimeout: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-semibold">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Requerir Doble Factor de Autenticación (MFA)</p>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">Obliga a administradores y docentes a registrar un token temporal (TOTP).</p>
                </div>
                <input
                  type="checkbox"
                  checked={securityInfo.requireMfa}
                  onChange={e => setSecurityInfo({ ...securityInfo, requireMfa: e.target.checked })}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex gap-3 text-xs">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-400">Atención en Políticas de Contraseña</p>
                  <p className="text-amber-700 dark:text-amber-500 font-medium mt-0.5 leading-relaxed">
                    Las políticas aplicadas impactan de manera directa sobre la API de Supabase Auth. Asegúrese de que correspondan a las configuraciones de su dashboard oficial en Supabase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
