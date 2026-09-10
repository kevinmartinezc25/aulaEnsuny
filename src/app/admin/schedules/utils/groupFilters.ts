/**
 * Utility function to filter schedule groups to ONLY official student grade groups (6° to 13° and Nivelatorio).
 * Excludes pseudo-groups and teacher meeting/committee groups (e.g., COM, NUCLEO, REUNIÓN).
 */
export const isOfficialGradeGroup = (groupName: string): boolean => {
  if (!groupName) return false
  const trimmed = groupName.trim()
  const upper = trimmed.toUpperCase()

  // Exclude non-academic / meeting / committee pseudo-groups (e.g. DOCENTES_INSTITUCIONAL, Com Inv, Comité, Nucleo)
  if (
    upper.startsWith('COM') ||
    upper.includes('COMITE') ||
    upper.includes('COMITÉ') ||
    upper.includes('INVESTIGAC') ||
    upper.includes('NUCLEO') ||
    upper.includes('NÚCLEO') ||
    upper.includes('REUNION') ||
    upper.includes('REUNIÓN') ||
    upper.includes('DOCENTE') ||
    upper.includes('INSTITUCIONAL')
  ) {
    return false
  }

  // All student grade groups and user-created cohort groups are valid
  return true
}

/**
 * Utility function to identify if a subject/block is of type "Horas Reunión"
 * (e.g. Comités, Núcleos de Área, Reuniones Institucionales, or non-academic workload subjects).
 * In all meeting subjects, all assigned teachers must coincide at the exact same hour.
 */
export const isMeetingSubject = (
  subjectName?: string,
  groupName?: string,
  groupId?: string,
  isAcademicWorkload?: boolean
): boolean => {
  if (isAcademicWorkload === false) return true
  if (groupName && !isOfficialGradeGroup(groupName)) return true
  if (groupId && !isOfficialGradeGroup(groupId)) return true
  if (!subjectName) return false
  const upper = subjectName.trim().toUpperCase()
  return (
    upper.includes('NÚCLEO') ||
    upper.includes('NUCLEO') ||
    upper.includes('COMITÉ') ||
    upper.includes('COMITE') ||
    upper.includes('REUNIÓN') ||
    upper.includes('REUNION') ||
    upper.includes('CONSEJO') ||
    upper.includes('COORDINAC') ||
    upper.includes('DOCENTES') ||
    upper.includes('INSTITUCIONAL')
  )
}

