export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'student' | 'teacher' | 'admin' | 'superadmin'
  status: 'active' | 'inactive'
  grade?: string
  createdAt: string
}

export interface AdminCourse {
  id: string
  title: string
  teacher: string
  teacherId: string
  subject: string
  students: number
  status: 'active' | 'draft' | 'archived'
  grade: string
  createdAt: string
}

export interface AcademicLevel {
  id: string
  name: string
  createdAt: string
}

export interface AcademicGroup {
  id: string
  academicLevelId: string
  name: string
  createdAt: string
}

export interface AdminTeacher {
  id: string
  name: string
  email: string
  phone: string
  subjects: string[]
  status: 'active' | 'inactive'
  joinedDate: string
}

export interface AdminStudent {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  gradeLevel: string
  groupName?: string
  status: 'active' | 'inactive'
  joinedDate: string
}

export interface StudentDetails {
  documentType: string
  documentNumber: string
  expeditionDate?: string
  expeditionPlace?: string
  firstName: string
  secondName?: string
  firstSurname: string
  secondSurname?: string
  birthDate: string
  gender: string
  bloodType?: string
  rh?: string
  nationality: string
  birthMunicipality?: string
  birthDepartment?: string
}

export interface StudentContact {
  address: string
  neighborhood?: string
  municipality: string
  department: string
  zone: 'Urbana' | 'Rural'
  phone?: string
  studentCellphone?: string
  studentEmail?: string
}

export interface StudentGuardians {
  fatherName?: string
  fatherDocument?: string
  fatherPhone?: string
  fatherEmail?: string
  fatherOccupation?: string
  motherName?: string
  motherDocument?: string
  motherPhone?: string
  motherEmail?: string
  motherOccupation?: string
  guardianName: string
  guardianDocument: string
  guardianRelationship: string
  guardianPhone: string
  guardianEmail?: string
  guardianAddress?: string
  guardianOccupation?: string
}

export interface StudentMedicalInfo {
  eps: string
  affiliationType?: string
  ips?: string
  allergies?: string
  diseases?: string
  medicines?: string
  observations?: string
}

export interface StudentDocument {
  id?: string
  category: 'identificacion' | 'academico' | 'salud' | 'foto' | 'otro'
  name: string
  fileUrl: string
  fileName: string
}

export interface StudentEnrollment {
  academicYear: number
  enrollmentDate: string
  enrollmentStatus: 'active' | 'pending' | 'withdrawn' | 'cancelled'
  sede: string
  jornada: 'Mañana' | 'Tarde' | 'Completa' | 'Única' | 'Nocturna'
  gradeLevel: string
  groupName: string
  enrollmentNumber?: string
  simatBeneficiary: boolean
  estrato?: number
  sisben?: string
  conflictVictim: boolean
  specialPopulation?: string
  previousInstitution?: string
  previousMunicipality?: string
  previousDepartment?: string
  previousGrade?: string
  previousYear?: number
  observations?: string
}

export interface StudentAcademicHistory {
  id?: string
  year: number
  gradeLevel: string
  groupName: string
  finalStatus: string
  finalAverage?: number
  result?: string
}

export interface FullStudentData {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  joinedDate: string
  details?: StudentDetails
  contact?: StudentContact
  guardians?: StudentGuardians
  medical?: StudentMedicalInfo
  documents?: StudentDocument[]
  enrollment?: StudentEnrollment
  academicHistory?: StudentAcademicHistory[]
  courses?: string[]
  password?: string
}
