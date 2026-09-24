/**
 * Utilidad para resolver el grupo escolar oficial en sch_groups
 * a partir de las variantes en que puede estar registrado el grado y grupo del estudiante.
 */
export function resolveOfficialGroup(
  allGroups: Array<{ id: string; name: string }>,
  rawGrade?: string | null,
  rawGroup?: string | null
): { groupId: string; groupName: string; gradeLevel: string } | null {
  if (!allGroups || allGroups.length === 0) return null

  const gradeStr = (rawGrade || '').trim()
  const groupStr = (rawGroup || '').trim()

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

  // 1. Coincidencia directa si groupStr ya es el nombre del grupo (ej: "10°-1", "7-2", "PFC I")
  if (groupStr) {
    const exact = allGroups.find(g => g.name.toLowerCase() === groupStr.toLowerCase())
    if (exact) {
      const parts = exact.name.split('-')
      return {
        groupId: exact.id,
        groupName: exact.name,
        gradeLevel: gradeStr || (parts[0] ? parts[0].trim() : '')
      }
    }

    const normTarget = norm(groupStr)
    const normMatch = allGroups.find(g => norm(g.name) === normTarget)
    if (normMatch) {
      const parts = normMatch.name.split('-')
      return {
        groupId: normMatch.id,
        groupName: normMatch.name,
        gradeLevel: gradeStr || (parts[0] ? parts[0].trim() : '')
      }
    }
  }

  // 1.5 Manejo especial para ciclos complementarios PFC (12 y 13)
  const gradeDigits = gradeStr.replace(/\D/g, '')
  if (gradeDigits === '12' || /pfc[\s\-_]?12/i.test(gradeStr) || /pfc[\s\-_]?12/i.test(groupStr)) {
    const pfc12Match = allGroups.find(g => /pfc[\s\-_]?12/i.test(g.name))
    if (pfc12Match) {
      return {
        groupId: pfc12Match.id,
        groupName: pfc12Match.name,
        gradeLevel: gradeStr || 'PFC-12'
      }
    }
  }

  if (gradeDigits === '13' || /pfc[\s\-_]?13/i.test(gradeStr) || /pfc[\s\-_]?13/i.test(groupStr)) {
    const pfc13Match = allGroups.find(g => /pfc[\s\-_]?13/i.test(g.name))
    if (pfc13Match) {
      return {
        groupId: pfc13Match.id,
        groupName: pfc13Match.name,
        gradeLevel: gradeStr || 'PFC-13'
      }
    }
  }

  // 1.6 Manejo especial para cohorte Nivelatorio
  if (/nivelat/i.test(gradeStr) || /nivelat/i.test(groupStr)) {
    const nivMatch = allGroups.find(g => /nivelat/i.test(g.name))
    if (nivMatch) {
      return {
        groupId: nivMatch.id,
        groupName: nivMatch.name,
        gradeLevel: 'Nivelatorio'
      }
    }
  }

  // 2. Extraer dígitos de grado y grupo (ej: Grado "10°" -> "10", Grupo "1" -> "1")
  const groupDigits = groupStr.replace(/\D/g, '')

  if (gradeDigits && groupDigits) {
    // Clave combinada (ej: 10 y 1 -> "101", 7 y 2 -> "72")
    const combinedKey = `${gradeDigits}${groupDigits}`
    const match = allGroups.find(g => norm(g.name) === combinedKey)
    if (match) {
      return {
        groupId: match.id,
        groupName: match.name,
        gradeLevel: gradeStr || `${gradeDigits}°`
      }
    }

    // Probar patrón flexible: grado + cualquier separador + grupo
    const regex = new RegExp(`^0*${gradeDigits}[°º\\-\\s/]*0*${groupDigits}$`, 'i')
    const regexMatch = allGroups.find(g => regex.test(g.name.trim()))
    if (regexMatch) {
      return {
        groupId: regexMatch.id,
        groupName: regexMatch.name,
        gradeLevel: gradeStr || `${gradeDigits}°`
      }
    }
  }

  // 2.5 Intento de coincidencia textual completa (ej: "Sexto" y "A" -> "SextoA")
  const normGrade = norm(gradeStr)
  const normGroup = norm(groupStr)
  if (normGrade && normGroup) {
    const combinedStr = `${normGrade}${normGroup}`
    const matchStr = allGroups.find(g => norm(g.name) === combinedStr)
    if (matchStr) {
      return {
        groupId: matchStr.id,
        groupName: matchStr.name,
        gradeLevel: gradeStr
      }
    }
  }

  // 3. Si groupStr tiene guión o barra (ej: "10-1", "7/2")
  if (groupStr.includes('-') || groupStr.includes('/')) {
    const parts = groupStr.split(/[-/]/).map(p => p.trim().replace(/\D/g, ''))
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const combined = `${parts[0]}${parts[1]}`
      const match = allGroups.find(g => norm(g.name) === combined)
      if (match) {
        return {
          groupId: match.id,
          groupName: match.name,
          gradeLevel: gradeStr || `${parts[0]}°`
        }
      }
    }
  }

  return null
}
