/**
 * Utilidades de normalización y catálogo para Grados Escolares,
 * Sedes y Modalidades Educativas en aulaEnsuny.
 */

export const OFFICIAL_GRADE_LEVELS = [
  'Párvulos',
  'Jardín',
  'Transición',
  '1°',
  '2°',
  '3°',
  '4°',
  '5°',
  '6°',
  '7°',
  '8°',
  '9°',
  '10°',
  '11°',
  'PFC-12',
  'PFC-13',
  'Nivelatorio',
  'Aula Multigrado'
] as const

export const OFFICIAL_MODALITIES = [
  'Tradicional',
  'Escuela Nueva',
  'Aula Multigrado'
] as const

export const DEFAULT_INSTITUTIONAL_SEDES = [
  'Sede Principal',
  'Sede San José',
  'Sede La Ceiba',
  'Sede El Porvenir'
] as const

/**
 * Normaliza cualquier variante de nombre de grado (desde Preescolar hasta PFC y Multigrado)
 * a su nomenclatura institucional oficial estándar.
 */
export function normalizeGradeLevel(grade?: string | null): string {
  if (!grade) return ''
  let clean = grade.trim()
  if (!clean) return ''
  
  // Remover la palabra "Grado" al inicio si existe (ej. "Grado 5" -> "5")
  clean = clean.replace(/^grado\s+/i, '').trim()

  // 1. Preescolar
  if (/^transici[oó]n|grado\s*0|^0°?$/i.test(clean)) return 'Transición'
  if (/^jard[ií]n/i.test(clean)) return 'Jardín'
  if (/^p[aá]rvulos?/i.test(clean)) return 'Párvulos'
  if (/^pre[\s\-_]?jard[ií]n/i.test(clean)) return 'Pre-Jardín'
  if (/^preescolar/i.test(clean)) return 'Transición'

  // 2. Primaria (1° a 5°)
  if (/^(1|1°|primero)$/i.test(clean)) return '1°'
  if (/^(2|2°|segundo)$/i.test(clean)) return '2°'
  if (/^(3|3°|tercero)$/i.test(clean)) return '3°'
  if (/^(4|4°|cuarto)$/i.test(clean)) return '4°'
  if (/^(5|5°|quinto)$/i.test(clean)) return '5°'

  // 3. Secundaria y Media (6° a 11°)
  if (/^(6|6°|sexto)$/i.test(clean)) return '6°'
  if (/^(7|7°|s[eé]ptimo)$/i.test(clean)) return '7°'
  if (/^(8|8°|octavo)$/i.test(clean)) return '8°'
  if (/^(9|9°|noveno)$/i.test(clean)) return '9°'
  if (/^(10|10°|d[eé]cimo)$/i.test(clean)) return '10°'
  if (/^(11|11°|once)$/i.test(clean)) return '11°'

  // 4. Formación Complementaria Normal Superior (PFC)
  if (/^(pfc[\s\-_]?12|12°?)$/i.test(clean)) return 'PFC-12'
  if (/^(pfc[\s\-_]?13|13°?)$/i.test(clean)) return 'PFC-13'

  // 5. Modelos Flexibles y Multigrado
  if (/^nivelat/i.test(clean)) return 'Nivelatorio'
  if (/multigrado|escuela\s*nueva/i.test(clean)) return 'Aula Multigrado'

  // Coincidencias con sufijo numérico genérico (ej: "1" -> "1°", "10" -> "10°")
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean, 10)
    if (num >= 1 && num <= 11) return `${num}°`
  }

  return clean
}

/**
 * Normaliza la modalidad educativa.
 */
export function normalizeModality(modality?: string | null): string {
  if (!modality) return 'Tradicional'
  const clean = modality.trim().toLowerCase()
  if (/escuela\s*nueva/i.test(clean)) return 'Escuela Nueva'
  if (/multigrado/i.test(clean)) return 'Aula Multigrado'
  return 'Tradicional'
}

/**
 * Normaliza el nombre de la sede institucional.
 */
export function normalizeSede(sede?: string | null): string {
  if (!sede) return 'Sede Principal'
  const clean = sede.trim()
  if (!clean) return 'Sede Principal'
  if (/san\s*jos[eé]/i.test(clean)) return 'Sede San José'
  if (/la\s*ceiba|ceiba/i.test(clean)) return 'Sede La Ceiba'
  if (/el\s*porvenir|porvenir/i.test(clean)) return 'Sede El Porvenir'
  if (/principal/i.test(clean)) return 'Sede Principal'
  return clean
}

/**
 * Extrae la sede y modalidad desde el campo de observaciones/notas si las columnas
 * directas aún no están creadas en la base de datos.
 */
export function parseMetadataFromNotes(
  notes?: string | null,
  defaultSede = 'Sede Principal',
  defaultMod = 'Tradicional'
): { sede: string; modalidad: string } {
  if (!notes) return { sede: defaultSede, modalidad: defaultMod }
  const sedeMatch = notes.match(/\[Sede:\s*([^|\]]+)/i)
  const modMatch = notes.match(/Modalidad:\s*([^\]]+)\]/i)
  return {
    sede: sedeMatch ? normalizeSede(sedeMatch[1]) : defaultSede,
    modalidad: modMatch ? normalizeModality(modMatch[1]) : defaultMod
  }
}

/**
 * Construye la cadena de notas incrustando la sede y modalidad de manera segura y no destructiva.
 */
export function buildNotesWithMetadata(
  existingNotes?: string | null,
  sede?: string | null,
  modalidad?: string | null
): string {
  const cleanExisting = (existingNotes || '').replace(/\[Sede:[^\]]+\]/g, '').trim()
  const s = normalizeSede(sede)
  const m = normalizeModality(modalidad)
  const metaTag = `[Sede: ${s} | Modalidad: ${m}]`
  return cleanExisting ? `${metaTag} ${cleanExisting}` : metaTag
}

/**
 * Retorna el índice de orden jerárquico oficial (Preescolar -> Primaria -> Secundaria -> Media -> PFC/Multigrado).
 */
export function getGradeLevelHierarchyIndex(name: string): number {
  const norm = normalizeGradeLevel(name)
  const idx = OFFICIAL_GRADE_LEVELS.indexOf(norm as any)
  if (idx !== -1) return idx
  const numMatch = name.match(/^(\d+)/)
  if (numMatch) {
    const num = parseInt(numMatch[1], 10)
    return 100 + num
  }
  return 999
}

