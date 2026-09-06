import type { DocFolder } from '../entities/Document'

export interface AcademicSubject {
  id: string
  slug: string
  title: string
  categoryBadge: string
  description: string
  coordinator: string
  accentColor: string
  subtleBgLight: string
  subtleBorderLight: string
  iconName: 'terminal' | 'psychiatry' | 'square_foot' | 'science' | 'volunteer_activism' | 'public' | 'sports_volleyball' | 'book_open' | 'languages' | 'palette' | 'graduation_cap' | 'menu_book' | 'gavel' | 'grading' | 'file_text'
  dbFolderId?: string
  createdBy?: string
}

export interface InstitutionalDocumentItem {
  id: string
  slug: string
  title: string
  statusBadge: string
  badgeColorClass: string
  versionResolution: string
  description: string
  iconName: 'menu_book' | 'gavel' | 'grading' | 'file_text'
  subtleBgLight: string
  subtleBorderLight: string
  pdfUrl?: string
  readOnlineLabel: string
  dbDocId?: string
  dbFolderId?: string
}

export interface VisualCardResource {
  id: string
  subjectSlug: string
  title: string
  description: string
  fileType: 'pdf' | 'code' | 'video' | 'sheet' | 'doc' | 'slides'
  fileSizeText: string
  gradeText: string
  termText: string
  authorName: string
  authorRole: string
  updatedAtText: string
  category: string
  downloadUrl?: string
  driveFileId?: string
  subtleBgColor: string
  createdBy?: string
}

/**
 * Normaliza una URL o ID de Google Drive para visualización dentro de un iframe
 */
export function getDrivePreviewUrl(urlOrId?: string | null): string | null {
  if (!urlOrId) return null
  const trimmed = urlOrId.trim()
  if (trimmed.startsWith('/') || trimmed.startsWith('blob:')) {
    return trimmed
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://drive.google.com/file/d/${trimmed}/preview`
  }
  const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`
  }
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`
  }
  if (trimmed.includes('drive.google.com') && trimmed.includes('/view')) {
    return trimmed.replace(/\/view.*$/, '/preview')
  }
  return trimmed
}

/**
 * Normaliza una URL o ID de Google Drive para descarga directa del archivo original
 */
export function getDriveDirectDownloadUrl(urlOrId?: string | null): string | null {
  if (!urlOrId) return null
  const trimmed = urlOrId.trim()
  if (trimmed.startsWith('/') || trimmed.startsWith('blob:')) {
    return trimmed
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://drive.google.com/uc?export=download&id=${trimmed}`
  }
  const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`
  }
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`
  }
  return trimmed
}

export const INSTITUTION_INFO = {
  fullName: 'Institución Educativa Escuela Normal Superior del Nordeste',
  shortName: 'I.E. Escuela Normal Superior del Nordeste',
  sigla: 'ENSUNY',
  academicCycle: 'Ciclo Escolar 2025',
  location: 'Yolombó, Antioquia • Colombia',
  motto: 'Formando maestros con vocación, ciencia y sentido humano',
}

// Subtle pastel background colors palette
export const SUBTLE_COLORS = [
  { bg: 'bg-[#F0FDF4] dark:bg-[#132219]/60', border: 'border-[#DCFCE7] dark:border-[#1F4E31]/60' }, // mint/emerald
  { bg: 'bg-[#EFF6FF] dark:bg-[#131C2E]/60', border: 'border-[#DBEAFE] dark:border-[#1E3A8A]/40' }, // blue
  { bg: 'bg-[#FAF5FF] dark:bg-[#20152D]/60', border: 'border-[#F3E8FF] dark:border-[#581C87]/40' }, // purple
  { bg: 'bg-[#FFF7ED] dark:bg-[#271B12]/60', border: 'border-[#FFEDD5] dark:border-[#7C2D12]/40' }, // warm amber
  { bg: 'bg-[#F0FDF8] dark:bg-[#122421]/60', border: 'border-[#CCFBF1] dark:border-[#134E48]/40' }, // teal
  { bg: 'bg-[#FFF1F2] dark:bg-[#271317]/60', border: 'border-[#FFE4E6] dark:border-[#881337]/40' }, // rose
  { bg: 'bg-[#F5F3FF] dark:bg-[#1A182E]/60', border: 'border-[#EDE9FE] dark:border-[#4C1D95]/40' }, // indigo
  { bg: 'bg-[#F8FAFC] dark:bg-[#161B22]/60', border: 'border-[#E2E8F0] dark:border-[#334155]/50' }, // slate
]

