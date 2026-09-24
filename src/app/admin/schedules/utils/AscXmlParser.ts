export interface AscTeacher {
  id: string
  name: string
  short: string
}

export interface AscSubject {
  id: string
  name: string
  short: string
}

export interface AscGroup {
  id: string
  name: string
  short: string
}

export interface AscClassroom {
  id: string
  name: string
  short: string
}

export interface AscSlot {
  teacher_id: string
  subject_id: string
  /** '__JORNADA_INSTITUCIONAL__' when the lesson has no classids in the XML */
  group_id: string
  classroom_id: string
  day_of_week: number
  period: number
}

/** Sentinel value used when a lesson has no classids (administrative/non-classroom duties) */
export const JORNADA_INSTITUCIONAL_ID = '__JORNADA_INSTITUCIONAL__'

/** Sentinel value used when a lesson has no teacherids (autonomous work / TA) */
export const SIN_DOCENTE_ID = '__SIN_DOCENTE__'

export interface AscParsedData {
  teachers: AscTeacher[]
  subjects: AscSubject[]
  groups: AscGroup[]
  classrooms: AscClassroom[]
  slots: AscSlot[]
}

/**
 * Convierte el string de aSc (ej: "01000") a un número de día de la semana (1-7).
 * Lunes = 1, Martes = 2, etc.
 */
function parseAscDays(daysStr: string): number {
  const index = daysStr.indexOf('1')
  if (index === -1) return 1 // fallback
  return index + 1 // 0-index a 1-index (1=Lunes)
}

function sanitizeAscText(str: string): string {
  if (!str) return ''
  return str
    // Limpiar caracteres de reemplazo unicode o signos corruptos
    .replace(/\uFFFD/g, '')
    // Reemplazar espacios duros o no separables por espacio normal
    .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/g, ' ')
    // Correcciones léxicas comunes originadas de fallos de codificación
    .replace(/\bESPA\s*OL\b/gi, 'ESPAÑOL')
    .replace(/\bPATI\s*O\b/gi, 'PATIÑO')
    .replace(/\bMATEM\s*TICAS\b/gi, 'MATEMÁTICAS')
    .replace(/\bPEDAGOG\s*A\b/gi, 'PEDAGOGÍA')
    .replace(/\bEDUCACI\s*N\b/gi, 'EDUCACIÓN')
    .replace(/\bINVESTIGACI\s*N\b/gi, 'INVESTIGACIÓN')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeAscGroupName(str: string): string {
  const clean = sanitizeAscText(str)
  // Formato tipo "6 1", "10 2", "7- 1", "8  2" -> "6-1", "10-2"
  const gradeMatch = clean.match(/^(\d{1,2})\s*[\s\-_º°]\s*(\d{1,2})$/)
  if (gradeMatch) {
    return `${gradeMatch[1]}-${gradeMatch[2]}`
  }
  // Formato tipo "12 " -> "12"
  const singleGradeMatch = clean.match(/^(\d{1,2})\s*$/)
  if (singleGradeMatch) {
    return singleGradeMatch[1]
  }
  return clean
}

export class AscXmlParser {
  static parse(xmlString: string): AscParsedData {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlString, "text/xml")

    const errorNode = xmlDoc.querySelector("parsererror")
    if (errorNode) {
      throw new Error("El archivo XML proporcionado no es válido.")
    }

    const data: AscParsedData = {
      teachers: [],
      subjects: [],
      groups: [],
      classrooms: [],
      slots: []
    }

    // 1. Extraer Docentes
    const teachersNodes = xmlDoc.querySelectorAll("teachers > teacher")
    teachersNodes.forEach(node => {
      const rawName = node.getAttribute("name") || ''
      const rawShort = node.getAttribute("short") || ''
      data.teachers.push({
        id: node.getAttribute("id") || '',
        name: sanitizeAscText(rawName),
        short: sanitizeAscText(rawShort)
      })
    })

