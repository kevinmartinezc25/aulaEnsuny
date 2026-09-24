import { create } from 'zustand'
import { AssistedAchievement, AssistedActivity, AssistedGrade } from '@/modules/planilla-asistida/application/actions'
import { saveAssistedGrades } from '@/modules/planilla-asistida/application/actions'
import { AssistedSession, AssistedAttendance, saveAssistedAttendance } from '@/modules/planilla-asistida/application/attendanceActions'
import { toast } from 'sonner'

export type GradeMap = Record<string, Record<string, number>> // student_id -> activity_id -> grade_value
export type AttendanceMap = Record<string, Record<string, 'A' | 'I' | 'E' | 'T'>> // student_id -> session_id -> status
interface PlanillaState {
  subjectId: string | null
  students: { id: string, number: number, full_name: string }[]
  achievements: AssistedAchievement[]
  activities: AssistedActivity[]
  grades: GradeMap
  sessions: AssistedSession[]
  attendance: AttendanceMap
  
  // Save State
  isSaving: boolean
  hasUnsavedChanges: boolean
  dirtyGrades: { student_id: string, activity_id: string, grade_value: number }[]
  dirtyAttendance: { session_id: string, student_id: string, status: 'A' | 'I' | 'E' | 'T' }[]

  // Setters
  initialize: (subjectId: string, data: {
    students: { id: string, number: number, full_name: string }[],
    achievements: AssistedAchievement[],
    activities: AssistedActivity[],
    grades: AssistedGrade[],
    sessions?: AssistedSession[],
    attendance?: AssistedAttendance[]
  }) => void
  
  setGrade: (studentId: string, activityId: string, value: number | null) => void
  setAttendance: (studentId: string, sessionId: string, status: 'A' | 'I' | 'E' | 'T' | null) => void
  saveChanges: () => Promise<void>
  
  setSessions: (sessions: AssistedSession[]) => void
  addSession: (session: AssistedSession) => void
  updateSession: (session: AssistedSession) => void
  removeSession: (sessionId: string) => void
  
  // CRUD de estudiantes en memoria
  addStudent: (student: { id: string, number: number, full_name: string, directoryId?: string }) => void
  addStudents: (studentsToAdd: { id: string, number: number, full_name: string, directoryId?: string }[]) => void
  removeStudent: (studentId: string) => void

  // CRUD de Logros en memoria
  addAchievement: (achievement: AssistedAchievement) => void
  updateAchievement: (id: string, name: string, description: string, codeConfig?: any) => void
  removeAchievement: (id: string) => void

  // CRUD de Actividades en memoria
  addActivity: (activity: AssistedActivity) => void
  updateActivity: (id: string, name: string) => void
  removeActivity: (id: string) => void
  toggleActivityPublished: (id: string) => void
}

