/**
 * Utility function to filter schedule groups to ONLY official student grade groups (6° to 13° and Nivelatorio).
 * Excludes pseudo-groups and teacher meeting/committee groups (e.g., COM, NUCLEO, REUNIÓN).
 */
export const isOfficialGradeGroup = (groupName: string): boolean => {
  if (!groupName) return false
  const trimmed = groupName.trim()
  const upper = trimmed.toUpperCase()

  // Exclude non-academic / meeting / committee pseudo-groups (e.g. Com Inv, Comité de Investigación, Nucleo Ciencias)
  if (
    upper.startsWith('COM') ||
    upper.includes('COMITE') ||
    upper.includes('COMITÉ') ||
    upper.includes('INVESTIGAC') ||
    upper.includes('NUCLEO') ||
    upper.includes('NÚCLEO') ||
    upper.includes('REUNION') ||
    upper.includes('REUNIÓN')
  ) {
    return false
  }

  // All student grade groups and user-created cohort groups are valid
  return true
}
