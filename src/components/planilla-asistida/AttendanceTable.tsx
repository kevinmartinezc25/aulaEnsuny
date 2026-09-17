'use client'

import React, { useState, useEffect, useRef } from 'react'
import { usePlanillaStore } from '@/store/usePlanillaStore'
import { Plus, Trash2, Edit2, CalendarDays } from 'lucide-react'
import { CreateSessionModal } from '@/modules/planilla-asistida/presentation/components/CreateSessionModal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { deleteAssistedSession, AssistedSession, toggleAssistedSessionLock } from '@/modules/planilla-asistida/application/attendanceActions'
import { Lock, Unlock } from 'lucide-react'

interface AttendanceTableProps {
  subjectId: string
}

export function AttendanceTable({ subjectId }: AttendanceTableProps) {
  const { students, sessions, attendance, setAttendance, removeSession, updateSession, hasUnsavedChanges, saveChanges, isSaving } = usePlanillaStore()
  const [isTogglingLock, setIsTogglingLock] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sessionToEdit, setSessionToEdit] = useState<AssistedSession | null>(null)
  
  // Para permitir desbloquear temporalmente clases pasadas que se auto-bloquean
  const [unlockedPastSessions, setUnlockedPastSessions] = useState<Set<string>>(new Set())

  // Handlers
  const handleOpenEdit = (session: AssistedSession) => {
    setSessionToEdit(session)
    setIsModalOpen(true)
  }

  // Auto-save logic (debounce)
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        saveChanges()
      }, 1500)
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [attendance, hasUnsavedChanges, saveChanges])

  const handleOpenCreate = () => {
    setSessionToEdit(null)
    setIsModalOpen(true)
  }

  const isSessionPast = (session: AssistedSession) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [year, month, day] = session.date.split('-')
    const sessionDate = new Date(Number(year), Number(month) - 1, Number(day))
    sessionDate.setHours(0, 0, 0, 0)
    return sessionDate < today
  }

  const handleToggleLock = async (session: AssistedSession) => {
    try {
      setIsTogglingLock(session.id)
      
      const isPast = isSessionPast(session)
      
      // Si es una clase pasada y no está explícitamente bloqueada en BD
      // el bloqueo es puramente visual/automático.
      if (isPast && !session.is_locked) {
        if (!unlockedPastSessions.has(session.id)) {
          setUnlockedPastSessions(prev => new Set(prev).add(session.id))
          toast.success('Clase pasada desbloqueada temporalmente')
        } else {
          setUnlockedPastSessions(prev => {
            const next = new Set(prev)
            next.delete(session.id)
            return next
          })
          toast.success('Clase bloqueada nuevamente')
        }
      } else {
        // Comportamiento normal en BD
        const newLockedState = !session.is_locked
        await toggleAssistedSessionLock(session.id, newLockedState)
        updateSession({ ...session, is_locked: newLockedState })
        
        // Si acabamos de desbloquear en BD y es pasada, la metemos a los permitidos también
        if (!newLockedState && isPast) {
          setUnlockedPastSessions(prev => new Set(prev).add(session.id))
        } else if (newLockedState) {
          setUnlockedPastSessions(prev => {
            const next = new Set(prev)
            next.delete(session.id)
            return next
          })
        }
        
        toast.success(newLockedState ? 'Clase bloqueada' : 'Clase desbloqueada')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar bloqueo')
    } finally {
      setIsTogglingLock(null)
    }
  }

  const isSessionLocked = (session: AssistedSession) => {
    if (unlockedPastSessions.has(session.id)) return false
    
    // Si el usuario lo bloqueó explícitamente, está bloqueada.
    if (session.is_locked) return true
    
    // Bloqueo automático por fecha (si la fecha es menor al día actual)
    return isSessionPast(session)
  }

  const handleToggleAttendance = (studentId: string, session: AssistedSession) => {
    if (isSessionLocked(session)) return

    const currentStatus = attendance[studentId]?.[session.id]
    
    // Ciclo: undefined -> A -> I -> E -> A
    let nextStatus: 'A' | 'I' | 'E'
    if (!currentStatus) nextStatus = 'A'
    else if (currentStatus === 'A') nextStatus = 'I'
    else if (currentStatus === 'I') nextStatus = 'E'
    else nextStatus = 'A' // Si es E, pasa a A de nuevo (o se podría añadir un null/vacío)
    
    // Si quisieramos poder dejarlo vacío:
    // else if (currentStatus === 'E') nextStatus = null
    
    setAttendance(studentId, session.id, nextStatus)
  }

  const handleDeleteSession = (sessionId: string) => {
    toast.error('¿Estás seguro de eliminar esta sesión?', {
      description: 'Se perderán todos los registros de asistencia de esta fecha.',
      action: {
        label: 'Eliminar',
        onClick: () => {
          // Actualización optimista: removemos la sesión de la UI inmediatamente
          removeSession(sessionId)
          
          toast.promise(
            deleteAssistedSession(sessionId),
            {
              loading: 'Eliminando clase...',
              success: 'Clase eliminada exitosamente',
              error: 'Error al eliminar la clase. Recarga la página.'
            }
          )
        }
      },
      cancel: { label: 'Cancelar', onClick: () => {} }
    })
  }

  // Estilos y labels para los estados
  const getStatusDisplay = (status?: 'A' | 'I' | 'E', locked?: boolean) => {
    if (locked && status) {
      let text = '-'
      if (status === 'A') text = 'Asiste'
      if (status === 'I') text = 'Inasistencia'
      if (status === 'E') text = 'Excusa'
      return <span className="text-slate-500 font-bold bg-slate-200/50 dark:bg-slate-700/50 px-1 py-1 rounded w-full h-full flex items-center justify-center text-[11px]" title={text}>{text}</span>
    }

    switch (status) {
      case 'A': return <span className="text-emerald-600 font-bold bg-emerald-50 px-1 py-1 rounded w-full h-full flex items-center justify-center text-[11px]" title="Asiste">Asiste</span>
      case 'I': return <span className="text-red-600 font-bold bg-red-50 px-1 py-1 rounded w-full h-full flex items-center justify-center text-[11px]" title="Inasistencia">Inasistencia</span>
      case 'E': return <span className="text-amber-600 font-bold bg-amber-50 px-1 py-1 rounded w-full h-full flex items-center justify-center text-[11px]" title="Excusa">Excusa</span>
      default: return <span className="text-slate-300 w-full h-full flex items-center justify-center">-</span>
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm sm:text-base">
          <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
          Registro de Asistencia
          {isSaving ? (
            <span className="text-xs font-normal text-amber-600 ml-4 flex items-center"><span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse mr-1"></span> Guardando...</span>
          ) : hasUnsavedChanges ? (
            <span className="text-xs font-normal text-slate-400 ml-4">Cambios sin guardar</span>
          ) : (
            <span className="text-xs font-normal text-emerald-600 ml-4 flex items-center"><span className="h-2 w-2 bg-emerald-500 rounded-full mr-1"></span> Guardado</span>
          )}
        </h3>
        <Button onClick={handleOpenCreate} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" />
          Nueva Clase
        </Button>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="w-full text-sm text-left border-collapse min-w-max">
          <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="hidden md:table-cell px-4 py-3 font-bold border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky left-0 z-30 w-[50px]">
                N°
              </th>
              <th className="px-2 md:px-4 py-3 font-bold border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky left-0 md:left-[50px] z-30 w-40 min-w-[160px] md:w-auto md:min-w-[250px] shadow-[4px_0_10px_rgba(0,0,0,0.05)]">
                Estudiante
              </th>
              {sessions.map(session => {
                const locked = isSessionLocked(session)
                return (
                <th key={session.id} className={`relative px-1 py-2 font-semibold border-b border-r border-slate-200 dark:border-slate-800 text-center w-[85px] min-w-[85px] max-w-[85px] group overflow-hidden ${locked ? 'bg-slate-100 dark:bg-slate-800/60' : ''}`}>
                  <div className="flex flex-col items-center justify-center">
                    <span className={`mb-1 ${locked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
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
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-slate-900 rounded shadow-sm border border-slate-200 dark:border-slate-700 p-0.5 z-10">
                      <button 
                        onClick={() => handleToggleLock(session)}
                        disabled={isTogglingLock === session.id}
                        className={`p-1 rounded bg-white/50 dark:bg-slate-800/50 ${session.is_locked ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-emerald-500'}`}
                        title={session.is_locked ? 'Desbloquear asistencia' : 'Bloquear asistencia'}
                      >
                        {session.is_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(session)}
                        disabled={session.is_locked}
                        className={`p-1 rounded bg-white/50 dark:bg-slate-800/50 ${session.is_locked ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-300 hover:text-emerald-500'}`}
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
              )})}
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
              const iPercentage = totalMarcadas > 0 ? Math.round((iCount / totalMarcadas) * 100) : 0
              const ePercentage = totalMarcadas > 0 ? Math.round((eCount / totalMarcadas) * 100) : 0

              return (
                <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group/row transition-colors">
                  <td className="hidden md:table-cell px-4 py-2 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 sticky left-0 z-10 text-center text-slate-400 group-hover/row:bg-slate-50/50 dark:group-hover/row:bg-slate-800/30">
                    {student.number}
                  </td>
                  <td 
                    title={student.full_name}
                    className="px-2 md:px-4 py-2 border-r border-slate-100 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 sticky left-0 md:left-[50px] z-10 w-40 min-w-[160px] md:w-auto md:min-w-[250px] group-hover/row:bg-slate-50/50 dark:group-hover/row:bg-slate-800/30 shadow-[4px_0_10px_rgba(0,0,0,0.05)] uppercase whitespace-normal break-words text-[11px] md:text-sm leading-tight"
                  >
                    {student.full_name}
                  </td>
                  
                  {sessions.map(session => {
                    const locked = isSessionLocked(session)
                    return (
                      <td 
                        key={session.id} 
                        className={`border-r border-slate-100 dark:border-slate-800 p-0 text-center select-none transition-colors w-[85px] min-w-[85px] max-w-[85px] overflow-hidden ${locked ? 'bg-slate-100 dark:bg-slate-800/60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        onClick={() => handleToggleAttendance(student.id, session)}
                      >
                        <div className="w-full h-10 flex items-center justify-center p-1 relative">
                          {locked && (
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMCIvPjxwYXRoIGQ9Ik0tMSwxIGwyLC0yIE0wLDQgbDQsLTQgTTMsNSBsMiwtMiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utb3BhY2l0eT0iMC4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] z-0 pointer-events-none"></div>
                          )}
                          <div className="relative z-10 w-full h-full">
                            {getStatusDisplay(attendance[student.id]?.[session.id], locked)}
                          </div>
                        </div>
                      </td>
                    )
                  })}

                  <td className="px-2 py-2 text-center text-[11px] font-medium border-l-2 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                     <div className="flex flex-col items-center justify-center gap-1">
                       <div className="flex gap-2">
                         <span className="text-emerald-600" title="Asistencias">{aCount}A {totalMarcadas > 0 ? `${aPercentage}%` : ''}</span>
                         <span className="text-red-600" title="Inasistencias">{iCount}I {totalMarcadas > 0 ? `${iPercentage}%` : ''}</span>
                         <span className="text-amber-600" title="Excusas">{eCount}E {totalMarcadas > 0 ? `${ePercentage}%` : ''}</span>
                       </div>
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