export const usePlanillaStore = create<PlanillaState>((set, get) => ({
  subjectId: null,
  students: [],
  achievements: [],
  activities: [],
  grades: {},
  sessions: [],
  attendance: {},
  isSaving: false,
  hasUnsavedChanges: false,
  dirtyGrades: [],
  dirtyAttendance: [],

  initialize: (subjectId, data) => {
    const gradesMap: GradeMap = {}
    data.students.forEach(s => { gradesMap[s.id] = {} })
    data.grades.forEach(g => {
      if (!gradesMap[g.student_id]) gradesMap[g.student_id] = {}
      gradesMap[g.student_id][g.activity_id] = g.grade_value
    })

    const attendanceMap: AttendanceMap = {}
    data.students.forEach(s => { attendanceMap[s.id] = {} })
    if (data.attendance) {
      data.attendance.forEach(a => {
        if (!attendanceMap[a.student_id]) attendanceMap[a.student_id] = {}
        attendanceMap[a.student_id][a.session_id] = a.status
      })
    }

    set({
      subjectId,
      students: data.students,
      achievements: data.achievements,
      activities: data.activities,
      grades: gradesMap,
      sessions: data.sessions || [],
      attendance: attendanceMap,
      hasUnsavedChanges: false,
      dirtyGrades: [],
      dirtyAttendance: []
    })
  },

  addStudent: (student) => {
    set(state => {
      const newGrades = { ...state.grades }
      if (!newGrades[student.id]) newGrades[student.id] = {}
      return { 
        students: [...state.students, student],
        grades: newGrades
      }
    })
  },

  addStudents: (studentsToAdd) => {
    set(state => {
      const newGrades = { ...state.grades }
      studentsToAdd.forEach(s => {
        if (!newGrades[s.id]) newGrades[s.id] = {}
      })
      return { 
        students: [...state.students, ...studentsToAdd],
        grades: newGrades
      }
    })
  },

  removeStudent: (studentId) => {
    set(state => {
      const newStudents = state.students.filter(s => s.id !== studentId)
      const newGrades = { ...state.grades }
      delete newGrades[studentId]
      return { 
        students: newStudents,
        grades: newGrades 
      }
    })
  },

  setGrade: (studentId, activityId, value) => {
    set(state => {
      const newGrades = { ...state.grades }
      if (!newGrades[studentId]) newGrades[studentId] = {}
      
      const newDirty = [...state.dirtyGrades]
      const existingDirtyIndex = newDirty.findIndex(d => d.student_id === studentId && d.activity_id === activityId)
      
      if (value === null) {
        delete newGrades[studentId][activityId]
        
        // Registrar la eliminación para mandarla al backend
        if (existingDirtyIndex >= 0) {
          newDirty[existingDirtyIndex].grade_value = null as any
        } else {
          newDirty.push({ student_id: studentId, activity_id: activityId, grade_value: null as any })
        }
      } else {
        newGrades[studentId][activityId] = value
        
        if (existingDirtyIndex >= 0) {
          newDirty[existingDirtyIndex].grade_value = value
        } else {
          newDirty.push({ student_id: studentId, activity_id: activityId, grade_value: value })
        }
      }

      return {
        grades: newGrades,
        hasUnsavedChanges: newDirty.length > 0,
        dirtyGrades: newDirty
      }
    })
  },

  saveChanges: async () => {
    const state = get()
    if (state.dirtyGrades.length === 0 && state.dirtyAttendance.length === 0) return

    set({ isSaving: true })
    try {
      if (state.dirtyGrades.length > 0) {
        await saveAssistedGrades(state.dirtyGrades)
      }
      if (state.dirtyAttendance.length > 0) {
        await saveAssistedAttendance(state.dirtyAttendance)
      }
      set({ hasUnsavedChanges: false, dirtyGrades: [], dirtyAttendance: [], isSaving: false })
    } catch (error) {
      set({ isSaving: false })
      toast.error('Error al guardar los cambios. Intenta de nuevo.')
    }
  },

  setAttendance: (studentId, sessionId, status) => {
    set(state => {
      const newAttendance = { ...state.attendance }
      
      // Es vital clonar el objeto anidado para que React detecte el cambio de referencia
      if (newAttendance[studentId]) {
        newAttendance[studentId] = { ...newAttendance[studentId] }
      } else {
        newAttendance[studentId] = {}
      }
      
      const newDirty = [...state.dirtyAttendance]
      const existingDirtyIndex = newDirty.findIndex(d => d.student_id === studentId && d.session_id === sessionId)
      
      if (status === null) {
        delete newAttendance[studentId][sessionId]
        
        if (existingDirtyIndex >= 0) {
          newDirty[existingDirtyIndex].status = null as any
        } else {
          newDirty.push({ student_id: studentId, session_id: sessionId, status: null as any })
        }
      } else {
        newAttendance[studentId][sessionId] = status
        
        if (existingDirtyIndex >= 0) {
          newDirty[existingDirtyIndex] = { ...newDirty[existingDirtyIndex], status }
        } else {
          newDirty.push({ student_id: studentId, session_id: sessionId, status })
        }
      }

      return {
        attendance: newAttendance,
        hasUnsavedChanges: newDirty.length > 0 || state.dirtyGrades.length > 0,
        dirtyAttendance: newDirty
      }
    })
  },

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) => set(state => ({
    sessions: [...state.sessions, session].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })),

  updateSession: (session) => set(state => ({
    sessions: state.sessions.map(s => s.id === session.id ? session : s).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })),

  removeSession: (sessionId) => set(state => ({
    sessions: state.sessions.filter(s => s.id !== sessionId)
  })),

  addAchievement: (achievement) => {
    set(state => ({
      achievements: [...state.achievements, achievement]
    }))
  },

  updateAchievement: (id, name, description, codeConfig) => {
    set(state => ({
      achievements: state.achievements.map(ach => 
        ach.id === id ? { ...ach, name, description, code_config: codeConfig || ach.code_config } : ach
      )
    }))
  },

  removeAchievement: (id) => {
    set(state => ({
      achievements: state.achievements.filter(ach => ach.id !== id),
      activities: state.activities.filter(act => act.achievement_id !== id)
    }))
  },

  addActivity: (activity) => {
    set(state => ({
      activities: [...state.activities, activity]
    }))
  },

  updateActivity: (id, name) => {
    set(state => ({
      activities: state.activities.map(act => 
        act.id === id ? { ...act, name } : act
      )
    }))
  },

  removeActivity: (id) => {
    set(state => ({
      activities: state.activities.filter(act => act.id !== id)
    }))
  },

  toggleActivityPublished: (id) => {
    set(state => ({
      activities: state.activities.map(act => 
        act.id === id ? { ...act, is_published: !act.is_published } : act
      )
    }))
  }
}))
