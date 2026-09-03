'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Search,
  Settings,
  BarChart2,
  Calendar,
  Clock,
  Eye,
  UserCheck,
  Building,
  GraduationCap,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { PermissionRequest, PermissionStatsSummary } from '../../domain/entities'
import { PermissionStatusBadge } from '../components/PermissionStatusBadge'
import { PermissionStatsCards } from '../components/PermissionStatsCards'
import { getAdminPermissions, getCurrentAdminRoleInfo } from '../../application/adminActions'

export function AdminPermissionsScreen() {
  const [activeTab, setActiveTab] = useState<'rector' | 'coordinator' | 'history' | 'all'>('rector')
  const [requests, setRequests] = useState<PermissionRequest[]>([])
  const [adminRole, setAdminRole] = useState<{
    role: 'superadmin' | 'admin'
    name: string
    isRector: boolean
    isCoordinator: boolean
  } | null>(null)
  const [stats, setStats] = useState<PermissionStatsSummary>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    returned: 0,
    totalHoursAffected: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function initRole() {
      try {
        const info = await getCurrentAdminRoleInfo()
        setAdminRole(info)
        // Si es rol admin exclusivo (coordinador), enfocar en su etapa correspondiente
        if (info.role === 'admin') {
          setActiveTab('coordinator')
        }
      } catch (e) {
        console.error(e)
      }
    }
    initRole()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getAdminPermissions({ tab: activeTab, search })
      setRequests(data.requests)
      setStats(data.stats)
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar solicitudes de permisos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab])

  const filteredRequests = requests.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.requestNumber.toLowerCase().includes(q) ||
      r.teacherSnapshot.fullName.toLowerCase().includes(q) ||
      r.typeSnapshot?.name.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Encabezado Directivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              📋 Permisos Docentes
            </h1>
            {adminRole && (
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  adminRole.isRector
                    ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                    : 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800'
                }`}
              >
                {adminRole.isRector ? 'Rectoría (SuperAdmin)' : 'Coordinación Académica (Admin)'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bandeja institucional de recepción, revisión y aprobación para Rectoría y Coordinación Académica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/permissions/reports"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            <BarChart2 className="h-4 w-4 text-blue-600" />
            <span>Reportes y Analíticas</span>
          </Link>
          <Link
            href="/admin/permissions/settings"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Configuración</span>
          </Link>
          <button
            onClick={loadData}
            title="Recargar bandeja"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <PermissionStatsCards stats={stats} />

      {/* Pestañas Institucionales */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('rector')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'rector'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building className="h-4 w-4" />
            <span>Etapa 1: Rectoría</span>
            {stats.pending > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-[10px]">
                {stats.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('coordinator')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'coordinator'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Etapa 2: Coordinación Académica</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-slate-800 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Histórico Institucional</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-72 pb-2 sm:pb-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar docente, radicado..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Contenido de Solicitudes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
          <p className="text-xs">Cargando solicitudes institucionales...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 inline-block mb-3">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Bandeja al día
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No hay solicitudes pendientes en esta etapa institucional.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900/60">
                      {req.requestNumber}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {req.teacherSnapshot.fullName}
                    </span>
                    <span className="text-xs text-slate-400">({req.typeSnapshot?.name})</span>
                    <PermissionStatusBadge status={req.status} size="sm" />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {req.reason}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-medium pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {req.startDate === req.endDate ? req.startDate : `${req.startDate} al ${req.endDate}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {req.isFullDay ? 'Jornada Completa' : `${req.startTime} - ${req.endTime}`}
                    </span>
                    {req.affectsAcademicDuty && (
                      <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {req.academicImpact?.length || 1} clase(s) afectada(s)
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/admin/permissions/${req.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Revisar Expediente</span>
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
