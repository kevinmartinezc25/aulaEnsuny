/**
 * Normaliza los nombres de grado asegurando que los programas de formación complementaria
 * (PFC 12, 12, 12°) se normalicen a 'PFC-12', y (PFC 13, 13, 13°) a 'PFC-13'.
 * También normaliza números de grados estándar como 6 -> 6°.
 */
export function normalizeGradeLevel(grade?: string | null): string {
  if (!grade) return ''
  const clean = grade.trim()
  if (!clean) return ''
  if (/^(pfc[\s\-_]?12|12°?)$/i.test(clean)) return 'PFC-12'
  if (/^(pfc[\s\-_]?13|13°?)$/i.test(clean)) return 'PFC-13'
  if (/^([6-9]|1[0-1])$/.test(clean)) return `${clean}°`
  return clean
}
