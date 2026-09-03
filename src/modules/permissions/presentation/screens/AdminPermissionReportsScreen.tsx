'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  BarChart2,
  Calendar,
  GraduationCap,
  Clock,
  TrendingUp,
  Loader2,
  Users
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts'
import { getPermissionsReportMetrics } from '../../application/reportsActions'
import { getAdminPermissions } from '../../application/adminActions'
import { PermissionReportMetrics } from '../../domain/entities'

export function AdminPermissionReportsScreen() {
  const [metrics, setMetrics] = useState<PermissionReportMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await getPermissionsReportMetrics()
        setMetrics(data)
      } catch (e) {
        console.error(e)
        toast.error('Error al cargar métricas')
      } finally {
        setLoading(false)
      }
    }
    loadMetrics()
  }, [])

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const { requests } = await getAdminPermissions({ tab: 'all' })
      const rows = requests.map(r => ({
        'Radicado': r.requestNumber,
        'Docente': r.teacherSnapshot.fullName,
        'Correo': r.teacherSnapshot.email,
        'Tipo de Permiso': r.typeSnapshot?.name || 'Permiso',
        'Fecha Inicio': r.startDate,
        'Fecha Fin': r.endDate,
        'Modalidad': r.isFullDay ? 'Jornada Completa' : `${r.startTime} - ${r.endTime}`,
        'Motivo': r.reason,
        'Afecta Clases': r.affectsAcademicDuty ? 'Sí' : 'No',
        'Horas Afectadas': r.academicImpact?.reduce((acc, i) => acc + (i.hoursCount || 0), 0) || 0,
        'Estado': r.status,
        'Fecha Solicitud': r.createdAt.split('T')[0]
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Permisos Docentes')
      XLSX.writeFile(wb, `Reporte_Permisos_Docentes_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Reporte exportado a Excel exitosamente')
    } catch {
      toast.error('Error al exportar archivo Excel')
    } finally {
      setIsExporting(false)
    }
  }

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs">Cargando métricas y analíticas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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
            <span>📊 Reportes y Analíticas de Permisos Docentes</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Consulte tendencias institucionales, horas de clase afectadas y comportamiento mensual.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{isExporting ? 'Exportando...' : 'Exportar a Excel (XLSX)'}</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Total Solicitudes</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
            {metrics.totalRequests}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Aprobadas</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {metrics.approvedCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Rechazadas</span>
          <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
            {metrics.rejectedCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Horas Afectadas</span>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 block">
            {metrics.totalHoursAffected}h
          </span>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Evolución Mensual */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span>Evolución Mensual de Solicitudes</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="total" name="Total" stroke="#3b82f6" fillOpacity={1} fill="url(#totalGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="approved" name="Aprobadas" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Solicitudes por Tipo */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-purple-600" />
            <span>Distribución por Tipo de Permiso</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.byTypeData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Solicitudes" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ranking de Docentes con más solicitudes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-600" />
          <span>Docentes con Mayor Frecuencia de Permisos</span>
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
          {metrics.topTeachers.map((t, idx) => (
            <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-[11px] text-slate-500">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-[11px] text-slate-400">{t.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{t.count}</span>
                  <span className="text-[10px] text-slate-400 block">permisos</span>
                </div>
                <div>
                  <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">{t.hours}h</span>
                  <span className="text-[10px] text-slate-400 block">afectadas</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