export function getSubtleCardStyle(seed: string | number) {
  let hash = 0
  const str = String(seed)
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % SUBTLE_COLORS.length
  return SUBTLE_COLORS[index]
}

// Real academic areas mapped from the institution's real folders (doc_folders)
export const ACADEMIC_SUBJECTS: AcademicSubject[] = [
  {
    id: 'db30786a-da4e-4d02-8ed9-51b6b86ddf60',
    slug: 'tecnologia',
    title: 'Tecnología e Informática',
    categoryBadge: 'STEM',
    description: 'Planeaciones, mallas curriculares y material didáctico del área de tecnología.',
    coordinator: 'Dpto. de Tecnología',
    accentColor: '#0071e3',
    subtleBgLight: SUBTLE_COLORS[1].bg,
    subtleBorderLight: SUBTLE_COLORS[1].border,
    iconName: 'terminal',
    dbFolderId: 'db30786a-da4e-4d02-8ed9-51b6b86ddf60',
  },
  {
    id: '9dc697ba-0edd-47cb-912a-f8e0ee79df60',
    slug: 'matematicas',
    title: 'Matemáticas',
    categoryBadge: 'Exactas',
    description: 'Mallas curriculares, guías y talleres del departamento de matemáticas.',
    coordinator: 'Dpto. de Matemáticas',
    accentColor: '#4a47d2',
    subtleBgLight: SUBTLE_COLORS[2].bg,
    subtleBorderLight: SUBTLE_COLORS[2].border,
    iconName: 'square_foot',
    dbFolderId: '9dc697ba-0edd-47cb-912a-f8e0ee79df60',
  },
  {
    id: '2539f2f2-8c24-4986-9121-eca16e8804a4',
    slug: 'ciencias-naturales',
    title: 'Ciencias Naturales',
    categoryBadge: 'Ciencias',
    description: 'Planeaciones pedagógicas y guías didácticas de biología, física y química.',
    coordinator: 'Dpto. de Ciencias Naturales',
    accentColor: '#007f92',
    subtleBgLight: SUBTLE_COLORS[0].bg,
    subtleBorderLight: SUBTLE_COLORS[0].border,
    iconName: 'psychiatry',
    dbFolderId: '2539f2f2-8c24-4986-9121-eca16e8804a4',
  },
  {
    id: 'b66ee6a2-52cc-4e68-9778-d1778f62ccb5',
    slug: 'ciencias-sociales',
    title: 'Ciencias Sociales',
    categoryBadge: 'Sociales',
    description: 'Historia, geografía, constitución y democracia escolar institucional.',
    coordinator: 'Dpto. de Ciencias Sociales',
    accentColor: '#0059b5',
    subtleBgLight: SUBTLE_COLORS[6].bg,
    subtleBorderLight: SUBTLE_COLORS[6].border,
    iconName: 'public',
    dbFolderId: 'b66ee6a2-52cc-4e68-9778-d1778f62ccb5',
  },
  {
    id: 'c27e97f8-0507-4da6-9791-01344b20f97b',
    slug: 'lenguaje',
    title: 'Lengua Castellana',
    categoryBadge: 'Lenguaje',
    description: 'Planes de aula, lectura crítica y mallas curriculares de humanidades.',
    coordinator: 'Dpto. de Humanidades',
    accentColor: '#d97706',
    subtleBgLight: SUBTLE_COLORS[3].bg,
    subtleBorderLight: SUBTLE_COLORS[3].border,
    iconName: 'book_open',
    dbFolderId: 'c27e97f8-0507-4da6-9791-01344b20f97b',
  },
  {
    id: 'b74af536-f9c4-44b8-a282-7e70cfc1a9b5',
    slug: 'ingles',
    title: 'Idioma Extranjero (Inglés)',
    categoryBadge: 'Idiomas',
    description: 'Planeaciones curriculares y recursos para el bilingüismo escolar.',
    coordinator: 'Área de Idiomas',
    accentColor: '#0284c7',
    subtleBgLight: SUBTLE_COLORS[1].bg,
    subtleBorderLight: SUBTLE_COLORS[1].border,
    iconName: 'languages',
    dbFolderId: 'b74af536-f9c4-44b8-a282-7e70cfc1a9b5',
  },
  {
    id: '4923f714-99b2-46fc-8c43-c64520b78ea0',
    slug: 'artistica',
    title: 'Educación Artística',
    categoryBadge: 'Expresión',
    description: 'Desarrollo de la creatividad, expresión plástica y corporal normalista.',
    coordinator: 'Área Artística y Cultural',
    accentColor: '#db2777',
    subtleBgLight: SUBTLE_COLORS[5].bg,
    subtleBorderLight: SUBTLE_COLORS[5].border,
    iconName: 'palette',
    dbFolderId: '4923f714-99b2-46fc-8c43-c64520b78ea0',
  },
  {
    id: '38bc6992-4282-4d62-8f81-6d0888e729d7',
    slug: 'educacion-fisica',
    title: 'Educación Física',
    categoryBadge: 'Deporte',
    description: 'Salud, motricidad y reglamentos deportivos de la institución.',
    coordinator: 'Área de Educación Física',
    accentColor: '#6462ec',
    subtleBgLight: SUBTLE_COLORS[4].bg,
    subtleBorderLight: SUBTLE_COLORS[4].border,
    iconName: 'sports_volleyball',
    dbFolderId: '38bc6992-4282-4d62-8f81-6d0888e729d7',
  },
  {
    id: '789ae370-f042-4121-af52-dcb468deb694',
    slug: 'religion',
    title: 'Educación Religiosa y Ética',
    categoryBadge: 'Valores',
    description: 'Formación en valores humanos, convivencia pacífica y sentido de vida.',
    coordinator: 'Área de Ética y Religión',
    accentColor: '#5c6479',
    subtleBgLight: SUBTLE_COLORS[7].bg,
    subtleBorderLight: SUBTLE_COLORS[7].border,
    iconName: 'volunteer_activism',
    dbFolderId: '789ae370-f042-4121-af52-dcb468deb694',
  },
  {
    id: 'cdc5bb21-7320-474b-9e15-dfe9fc4b858b',
    slug: 'pfc',
    title: 'PFC (Formación Docente)',
    categoryBadge: 'Normalista',
    description: 'Proyectos de investigación y práctica pedagógica de los maestros en formación.',
    coordinator: 'Coordinación PFC',
    accentColor: '#10B981',
    subtleBgLight: SUBTLE_COLORS[0].bg,
    subtleBorderLight: SUBTLE_COLORS[0].border,
    iconName: 'graduation_cap',
    dbFolderId: 'cdc5bb21-7320-474b-9e15-dfe9fc4b858b',
  },
]

