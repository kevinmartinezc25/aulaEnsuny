'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Save, ArrowLeft, Loader2, User, Home, ShieldAlert,
  BookOpen, FileText, History, Check, AlertCircle, Plus, Trash2, Upload, File
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getAcademicLevels, AcademicLevel, getAcademicGroups, AcademicGroup,
  getAdminCourses, AdminCourse, getAdminStudentById, enrollStudent, updateStudent,
  FullStudentData, StudentDetails, StudentContact, StudentGuardians, StudentMedicalInfo,
  StudentEnrollment, StudentAcademicHistory, StudentDocument
} from '../../application/actions'

interface Props {
  studentId?: string
}

type TabType = 'basic' | 'family' | 'health' | 'academic' | 'documents' | 'history'

const TAB_CONFIG: { id: TabType; label: string; icon: any }[] = [
  { id: 'basic', label: '1. Información Básica', icon: User },
  { id: 'family', label: '2. Información Familiar', icon: Home },
  { id: 'health', label: '3. Salud y SIMAT', icon: ShieldAlert },
  { id: 'academic', label: '4. Asignación Académica', icon: BookOpen },
  { id: 'documents', label: '5. Documentos Soporte', icon: FileText },
  { id: 'history', label: '6. Historial Escolar', icon: History }
]

