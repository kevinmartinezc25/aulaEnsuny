'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar as CalendarIcon, List, Clock, MapPin, Users, Plus, ChevronLeft, ChevronRight, 
  Search, SlidersHorizontal, MoreVertical, Edit2, Trash2, X, Check, AlertCircle, Bookmark,
  BookOpen, ClipboardList, GraduationCap, Heart, Flag, Laptop, FileCheck, Info, Save,
  Briefcase, CheckCircle2, MessageSquare, FileSpreadsheet, Download, Upload
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getEvents, getEventCategories, getSystemUsers, saveEvent, deleteEvent, saveEventsBatch, InstitutionalEvent, EventCategory, ProfileInfo } from '../../application/actions'
import { toast } from 'sonner'

interface InstitutionalAgendaScreenProps {
  isAdmin: boolean
}

// Icon mapper for categories
const iconMap: Record<string, any> = {
  BookOpen: BookOpen,
  ClipboardList: ClipboardList,
  GraduationCap: GraduationCap,
  Users: Users,
  Heart: Heart,
  Flag: Flag,
  Laptop: Laptop,
  FileCheck: FileCheck,
  Calendar: CalendarIcon
}

// Color mapper for Tailwind border/text/bg styling
const colorMap: Record<string, { border: string, bg: string, text: string, dot: string, accent: string }> = {
  blue: {
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    accent: 'bg-blue-500 text-white'
  },
  emerald: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    accent: 'bg-emerald-500 text-white'
  },
  amber: {
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    accent: 'bg-amber-500 text-white'
  },
  purple: {
    border: 'border-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    text: 'text-purple-600 dark:text-purple-400',
    dot: 'bg-purple-500',
    accent: 'bg-purple-500 text-white'
  },
  rose: {
    border: 'border-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
    accent: 'bg-rose-500 text-white'
  },
  violet: {
    border: 'border-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/20',
    text: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
    accent: 'bg-violet-500 text-white'
  },
  cyan: {
    border: 'border-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-950/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    dot: 'bg-cyan-500',
    accent: 'bg-cyan-500 text-white'
  },
  orange: {
    border: 'border-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    text: 'text-orange-600 dark:text-orange-400',
    dot: 'bg-orange-500',
    accent: 'bg-orange-500 text-white'
  },
  slate: {
    border: 'border-slate-500',
    bg: 'bg-slate-50 dark:bg-slate-900/40',
    text: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-500',
    accent: 'bg-slate-600 text-white'
  }
}

const getComplianceStyles = (compliance: string) => {
  switch (compliance) {
    case 'Cumplido':
      return 'bg-emerald-55/60 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
    case 'No cumplido':
      return 'bg-rose-55/60 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50'
    case 'Parcialmente cumplido':
      return 'bg-blue-55/60 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50'
    case 'Pendiente':
    default:
      return 'bg-amber-55/60 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
  }
}

