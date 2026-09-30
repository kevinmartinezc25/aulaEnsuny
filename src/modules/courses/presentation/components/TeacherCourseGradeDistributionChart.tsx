'use client'

import React from 'react'
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LabelList 
} from 'recharts'
import type { TeacherCourseStats } from '../../application/teacherActions'

interface Props {
  data: TeacherCourseStats['chartData']
}

export default function TeacherCourseGradeDistributionChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] w-full flex items-center justify-center text-center p-4">
        <p className="text-xs font-semibold text-slate-400">Sin datos de calificaciones suficientes.</p>
      </div>
    )
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 15, left: -20, bottom: 0 }} 
          barGap={8}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
          <XAxis 
            dataKey="label" 
            stroke="#94a3b8" 
            fontSize={11} 
            fontWeight={600}
            interval={0}
            tickLine={false} 
            axisLine={{ stroke: '#f1f5f9' }} 
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={11} 
            allowDecimals={false}
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null
              const item = payload[0].payload as TeacherCourseStats['chartData'][0]
              return (
                <div className="rounded-2xl border border-slate-200/80 bg-white/95 dark:bg-slate-900/95 dark:border-slate-800 p-3.5 shadow-xl backdrop-blur-md text-xs">
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.label} (Desempeño {item.desempeno})
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500 dark:text-slate-400">Estudiantes:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.count} {item.count === 1 ? 'estudiante' : 'estudiantes'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500 dark:text-slate-400">Porcentaje:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            }}
          />
          <Bar 
            dataKey="count" 
            name="Estudiantes" 
            radius={[8, 8, 0, 0]} 
            maxBarSize={56}
          >
            <LabelList 
              dataKey="count" 
              position="top" 
              fill="#64748b" 
              fontSize={12} 
              fontWeight={700}
              formatter={(val: any) => (Number(val) > 0 ? `${val} est.` : '')}
            />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