export function AdminEnrollStudentScreen({ studentId }: Props) {
  const router = useRouter()
  const isEditMode = !!studentId

  // --- Estados de datos auxiliares ---
  const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([])
  const [academicGroups, setAcademicGroups] = useState<AcademicGroup[]>([])
  const [allCourses, setAllCourses] = useState<AdminCourse[]>([])
  const [loadingAux, setLoadingAux] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingStudent, setIsLoadingStudent] = useState(isEditMode)
  const [activeTab, setActiveTab] = useState<TabType>('basic')

  // --- Estados del Formulario ---
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState<StudentDetails>({
    documentType: 'TI',
    documentNumber: '',
    expeditionDate: '',
    expeditionPlace: '',
    firstName: '',
    secondName: '',
    firstSurname: '',
    secondSurname: '',
    birthDate: '',
    gender: 'M',
    bloodType: 'O',
    rh: '+',
    nationality: 'Colombiana',
    birthMunicipality: '',
    birthDepartment: ''
  })

  const [contact, setContact] = useState<StudentContact>({
    address: '',
    neighborhood: '',
    municipality: '',
    department: '',
    zone: 'Urbana',
    phone: '',
    studentCellphone: '',
    studentEmail: ''
  })

  const [guardians, setGuardians] = useState<StudentGuardians>({
    fatherName: '',
    fatherDocument: '',
    fatherPhone: '',
    fatherEmail: '',
    fatherOccupation: '',
    motherName: '',
    motherDocument: '',
    motherPhone: '',
    motherEmail: '',
    motherOccupation: '',
    guardianName: '',
    guardianDocument: '',
    guardianRelationship: 'Madre',
    guardianPhone: '',
    guardianEmail: '',
    guardianAddress: '',
    guardianOccupation: ''
  })

  const [medical, setMedical] = useState<StudentMedicalInfo>({
    eps: '',
    affiliationType: 'Contributivo',
    ips: '',
    allergies: '',
    diseases: '',
    medicines: '',
    observations: ''
  })

  const [enrollment, setEnrollment] = useState<StudentEnrollment>({
    academicYear: new Date().getFullYear(),
    enrollmentDate: new Date().toISOString().split('T')[0],
    enrollmentStatus: 'active',
    sede: 'Principal',
    jornada: 'Única',
    gradeLevel: '',
    groupName: '',
    enrollmentNumber: '',
    simatBeneficiary: false,
    estrato: 1,
    sisben: '',
    conflictVictim: false,
    specialPopulation: 'Ninguna',
    previousInstitution: '',
    previousMunicipality: '',
    previousDepartment: '',
    previousGrade: '',
    previousYear: new Date().getFullYear() - 1,
    observations: ''
  })

  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [academicHistory, setAcademicHistory] = useState<StudentAcademicHistory[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [newPassword, setNewPassword] = useState('')

  // --- Edad calculada ---
  const calculatedAge = useMemo(() => {
    if (!details.birthDate) return null
    const birth = new Date(details.birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }, [details.birthDate])

  // --- Cargar datos auxiliares al montar ---
  useEffect(() => {
    async function loadAuxData() {
      setLoadingAux(true)
      try {
        const [levels, courses] = await Promise.all([
          getAcademicLevels(),
          getAdminCourses()
        ])
        setAcademicLevels(levels)
        setAllCourses(courses.filter(c => c.status === 'active'))
        
        // Seleccionar primer nivel si está vacío
        if (levels.length > 0 && !enrollment.gradeLevel) {
          setEnrollment(prev => ({ ...prev, gradeLevel: levels[0].name }))
        }
      } catch (err) {
        console.error('Error cargando datos auxiliares:', err)
        toast.error('Error al cargar datos auxiliares del colegio.')
      } finally {
        setLoadingAux(false)
      }
    }
    loadAuxData()
  }, [])

  // --- Cargar grupos al cambiar nivel ---
  useEffect(() => {
    async function loadGroups() {
      if (!enrollment.gradeLevel || academicLevels.length === 0) return
      const matchedLevel = academicLevels.find(l => l.name === enrollment.gradeLevel)
      if (matchedLevel) {
        try {
          const grps = await getAcademicGroups(matchedLevel.id)
          setAcademicGroups(grps)
          if (grps.length > 0 && !enrollment.groupName) {
            setEnrollment(prev => ({ ...prev, groupName: grps[0].name }))
          }
        } catch (err) {
          console.error(err)
        }
      }
    }
    loadGroups()
  }, [enrollment.gradeLevel, academicLevels])

  // --- Auto-seleccionar cursos sugeridos al cambiar el grado ---
  useEffect(() => {
    if (!enrollment.gradeLevel || allCourses.length === 0) return
    
    // Solo auto-seleccionar si estamos creando o si el estudiante no tiene cursos guardados aún
    if (!isEditMode) {
      const matchingCourseIds = allCourses
        .filter(c => c.grade === enrollment.gradeLevel)
        .map(c => c.id)
      setSelectedCourses(matchingCourseIds)
    }
  }, [enrollment.gradeLevel, allCourses, isEditMode])

  // --- Cargar estudiante si es modo edición ---
  useEffect(() => {
    if (!isEditMode || !studentId || studentId === 'new') return

    async function loadStudent() {
      setIsLoadingStudent(true)
      try {
        const res = await getAdminStudentById(studentId!)
        if (res) {
          setEmail(res.email)
          if (res.details) setDetails(res.details)
          if (res.contact) setContact(res.contact)
          if (res.guardians) setGuardians(res.guardians)
          if (res.medical) setMedical(res.medical)
          if (res.enrollment) setEnrollment(res.enrollment)
          if (res.documents) setDocuments(res.documents)
          if (res.academicHistory) setAcademicHistory(res.academicHistory)
          if (res.courses) setSelectedCourses(res.courses)
        } else {
          toast.error('No se pudo encontrar el estudiante solicitado.')
          router.push('/admin/students')
        }
      } catch (err) {
        console.error(err)
        toast.error('Error al cargar datos del estudiante.')
      } finally {
        setIsLoadingStudent(false)
      }
    }

    loadStudent()
  }, [studentId, isEditMode])

  // --- Agregar fila a Historial Escolar ---
  const addHistoryRow = () => {
    const lastYear = academicHistory.length > 0 
      ? Math.max(...academicHistory.map(h => h.year)) 
      : new Date().getFullYear() - 1
    
    setAcademicHistory([
      ...academicHistory,
      {
        year: lastYear - 1,
        gradeLevel: '6°',
        groupName: '1',
        finalStatus: 'Aprobado',
        finalAverage: 4.0,
        result: ''
      }
    ])
  }

  // --- Eliminar fila de Historial Escolar ---
  const removeHistoryRow = (index: number) => {
    setAcademicHistory(academicHistory.filter((_, i) => i !== index))
  }

  // --- Modificar fila de Historial Escolar ---
  const updateHistoryRow = (index: number, field: keyof StudentAcademicHistory, value: any) => {
    setAcademicHistory(academicHistory.map((h, i) => i === index ? { ...h, [field]: value } : h))
  }

  // --- Simular Carga de Documentos ---
  const [uploadingDocCategory, setUploadingDocCategory] = useState<string | null>(null)
  
  const handleMockUpload = (category: StudentDocument['category']) => {
    setUploadingDocCategory(category)
    
    setTimeout(() => {
      const mockDocs: Record<string, { name: string; url: string }> = {
        identificacion: { name: `Soporte_Identificacion_${details.documentNumber || '123'}.pdf`, url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
        academico: { name: 'Certificados_Academicos_Anteriores.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
        salud: { name: 'Certificado_EPS_Vacunacion.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
        foto: { name: 'Foto_Ficha_Estudiante.png', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200' },
        otro: { name: 'Otros_Soportes_Ficha.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
      }

      const info = mockDocs[category]
      setDocuments(prev => [
        ...prev.filter(d => d.category !== category), // Reemplazar si ya existe la categoría
        {
          category,
          name: info.name,
          fileName: info.name,
          fileUrl: info.url
        }
      ])
      setUploadingDocCategory(null)
      toast.success('Documento cargado y guardado correctamente.')
    }, 1500)
  }

  // --- Eliminar Documento ---
  const removeDocument = (category: string) => {
    setDocuments(documents.filter(d => d.category !== category))
    toast.success('Documento soporte removido.')
  }

  // --- Guardar Formulario Completo ---
  const handleSave = async () => {
    if (!details.firstName || !details.firstSurname || !details.documentNumber || !email) {
      toast.error('Primer Nombre, Primer Apellido, Documento y Correo Electrónico son obligatorios.')
      setActiveTab('basic')
      return
    }

    if (!details.birthDate) {
      toast.error('La Fecha de Nacimiento es obligatoria.')
      setActiveTab('basic')
      return
    }

    if (!enrollment.gradeLevel || !enrollment.groupName) {
      toast.error('La asignación de Grado y Grupo es requerida.')
      setActiveTab('academic')
      return
    }

    if (isEditMode && newPassword.trim().length > 0 && newPassword.trim().length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    setIsSaving(true)
    const payload: FullStudentData = {
      id: studentId || '',
      name: `${details.firstName} ${details.firstSurname}`,
      email,
      status: enrollment.enrollmentStatus === 'active' ? 'active' : 'inactive',
      joinedDate: isEditMode ? '' : new Date().toISOString().split('T')[0],
      details,
      contact,
      guardians,
      medical,
      enrollment,
      documents,
      academicHistory,
      courses: selectedCourses,
      password: isEditMode && newPassword.trim() ? newPassword.trim() : undefined
    }

    try {
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

      if (isDemoMode) {
        toast.info('Simulación: Guardando ficha académica en modo Demo.')
        await new Promise(resolve => setTimeout(resolve, 1500))
        toast.success(isEditMode ? 'Estudiante actualizado con éxito (Demo)' : 'Estudiante matriculado con éxito (Demo)')
        router.push('/admin/students')
        return
      }

      if (isEditMode) {
        const result = await updateStudent(studentId!, payload)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Ficha actualizada con éxito.')
          router.push('/admin/students')
        }
      } else {
        const result = await enrollStudent(payload)
        if (result.error) {
          toast.error(result.error)
        } else {
          if (result.password) {
            toast.success(`Estudiante matriculado con éxito. Contraseña temporal: ${result.password}`, {
              duration: 10000
            })
          } else {
            toast.success('Estudiante matriculado con éxito.')
          }
          router.push('/admin/students')
        }
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Ocurrió un error inesperado al guardar la ficha.')
    } finally {
      setIsSaving(false)
    }
  }

  // --- Toggle check curso ---
  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  if (isLoadingStudent) {
    return (
      <div className="h-[450px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Cargando ficha académica completa...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left">
      {/* Botón Volver y Título */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => router.push('/admin/students')}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a estudiantes
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            {isEditMode ? 'Ficha Académica de Estudiante' : 'Matricular Nuevo Estudiante'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isEditMode 
              ? 'Edita los datos personales, residencia, salud, documentos soporte y asignación académica.' 
              : 'Completa la matrícula estándar del alumno en SIMAT, historial familiar, médico y LMS.'}
          </p>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-md disabled:opacity-50 self-start sm:self-center"
        >
          {isSaving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Save className="h-4.5 w-4.5" />}
          <span>{isEditMode ? 'Guardar Cambios' : 'Matricular Alumno'}</span>
        </button>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-slate-100 dark:border-slate-800/60">
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-100 dark:border-slate-800/60'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Contenido de Pestañas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 text-sm"
          >
            {/* Pestaña 1: Información Básica */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                    <User className="h-4 w-4 text-blue-500" /> Datos de Identificación Personal
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Tipo de Documento *</label>
                      <select 
                        value={details.documentType}
                        onChange={e => setDetails({ ...details, documentType: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      >
                        <option value="TI">Tarjeta de Identidad (TI)</option>
                        <option value="RC">Registro Civil (RC)</option>
                        <option value="CC">Cédula de Ciudadanía (CC)</option>
                        <option value="CE">Cédula de Extranjería (CE)</option>
                        <option value="NES">Número Establecido por Secretaría (NES)</option>
                        <option value="PEP">Permiso Especial de Permanencia (PEP)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Número de Documento *</label>
                      <input 
                        type="text" 
                        value={details.documentNumber}
                        onChange={e => setDetails({ ...details, documentNumber: e.target.value })}
                        placeholder="Ej: 1002345678"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Fecha de Expedición</label>
                      <input 
                        type="date" 
                        value={details.expeditionDate}
                        onChange={e => setDetails({ ...details, expeditionDate: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Lugar de Expedición</label>
                      <input 
                        type="text" 
                        value={details.expeditionPlace}
                        onChange={e => setDetails({ ...details, expeditionPlace: e.target.value })}
                        placeholder="Municipio / Ciudad"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Primer Nombre *</label>
                    <input 
                      type="text" 
                      value={details.firstName}
                      onChange={e => setDetails({ ...details, firstName: e.target.value })}
                      placeholder="Ej: Ana"
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Segundo Nombre</label>
                    <input 
                      type="text" 
                      value={details.secondName}
                      onChange={e => setDetails({ ...details, secondName: e.target.value })}
                      placeholder="Ej: María"
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Primer Apellido *</label>
                    <input 
                      type="text" 
                      value={details.firstSurname}
                      onChange={e => setDetails({ ...details, firstSurname: e.target.value })}
                      placeholder="Ej: Torres"
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Segundo Apellido</label>
                    <input 
                      type="text" 
                      value={details.secondSurname}
                      onChange={e => setDetails({ ...details, secondSurname: e.target.value })}
                      placeholder="Ej: Herrera"
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Fecha de Nacimiento *</label>
                    <input 
                      type="date" 
                      value={details.birthDate}
                      onChange={e => setDetails({ ...details, birthDate: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Edad Calculada</label>
                    <input 
                      type="text" 
                      value={calculatedAge !== null ? `${calculatedAge} años` : '--'} 
                      disabled 
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-slate-950 text-slate-500 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Sexo *</label>
                    <select 
                      value={details.gender}
                      onChange={e => setDetails({ ...details, gender: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Tipo de Sangre</label>
                    <select 
                      value={details.bloodType}
                      onChange={e => setDetails({ ...details, bloodType: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    >
                      <option value="O">O</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Factor RH</label>
                    <select 
                      value={details.rh}
                      onChange={e => setDetails({ ...details, rh: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    >
                      <option value="+">Positivo (+)</option>
                      <option value="-">Negativo (-)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Nacionalidad</label>
                    <input 
                      type="text" 
                      value={details.nationality}
                      onChange={e => setDetails({ ...details, nationality: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Municipio de Nacimiento</label>
                    <input 
                      type="text" 
                      value={details.birthMunicipality}
                      onChange={e => setDetails({ ...details, birthMunicipality: e.target.value })}
                      placeholder="Ej: Bucaramanga"
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Departamento de Nacimiento</label>
                    <input 
                      type="text" 
                      value={details.birthDepartment}
                      onChange={e => setDetails({ ...details, birthDepartment: e.target.value })}
                      placeholder="Ej: Santander"
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 mt-6 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                    <Home className="h-4 w-4 text-blue-500" /> Información de Residencia y Contacto
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Dirección Completa *</label>
                      <input 
                        type="text" 
                        value={contact.address}
                        onChange={e => setContact({ ...contact, address: e.target.value })}
                        placeholder="Ej: Calle 45 # 12 - 34 Apto 302"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Barrio</label>
                      <input 
                        type="text" 
                        value={contact.neighborhood}
                        onChange={e => setContact({ ...contact, neighborhood: e.target.value })}
                        placeholder="Ej: San Alonso"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Municipio de Residencia *</label>
                      <input 
                        type="text" 
                        value={contact.municipality}
                        onChange={e => setContact({ ...contact, municipality: e.target.value })}
                        placeholder="Ej: Floridablanca"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 uppercase mb-1">Departamento de Residencia *</label>
                      <input 
                        type="text" 
                        value={contact.department}
                        onChange={e => setContact({ ...contact, department: e.target.value })}
                        placeholder="Ej: Santander"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Zona Geográfica</label>
                      <select 
                        value={contact.zone}
                        onChange={e => setContact({ ...contact, zone: e.target.value as any })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      >
                        <option value="Urbana">Urbana</option>
                        <option value="Rural">Rural</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Teléfono Fijo</label>
                      <input 
                        type="text" 
                        value={contact.phone}
                        onChange={e => setContact({ ...contact, phone: e.target.value })}
                        placeholder="Ej: 6076324567"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Celular del Estudiante</label>
                      <input 
                        type="text" 
                        value={contact.studentCellphone}
                        onChange={e => setContact({ ...contact, studentCellphone: e.target.value })}
                        placeholder="Ej: 3154567890"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Correo Electrónico Personal</label>
                      <input 
                        type="email" 
                        value={contact.studentEmail}
                        onChange={e => setContact({ ...contact, studentEmail: e.target.value })}
                        placeholder="estudiante@correo.com"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pestaña 2: Información Familiar */}
            {activeTab === 'family' && (
              <div className="space-y-6">
                {/* Madre */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                    🧑 Ficha de la Madre
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={guardians.motherName}
                        onChange={e => setGuardians({ ...guardians, motherName: e.target.value })}
                        placeholder="Madre del estudiante"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Identificación / Cédula</label>
                      <input 
                        type="text" 
                        value={guardians.motherDocument}
                        onChange={e => setGuardians({ ...guardians, motherDocument: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 uppercase mb-1">Celular de Contacto</label>
                      <input 
                        type="text" 
                        value={guardians.motherPhone}
                        onChange={e => setGuardians({ ...guardians, motherPhone: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Ocupación / Oficio</label>
                      <input 
                        type="text" 
                        value={guardians.motherOccupation}
                        onChange={e => setGuardians({ ...guardians, motherOccupation: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Correo Electrónico</label>
                      <input 
                        type="email" 
                        value={guardians.motherEmail}
                        onChange={e => setGuardians({ ...guardians, motherEmail: e.target.value })}
                        placeholder="madre@correo.com"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Padre */}
                <div className="mt-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                    👨 Ficha del Padre
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={guardians.fatherName}
                        onChange={e => setGuardians({ ...guardians, fatherName: e.target.value })}
                        placeholder="Padre del estudiante"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Identificación / Cédula</label>
                      <input 
                        type="text" 
                        value={guardians.fatherDocument}
                        onChange={e => setGuardians({ ...guardians, fatherDocument: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 uppercase mb-1">Celular de Contacto</label>
                      <input 
                        type="text" 
                        value={guardians.fatherPhone}
                        onChange={e => setGuardians({ ...guardians, fatherPhone: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Ocupación / Oficio</label>
                      <input 
                        type="text" 
                        value={guardians.fatherOccupation}
                        onChange={e => setGuardians({ ...guardians, fatherOccupation: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Correo Electrónico</label>
                      <input 
                        type="email" 
                        value={guardians.fatherEmail}
                        onChange={e => setGuardians({ ...guardians, fatherEmail: e.target.value })}
                        placeholder="padre@correo.com"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Acudiente */}
                <div className="mt-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                    👤 Acudiente Principal (Responsable Legal)
                  </h3>
                  
                  <div className="p-4 mb-4 rounded-xl bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-xs">
                    💡 Copiar rápidamente desde:
                    <button 
                      onClick={() => setGuardians(prev => ({
                        ...prev,
                        guardianName: prev.motherName || '',
                        guardianDocument: prev.motherDocument || '',
                        guardianPhone: prev.motherPhone || '',
                        guardianEmail: prev.motherEmail || '',
                        guardianRelationship: 'Madre',
                        guardianAddress: contact.address,
                        guardianOccupation: prev.motherOccupation || ''
                      }))}
                      className="ml-2 px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold cursor-pointer"
                    >
                      Madre
                    </button>
                    <button 
                      onClick={() => setGuardians(prev => ({
                        ...prev,
                        guardianName: prev.fatherName || '',
                        guardianDocument: prev.fatherDocument || '',
                        guardianPhone: prev.fatherPhone || '',
                        guardianEmail: prev.fatherEmail || '',
                        guardianRelationship: 'Padre',
                        guardianAddress: contact.address,
                        guardianOccupation: prev.fatherOccupation || ''
                      }))}
                      className="ml-1 px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold cursor-pointer"
                    >
                      Padre
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Nombre Completo del Acudiente *</label>
                      <input 
                        type="text" 
                        value={guardians.guardianName}
                        onChange={e => setGuardians({ ...guardians, guardianName: e.target.value })}
                        placeholder="Ej: Ana María Torres"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Parentesco *</label>
                      <select 
                        value={guardians.guardianRelationship}
                        onChange={e => setGuardians({ ...guardians, guardianRelationship: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      >
                        <option value="Madre">Madre</option>
                        <option value="Padre">Padre</option>
                        <option value="Abuelo/a">Abuelo/a</option>
                        <option value="Tío/a">Tío/a</option>
                        <option value="Hermano/a">Hermano/a mayor de edad</option>
                        <option value="Otro">Otro parentesco</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Cédula del Acudiente *</label>
                      <input 
                        type="text" 
                        value={guardians.guardianDocument}
                        onChange={e => setGuardians({ ...guardians, guardianDocument: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Celular *</label>
                      <input 
                        type="text" 
                        value={guardians.guardianPhone}
                        onChange={e => setGuardians({ ...guardians, guardianPhone: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Correo Electrónico</label>
                      <input 
                        type="email" 
                        value={guardians.guardianEmail}
                        onChange={e => setGuardians({ ...guardians, guardianEmail: e.target.value })}
                        placeholder="acudiente@correo.com"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Dirección de Residencia del Acudiente</label>
                      <input 
                        type="text" 
                        value={guardians.guardianAddress}
                        onChange={e => setGuardians({ ...guardians, guardianAddress: e.target.value })}
                        placeholder="Si es diferente a la del estudiante"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pestaña 3: Salud e Información Administrativa */}
            {activeTab === 'health' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                    🚑 Ficha Médica y de Salud
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">EPS del Estudiante *</label>
                      <input 
                        type="text" 
                        value={medical.eps}
                        onChange={e => setMedical({ ...medical, eps: e.target.value })}
                        placeholder="Ej: EPS Sanitas, Sura..."
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-555 uppercase mb-1">Tipo de Afiliación</label>
                      <select 
                        value={medical.affiliationType}
                        onChange={e => setMedical({ ...medical, affiliationType: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      >
                        <option value="Contributivo">Contributivo</option>
                        <option value="Subsidiado">Subsidiado</option>
                        <option value="Especial">Especial (Magisterio, Militar, etc.)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Centro de Salud Asignado (IPS)</label>
                      <input 
                        type="text" 
                        value={medical.ips}
                        onChange={e => setMedical({ ...medical, ips: e.target.value })}
                        placeholder="Clínica / Hospital de atención"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Alergias Conocidas</label>
                      <textarea 
                        value={medical.allergies}
                        onChange={e => setMedical({ ...medical, allergies: e.target.value })}
                        placeholder="Ej: Medicamentos, alimentos, picaduras. (Escribir Ninguna si aplica)"
                        rows={2}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Condiciones Médicas / Diagnósticos</label>
                      <textarea 
                        value={medical.diseases}
                        onChange={e => setMedical({ ...medical, diseases: e.target.value })}
                        placeholder="Ej: Asma, Diabetes, convulsiones, afecciones cardíacas."
                        rows={2}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Medicamentos Permanentes</label>
                      <textarea 
                        value={medical.medicines}
                        onChange={e => setMedical({ ...medical, medicines: e.target.value })}
                        placeholder="Indicar dosificación y horarios si el colegio debe administrarlos."
                        rows={2}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Otras Observaciones Médicas / Cuidados Especiales</label>
                      <textarea 
                        value={medical.observations}
                        onChange={e => setMedical({ ...medical, observations: e.target.value })}
                        placeholder="Recomendaciones para educación física, etc."
                        rows={2}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                    📋 Información Administrativa y de Protección Social
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Estrato Socioeconómico</label>
                      <select 
                        value={enrollment.estrato}
                        onChange={e => setEnrollment({ ...enrollment, estrato: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Puntaje / Grupo Sisben</label>
                      <input 
                        type="text" 
                        value={enrollment.sisben}
                        onChange={e => setEnrollment({ ...enrollment, sisben: e.target.value })}
                        placeholder="Ej: A3, B4, C1"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Población Especial / Vulnerable</label>
                      <select 
                        value={enrollment.specialPopulation}
                        onChange={e => setEnrollment({ ...enrollment, specialPopulation: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      >
                        <option value="Ninguna">Ninguna</option>
                        <option value="Indígena">Cabildo / Indígena</option>
                        <option value="Afrocolombiana">Afrodescendiente / Negritudes</option>
                        <option value="Discapacidad">Condición de Discapacidad</option>
                        <option value="Talento Excepcional">Capacidades Excepcionales</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Número de Matrícula (Código)</label>
                      <input 
                        type="text" 
                        value={enrollment.enrollmentNumber}
                        onChange={e => setEnrollment({ ...enrollment, enrollmentNumber: e.target.value })}
                        placeholder="Generado automáticamente o manual"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 mt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={enrollment.simatBeneficiary}
                        onChange={e => setEnrollment({ ...enrollment, simatBeneficiary: e.target.checked })}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase">Estudiante Beneficiario SIMAT</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={enrollment.conflictVictim}
                        onChange={e => setEnrollment({ ...enrollment, conflictVictim: e.target.checked })}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase">Víctima del Conflicto Armado (Sí/No)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Pestaña 4: Asignación Académica e Integración LMS */}
            {activeTab === 'academic' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                    🏫 Registro de Matrícula y Ubicación del Curso
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Año Lectivo</label>
                      <input 
                        type="number" 
                        value={enrollment.academicYear}
                        onChange={e => setEnrollment({ ...enrollment, academicYear: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Sede de Matrícula</label>
                      <input 
                        type="text" 
                        value={enrollment.sede}
                        onChange={e => setEnrollment({ ...enrollment, sede: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Jornada Escolar</label>
                      <select 
                        value={enrollment.jornada}
                        onChange={e => setEnrollment({ ...enrollment, jornada: e.target.value as any })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      >
                        <option value="Mañana">Mañana</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Completa">Completa</option>
                        <option value="Única">Única</option>
                        <option value="Nocturna">Nocturna</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Grado / Nivel *</label>
                      <select 
                        value={enrollment.gradeLevel}
                        onChange={e => setEnrollment({ ...enrollment, gradeLevel: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      >
                        {academicLevels.map(lvl => (
                          <option key={lvl.id} value={lvl.name}>Grado {lvl.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Grupo Asignado *</label>
                      <select 
                        value={enrollment.groupName}
                        onChange={e => setEnrollment({ ...enrollment, groupName: e.target.value })}
                        disabled={academicGroups.length === 0}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm disabled:opacity-50"
                      >
                        {academicGroups.length === 0 ? (
                          <option value="">No hay grupos</option>
                        ) : (
                          academicGroups.map(grp => (
                            <option key={grp.id} value={grp.name}>Grupo {grp.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Estado de Matrícula</label>
                      <select 
                        value={enrollment.enrollmentStatus}
                        onChange={e => setEnrollment({ ...enrollment, enrollmentStatus: e.target.value as any })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      >
                        <option value="active">Activa</option>
                        <option value="pending">Pendiente (Sin formalizar)</option>
                        <option value="withdrawn">Retirado / Traslado</option>
                        <option value="cancelled">Cancelada / Desertor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Institución Educativa de Procedencia</label>
                      <input 
                        type="text" 
                        value={enrollment.previousInstitution}
                        onChange={e => setEnrollment({ ...enrollment, previousInstitution: e.target.value })}
                        placeholder="Colegio anterior"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Último Grado Cursado</label>
                      <input 
                        type="text" 
                        value={enrollment.previousGrade}
                        onChange={e => setEnrollment({ ...enrollment, previousGrade: e.target.value })}
                        placeholder="Ej: 8°"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 uppercase mb-1">Año de Procedencia</label>
                      <input 
                        type="number" 
                        value={enrollment.previousYear}
                        onChange={e => setEnrollment({ ...enrollment, previousYear: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Asignación de Cursos Específica */}
                <div className="mt-6">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-850 mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      ✏️ Asignación de Cursos / Materias LMS
                    </h3>
                    <button 
                      onClick={() => {
                        // Seleccionar todos los cursos
                        setSelectedCourses(allCourses.map(c => c.id))
                        toast.success('Todas las materias han sido marcadas.')
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-500 cursor-pointer"
                    >
                      Seleccionar Todas
                    </button>
                  </div>

                  <p className="text-xs text-slate-550 dark:text-slate-400 mb-3">
                    Marca las materias individuales en las que el estudiante participará. Al registrar el Grado arriba, se seleccionan por defecto las materias del mismo grado escolar de manera inteligente.
                  </p>

                  {allCourses.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400">
                      No hay cursos registrados o activos en el sistema para asignar.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {allCourses.map(course => {
                        const isChecked = selectedCourses.includes(course.id)
                        return (
                          <div 
                            key={course.id}
                            onClick={() => toggleCourse(course.id)}
                            className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                              isChecked 
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80 shadow-sm'
                                : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800/60 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className={`mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors ${
                              isChecked 
                                ? 'bg-blue-600 border-blue-600 text-white' 
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950'
                            }`}>
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <div className="text-left">
                              <h4 className="font-semibold text-slate-900 dark:text-white text-xs leading-none">
                                {course.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase">
                                Grado {course.grade} • {course.subject}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">
                                Prof: {course.teacher}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Acceso LMS */}
                <div className="mt-6 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                    💻 Cuenta y Credenciales del LMS
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-450 dark:text-slate-555 uppercase mb-1">Correo Institucional *</label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Ej: j.torres@estudiante.ensuny.edu.co"
                        disabled={isEditMode}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none dark:text-white text-sm disabled:opacity-50"
                      />
                      {!isEditMode && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Este correo servirá como usuario de acceso principal.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-450 dark:text-slate-550 uppercase mb-1">Contraseña Temporal</label>
                      <input 
                        type="text" 
                        value={isEditMode ? '••••••••' : `Ensuny${new Date().getFullYear()}!`} 
                        disabled
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-slate-950 text-slate-455 font-mono text-sm disabled:opacity-50"
                      />
                    </div>

                    {isEditMode && (
                      <div>
                        <label className="block text-xs font-bold text-slate-450 dark:text-slate-550 uppercase mb-1">Nueva contraseña</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Dejar vacío para no cambiar"
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                        />
                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          Ingresa una nueva contraseña solo si deseas actualizar la credencial de acceso del estudiante.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-450 dark:text-slate-550 uppercase mb-1">Acceso al Sistema</label>
                      <select 
                        value={enrollment.enrollmentStatus === 'active' ? 'active' : 'suspended'}
                        disabled
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-slate-950 text-slate-450 text-sm disabled:opacity-50"
                      >
                        <option value="active">Activo</option>
                        <option value="suspended">Inactivo / Suspendido</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pestaña 5: Documentos Soporte */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                    📂 Carpeta Digital de Documentos Soporte
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                    Adjunta los soportes escaneados obligatorios en formato PDF o imagen para el expediente institucional del estudiante.
                  </p>

                  <div className="space-y-4">
                    {[
                      { category: 'identificacion', label: 'Documento de Identificación', desc: 'Registro Civil de Nacimiento (RC) o Tarjeta de Identidad (TI).' },
                      { category: 'academico', label: 'Soportes Académicos', desc: 'Boletín final del grado anterior, certificado de notas y Paz y Salvo de colegio de procedencia.' },
                      { category: 'salud', label: 'Certificado de Afiliación a Salud', desc: 'Certificado de EPS activo con fecha no mayor a 30 días, y carnet de vacunas (grados primarios).' },
                      { category: 'foto', label: 'Fotografía del Estudiante', desc: 'Fotografía formal fondo blanco tipo documento (PNG/JPG).' },
                      { category: 'otro', label: 'Otros Documentos', desc: 'Soporte del Sisben, certificados de discapacidad o víctima de conflicto si aplica.' }
                    ].map(docType => {
                      const uploadedFile = documents.find(d => d.category === docType.category)
                      const isUploading = uploadingDocCategory === docType.category

                      return (
                        <div 
                          key={docType.category} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 gap-4"
                        >
                          <div className="text-left space-y-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white text-xs">
                              {docType.label}
                            </h4>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              {docType.desc}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            {isUploading ? (
                              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Cargando soporte...</span>
                              </div>
                            ) : uploadedFile ? (
                              <div className="flex items-center gap-3">
                                <a 
                                  href={uploadedFile.fileUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-100/30"
                                >
                                  <File className="h-3.5 w-3.5" />
                                  <span className="truncate max-w-[150px]">{uploadedFile.name}</span>
                                </a>
                                <button 
                                  onClick={() => removeDocument(docType.category)}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 dark:bg-red-950/20 transition-all cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleMockUpload(docType.category as any)}
                                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-semibold cursor-pointer transition-all"
                              >
                                <Upload className="h-3.5 w-3.5" />
                                Adjuntar
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Pestaña 6: Historial Escolar */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-850 mb-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    🎓 Registro de Trayectoria e Historial Académico
                  </h3>
                  <button 
                    onClick={addHistoryRow}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 dark:bg-blue-950/20 text-xs font-bold cursor-pointer transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar Año
                  </button>
                </div>
                
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                  Registra el desempeño del estudiante en años anteriores dentro o fuera de la institución para mantener un expediente histórico unificado.
                </p>

                {academicHistory.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center text-slate-400">
                    No se han registrado años lectivos anteriores. Haz clic en "Agregar Año" para ingresar registros.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {academicHistory.map((row, index) => (
                      <div 
                        key={index}
                        className="p-4 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 space-y-4 relative text-left"
                      >
                        {/* Header of the Card */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                            Registro #{index + 1}
                          </span>
                          <button 
                            onClick={() => removeHistoryRow(index)}
                            className="flex items-center justify-center p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 dark:bg-red-950/20 transition-colors cursor-pointer"
                            title="Eliminar Registro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Grid fields */}
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Año *</label>
                            <input 
                              type="number" 
                              value={row.year}
                              onChange={e => updateHistoryRow(index, 'year', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:text-white text-xs font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Grado *</label>
                            <select 
                              value={row.gradeLevel}
                              onChange={e => updateHistoryRow(index, 'gradeLevel', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:text-white text-xs"
                            >
                              <option value="8°">Grado 8°</option>
                              <option value="9°">Grado 9°</option>
                              <option value="10°">Grado 10°</option>
                              <option value="11°">Grado 11°</option>
                              <option value="Transición">Transición</option>
                              <option value="1°">Grado 1°</option>
                              <option value="2°">Grado 2°</option>
                              <option value="3°">Grado 3°</option>
                              <option value="4°">Grado 4°</option>
                              <option value="5°">Grado 5°</option>
                              <option value="6°">Grado 6°</option>
                              <option value="7°">Grado 7°</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Grupo</label>
                            <input 
                              type="text" 
                              value={row.groupName}
                              onChange={e => updateHistoryRow(index, 'groupName', e.target.value)}
                              placeholder="Ej: 1 o A"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:text-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Estado Final</label>
                            <select 
                              value={row.finalStatus}
                              onChange={e => updateHistoryRow(index, 'finalStatus', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:text-white text-xs font-semibold text-slate-800"
                            >
                              <option value="Aprobado">Aprobado</option>
                              <option value="Reprobado">Reprobado</option>
                              <option value="Desertó">Desertó</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Promedio Final</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              min="1.0" 
                              max="5.0"
                              value={row.finalAverage || ''}
                              onChange={e => updateHistoryRow(index, 'finalAverage', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:text-white text-xs font-semibold"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Resultados / Observaciones</label>
                            <input 
                              type="text" 
                              value={row.result}
                              onChange={e => updateHistoryRow(index, 'result', e.target.value)}
                              placeholder="Ej: Primer puesto, mención de honor, observaciones de comportamiento"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
