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
  group_id: string
  classroom_id: string
  day_of_week: number
  period: number
}

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
      data.teachers.push({
        id: node.getAttribute("id") || '',
        name: node.getAttribute("name") || '',
        short: node.getAttribute("short") || ''
      })
    })

    // 2. Extraer Materias
    const subjectsNodes = xmlDoc.querySelectorAll("subjects > subject")
    subjectsNodes.forEach(node => {
      data.subjects.push({
        id: node.getAttribute("id") || '',
        name: node.getAttribute("name") || '',
        short: node.getAttribute("short") || ''
      })
    })

    // 3. Extraer Grupos (Clases en aSc)
    const classesNodes = xmlDoc.querySelectorAll("classes > class")
    classesNodes.forEach(node => {
      data.groups.push({
        id: node.getAttribute("id") || '',
        name: node.getAttribute("name") || '',
        short: node.getAttribute("short") || ''
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

        lesson.teacherids.forEach((teacherId: string) => {
          if (!teacherId) return
          lesson.classids.forEach((groupId: string) => {
            if (!groupId) return

            data.slots.push({
              teacher_id: teacherId,
              subject_id: lesson.subjectid,
              group_id: groupId,
              classroom_id: mainClassroomId,
              day_of_week: dayOfWeek,
              period: period
            })
          })
        })
      }
    })

    return data
  }
}