    // 2. Extraer Materias
    const subjectsNodes = xmlDoc.querySelectorAll("subjects > subject")
    subjectsNodes.forEach(node => {
      const rawName = node.getAttribute("name") || ''
      const rawShort = node.getAttribute("short") || ''
      data.subjects.push({
        id: node.getAttribute("id") || '',
        name: sanitizeAscText(rawName),
        short: sanitizeAscText(rawShort)
      })
    })

    // 3. Extraer Grupos (Clases en aSc)
    const classesNodes = xmlDoc.querySelectorAll("classes > class")
    classesNodes.forEach(node => {
      const rawName = node.getAttribute("name") || ''
      const rawShort = node.getAttribute("short") || ''
      data.groups.push({
        id: node.getAttribute("id") || '',
        name: normalizeAscGroupName(rawName),
        short: normalizeAscGroupName(rawShort)
      })
    })

    // 4. Extraer Aulas
    const classroomsNodes = xmlDoc.querySelectorAll("classrooms > classroom")
    classroomsNodes.forEach(node => {
      data.classrooms.push({
        id: node.getAttribute("id") || '',
        name: node.getAttribute("name") || '',
        short: node.getAttribute("short") || ''
      })
    })

    // 5. Mapear Lessons
    const lessonsNodes = xmlDoc.querySelectorAll("lessons > lesson")
    const lessonMap = new Map<string, any>()
    lessonsNodes.forEach(node => {
      const id = node.getAttribute("id") || ''
      const classids = (node.getAttribute("classids") || '').split(',')
      const teacherids = (node.getAttribute("teacherids") || '').split(',')
      const subjectid = node.getAttribute("subjectid") || ''
      
      lessonMap.set(id, { classids, teacherids, subjectid })
    })

    // 6. Procesar Cards y combinarlas con Lessons para generar los Slots
    const cardsNodes = xmlDoc.querySelectorAll("cards > card")
    cardsNodes.forEach(node => {
      const lessonId = node.getAttribute("lessonid") || ''
      const period = parseInt(node.getAttribute("period") || '1')
      const days = node.getAttribute("days") || '10000'
      const classroomids = (node.getAttribute("classroomids") || '').split(',')

      const lesson = lessonMap.get(lessonId)
      if (lesson) {
        const dayOfWeek = parseAscDays(days)
        const mainClassroomId = classroomids.length > 0 && classroomids[0] !== "" ? classroomids[0] : ''

        const effectiveTeachers = lesson.teacherids.filter((id: string) => id.trim() !== '')
        const effectiveClassIds = lesson.classids.filter((id: string) => id.trim() !== '')

        if (effectiveTeachers.length === 0) {
          // Lesson sin docente asignado pero con grupo(s) (ej. Trabajo Autónomo TA)
          if (effectiveClassIds.length > 0) {
            effectiveClassIds.forEach((groupId: string) => {
              data.slots.push({
                teacher_id: SIN_DOCENTE_ID,
                subject_id: lesson.subjectid,
                group_id: groupId,
                classroom_id: mainClassroomId,
                day_of_week: dayOfWeek,
                period: period
              })
            })
          }
        } else {
          effectiveTeachers.forEach((teacherId: string) => {
            if (effectiveClassIds.length === 0) {
              // Lesson sin grupo asignado: asesoría, coordinación, directivo, etc.
              // Se representa con el centinela __JORNADA_INSTITUCIONAL__ para no perderla.
              data.slots.push({
                teacher_id: teacherId,
                subject_id: lesson.subjectid,
                group_id: JORNADA_INSTITUCIONAL_ID,
                classroom_id: mainClassroomId,
                day_of_week: dayOfWeek,
                period: period
              })
            } else {
              effectiveClassIds.forEach((groupId: string) => {
                data.slots.push({
                  teacher_id: teacherId,
                  subject_id: lesson.subjectid,
                  group_id: groupId,
                  classroom_id: mainClassroomId,
                  day_of_week: dayOfWeek,
                  period: period
                })
              })
            }
          })
        }
      }
    })

    return data
  }
}