// Real institutional documents mapped from doc_folders (under Institucional)
export const INSTITUTIONAL_DOCS: InstitutionalDocumentItem[] = [
  {
    id: '3690e7f0-2cb1-4c34-9bf6-78aae5e1b8a1',
    slug: 'pei',
    title: 'PEI (Proyecto Educativo Institucional)',
    statusBadge: 'Oficial • Vigente',
    badgeColorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    versionResolution: 'Acuerdo Consejo Directivo • ENSUNY',
    description: 'Horizonte pedagógico, modelo formativo normalista y principios institucionales.',
    iconName: 'menu_book',
    subtleBgLight: SUBTLE_COLORS[1].bg,
    subtleBorderLight: SUBTLE_COLORS[1].border,
    readOnlineLabel: 'Leer en línea',
    dbFolderId: '3690e7f0-2cb1-4c34-9bf6-78aae5e1b8a1',
    dbDocId: '527a9478-7208-49f3-9136-7d68446fe761',
    pdfUrl: 'https://drive.google.com/file/d/1uPwEu3f_8pVWgOajn3XfGtt1QGcVastQ/preview',
  },
  {
    id: 'a8921ad8-d7bf-4bf7-8047-06e0b0da14a1',
    slug: 'manual-convivencia',
    title: 'Manual de Convivencia',
    statusBadge: 'Reglamento',
    badgeColorClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
    versionResolution: 'Acuerdo de Convivencia Escolar',
    description: 'Pautas de convivencia armónica, derechos, deberes y rutas de atención integral.',
    iconName: 'gavel',
    subtleBgLight: SUBTLE_COLORS[4].bg,
    subtleBorderLight: SUBTLE_COLORS[4].border,
    readOnlineLabel: 'Consultar Manual',
    dbFolderId: 'a8921ad8-d7bf-4bf7-8047-06e0b0da14a1',
  },
  {
    id: '7073eef5-f4ca-48c7-aeb9-e2bea832877c',
    slug: 'siee',
    title: 'Sistema de Evaluación (SIEE)',
    statusBadge: 'Normativa',
    badgeColorClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
    versionResolution: 'Resolución de Evaluación y Promoción',
    description: 'Criterios de valoración y seguimiento del aprendizaje en todos los niveles.',
    iconName: 'grading',
    subtleBgLight: SUBTLE_COLORS[2].bg,
    subtleBorderLight: SUBTLE_COLORS[2].border,
    readOnlineLabel: 'Ver Escalas',
    dbFolderId: '7073eef5-f4ca-48c7-aeb9-e2bea832877c',
  },
  {
    id: '77f9f9a5-e27a-4d91-bedd-c5966f41b7aa',
    slug: 'formatos',
    title: 'Formatos Institucionales',
    statusBadge: 'Gestión',
    badgeColorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    versionResolution: 'Plantillas y Actas Institucionales',
    description: 'Formatos oficiales de planeación, actas de comisión y seguimiento académico.',
    iconName: 'file_text',
    subtleBgLight: SUBTLE_COLORS[3].bg,
    subtleBorderLight: SUBTLE_COLORS[3].border,
    readOnlineLabel: 'Explorar Formatos',
    dbFolderId: '77f9f9a5-e27a-4d91-bedd-c5966f41b7aa',
  },
]