export function InstitutionalAgendaScreen({ isAdmin }: InstitutionalAgendaScreenProps) {
  // Helper to calculate days in the month and starting offset (lunes-domingo)
  const getMonthDays = (d: Date) => {
    const year = d.getFullYear()
    const month = d.getMonth()
    const firstDayIndex = new Date(year, month, 1).getDay() // 0: Dom, 1: Lun, ..., 6: Sáb
    // Convertir domingo de 0 a 6, y desplazar los demás
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1
    
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    const days = []
    for (let i = 0; i < offset; i++) {
      days.push(null)
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(i)
    }
    return days
  }

  // Data State
  const [events, setEvents] = useState<InstitutionalEvent[]>([])
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [users, setUsers] = useState<ProfileInfo[]>([])
  const [loading, setLoading] = useState(true)

  // Custom manual responsibles & frequent tags State
  const [customResponsibles, setCustomResponsibles] = useState<string[]>([])
  const [manualResponsibleInput, setManualResponsibleInput] = useState('')
  const [frequentTags, setFrequentTags] = useState<string[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('agenda_frequent_tags')
      if (stored) {
        try {
          setFrequentTags(JSON.parse(stored))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  const addFrequentTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    if (!frequentTags.includes(trimmed)) {
      const updated = [...frequentTags, trimmed]
      setFrequentTags(updated)
      localStorage.setItem('agenda_frequent_tags', JSON.stringify(updated))
    }
  }

  const removeFrequentTag = (tag: string) => {
    const updated = frequentTags.filter(t => t !== tag)
    setFrequentTags(updated)
    localStorage.setItem('agenda_frequent_tags', JSON.stringify(updated))
  }

  const addCustomResponsible = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (!customResponsibles.includes(trimmed)) {
      setCustomResponsibles(prev => [...prev, trimmed])
    }
  }

  const removeCustomResponsible = (name: string) => {
    setCustomResponsibles(prev => prev.filter(n => n !== name))
  }

  // Layout View Mode: 'list' | 'month' | 'week' | 'day'
  const [viewMode, setViewMode] = useState<'list' | 'month' | 'week' | 'day'>('list')
  const [currentDate, setCurrentDate] = useState(() => new Date())

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all')
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false)

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedEvent, setSelectedEvent] = useState<InstitutionalEvent | null>(null)
  
  // Form Fields
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0])
  const [formStartTime, setFormStartTime] = useState('08:00')
  const [formEndTime, setFormEndTime] = useState('09:00')
  const [formLocation, setFormLocation] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [formStatus, setFormStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('pending')
  const [formResponsibles, setFormResponsibles] = useState<string[]>([]) // user ids
  const [formResources, setFormResources] = useState('')
  const [formCompliance, setFormCompliance] = useState('Pendiente')
  const [formObservations, setFormObservations] = useState('')

  // Excel Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importData, setImportData] = useState<any[]>([])
  const [defaultCategoryId, setDefaultCategoryId] = useState('')
  const [importMonth, setImportMonth] = useState(() => (new Date().getMonth() + 1).toString().padStart(2, '0'))
  const [importYear, setImportYear] = useState(() => new Date().getFullYear().toString())
  const [isImporting, setIsImporting] = useState(false)

  // Load Data
  const loadData = async () => {
    setLoading(true)
    const [eventsData, catsData, usersData] = await Promise.all([
      getEvents(),
      getEventCategories(),
      getSystemUsers()
    ])
    setCategories(catsData)
    setUsers(usersData)
    if (catsData && catsData.length > 0) {
      setDefaultCategoryId(catsData[0].id)
    }
    
    // Iniciar con la agenda limpia sin datos de demostración
    setEvents(eventsData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter Logic
  const filteredEvents = events.filter(e => {
    const matchesSearch = 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.event_responsibles.some(r => 
        `${r.profiles?.first_name} ${r.profiles?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      )

    const matchesCategory = 
      selectedCategoryFilter === 'all' || 
      e.category_id === selectedCategoryFilter

    const matchesPriority = 
      selectedPriorityFilter === 'all' || 
      e.priority === selectedPriorityFilter

    return matchesSearch && matchesCategory && matchesPriority
  })

  // Date Navigation
  const handlePrevDate = () => {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1)
    else if (viewMode === 'week') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }

  const handleNextDate = () => {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1)
    else if (viewMode === 'week') d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }

  const handleToday = () => {
    setCurrentDate(new Date()) // Reset to Today
  }
  // Open Creation Modal
  const openCreateModal = () => {
    setModalMode('create')
    setSelectedEvent(null)
    setFormTitle('')
    setFormDesc('')
    setFormDate(currentDate.toISOString().split('T')[0])
    setFormStartTime('08:00')
    setFormEndTime('09:00')
    setFormLocation('')
    setFormCategoryId(categories[0]?.id || '')
    setFormPriority('medium')
    setFormStatus('pending')
    setFormResponsibles([])
    setCustomResponsibles([])
    setManualResponsibleInput('')
    setFormResources('')
    setFormCompliance('Pendiente')
    setFormObservations('')
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (event: InstitutionalEvent) => {
    setModalMode('edit')
    setSelectedEvent(event)
    setFormTitle(event.title)
    setFormDesc(event.description || '')
    
    const startDateObj = new Date(event.start_date)
    const endDateObj = new Date(event.end_date)
    
    setFormDate(startDateObj.toISOString().split('T')[0])
    setFormStartTime(startDateObj.toTimeString().slice(0, 5))
    setFormEndTime(endDateObj.toTimeString().slice(0, 5))
    setFormLocation(event.location || '')
    setFormCategoryId(event.category_id || '')
    setFormPriority(event.priority)
    setFormStatus(event.status)
    setFormResponsibles(event.event_responsibles.map(r => r.user_id))
    setCustomResponsibles(event.custom_responsibles || [])
    setManualResponsibleInput('')
    setFormResources(event.resources || '')
    setFormCompliance(event.compliance || 'Pendiente')
    setFormObservations(event.observations || '')
    setIsModalOpen(true)
  }

  // Save Event Form Submit
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      toast.error('El título es requerido.')
      return
    }

    const startDateTime = new Date(`${formDate}T${formStartTime}:00`).toISOString()
    const endDateTime = new Date(`${formDate}T${formEndTime}:00`).toISOString()

    const payload = {
      id: selectedEvent?.id,
      title: formTitle,
      description: formDesc || null,
      start_date: startDateTime,
      end_date: endDateTime,
      location: formLocation || null,
      category_id: formCategoryId || null,
      priority: formPriority,
      status: formStatus,
      responsibles: formResponsibles,
      custom_responsibles: customResponsibles,
      resources: formResources || null,
      compliance: formCompliance,
      observations: formObservations || null
    }

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode || selectedEvent?.id?.startsWith('mock-')) {
      // Local client save fallback for demo mode
      if (modalMode === 'create') {
        const cat = categories.find(c => c.id === formCategoryId) || null
        const selectedProfiles = users.filter(u => formResponsibles.includes(u.id))
        const newEv: InstitutionalEvent = {
          id: `mock-${Date.now()}`,
          title: formTitle,
          description: formDesc || null,
          start_date: startDateTime,
          end_date: endDateTime,
          location: formLocation || null,
          category_id: formCategoryId || null,
          priority: formPriority,
          status: formStatus,
          created_by: 'mock-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          event_categories: cat,
          event_responsibles: selectedProfiles.map(u => ({ user_id: u.id, profiles: u })),
          custom_responsibles: customResponsibles,
          resources: formResources || null,
          compliance: formCompliance,
          observations: formObservations || null
        }
        setEvents(prev => [...prev, newEv])
        toast.success('Actividad agendada con éxito (Modo Demo)')
      } else {
        const cat = categories.find(c => c.id === formCategoryId) || null
        const selectedProfiles = users.filter(u => formResponsibles.includes(u.id))
        setEvents(prev => prev.map(ev => ev.id === selectedEvent!.id ? {
          ...ev,
          title: formTitle,
          description: formDesc || null,
          start_date: startDateTime,
          end_date: endDateTime,
          location: formLocation || null,
          category_id: formCategoryId || null,
          priority: formPriority,
          status: formStatus,
          event_categories: cat,
          event_responsibles: selectedProfiles.map(u => ({ user_id: u.id, profiles: u })),
          custom_responsibles: customResponsibles,
          resources: formResources || null,
          compliance: formCompliance,
          observations: formObservations || null
        } : ev))
        toast.success('Actividad actualizada con éxito (Modo Demo)')
      }
      setIsModalOpen(false)
      return
    }

    const result = await saveEvent(payload)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(modalMode === 'create' ? 'Actividad agendada con éxito.' : 'Actividad actualizada con éxito.')
      setIsModalOpen(false)
      loadData()
    }
  }

  // Delete Event
  const handleDeleteEvent = async (eventId: string) => {
    toast('¿Seguro que deseas eliminar esta actividad institucional?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                             process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

          if (isDemoMode || eventId.startsWith('mock-')) {
            setEvents(prev => prev.filter(e => e.id !== eventId))
            toast.success('Actividad eliminada con éxito (Modo Demo)')
            return
          }

          const result = await deleteEvent(eventId)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success('Actividad institucional eliminada.')
            loadData()
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  // Download Excel template
  const downloadTemplate = () => {
    const templateData = [
      {
        "Fecha": "Lunes 03",
        "Hora": "7:00 a.m.",
        "Actividad": "Formación general con apoyo del grupo 9.2",
        "Propósitos": "Orientar a los participantes mediante la formación general, brindando las indicaciones y lineamientos correspondientes al mes en curso, a fin de fortalecer la organización, el trabajo en equipo y el cumplimiento de las actividades programadas.",
        "Responsable": "Director de grupo 9-2 y directivos",
        "Lugar": "Cancha de la Institución Educativa",
        "Recursos": "Humanos y tecnológicos",
        "Cumplimiento": "Cumplido",
        "Observaciones": "Se desarrolló con normalidad"
      },
      {
        "Fecha": "Martes 04",
        "Hora": "7:00 a.m.",
        "Actividad": "Contacto pedagógico",
        "Propósitos": "Generar un espacio de diálogo y escucha activa entre el director de grupo y los estudiantes, que permita identificar necesidades colectivas, brindar orientaciones pedagógicas y fortalecer los acuerdos de convivencia, con el fin de optimizar el rendimiento académico y promover un clima escolar basado en el respeto y el bienestar integral.",
        "Responsable": "Directores de grupo",
        "Lugar": "Salones de la Institución Educativa",
        "Recursos": "Humanos",
        "Cumplimiento": "Pendiente",
        "Observaciones": ""
      },
      {
        "Fecha": "Martes 04",
        "Hora": "8:00 a.m.",
        "Actividad": "Visita a la sede El Porvenir con estudiantes del PFC",
        "Propósitos": "Fortalecer el conocimiento de la comunidad rural mediante la realización de visitas a las sedes, con el fin de comprender su contexto social, cultural y educativo, identificar necesidades y potencialidades, y promover acciones pertinentes que contribuyan a su desarrollo integral.",
        "Responsable": "Estudiantes del PFC, Directivos, docente orientador",
        "Lugar": "C:E.R El Porvenir",
        "Recursos": "Humanos",
        "Cumplimiento": "Pendiente",
        "Observaciones": ""
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agenda")

    // Ajustar anchos de columnas
    const maxLens = [12, 12, 40, 50, 30, 30, 20, 15, 25]
    worksheet["!cols"] = maxLens.map(w => ({ wch: w }))

    XLSX.writeFile(workbook, "plantilla_agenda_institucional.xlsx")
    toast.success("Plantilla de Excel descargada.")
  }

  // Parse row date and time to ISO strings
  const parseRowDates = (rawFecha: any, rawHora: string, selectedYear: number, selectedMonth: number) => {
    let day = 1
    let month = selectedMonth 
    let year = selectedYear

    if (typeof rawFecha === 'number') {
      const dateObj = new Date((rawFecha - 25569) * 86400 * 1000)
      if (!isNaN(dateObj.getTime())) {
        day = dateObj.getDate()
        month = dateObj.getMonth() + 1
        year = dateObj.getFullYear()
      }
    } else {
      const fechaStr = String(rawFecha).toLowerCase().trim()
      const numberMatch = fechaStr.match(/\d+/)
      if (numberMatch) {
        day = parseInt(numberMatch[0], 10)
        const parts = fechaStr.split(/[-/]/)
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            year = parseInt(parts[0], 10)
            month = parseInt(parts[1], 10)
            day = parseInt(parts[2], 10)
          } else {
            day = parseInt(parts[0], 10)
            month = parseInt(parts[1], 10)
            year = parseInt(parts[2], 10)
            if (year < 100) year += 2000
          }
        }
      }
    }

    let startHour = 8
    let startMinute = 0
    let endHour = 9
    let endMinute = 0

    const horaStr = String(rawHora || "08:00").toLowerCase().trim()
    const timeMatch = horaStr.match(/(\d+)[:.](\d+)\s*(am|pm|a\.m\.|p\.m\.)?/)
    if (timeMatch) {
      startHour = parseInt(timeMatch[1], 10)
      startMinute = parseInt(timeMatch[2], 10)
      const period = timeMatch[3]
      if (period) {
        if ((period.includes('pm') || period.includes('p.m.')) && startHour < 12) {
          startHour += 12
        } else if ((period.includes('am') || period.includes('a.m.')) && startHour === 12) {
          startHour = 0
        }
      }
      endHour = startHour + 1
      endMinute = startMinute
    } else {
      const singleNumMatch = horaStr.match(/^\d+$/)
      if (singleNumMatch) {
        startHour = parseInt(singleNumMatch[0], 10)
        endHour = startHour + 1
      }
    }

    const startDateObj = new Date(year, month - 1, day, startHour, startMinute)
    const endDateObj = new Date(year, month - 1, day, endHour, endMinute)

    return {
      start_date: startDateObj.toISOString(),
      end_date: endDateObj.toISOString()
    }
  }

  // Handle Excel upload select file
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<any>(sheet)

        if (json.length === 0) {
          toast.error("El archivo está vacío.")
          return
        }

        const parsedRows = json.map((row, index) => {
          const getVal = (keys: string[]) => {
            for (const key of keys) {
              const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim())
              if (foundKey) return row[foundKey]
            }
            return null
          }

          const rawFecha = getVal(["fecha", "date"]) || ""
          const rawHora = getVal(["hora", "time"]) || "08:00"
          const title = getVal(["actividad", "actividades", "título", "titulo", "title"]) || ""
          const description = getVal(["propósitos", "propositos", "propósito", "proposito", "descripción", "descripcion", "details", "description"]) || ""
          const customResponsibles = getVal(["responsable", "responsables", "responsible", "encargado"]) || ""
          const location = getVal(["lugar", "ubicación", "ubicacion", "location"]) || ""
          const resources = getVal(["recursos", "recurso", "resources"]) || ""
          const compliance = getVal(["cumplimiento", "estado", "compliance"]) || "Pendiente"
          const observations = getVal(["observaciones", "observación", "observacion", "observations"]) || ""

          return {
            rowId: index + 1,
            rawFecha,
            rawHora,
            title: String(title).trim(),
            description: description ? String(description).trim() : null,
            custom_responsibles: customResponsibles ? String(customResponsibles).split(/[,;]+/).map(r => r.trim()).filter(Boolean) : [],
            location: location ? String(location).trim() : null,
            resources: resources ? String(resources).trim() : null,
            compliance: String(compliance).trim(),
            observations: observations ? String(observations).trim() : null,
            isValid: !!title
          }
        })

        setImportData(parsedRows)
        toast.success(`Se cargaron ${parsedRows.length} actividades del archivo Excel.`)
      } catch (err) {
        console.error("Error al procesar Excel:", err)
        toast.error("Error al procesar el archivo Excel.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Confirm and save batch import
  const confirmImport = async () => {
    if (importData.length === 0) {
      toast.error("No hay datos para importar.")
      return
    }

    const validRows = importData.filter(r => r.isValid)
    if (validRows.length === 0) {
      toast.error("Ninguna de las filas a importar es válida.")
      return
    }

    setIsImporting(true)
    const selectedYearNum = parseInt(importYear, 10)
    const selectedMonthNum = parseInt(importMonth, 10)

    const eventsPayload = validRows.map(row => {
      const { start_date, end_date } = parseRowDates(row.rawFecha, row.rawHora, selectedYearNum, selectedMonthNum)
      return {
        title: row.title,
        description: row.description,
        start_date,
        end_date,
        location: row.location,
        category_id: defaultCategoryId || null,
        priority: 'medium' as const,
        status: 'pending' as const,
        custom_responsibles: row.custom_responsibles,
        resources: row.resources,
        compliance: row.compliance,
        observations: row.observations
      }
    })

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isDemoMode) {
      const cat = categories.find(c => c.id === defaultCategoryId) || null
      const newEvents: InstitutionalEvent[] = eventsPayload.map((ev, index) => ({
        id: `mock-import-${Date.now()}-${index}`,
        title: ev.title,
        description: ev.description,
        start_date: ev.start_date,
        end_date: ev.end_date,
        location: ev.location,
        category_id: ev.category_id,
        priority: ev.priority,
        status: ev.status,
        created_by: 'mock-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        event_categories: cat,
        event_responsibles: [],
        custom_responsibles: ev.custom_responsibles,
        resources: ev.resources,
        compliance: ev.compliance,
        observations: ev.observations
      }))

      setEvents(prev => [...prev, ...newEvents])
      toast.success(`Se importaron ${newEvents.length} actividades con éxito (Modo Demo)`)
      setIsImportModalOpen(false)
      setImportData([])
      setIsImporting(false)
      return
    }

    const result = await saveEventsBatch(eventsPayload)
    setIsImporting(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Se importaron ${result.count} actividades con éxito.`)
      setIsImportModalOpen(false)
      setImportData([])
      loadData()
    }
  }

  // Toggle responsible selection in form
  const toggleResponsible = (uid: string) => {
    setFormResponsibles(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  // Group events by day for List View
  const groupEventsByDay = (eventsList: InstitutionalEvent[]) => {
    const groups: Record<string, InstitutionalEvent[]> = {}
    eventsList.forEach(e => {
      const dayKey = new Date(e.start_date).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      
      // Capitalize first letter of weekday
      const capitalizedKey = dayKey.charAt(0).toUpperCase() + dayKey.slice(1)
      
      if (!groups[capitalizedKey]) {
        groups[capitalizedKey] = []
      }
      groups[capitalizedKey].push(e)
    })
    return groups
  }

  const groupedEvents = groupEventsByDay(filteredEvents)

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-left pb-16">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Agenda Institucional
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Consulta y organiza las actividades institucionales del colegio.
          </p>
        </div>
        
        {/* Navigation Toolbar */}
        <div className="flex items-center gap-2">
          {/* View Selection Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['month', 'week', 'list'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  viewMode === mode 
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Lista'}
              </button>
            ))}
          </div>

          <button 
            onClick={handleToday}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Hoy
          </button>
          
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button 
              onClick={handlePrevDate}
              className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={handleNextDate}
              className="p-2 border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-250 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Importar Excel</span>
              </button>
              <button 
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva actividad</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left content, Right calendar sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column (Agenda Content) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar actividad, descripción o responsable..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>

            <div className="relative w-full sm:w-auto">
              <button 
                onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filtros</span>
                {(selectedCategoryFilter !== 'all' || selectedPriorityFilter !== 'all') && (
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                )}
              </button>

              <AnimatePresence>
                {showFiltersDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-30 space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Categoría</label>
                      <select 
                        value={selectedCategoryFilter} 
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      >
                        <option value="all">Todas las categorías</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Prioridad</label>
                      <select 
                        value={selectedPriorityFilter} 
                        onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      >
                        <option value="all">Todas las prioridades</option>
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Category Buttons Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategoryFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-850 dark:text-slate-350 dark:hover:bg-slate-800'
              }`}
            >
              Todos
            </button>
            {categories.slice(0, 5).map(cat => {
              const styles = colorMap[cat.color] || colorMap.slate
              const isSelected = selectedCategoryFilter === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? styles.accent
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-850 dark:text-slate-350'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : styles.dot}`}></span>
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>

          {/* Render Views */}
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          ) : viewMode === 'list' ? (
            /* Vista Lista */
            <div className="space-y-8">
              {Object.keys(groupedEvents).length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-16 text-center bg-white dark:bg-slate-900 shadow-sm">
                  <CalendarIcon className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No hay actividades agendadas</h3>
                  <p className="text-xs text-slate-550 dark:text-slate-400 max-w-sm mx-auto">
                    No se encontraron eventos institucionales para el rango de filtros seleccionado.
                  </p>
                </div>
              ) : (
                Object.entries(groupedEvents).map(([dayKey, dayEvents]) => (
                  <div key={dayKey} className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <CalendarIcon className="h-4 w-4 text-slate-400" />
                      <h2 className="text-sm font-bold tracking-tight uppercase text-slate-500 dark:text-slate-400">{dayKey}</h2>
                    </div>

                    <div className="space-y-4">
                      {dayEvents.map(event => {
                        const catColor = event.event_categories?.color || 'slate'
                        const styling = colorMap[catColor] || colorMap.slate
                        const CatIcon = iconMap[event.event_categories?.icon || 'Calendar'] || CalendarIcon

                        const startTimeStr = new Date(event.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
                        const endTimeStr = new Date(event.end_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })

                        return (
                          <div
                            key={event.id}
                            className={`group relative flex overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:border-slate-800/60 dark:bg-slate-900/40`}
                          >
                            {/* Color bar on left edge */}
                            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${styling.dot}`} />

                            <div className="flex flex-1 flex-col md:flex-row items-start md:items-center gap-5 pl-3">
                              {/* Left icon badge */}
                              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styling.bg} ${styling.text} shrink-0`}>
                                <CatIcon className="h-6 w-6" />
                              </div>

                              {/* Details */}
                              <div className="flex-1 space-y-1.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{startTimeStr} - {endTimeStr}</span>
                                  </span>
                                  {event.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span>{event.location}</span>
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                  {event.title}
                                </h3>
                                {event.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {event.description}
                                  </p>
                                )}
                                {(event.resources || event.observations) && (
                                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40 space-y-1">
                                    {event.resources && (
                                      <div className="flex items-start gap-1.5 text-xs text-slate-650 dark:text-slate-350">
                                        <Briefcase className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                                        <span>
                                          <strong className="text-slate-800 dark:text-slate-200 font-bold">Recursos: </strong>
                                          {event.resources}
                                        </span>
                                      </div>
                                    )}
                                    {event.observations && (
                                      <div className="flex items-start gap-1.5 text-xs text-slate-650 dark:text-slate-350">
                                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                                        <span>
                                          <strong className="text-slate-800 dark:text-slate-200 font-bold">Observaciones: </strong>
                                          {event.observations}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Responsibles names */}
                              <div className="flex items-center gap-4 shrink-0">
                                {((event.event_responsibles && event.event_responsibles.length > 0) || (event.custom_responsibles && event.custom_responsibles.length > 0)) && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Responsables</p>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={[
                                      ...(event.event_responsibles || []).map(r => `${r.profiles?.first_name} ${r.profiles?.last_name}`),
                                      ...(event.custom_responsibles || [])
                                    ].join(', ')}>
                                      {[
                                        ...(event.event_responsibles || []).map(r => `${r.profiles?.first_name} ${r.profiles?.last_name}`),
                                        ...(event.custom_responsibles || [])
                                      ].join(', ')}
                                    </p>
                                  </div>
                                )}

                                {/* Compliance tag */}
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getComplianceStyles(event.compliance || 'Pendiente')}`}>
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  <span>{event.compliance || 'Pendiente'}</span>
                                </span>

                                {/* Category tag */}
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styling.bg} ${styling.text} border border-transparent`}>
                                  {event.event_categories?.name || 'General'}
                                </span>
                              </div>
                            </div>

                            {/* Admin Menu Actions */}
                            {isAdmin && (
                              <div className="flex items-center gap-1 ml-4 border-l border-slate-50 dark:border-slate-800/40 pl-4 shrink-0">
                                <button 
                                  onClick={() => openEditModal(event)}
                                  title="Editar actividad"
                                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteEvent(event.id)}
                                  title="Eliminar actividad"
                                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : viewMode === 'month' ? (
            /* Vista Mensual (Grilla de Calendario) */
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900 overflow-hidden">
              <div className="text-center pb-4 mb-4 border-b border-slate-50 dark:border-slate-800/40">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
                {/* Days of Week */}
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                  <div key={d} className="bg-slate-50 dark:bg-slate-900/60 py-2.5 text-center text-xs font-bold text-slate-500 uppercase">{d}</div>
                ))}

                {/* Grid cells */}
                {getMonthDays(currentDate).map((dayNum, i) => {
                  if (dayNum === null) {
                    return <div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-slate-900/30 min-h-[100px] p-3 border-t border-r border-slate-105 dark:border-slate-800/20" />
                  }

                  const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum)
                  
                  // Filter events on this specific day
                  const dayEvents = filteredEvents.filter(e => {
                    const sd = new Date(e.start_date)
                    return sd.getDate() === dayNum && 
                           sd.getMonth() === currentDate.getMonth() && 
                           sd.getFullYear() === currentDate.getFullYear()
                  })

                  const today = new Date()
                  const isTodayCell = 
                    dayNum === today.getDate() && 
                    currentDate.getMonth() === today.getMonth() && 
                    currentDate.getFullYear() === today.getFullYear()

                  return (
                    <div 
                      key={`day-${dayNum}`} 
                      className={`bg-white dark:bg-slate-900 min-h-[100px] p-3 border-t border-r border-slate-100 dark:border-slate-800/40 relative flex flex-col justify-between ${
                        isTodayCell ? 'ring-2 ring-blue-500/20 bg-blue-50/10 dark:bg-blue-950/5' : ''
                      }`}
                    >
                      <span className={`text-xs font-bold ${isTodayCell ? 'flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm' : 'text-slate-700 dark:text-slate-300'}`}>
                        {dayNum}
                      </span>
                      
                      <div className="mt-2 space-y-1 overflow-y-auto flex-1 max-h-[80px]">
                        {dayEvents.map(e => {
                          const catColor = e.event_categories?.color || 'slate'
                          const styling = colorMap[catColor] || colorMap.slate
                          return (
                            <div 
                              key={e.id}
                              onClick={() => {
                                if (isAdmin) openEditModal(e)
                              }}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg truncate ${styling.bg} ${styling.text} border-l-2 ${styling.border} cursor-pointer`}
                              title={e.title}
                            >
                              {e.title}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Vista Semanal */
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
              <div className="space-y-6">
                {/* Visualizer for dynamic week starting on Monday */}
                {(() => {
                  const getMonday = (d: Date) => {
                    const date = new Date(d)
                    const day = date.getDay()
                    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
                    return new Date(date.setDate(diff))
                  }
                  const startOfWeek = getMonday(currentDate)

                  return Array.from({ length: 7 }).map((_, i) => {
                    const cellDate = new Date(startOfWeek)
                    cellDate.setDate(startOfWeek.getDate() + i)
                    
                    const dayEvents = filteredEvents.filter(e => {
                      const sd = new Date(e.start_date)
                      return sd.getDate() === cellDate.getDate() &&
                             sd.getMonth() === cellDate.getMonth() &&
                             sd.getFullYear() === cellDate.getFullYear()
                    })

                    const dayName = cellDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
                    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1)

                    return (
                      <div key={i} className="flex gap-4 border-b border-slate-100 dark:border-slate-800/40 pb-4 last:border-0 last:pb-0">
                        <div className="w-32 shrink-0">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {capitalizedDayName}
                          </p>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          {dayEvents.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No hay actividades agendadas</p>
                          ) : (
                            dayEvents.map(e => {
                              const catColor = e.event_categories?.color || 'slate'
                              const styling = colorMap[catColor] || colorMap.slate
                              const startTimeStr = new Date(e.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
                              
                              return (
                                <div 
                                  key={e.id}
                                  onClick={() => { if (isAdmin) openEditModal(e) }}
                                  className={`flex items-center justify-between p-3 rounded-2xl ${styling.bg} border-l-4 ${styling.border} cursor-pointer hover:opacity-90`}
                                >
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{e.title}</h4>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{startTimeStr} - {e.location || 'Lugar no especificado'}</p>
                                  </div>
                                  
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${styling.text}`}>
                                    {e.event_categories?.name}
                                  </span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Sidebars & mini calendar) */}
        <div className="space-y-6">
          
          {/* Widget 1: Próximos eventos */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Próximos eventos</span>
            </h3>

            <div className="space-y-4">
              {filteredEvents.slice(0, 4).map(e => {
                const startTimeStr = new Date(e.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
                const catColor = e.event_categories?.color || 'slate'
                const styling = colorMap[catColor] || colorMap.slate

                return (
                  <div key={e.id} className="text-left space-y-1.5 border-b border-slate-50 dark:border-slate-850 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                      <span>
                        {new Date(e.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                      <span>{startTimeStr}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{e.title}</h4>
                    <span className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${styling.bg} ${styling.text}`}>
                      {e.event_categories?.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Widget 2: Calendario mini */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-emerald-500" />
              <span>Calendario mini</span>
            </h3>
            
            <div className="space-y-3">
              <div className="text-center font-bold text-xs text-slate-500 uppercase tracking-wider">
                {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                  <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>
                ))}
                {getMonthDays(currentDate).map((dayNum, i) => {
                  if (dayNum === null) {
                    return <div key={`mini-empty-${i}`} className="py-1.5" />
                  }

                  const today = new Date()
                  const isToday = 
                    dayNum === today.getDate() && 
                    currentDate.getMonth() === today.getMonth() && 
                    currentDate.getFullYear() === today.getFullYear()
                  
                  // If day has events, show a dot indicator
                  const hasEvents = events.some(e => {
                    const sd = new Date(e.start_date)
                    return sd.getDate() === dayNum && 
                           sd.getMonth() === currentDate.getMonth() &&
                           sd.getFullYear() === currentDate.getFullYear()
                  })

                  return (
                    <div key={`mini-day-${dayNum}`} className="relative py-1.5 flex flex-col items-center justify-center">
                      <span className={`text-[10px] font-bold ${
                        isToday 
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {dayNum}
                      </span>
                      {hasEvents && !isToday && (
                        <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Creation/Editing Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/45 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-50 dark:border-slate-800/40">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {modalMode === 'create' ? 'Agendar Nueva Actividad' : 'Editar Actividad Institucional'}
                  </h3>
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
                    Centraliza la información de este evento institucional.
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Título de la actividad</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ej: Consejo Académico, Capacitación LMS, etc."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción o Detalles</label>
                  <textarea
                    rows={3}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Describe los temas o el objetivo de la actividad..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none"
                  />
                </div>

                {/* Date & Time Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hora Inicio</label>
                    <input
                      type="time"
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hora Fin</label>
                    <input
                      type="time"
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Location & Category & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lugar</label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="Ej: Sala de juntas, Aula TIC"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría</label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prioridad</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500"
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado de la actividad</label>
                  <div className="flex gap-4">
                    {([
                      { id: 'pending', name: 'Pendiente', color: 'text-amber-500 border-amber-200 bg-amber-50' },
                      { id: 'confirmed', name: 'Confirmado', color: 'text-emerald-500 border-emerald-200 bg-emerald-50' },
                      { id: 'cancelled', name: 'Cancelado', color: 'text-rose-500 border-rose-200 bg-rose-50' }
                    ] as const).map(statusOpt => (
                      <label key={statusOpt.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="formStatus"
                          value={statusOpt.id}
                          checked={formStatus === statusOpt.id}
                          onChange={() => setFormStatus(statusOpt.id)}
                          className="peer sr-only"
                        />
                        <span className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all peer-checked:ring-2 peer-checked:ring-slate-900 dark:peer-checked:ring-white ${statusOpt.color}`}>
                          {statusOpt.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Recursos */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recursos</label>
                  <input
                    type="text"
                    value={formResources}
                    onChange={(e) => setFormResources(e.target.value)}
                    placeholder="Ej: Humanos, Tecnológicos, Espacios físicos..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* Cumplimiento */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cumplimiento</label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: 'Pendiente', name: 'Pendiente', color: 'text-amber-600 border-amber-250 bg-amber-50 dark:bg-amber-950/20' },
                      { id: 'Cumplido', name: 'Cumplido', color: 'text-emerald-600 border-emerald-250 bg-emerald-50 dark:bg-emerald-950/20' },
                      { id: 'No cumplido', name: 'No cumplido', color: 'text-rose-600 border-rose-250 bg-rose-50 dark:bg-rose-950/20' },
                      { id: 'Parcialmente cumplido', name: 'Parcial', color: 'text-blue-600 border-blue-250 bg-blue-50 dark:bg-blue-950/20' }
                    ] as const).map(opt => (
                      <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="formCompliance"
                          value={opt.id}
                          checked={formCompliance === opt.id}
                          onChange={() => setFormCompliance(opt.id)}
                          className="peer sr-only"
                        />
                        <span className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all peer-checked:ring-2 peer-checked:ring-slate-900 dark:peer-checked:ring-white ${opt.color}`}>
                          {opt.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Observaciones */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observaciones</label>
                  <textarea
                    rows={2}
                    value={formObservations}
                    onChange={(e) => setFormObservations(e.target.value)}
                    placeholder="Escribe alguna observación o anotación..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none"
                  />
                </div>

                {/* Responsibles Personalizados / Manuales */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Asignar Responsables</label>
                  
                  {/* List of currently added custom responsibles */}
                  {customResponsibles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/20">
                      {customResponsibles.map(name => (
                        <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-bold border border-blue-100/50">
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() => removeCustomResponsible(name)}
                            className="hover:text-red-500 font-bold ml-1"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Input to write manual responsible */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualResponsibleInput}
                      onChange={(e) => setManualResponsibleInput(e.target.value)}
                      placeholder="Escribir nombre o grupo (ej: Grado 10B)..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (manualResponsibleInput.trim()) {
                            addCustomResponsible(manualResponsibleInput);
                            setManualResponsibleInput('');
                          }
                        }
                      }}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (manualResponsibleInput.trim()) {
                          addCustomResponsible(manualResponsibleInput);
                          setManualResponsibleInput('');
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Agregar
                    </button>
                    {manualResponsibleInput.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          const name = manualResponsibleInput.trim();
                          addCustomResponsible(name);
                          addFrequentTag(name);
                          setManualResponsibleInput('');
                          toast.success('Guardado como etiqueta frecuente');
                        }}
                        title="Agregar y guardar como etiqueta frecuente"
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        ★ Frecuente
                      </button>
                    )}
                  </div>

                  {/* Frequent tags section */}
                  {frequentTags.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Etiquetas Frecuentes (Haga clic para agregar):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {frequentTags.map(tag => {
                          const isSelected = customResponsibles.includes(tag);
                          return (
                            <div
                              key={tag}
                              className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
                                  : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-50'
                              }`}
                            >
                              <span onClick={() => isSelected ? removeCustomResponsible(tag) : addCustomResponsible(tag)}>
                                {tag}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFrequentTag(tag);
                                }}
                                className="text-slate-300 hover:text-red-500 font-bold ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Eliminar de frecuentes"
                              >
                                &times;
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-50 dark:border-slate-800/40">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-bold shadow-md"
                  >
                    <Save className="h-4 w-4" />
                    <span>Guardar Actividad</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Excel Modal Dialog */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/45 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/40">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-450" />
                    <span>Importar Agenda desde Excel</span>
                  </h3>
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
                    Sube un documento de Excel para cargar múltiples actividades institucionales a la vez.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsImportModalOpen(false)
                    setImportData([])
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Actions & Template Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-55/40 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-2 text-left">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">¿No tienes el formato adecuado?</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Descarga nuestra plantilla modelo de Excel pre-diligenciada para conocer exactamente qué columnas usar.
                    </p>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer border border-emerald-200 dark:border-emerald-900/50"
                    >
                      <Download className="h-4 w-4" />
                      <span>Descargar Plantilla</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Month Select */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mes de Destino</label>
                        <select
                          value={importMonth}
                          onChange={(e) => setImportMonth(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        >
                          {Array.from({ length: 12 }).map((_, i) => {
                            const val = (i + 1).toString().padStart(2, '0')
                            const label = new Date(2026, i, 1).toLocaleDateString('es-ES', { month: 'long' })
                            return <option key={val} value={val}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
                          })}
                        </select>
                      </div>

                      {/* Year Select */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Año de Destino</label>
                        <select
                          value={importYear}
                          onChange={(e) => setImportYear(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        >
                          {["2025", "2026", "2027", "2028"].map(yr => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Default Category */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría por Defecto</label>
                      <select
                        value={defaultCategoryId}
                        onChange={(e) => setDefaultCategoryId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dropzone Area */}
                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center bg-slate-50/20 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-all flex flex-col items-center justify-center">
                  <Upload className="h-10 w-10 text-slate-350 dark:text-slate-650 mb-3" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Selecciona o arrastra el archivo de Excel
                  </p>
                  <p className="text-[10px] text-slate-400 mb-4">
                    Soporta formatos .xlsx y .xls
                  </p>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Preview Table */}
                {importData.length > 0 && (
                  <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Vista previa de actividades a importar</h4>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        {importData.filter(r => r.isValid).length} actividades listas
                      </span>
                    </div>

                    <div className="border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-150 dark:border-slate-800">
                            <th className="p-3">Fila</th>
                            <th className="p-3">Fecha / Hora</th>
                            <th className="p-3">Actividad</th>
                            <th className="p-3">Lugar / Recursos</th>
                            <th className="p-3">Cumplimiento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
                          {importData.map((row) => (
                            <tr 
                              key={row.rowId} 
                              className={`hover:bg-slate-50/40 dark:hover:bg-slate-800/10 ${!row.isValid ? 'bg-red-50/10 text-red-550' : 'text-slate-750 dark:text-slate-300'}`}
                            >
                              <td className="p-3 font-semibold">{row.rowId}</td>
                              <td className="p-3">
                                <div className="font-semibold">{row.rawFecha}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{row.rawHora}</div>
                              </td>
                              <td className="p-3 font-semibold max-w-[200px] truncate" title={row.title}>
                                {row.title || <span className="italic text-red-400 font-semibold">Título requerido</span>}
                              </td>
                              <td className="p-3 font-medium">
                                <div className="max-w-[200px] truncate text-slate-700 dark:text-slate-350">{row.location || '-'}</div>
                                <div className="text-[10px] text-slate-400 max-w-[200px] truncate">{row.resources || '-'}</div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.compliance === 'Cumplido' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450' :
                                  row.compliance === 'No cumplido' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450' :
                                  row.compliance === 'Parcialmente cumplido' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-450' :
                                  'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450'
                                }`}>
                                  {row.compliance}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-800/40">
                <button 
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false)
                    setImportData([])
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  disabled={isImporting || importData.length === 0}
                  onClick={confirmImport}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-855 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isImporting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-slate-900 border-t-transparent"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isImporting ? 'Importando...' : 'Confirmar Importación'}</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
