import React from 'react'
import { TimeSlot } from '../utils/timeCalculator'
import { Calendar, Clock, GraduationCap, Quote, School, Users, User, CalendarDays } from 'lucide-react'
import { isOfficialGradeGroup } from '../utils/groupFilters'

interface PrintableScheduleProps {
  groupName: string
  directorName?: string
  classes: any[]
  timeSlots: TimeSlot[]
  groupMax: number
  isTeacherView?: boolean
}

const DAYS = [
  { id: 'Lunes', iconColor: 'text-blue-500', bgColor: 'bg-blue-50' },
  { id: 'Martes', iconColor: 'text-emerald-500', bgColor: 'bg-emerald-50' },
  { id: 'Miércoles', iconColor: 'text-amber-500', bgColor: 'bg-amber-50' },
  { id: 'Jueves', iconColor: 'text-rose-500', bgColor: 'bg-rose-50' },
  { id: 'Viernes', iconColor: 'text-indigo-500', bgColor: 'bg-indigo-50' }
]

const cleanStr = (s: any) => String(s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()

const normalizeDay = (d: any): string => {
  if (typeof d === 'number' || (!isNaN(parseInt(d, 10)) && /^\d+$/.test(String(d).trim()))) {
    const num = parseInt(String(d), 10)
    const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    return names[num - 1] || ''
  }
  const str = cleanStr(d)
  if (str.startsWith('lun')) return 'Lunes'
  if (str.startsWith('mar')) return 'Martes'
  if (str.startsWith('mie')) return 'Miércoles'
  if (str.startsWith('jue')) return 'Jueves'
  if (str.startsWith('vie')) return 'Viernes'
  if (str.startsWith('sab')) return 'Sábado'
  if (str.startsWith('dom')) return 'Domingo'
  return String(d || '')
}

export default function PrintableSchedule({ groupName, directorName, classes, timeSlots, groupMax, isTeacherView = false }: PrintableScheduleProps) {
  const maxPeriod = Number(groupMax) || 7
  const defaultFallback: TimeSlot[] = Array.from({ length: maxPeriod }, (_, i) => ({
    type: 'period',
    id: i + 1,
    startTime: '',
    endTime: ''
  }))

  let allSlots = (timeSlots || []).filter(s => s.type !== 'break' && (s.id == null || Number(s.id) <= maxPeriod))
  if (allSlots.length === 0) {
    allSlots = defaultFallback
  }

  // Filter classes for student group view so non-academic / multi-teacher meetings do not appear
  const filteredClasses = isTeacherView
    ? (classes || [])
    : (classes || []).filter(c => {
        if (!c.group) return true
        const gStr = String(c.group)
        if (gStr.includes('Comité') || gStr.includes('Reunión') || gStr.includes('DOCENTES')) return false
        return true
      })

  const isCoveredByPreviousBlock = (day: string, period: number) => {
    const targetDay = cleanStr(day)
    const p = Number(period)
    return filteredClasses.some(c => {
      const cDay = cleanStr(normalizeDay(c.day))
      const cPeriod = parseInt(String(c.period), 10)
      const cDuration = parseInt(String(c.duration || 1), 10) || 1
      return cDay === targetDay && p > cPeriod && p < cPeriod + cDuration
    })
  }

  const getStartingClass = (day: string, period: number) => {
    const targetDay = cleanStr(day)
    const p = Number(period)
    return filteredClasses.find(c => {
      const cDay = cleanStr(normalizeDay(c.day))
      const cPeriod = parseInt(String(c.period), 10)
      return cDay === targetDay && cPeriod === p
    })
  }

  return (
    <>
      <style type="text/css" media="print" dangerouslySetInnerHTML={{ __html: '@page { margin: 0; size: A4 landscape; } @media print { body, html { margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-page-wrapper { break-after: page !important; page-break-after: always !important; height: 100vh !important; max-height: 100vh !important; overflow: hidden !important; } }' }} />
      
      <div id="printable-schedule-container" className="print-page-wrapper w-[297mm] h-[209mm] bg-white text-slate-800 p-6 font-sans mx-auto relative overflow-hidden flex flex-col justify-between box-border print:w-full print:h-screen print:max-h-screen">
        <div className="relative z-10 h-full flex flex-col">
          {/* Header Section Oficial de Convivencia Escolar / Institucional */}
          <div className="mb-4">
            <div className="w-full flex items-center justify-between border-b-2 border-slate-900 pb-2 px-2">
              <div className="flex-1 flex justify-center">
                <img
                  src="/institutional-header.png"
                  alt="Institución Educativa Escuela Normal Superior del Nordeste - Yolombó Antioquia"
                  className="max-h-20 w-auto max-w-2xl object-contain drop-shadow-xs"
                  loading="eager"
                />
              </div>
              <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs flex flex-col gap-1 text-right ml-4">
                <div className="flex items-center gap-1.5 justify-end text-[10px] text-slate-500 uppercase font-bold">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Año Lectivo {new Date().getFullYear()}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end text-xs font-black text-[#1e293b]">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Jornada Mañana</span>
                </div>
              </div>
            </div>

            {/* Subheader con título y entidad */}
            <div className="flex items-center justify-between pt-2 px-2">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black uppercase tracking-wider text-[#1e293b]">
                  Horario de Clases
                </h1>
                <div className="bg-[#1e3a8a] text-white px-4 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                  {isTeacherView ? <User className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  <span className="font-bold text-xs tracking-wide">
                    {isTeacherView ? 'Docente:' : 'Grupo:'} {groupName}
                  </span>
                </div>
              </div>

              {!isTeacherView && directorName && (
                <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Director de Grupo: <b className="text-slate-900">{directorName}</b></span>
                </div>
              )}
            </div>
          </div>

          {/* Grid Section */}
          <div className="flex-1 w-full bg-white rounded-xl shadow-sm border-2 border-[#1e293b] overflow-hidden flex flex-col">
            <table className="w-full table-fixed border-collapse h-full">
              <thead>
                <tr>
                  <th className="bg-white text-[#1e293b] border-b-2 border-r border-slate-200 w-32 py-2">
                    <span className="text-sm font-black tracking-widest uppercase">Día</span>
                  </th>
                  {allSlots.map((slot, i) => (
                    <th key={`head-${i}`} className="bg-white text-[#1e293b] border-b-2 border-r border-slate-200 last:border-r-0 py-2">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold">{slot.id}ª</span>
                        {slot.startTime ? (
                          <span className="text-[9px] font-bold text-slate-500 mt-0.5 tracking-wider">
                            {slot.startTime}{slot.endTime ? ` - ${slot.endTime}` : ''}
                          </span>
                        ) : null}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dIdx) => (
                  <tr key={day.id} className="border-b border-slate-200 last:border-b-0">
                    <td className="border-r border-slate-200 bg-white">
                      <div className="flex items-center justify-center gap-2 w-full h-full">
                        <div className={`p-1.5 rounded-lg ${day.bgColor}`}>
                          <CalendarDays className={`w-5 h-5 ${day.iconColor}`} />
                        </div>
                        <span className="font-black text-xs text-[#1e293b] uppercase tracking-widest w-20">{day.id}</span>
                      </div>
                    </td>
                    {allSlots.map((slot, sIdx) => {
                      const p = slot.id!
                      if (isCoveredByPreviousBlock(day.id, p)) return null;

                      const cls = getStartingClass(day.id, p)
                      if (cls) {
                        return (
                          <td 
                            key={`${day.id}-${p}`} 
                            colSpan={parseInt(String(cls.duration || 1), 10) || 1} 
                            className="border-r border-slate-200 last:border-r-0 relative p-0" 
                          >
                            <div className="absolute inset-0" style={{ backgroundColor: `${cls.color || '#4f46e5'}15` }}>
                              <div className="w-full h-full flex flex-col justify-center items-center text-center px-1.5 py-1">
                                {isTeacherView ? (
                                  <>
                                    <span className="font-black text-xl text-[#1e293b] leading-tight tracking-tight">
                                      {cls.group || cls.teacher}
                                    </span>
                                    <span className="text-[9px] font-semibold text-slate-600 mt-0.5 line-clamp-1">
                                      {cls.subject}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-bold text-[12px] text-[#1e293b] leading-tight line-clamp-2">
                                      {cls.subject}
                                    </span>
                                    <span className="text-[10px] text-slate-600 mt-1 line-clamp-1">
                                      {cls.teacher}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        )
                      } else {
                        return (
                          <td key={`${day.id}-${p}`} className="border-r border-slate-200 last:border-r-0 bg-white text-center">
                            <span className="text-slate-300">-</span>
                          </td>
                        )
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Section */}
          <div className="mt-8 mb-2 flex justify-between items-center px-6 border-t border-slate-200 pt-6">
            {/* Vision */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full border-2 border-[#1e3a8a] flex items-center justify-center text-[#1e3a8a] bg-blue-50 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <p className="text-[10px] text-slate-600 font-medium leading-snug w-48">
                Comprometidos con la formación integral y la excelencia académica.
              </p>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-200 mx-4"></div>

            {/* Quote */}
            <div className="flex items-center gap-3 flex-1 justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-[#1e3a8a] flex items-center justify-center text-[#1e3a8a] bg-blue-50 shrink-0">
                <Quote className="w-4 h-4 fill-current" />
              </div>
              <p className="text-[11px] text-slate-700 italic font-medium leading-snug max-w-[250px] text-center">
                "La educación es el arma más poderosa que puedes usar para cambiar el mundo."
              </p>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-200 mx-4"></div>

            {/* Signature */}
            <div className="flex items-center gap-4 flex-1 justify-end pr-10">
              <div className="w-10 h-10 rounded-full border-2 border-[#1e3a8a] flex items-center justify-center text-[#1e3a8a] bg-blue-50 shrink-0">
                <School className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-center mt-2">
                <div className="w-48 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px] font-bold text-slate-600">Firma Coordinación</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