// Zero mock hardcoded resources - purely dynamic from database documents
export const SAMPLE_VISUAL_RESOURCES: VisualCardResource[] = []

/**
 * Fusiona las áreas académicas del catálogo institucional con las carpetas
 * reales creadas dinámicamente en la base de datos (hijas de Académico o carpetas raíz).
 */
export function getMergedAcademicSubjects(dbFolders: DocFolder[] = []): AcademicSubject[] {
  const result: AcademicSubject[] = [...ACADEMIC_SUBJECTS]

  // Encontrar carpetas del nivel académico en la BD:
  // Hijas directas de '3359b9b6-f96c-466a-8d26-ca7522e6e5b4' (Académico)
  // o carpetas raíz independientes (excepto las reservadas 'Académico' e 'Institucional')
  const academicDbFolders = dbFolders.filter(f => {
    const parent = f.parentId || f.parent_id
    if (parent === '3359b9b6-f96c-466a-8d26-ca7522e6e5b4') return true
    if (!parent && f.id !== '3359b9b6-f96c-466a-8d26-ca7522e6e5b4' && f.id !== '87c212dc-b724-49ec-a36b-e5b6eae82416') return true
    return false
  })

  const knownIds = new Set(ACADEMIC_SUBJECTS.map(s => s.id))
  const knownFolderIds = new Set(ACADEMIC_SUBJECTS.map(s => s.dbFolderId).filter(Boolean))

  for (const folder of academicDbFolders) {
    if (knownIds.has(folder.id) || knownFolderIds.has(folder.id)) {
      // Si ya existe en el catálogo, sincronizamos createdBy, título y descripción
      const idx = result.findIndex(s => s.id === folder.id || s.dbFolderId === folder.id)
      if (idx !== -1) {
        result[idx] = {
          ...result[idx],
          title: folder.name || result[idx].title,
          description: folder.description || result[idx].description,
          createdBy: folder.createdBy ?? result[idx].createdBy,
        }
      }
      continue
    }

    // Nueva carpeta creada por docente o admin
    const subtleStyle = getSubtleCardStyle(folder.id)
    const nameLower = folder.name.toLowerCase()
    let iconName: AcademicSubject['iconName'] = 'book_open'
    if (nameLower.includes('quim') || nameLower.includes('fisic') || nameLower.includes('biol') || nameLower.includes('cienc')) {
      iconName = 'science'
    } else if (nameLower.includes('tec') || nameLower.includes('info') || nameLower.includes('sist') || nameLower.includes('prog')) {
      iconName = 'terminal'
    } else if (nameLower.includes('mat') || nameLower.includes('geom') || nameLower.includes('calc')) {
      iconName = 'square_foot'
    } else if (nameLower.includes('ingl') || nameLower.includes('idiom') || nameLower.includes('fran')) {
      iconName = 'languages'
    } else if (nameLower.includes('art') || nameLower.includes('music') || nameLower.includes('cult')) {
      iconName = 'palette'
    } else if (nameLower.includes('depor') || (nameLower.includes('educaci') && nameLower.includes('fisic'))) {
      iconName = 'sports_volleyball'
    }

    result.push({
      id: folder.id,
      slug: folder.id,
      title: folder.name,
      categoryBadge: 'Académica',
      description: folder.description || `Planeaciones, guías y material pedagógico del área de ${folder.name}.`,
      coordinator: 'Área Académica',
      accentColor: '#0071e3',
      subtleBgLight: subtleStyle.bg,
      subtleBorderLight: subtleStyle.border,
      iconName,
      dbFolderId: folder.id,
      createdBy: folder.createdBy,
    })
  }

  // Sincronizar creador, nombre y descripción de las carpetas conocidas si están en dbFolders
  for (let i = 0; i < result.length; i++) {
    const item = result[i]
    const dbF = dbFolders.find(f => f.id === item.id || f.id === item.dbFolderId)
    if (dbF) {
      result[i] = {
        ...item,
        title: dbF.name || item.title,
        description: dbF.description || item.description,
        createdBy: dbF.createdBy ?? item.createdBy,
      }
    }
  }

  return result
}

