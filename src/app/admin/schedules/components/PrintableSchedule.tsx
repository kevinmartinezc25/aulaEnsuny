import React from 'react'
import { TimeSlot } from '../utils/timeCalculator'
import { Calendar, Clock, GraduationCap, Quote, School, Users, User, CalendarDays } from 'lucide-react'

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

export default function PrintableSchedule({ groupName, directorName, classes, timeSlots, groupMax, isTeacherView = false }: PrintableScheduleProps) {
  const allSlots = timeSlots.filter(s => s.type !== 'break' && s.id! <= groupMax)

  const isCoveredByPreviousBlock = (day: string, period: number) => {
    return classes.some(c => c.day === day && period > c.period && period < c.period + (c.duration || 1))
  }

  const getStartingClass = (day: string, period: number) => {
    return classes.find(c => c.day === day && c.period === period)
  }

  return (
    <>
      <style type="text/css" media="print" dangerouslySetInnerHTML={{ __html: '@page { margin: 0; size: A4 landscape; } @media print { body, html { margin: 0 !important; padding: 0 !important; height: 100% !important; overflow: hidden !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' }} />
      
      <div id="printable-schedule-container" className="w-[297mm] h-[209mm] bg-white text-slate-800 p-6 font-sans mx-auto relative overflow-hidden flex flex-col justify-between box-border print:w-full print:h-screen print:max-h-screen">
        <div className="relative z-10 h-full flex flex-col">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6 px-4">
            {/* Left Logo */}
            <div className="w-40 flex items-center justify-start">
              <img src="/logo_1.svg" alt="aulaEnsuny Logo" className="h-28 object-contain drop-shadow-md" />
            </div>

            {/* Center Titles */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <h3 className="text-[11px] font-bold text-[#1e293b] uppercase tracking-[0.2em] mb-1">
                Institución Educativa Escuela Normal Superior del Nordeste - ENSUNY {new Date().getFullYear()}
              </h3>
              <h1 className="text-[42px] font-black uppercase tracking-wider text-[#1e293b] leading-tight drop-shadow-sm">
                Horario de Clases
              </h1>
              
              <div className="flex items-center justify-center w-full max-w-md my-3 relative">
                <div className="h-px bg-slate-300 w-full absolute"></div>
                <div className="bg-white px-2 relative z-10 text-[#1e293b]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#1e293b]">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 mt-1">
                <div className="bg-[#1e3a8a] text-white px-6 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                  {isTeacherView ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  <span className="font-bold text-sm tracking-wide">{isTeacherView ? 'Docente:' : 'Grupo:'} {groupName}</span>
                </div>
                {!isTeacherView && directorName && (
                  <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                    <User className="w-3.5 h-3.5" />
                    <span>Director de Grupo: <b>{directorName}</b></span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Info Boxes */}
            <div className="w-40 flex flex-col items-end justify-center">
              <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-3 w-full">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[9px] text-slate-500 uppercase">Año Lectivo</span>
                    <span className="text-xs font-bold text-[#1e293b]">{new Date().getFullYear()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[9px] text-slate-500 uppercase">Jornada</span>
                    <span className="text-xs font-bold text-[#1e293b]">Mañana</span>
                  </div>
                </div>
              </div>
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
                        <span className="text-[9px] font-bold text-slate-500 mt-0.5 tracking-wider">{slot.startTime} - {slot.endTime}</span>
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
                            colSpan={cls.duration || 1} 
                            className="border-r border-slate-200 last:border-r-0 relative p-0" 
                          >
                            <div className="absolute inset-0" style={{ backgroundColor: `${cls.color}15` }}>
                              <div className="w-full h-full flex flex-col justify-center items-center text-center px-2 py-1">
                                <span className="font-bold text-[12px] text-[#1e293b] leading-tight line-clamp-2">{cls.subject}</span>
                                <span className="text-[10px] text-slate-600 mt-1 line-clamp-1">{cls.teacher}</span>
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
