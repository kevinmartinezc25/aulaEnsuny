'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { usePlanillaStore } from '@/store/usePlanillaStore'
import { Plus, Trash2, Edit2, CalendarDays, Lock, Unlock, MoreVertical, ArrowRight } from 'lucide-react'
import { CreateSessionModal } from '@/modules/planilla-asistida/presentation/components/CreateSessionModal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { deleteAssistedSession, AssistedSession, toggleAssistedSessionLock } from '@/modules/planilla-asistida/application/attendanceActions'

interface AttendanceTableProps {
  subjectId: string
}

export function AttendanceTable({ subjectId }: AttendanceTableProps) {
  const { students, sessions, attendance, setAttendance, removeSession, updateSession, hasUnsavedChanges, saveChanges, isSaving } = usePlanillaStore()
  const [isTogglingLock, setIsTogglingLock] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sessionToEdit, setSessionToEdit] = useState<AssistedSession | null>(null)
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null)
  
  // Para permitir desbloquear temporalmente clases pasadas que se auto-bloquean
  const [unlockedPastSessions, setUnlockedPastSessions] = useState<Set<string>>(new Set())
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const todayStr = useMemo(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const handleScrollToLatest = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        left: tableContainerRef.current.scrollWidth,
        behavior: 'smooth'
      })
    }
  }

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    if (!activeMenuSessionId) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-session-menu]')) {
        setActiveMenuSessionId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [activeMenuSessionId])

  // Handlers
  const handleOpenEdit = (session: AssistedSession) => {
    setSessionToEdit(session)
    setIsModalOpen(true)
  }

  // Auto-save logic (debounce 400ms para respuesta ágil)
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        saveChanges()
      }, 400)
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [attendance, hasUnsavedChanges, saveChanges])

  // Flush inmediato al desmontar el componente (p. ej. cambio de pestaña o navegación)
  useEffect(() => {
    return () => {
      const state = usePlanillaStore.getState()
      if (state.hasUnsavedChanges || state.dirtyGrades.length > 0 || state.dirtyAttendance.length > 0) {
        state.saveChanges()
      }
    }
  }, [])

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
    
    // Ciclo: undefined -> A -> T -> I -> E -> A
    let nextStatus: 'A' | 'I' | 'E' | 'T'
    if (!currentStatus) nextStatus = 'A'
    else if (currentStatus === 'A') nextStatus = 'T'
    else if (currentStatus === 'T') nextStatus = 'I'
    else if (currentStatus === 'I') nextStatus = 'E'
    else nextStatus = 'A'
    
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
  const getStatusDisplay = (status?: 'A' | 'I' | 'E' | 'T', locked?: boolean) => {
    if (locked && status) {
      let text = '-'
      if (status === 'A') text = 'Asiste'
      if (status === 'T') text = 'Tarde'
      if (status === 'I') text = 'Inasistencia'
      if (status === 'E') text = 'Excusa'
      return <span className="text-slate-500 font-bold bg-slate-200/50 dark:bg-slate-700/50 px-1 py-1 rounded w-full h-full flex items-center justify-center text-[11px]" title={text}>{text}</span>
    }

    switch (status) {
      case 'A': return <span className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 py-1 rounded-md w-full h-full flex items-center justify-center text-[11px] active:scale-95 transition-transform" title="Asiste">Asiste</span>
      case 'T': return <span className="text-amber-700 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-900/40 px-1 py-1 rounded-md w-full h-full flex items-center justify-center text-[11px] active:scale-95 transition-transform" title="Llega Tarde">Tarde</span>
      case 'I': return <span className="text-red-700 dark:text-red-300 font-bold bg-red-50 dark:bg-red-950/40 px-1 py-1 rounded-md w-full h-full flex items-center justify-center text-[11px] active:scale-95 transition-transform" title="Inasistencia">Inasistencia</span>
      case 'E': return <span className="text-amber-800 dark:text-amber-200 font-bold bg-amber-50 dark:bg-amber-900/30 px-1 py-1 rounded-md w-full h-full flex items-center justify-center text-[11px] active:scale-95 transition-transform" title="Excusa">Excusa</span>
      default: return <span className="text-slate-300 dark:text-slate-600 font-bold w-full h-full flex items-center justify-center text-xs">-</span>
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-0">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs sm:text-base">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
            <span>Registro de Asistencia</span>
          </h3>
          {isSaving ? (
            <span className="text-[11px] font-normal text-amber-600 flex items-center"><span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse mr-1"></span> Guardando...</span>
          ) : hasUnsavedChanges ? (
            <span className="text-[11px] font-normal text-slate-400">Sin guardar</span>
          ) : (
            <span className="text-[11px] font-normal text-emerald-600 flex items-center"><span className="h-1.5 w-1.5 bg-emerald-500 rounded-full mr-1"></span> Guardado</span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {sessions.length > 2 && (
            <button
              type="button"
              onClick={handleScrollToLatest}
              className="text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0 font-medium shadow-xs"
              title="Desplazarse a la última clase"
            >
              <span>Última clase</span>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
            </button>
          )}
          <Button onClick={handleOpenCreate} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-1" />
            Tomar Asistencia
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div ref={tableContainerRef} className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="w-full text-sm text-left border-collapse min-w-max">
          <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 sticky top-0 z-30 shadow-xs">
            <tr>
              <th className="hidden md:table-cell px-3 py-2.5 font-bold border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky left-0 z-40 w-[45px] min-w-[45px] text-center">
                N°
              </th>
              <th className="px-2.5 md:px-4 py-2.5 font-bold border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky left-0 md:left-[45px] z-40 w-36 min-w-[130px] max-w-[130px] md:w-auto md:min-w-[220px] md:max-w-none shadow-[4px_0_12px_rgba(0,0,0,0.06)]">
                Estudiante
              </th>
              {sessions.map(session => {
                const locked = isSessionLocked(session)
                const isMenuOpen = activeMenuSessionId === session.id
                const isToday = session.date === todayStr
                return (
                <th 
                  key={session.id} 
                  className={`relative px-1 py-1.5 font-semibold border-b border-r border-slate-200 dark:border-slate-800 text-center w-[96px] min-w-[96px] max-w-[96px] ${
                    locked ? 'bg-slate-100/90 dark:bg-slate-800/60' : isToday ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'bg-slate-50 dark:bg-slate-900'
                  } ${isMenuOpen ? 'z-30' : 'z-10'}`}
                >
                  <div className="flex flex-col items-center justify-center relative" data-session-menu={isMenuOpen ? "true" : undefined}>
                    {/* Fila superior: Candado (si bloqueado) + Fecha + Menú ⋮ */}
                    <div className="flex items-center justify-between w-full gap-0.5 px-0.5">
                      <div className="flex items-center gap-1 min-w-0 flex-1 justify-center pl-0.5">
                        {locked && (
                          <span title={session.is_locked ? "Clase bloqueada" : "Clase pasada (auto-bloqueada)"} className="shrink-0">
                            <Lock className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                          </span>
                        )}
                        <span className={`text-xs font-bold truncate ${locked ? 'text-slate-500 dark:text-slate-400' : isToday ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                          {(() => {
                            const [year, month, day] = session.date.split('-');
                            const localDate = new Date(Number(year), Number(month) - 1, Number(day));
                            return localDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                          })()}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-1 py-0.2 rounded shrink-0">
                            Hoy
                          </span>
                        )}
                      </div>

                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMenuSessionId(prev => prev === session.id ? null : session.id)
                        }}
                        className={`p-1 rounded-md transition-colors shrink-0 ${
                          isMenuOpen 
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100' 
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                        }`}
                        title="Opciones de clase"
                        aria-label="Opciones de clase"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Fila inferior: Tópico / Tema */}
                    {session.topic ? (
                      <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 truncate w-full px-0.5 mt-0.5 block text-center" title={session.topic}>
                        {session.topic}
                      </span>
                    ) : (
                      <span className="text-[10px] font-normal text-transparent select-none mt-0.5 block">
                        -
                      </span>
                    )}

                    {/* Menú Dropdown Contextual */}
                    {isMenuOpen && (
                      <div 
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Opción 1: Bloquear / Desbloquear */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuSessionId(null)
                            handleToggleLock(session)
                          }}
                          disabled={isTogglingLock === session.id}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          {locked ? (
                            <>
                              <Unlock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Desbloquear clase</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Bloquear clase</span>
                            </>
                          )}
                        </button>

                        {/* Opción 2: Editar clase */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuSessionId(null)
                            handleOpenEdit(session)
                          }}
                          disabled={locked}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                            locked 
                              ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={locked ? "Desbloquea la clase para editarla" : "Editar clase"}
                        >
                          <Edit2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>Editar clase</span>
                        </button>

                        {/* Separador */}
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                        {/* Opción 3: Eliminar clase */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuSessionId(null)
                            handleDeleteSession(session.id)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Eliminar clase</span>
                        </button>
                      </div>
                    )}
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
              let aCount = 0, iCount = 0, eCount = 0, tCount = 0
              sessions.forEach(session => {
                const status = attendance[student.id]?.[session.id]
                if (status === 'A') aCount++
                else if (status === 'I') iCount++
                else if (status === 'E') eCount++
                else if (status === 'T') tCount++
              })
              const totalMarcadas = aCount + iCount + eCount + tCount
              const aPercentage = totalMarcadas > 0 ? Math.round((aCount / totalMarcadas) * 100) : 0
              const tPercentage = totalMarcadas > 0 ? Math.round((tCount / totalMarcadas) * 100) : 0
              const iPercentage = totalMarcadas > 0 ? Math.round((iCount / totalMarcadas) * 100) : 0
              const ePercentage = totalMarcadas > 0 ? Math.round((eCount / totalMarcadas) * 100) : 0

              return (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group/row transition-colors">
                  <td className="hidden md:table-cell px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky left-0 z-20 text-center text-slate-400 font-mono text-xs group-hover/row:bg-slate-50 dark:group-hover/row:bg-slate-800 transition-colors">
                    {student.number}
                  </td>
                  <td 
                    title={student.full_name}
                    className="px-2.5 md:px-4 py-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 sticky left-0 md:left-[45px] z-20 w-36 min-w-[130px] max-w-[130px] md:w-auto md:min-w-[220px] md:max-w-none group-hover/row:bg-slate-50 dark:group-hover/row:bg-slate-800 transition-colors shadow-[4px_0_12px_rgba(0,0,0,0.06)] uppercase truncate text-xs leading-tight select-none"
                  >
                    {student.full_name}
                  </td>
                  
                  {sessions.map(session => {
                    const locked = isSessionLocked(session)
                    return (
                      <td 
                        key={session.id} 
                        className={`border-r border-slate-100 dark:border-slate-800 p-0 text-center select-none transition-colors w-[96px] min-w-[96px] max-w-[96px] overflow-hidden ${locked ? 'bg-slate-100 dark:bg-slate-800/60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700'}`}
                        onClick={() => handleToggleAttendance(student.id, session)}
                      >
                        <div className="w-full h-10 flex items-center justify-center p-1 relative">
                          {locked && (
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMCIvPjxwYXRoIGQ9Ik0tMSwxIGwyLC0yIE0wLDQgbDQsLTQgTTMsNSBsMiwtMiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utb3BhY2l0eT0iMC4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] z-0 pointer-events-none"></div>
                          )}
                          <div className="w-full h-full flex items-center justify-center">
                            {getStatusDisplay(attendance[student.id]?.[session.id], locked)}
                          </div>
                        </div>
                      </td>
                    )
                  })}

                  <td className="px-2 py-2 text-center text-[11px] font-medium border-l-2 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 min-w-[140px]">
                     <div className="flex flex-col items-center justify-center gap-1">
                       <div className="flex gap-1.5 flex-wrap justify-center">
                         <span className="text-emerald-600 font-semibold" title="Asistencias">{aCount}A {totalMarcadas > 0 ? `${aPercentage}%` : ''}</span>
                         <span className="text-amber-600 font-semibold" title="Llegadas Tarde">{tCount}T {totalMarcadas > 0 ? `${tPercentage}%` : ''}</span>
                         <span className="text-red-600 font-semibold" title="Inasistencias">{iCount}I {totalMarcadas > 0 ? `${iPercentage}%` : ''}</span>
                         <span className="text-amber-700 dark:text-amber-400 font-semibold" title="Excusas">{eCount}E {totalMarcadas > 0 ? `${ePercentage}%` : ''}</span>
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