// Institutional subjects/folders mapped as AcademicSubject for unified UI & navigation dynamics
export const INSTITUTIONAL_SUBJECTS: AcademicSubject[] = [
  {
    id: '3690e7f0-2cb1-4c34-9bf6-78aae5e1b8a1',
    slug: 'pei',
    title: 'PEI (Proyecto Educativo Institucional)',
    categoryBadge: 'Oficial',
    description: 'Horizonte pedagógico, modelo formativo normalista y principios institucionales.',
    coordinator: 'Consejo Directivo',
    accentColor: '#0071e3',
    subtleBgLight: SUBTLE_COLORS[1].bg,
    subtleBorderLight: SUBTLE_COLORS[1].border,
    iconName: 'menu_book',
    dbFolderId: '3690e7f0-2cb1-4c34-9bf6-78aae5e1b8a1',
  },
  {
    id: 'a8921ad8-d7bf-4bf7-8047-06e0b0da14a1',
    slug: 'manual-convivencia',
    title: 'Manual de Convivencia',
    categoryBadge: 'Reglamento',
    description: 'Pautas de convivencia armónica, derechos, deberes y rutas de atención integral.',
    coordinator: 'Comité de Convivencia',
    accentColor: '#0d9488',
    subtleBgLight: SUBTLE_COLORS[4].bg,
    subtleBorderLight: SUBTLE_COLORS[4].border,
    iconName: 'gavel',
    dbFolderId: 'a8921ad8-d7bf-4bf7-8047-06e0b0da14a1',
  },
  {
    id: '7073eef5-f4ca-48c7-aeb9-e2bea832877c',
    slug: 'siee',
    title: 'Sistema de Evaluación (SIEE)',
    categoryBadge: 'Normativa',
    description: 'Criterios de valoración y seguimiento del aprendizaje en todos los niveles.',
    coordinator: 'Comisión de Evaluación',
    accentColor: '#4f46e5',
    subtleBgLight: SUBTLE_COLORS[2].bg,
    subtleBorderLight: SUBTLE_COLORS[2].border,
    iconName: 'grading',
    dbFolderId: '7073eef5-f4ca-48c7-aeb9-e2bea832877c',
  },
  {
    id: '77f9f9a5-e27a-4d91-bedd-c5966f41b7aa',
    slug: 'formatos',
    title: 'Formatos Institucionales',
    categoryBadge: 'Gestión',
    description: 'Formatos oficiales de planeación, actas de comisión y seguimiento académico.',
    coordinator: 'Secretaría Académica',
    accentColor: '#d97706',
    subtleBgLight: SUBTLE_COLORS[3].bg,
    subtleBorderLight: SUBTLE_COLORS[3].border,
    iconName: 'file_text',
    dbFolderId: '77f9f9a5-e27a-4d91-bedd-c5966f41b7aa',
  },
]

