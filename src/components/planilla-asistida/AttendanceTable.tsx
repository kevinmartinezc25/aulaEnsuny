'use client'

import React, { useState } from 'react'
import { usePlanillaStore } from '@/store/usePlanillaStore'
import { Plus, Trash2, Edit2, CalendarDays } from 'lucide-react'
import { CreateSessionModal } from '@/modules/planilla-asistida/presentation/components/CreateSessionModal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { deleteAssistedSession, AssistedSession } from '@/modules/planilla-asistida/application/attendanceActions'

interface AttendanceTableProps {
  subjectId: string
}

export function AttendanceTable({ subjectId }: AttendanceTableProps) {
  const { students, sessions, attendance, setAttendance, removeSession } = usePlanillaStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sessionToEdit, setSessionToEdit] = useState<AssistedSession | null>(null)

  // Handlers
  const handleOpenEdit = (session: AssistedSession) => {
    setSessionToEdit(session)
    setIsModalOpen(true)
  }

  const handleOpenCreate = () => {
    setSessionToEdit(null)
    setIsModalOpen(true)
  }
  const handleToggleAttendance = (studentId: string, sessionId: string) => {
    const currentStatus = attendance[studentId]?.[sessionId]
    
    // Ciclo: undefined -> A -> I -> E -> A
    let nextStatus: 'A' | 'I' | 'E'
    if (!currentStatus) nextStatus = 'A'
    else if (currentStatus === 'A') nextStatus = 'I'
    else if (currentStatus === 'I') nextStatus = 'E'
    else nextStatus = 'A' // Si es E, pasa a A de nuevo (o se podría añadir un null/vacío)
    
    // Si quisieramos poder dejarlo vacío:
    // else if (currentStatus === 'E') nextStatus = null
    
    setAttendance(studentId, sessionId, nextStatus)
  }

  const handleDeleteSession = (sessionId: string) => {
    toast.error('¿Estás seguro de eliminar esta sesión?', {
      description: 'Se perderán todos los registros de asistencia de esta fecha.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteAssistedSession(sessionId)
            removeSession(sessionId)
            toast.success('Sesión eliminada')
          } catch (error: any) {
            toast.error(error.message || 'Error al eliminar')
          }
        }
      },
      cancel: { label: 'Cancelar', onClick: () => {} }
    })
  }

  // Estilos y labels para los estados
  const getStatusDisplay = (status?: 'A' | 'I' | 'E') => {
    switch (status) {
      case 'A': return <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded w-full h-full flex items-center justify-center">A</span>
      case 'I': return <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded w-full h-full flex items-center justify-center">I</span>
      case 'E': return <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded w-full h-full flex items-center justify-center">E</span>
      default: return <span className="text-slate-300 w-full h-full flex items-center justify-center">-</span>
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-emerald-600" />
          Registro de Asistencia
        </h3>
        <Button onClick={handleOpenCreate} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8">
          <Plus className="h-4 w-4 mr-1" />
          Nueva Clase
        </Button>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="w-full text-sm text-left border-collapse min-w-max">
          <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky left-0 z-30 w-[50px]">
                N°
              </th>
              <th className="px-4 py-3 font-bold border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky left-[50px] z-30 min-w-[250px]">
                Estudiante
              </th>
              {sessions.map(session => (
                <th key={session.id} className="relative px-2 py-2 font-semibold border-b border-r border-slate-200 dark:border-slate-800 text-center min-w-[80px] max-w-[120px] group">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-slate-900 dark:text-white mb-1">
                      {(() => {
                        const [year, month, day] = session.date.split('-');
                        const localDate = new Date(Number(year), Number(month) - 1, Number(day));
                        return localDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                      })()}
                    </span>
                    {session.topic && (
                      <span className="text-[10px] font-normal text-slate-400 truncate w-full px-1" title={session.topic}>
                        {session.topic}
                      </span>
                    )}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-slate-900 rounded shadow-sm border border-slate-200 dark:border-slate-700 p-0.5">
                      <button 
                        onClick={() => handleOpenEdit(session)}
                        className="p-1 text-slate-300 hover:text-emerald-500 rounded bg-white/50 dark:bg-slate-800/50"
                        title="Editar clase"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSession(session.id)}
                        className="p-1 text-slate-300 hover:text-red-500 rounded bg-white/50 dark:bg-slate-800/50"
                        title="Eliminar clase"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 font-bold border-b border-slate-200 dark:border-slate-800 text-center min-w-[100px] bg-slate-50/80 dark:bg-slate-900/80">
                Resumen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((student) => {
              
              // Calcular resumen del estudiante
              let aCount = 0, iCount = 0, eCount = 0
              sessions.forEach(session => {
                const status = attendance[student.id]?.[session.id]
                if (status === 'A') aCount++
                if (status === 'I') iCount++
                if (status === 'E') eCount++
              })
              const totalMarcadas = aCount + iCount + eCount
              const aPercentage = totalMarcadas > 0 ? Math.round((aCount / totalMarcadas) * 100) : 0

              return (
                <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group/row transition-colors">
                  <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 sticky left-0 z-10 text-center text-slate-400 group-hover/row:bg-slate-50/50 dark:group-hover/row:bg-slate-800/30">
                    {student.number}
                  </td>
                  <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 sticky left-[50px] z-10 truncate max-w-[250px] group-hover/row:bg-slate-50/50 dark:group-hover/row:bg-slate-800/30">
                    {student.full_name}
                  </td>
                  
                  {sessions.map(session => (
                    <td 
                      key={session.id} 
                      className="border-r border-slate-100 dark:border-slate-800 p-0 text-center cursor-pointer select-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleToggleAttendance(student.id, session.id)}
                    >
                      <div className="w-full h-10 flex items-center justify-center p-1">
                        {getStatusDisplay(attendance[student.id]?.[session.id])}
                      </div>
                    </td>
                  ))}

                  <td className="px-2 py-2 text-center text-xs font-medium border-l-2 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                     <div className="flex flex-col items-center justify-center gap-1">
                       <div className="flex gap-2">
                         <span className="text-emerald-600" title="Asistencias">{aCount}A</span>
                         <span className="text-red-600" title="Inasistencias">{iCount}I</span>
                         <span className="text-amber-600" title="Excusas">{eCount}E</span>
                       </div>
                       {totalMarcadas > 0 && (
                         <span className={`text-[10px] px-1.5 py-0.5 rounded ${aPercentage < 75 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                           {aPercentage}% Asist.
                         </span>
                       )}
                     </div>
                  </td>
                </tr>
              )
            })}
            
            {students.length === 0 && (
              <tr>
                <td colSpan={sessions.length + 3} className="px-4 py-8 text-center text-slate-500">
                  No hay estudiantes registrados. Agrega estudiantes desde la pestaña correspondiente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateSessionModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSessionToEdit(null)
        }}
        subjectId={subjectId}
        onSuccess={() => {
          setIsModalOpen(false)
          setSessionToEdit(null)
        }}
        sessionToEdit={sessionToEdit}
      />
    </div>
  )
}
