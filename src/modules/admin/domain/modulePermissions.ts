export interface ModulePermission {
  id?: string
  module_key: string
  module_name: string
  is_enabled: boolean
  section?: string
  description?: string
  updated_at?: string
}

export interface AdminModuleDefinition {
  key: string
  name: string
  section: string
  description: string
  href: string
}

export interface AdministratorUser {
  id: string
  name: string
  email: string
  role: 'admin'
  status: 'active' | 'inactive'
  avatarUrl?: string
}

export const ALL_ADMIN_MODULES: AdminModuleDefinition[] = [
  // Gestión Académica
  { key: 'teachers', name: 'Docentes', section: 'Gestión Académica', description: 'Directorio, asignación de carga pedagógica y perfiles de docentes.', href: '/admin/teachers' },
  { key: 'students', name: 'Estudiantes', section: 'Gestión Académica', description: 'Matrículas, directorio general y expedientes estudiantiles.', href: '/admin/students' },
  { key: 'users', name: 'Usuarios', section: 'Gestión Académica', description: 'Administración de credenciales, roles y accesos del personal.', href: '/admin/users' },
  { key: 'grade-levels', name: 'Grados y Niveles', section: 'Gestión Académica', description: 'Estructura curricular de primaria, secundaria y grados.', href: '/admin/grade-levels' },
  { key: 'courses', name: 'Cursos y Materias', section: 'Gestión Académica', description: 'Gestión de asignaturas, grupos y contenidos de clase.', href: '/admin/courses' },
  { key: 'schedules', name: 'Horarios', section: 'Gestión Académica', description: 'Malla horaria institucional de docentes y grupos.', href: '/admin/schedules' },
  { key: 'evaluations', name: 'Evaluaciones', section: 'Gestión Académica', description: 'Supervisión de exámenes y actividades evaluativas.', href: '/admin/evaluations' },
  { key: 'academic-registry', name: 'Registro Académico', section: 'Gestión Académica', description: 'Libro central de notas, boletines y certificaciones.', href: '/admin/academic-registry' },

  // Gestión Institucional
  { key: 'permissions', name: 'Permisos Docentes', section: 'Gestión Institucional', description: 'Flujo de revisión, aprobación y cobertura de ausencias docentes.', href: '/admin/permissions' },
  { key: 'disciplinary', name: 'Convivencia', section: 'Gestión Institucional', description: 'Seguimiento disciplinario, actas de compromiso y citaciones.', href: '/admin/disciplinary' },
  { key: 'elections', name: 'Elecciones', section: 'Gestión Institucional', description: 'Gobierno escolar, personería y votaciones electrónicas.', href: '/admin/elections' },

  // Planificación y Recursos
  { key: 'institutional-agenda', name: 'Agenda', section: 'Planificación y Recursos', description: 'Programación de reuniones, circulares y citas directivas.', href: '/admin/institutional-agenda' },
  { key: 'calendar', name: 'Calendario', section: 'Planificación y Recursos', description: 'Cronograma y eventos institucionales del año escolar.', href: '/admin/calendar' },
  { key: 'notifications', name: 'Notificaciones', section: 'Planificación y Recursos', description: 'Centro de envíos y comunicados masivos a la comunidad.', href: '/admin/notifications' },
  { key: 'docs', name: 'Centro de Docs', section: 'Planificación y Recursos', description: 'Documentos oficiales, manuales y reglamentación escolar.', href: '/admin/docs' },
  { key: 'resources', name: 'Recursos', section: 'Planificación y Recursos', description: 'Inventario de aulas especializadas y material educativo.', href: '/admin/resources' },

  // Reportes y Analíticas
  { key: 'analytics', name: 'Analíticas', section: 'Reportes y Analíticas', description: 'Métricas de rendimiento, alertas de deserción y estadísticas.', href: '/admin/analytics' },
  { key: 'academic-reports', name: 'Reportes Académicos', section: 'Reportes y Analíticas', description: 'Generación y exportación de informes oficiales consolidados.', href: '/admin/academic-reports' },

  // Sistema
  { key: 'settings', name: 'Configuración', section: 'Sistema', description: 'Datos institucionales, NIT, rectoría y preferencias del sistema.', href: '/admin/settings' },
  { key: 'roles', name: 'Roles y Permisos', section: 'Sistema', description: 'Matriz informativa de privilegios por perfil en el sistema.', href: '/admin/roles' },
]