/**
 * Fusiona las carpetas institucionales con las creadas dinámicamente en la BD
 * bajo la raíz 'Institucional' (87c212dc-b724-49ec-a36b-e5b6eae82416).
 */
export function getMergedInstitutionalSubjects(dbFolders: DocFolder[] = []): AcademicSubject[] {
  const result: AcademicSubject[] = [...INSTITUTIONAL_SUBJECTS]

  // Encontrar carpetas del nivel institucional en la BD:
  // Hijas directas de '87c212dc-b724-49ec-a36b-e5b6eae82416' (Institucional)
  const institutionalDbFolders = dbFolders.filter(f => {
    const parent = f.parentId || f.parent_id
    return parent === '87c212dc-b724-49ec-a36b-e5b6eae82416'
  })

  const knownIds = new Set(INSTITUTIONAL_SUBJECTS.map(s => s.id))
  const knownFolderIds = new Set(INSTITUTIONAL_SUBJECTS.map(s => s.dbFolderId).filter(Boolean))

  for (const folder of institutionalDbFolders) {
    if (knownIds.has(folder.id) || knownFolderIds.has(folder.id)) {
      // Si ya existe en el catálogo, sincronizamos createdBy, título y descripción
      const idx = result.findIndex(s => s.id === folder.id || s.dbFolderId === folder.id)
      if (idx !== -1) {
        result[idx] = {
          ...result[idx],
          title: folder.name || result[idx].title,
          description: folder.description || result[idx].description,
          createdBy: folder.createdBy ?? result[idx].createdBy,
        }
      }
      continue
    }

    // Nueva carpeta creada por docente o admin en sección institucional
    const subtleStyle = getSubtleCardStyle(folder.id)
    result.push({
      id: folder.id,
      slug: folder.id,
      title: folder.name,
      categoryBadge: 'Institucional',
      description: folder.description || `Documentos y acuerdos oficiales de ${folder.name}.`,
      coordinator: 'Gobierno Escolar',
      accentColor: '#0071e3',
      subtleBgLight: subtleStyle.bg,
      subtleBorderLight: subtleStyle.border,
      iconName: 'file_text',
      dbFolderId: folder.id,
      createdBy: folder.createdBy,
    })
  }

  // Sincronizar creador, nombre y descripción de las carpetas conocidas si están en dbFolders
  for (let i = 0; i < result.length; i++) {
    const item = result[i]
    const dbF = dbFolders.find(f => f.id === item.id || f.id === item.dbFolderId)
    if (dbF) {
      result[i] = {
        ...item,
        title: dbF.name || item.title,
        description: dbF.description || item.description,
        createdBy: dbF.createdBy ?? item.createdBy,
      }
    }
  }

  return result
}
