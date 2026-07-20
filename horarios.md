# 🗓️ Análisis y Propuesta Arquitectónica: HorarioEnsuny

## 1. Viabilidad en el Proyecto Actual (aulaEnsuny)

Como Arquitecto de Software y Tech Lead, he evaluado la propuesta frente a la infraestructura actual de **aulaEnsuny**. La respuesta corta es: **Sí, es viable implementarlo como un módulo independiente dentro del monorepo actual (Modular Monolith), PERO existen fricciones tecnológicas importantes que debemos resolver primero.**

> [!TIP]
> **Stack Tecnológico Resolvido**
> Se ha decidido **omitir Prisma ORM y Better Auth**. Mantendremos **Supabase Auth** y **Supabase SDK** (PostgreSQL) para asegurar la cohesión total con el resto del ecosistema de `aulaEnsuny` y la base de datos existente. Cumpliremos con la *Clean Architecture* abstrayendo el acceso a la base de datos dentro del Patrón Repositorio en la capa de infraestructura.

Para mantener la cohesión del sistema y no reinventar la rueda, propongo implementar **HorarioEnsuny** adaptando las tecnologías a lo que ya tenemos o, si el motor de generación es computacionalmente muy pesado, aislarlo en un microservicio (aunque empezaremos como Modular Monolith).

---

## 2. Diseño del Dominio (Domain Driven Design)

El corazón de HorarioEnsuny no es el CRUD, sino el **Motor Generador** y sus **Restricciones**. El dominio (Core) no tendrá dependencias externas.

### Entidades Core
- `Teacher`: Identificador, disponibilidad horaria, materias que imparte, carga máxima.
- `Subject`: Intensidad horaria, requiere laboratorio, bloque doble permitido.
- `Group`: Conjunto de estudiantes, currículo requerido.
- `Classroom`: Capacidad, tipo (aula normal, laboratorio).
- `Timeslot`: Bloque de tiempo (ej. Lunes 07:00-07:50).
- `ClassSession`: (Assignment) Representa la tupla generada: `[Teacher, Subject, Group, Classroom, Timeslot]`.
- `Schedule`: Agregado raíz que contiene una lista de `ClassSession` y la métrica de fitness (score).

### Patrón de Reglas (Specification / Strategy Pattern)
Las reglas validarán un `Schedule` completo o una asignación parcial (`ClassSession`).

```typescript
// Interface común para el Motor de Restricciones
interface IScheduleRule {
  readonly isMandatory: boolean;
  readonly code: string;
  readonly weight: number; // Para reglas soft
  
  validate(schedule: Schedule, newSession?: ClassSession): RuleResult;
}
```

*Ejemplo: `TeacherOverlapRule` verificará que dentro del agregado `Schedule`, no existan dos `ClassSession` con el mismo `Teacher` en el mismo `Timeslot`.*

---

## 3. Arquitectura del Motor (Simulador y Algoritmos)

Tomando tu excelente recomendación sobre el **Simulador de Generación**, la arquitectura del motor se dividirá en tres capas:

1. **Rule Engine:** Evalúa un horario y retorna un `Score` (0 a 100).
2. **Algorithm Strategy:** Interfaz intercambiable (`Backtracking`, `GeneticAlgorithm`).
3. **Simulation Orchestrator:** Ejecuta el algoritmo *N* veces, guarda los metadatos de rendimiento y retorna el top 5 de horarios generados basándose en el `Score` del Rule Engine.

---

## 4. Diseño del Modelo de Datos (Esquema conceptual)

Dado que las reglas viven en código, la BD sólo almacena entidades estáticas y resultados:

- `sch_teachers` (id, name, max_hours)
- `sch_subjects` (id, name, color, requires_lab)
- `sch_groups` (id, name, level)
- `sch_classrooms` (id, name, is_lab)
- `sch_teacher_subjects` (teacher_id, subject_id)
- `sch_curriculums` (group_id, subject_id, weekly_hours, allow_double_blocks)
- `sch_availabilities` (entity_type, entity_id, day_of_week, time_block, is_available)
- `sch_schedules` (id, status, fitness_score, generation_time, created_at)
- `sch_assignments` (schedule_id, teacher_id, subject_id, group_id, classroom_id, day, block)

---

## 5. Diseño de Casos de Uso y Navegación UI

La experiencia de usuario se diseñará pensando en un flujo de **configuración "paso a paso"** antes de llegar al simulador.

1. **Dashboard:** Métricas globales y últimos horarios generados.
2. **Catálogos Base:** CRUD de Docentes, Materias, Grupos y Salones.
3. **Matriz de Disponibilidad:** Interfaz tipo grilla (Notion/Google Calendar) para marcar en rojo las horas no disponibles de profesores y salones.
4. **Plan de Estudios:** Donde se asocia (Grupo + Materia + Docente + Horas semanales).
5. **Panel de Restricciones:** Toggle switches interactivos (Shadcn UI) para encender/apagar reglas suaves (Soft rules) y asignar su "peso" de importancia.
6. **Simulador (El Core):** Pantalla interactiva que lanza la generación (con Web Workers o colas de fondo), mostrando barras de progreso de las *N* iteraciones y revelando las "Top 5 propuestas".
7. **Visor de Horario:** Matriz interactiva bidireccional (Días vs Bloques) con Drag & Drop para ajustes finos, mostrando indicadores rojos si un movimiento manual rompe una regla.

---

## 6. Plan de Iteraciones propuesto

Como solicitaste, construiremos esto módulo a módulo.

**Iteración 1: Core de Entidades y Catálogos.** (Preparación de la BD, Repositorios, e interfaces CRUD básicas de Docentes, Materias, Grupos, Salones).
**Iteración 2: Matrices de Disponibilidad y Plan de Estudios.** (UI interactiva para asignar horas y disponibilidades).
**Iteración 3: Dominio del Motor (Rule Engine).** (Programar las reglas mandatorias y suaves, en puro TypeScript sin UI).
**Iteración 4: Algoritmo Base (Backtracking) y Simulador.** (Conectar el algoritmo a las reglas).
**Iteración 5: Visor y Editor Manual.** (La tabla visual interactiva del horario final con Drag & Drop).

---

## 7. Estado de Implementación Actual

> Última actualización: Julio 2026

### Componentes Implementados

| Componente | Archivo | Estado |
|---|---|---|
| Página principal | `admin/schedules/page.tsx` | ✅ |
| Lienzo Maestro (GENERAL) | `components/MasterScheduleCanvas.tsx` | ✅ |
| Lienzo Individual | `components/ScheduleCanvas.tsx` | ✅ |
| Impresión Profesional | `components/PrintableSchedule.tsx` | ✅ |
| Modal de Edición de Celda | `components/SlotEditorModal.tsx` | ✅ |
| Drawer de Grupos | `components/GroupsDrawer.tsx` | ✅ |
| Drawer de Docentes | `components/TeachersDrawer.tsx` | ✅ |
| Drawer de Aulas | `components/ClassroomsDrawer.tsx` | ✅ |

### Flujo de Datos

**`page.tsx`** consulta `sch_groups` con un join a `profiles` para obtener el director:
```ts
supabase.from('sch_groups').select('id, name, director:profiles(id, first_name, last_name)')
```
Propaga `groupName` y `directorName` como props hacia `ScheduleCanvas`.

**`MasterScheduleCanvas.tsx`** (Horario General) utiliza una estrategia de doble consulta para garantizar la compatibilidad hacia atrás:
- Consulta a la tabla oficial de `profiles` para mapear los nuevos UUIDs de autenticación, filtrando mediante el rol con una acción de servidor (`getAdminUsers()`).
- Consulta de respaldo a la tabla antigua `sch_teachers` para mapear IDs residuales heredados de antes de la migración.

### Exportación a PDF (Diseño Profesional)

**Decisión de diseño:** Se descartó `html2pdf.js` porque usa `html2canvas` internamente, que no soporta colores modernos de CSS (`oklch`, `lab`) presentes en Tailwind v4, generando errores de consola. Se usa **`window.print()` nativo** con directivas CSS de impresión.

**Estructura del documento impreso (A4 Horizontal a una cara):**
- **Encabezado:** Logotipo oficial (`logo_1.svg`), Institución Educativa ENSUNY + año actual, título monumental "HORARIO DE CLASES", y tarjetas de información superior (Jornada, Año lectivo).
- **Tabla:** Cabecera de fondo blanco con texto oscuro (`#1e293b`), Días de la semana en la columna izquierda con íconos coloreados individualmente.
- Sin sección de descansos/recreos impresa, para limpiar el diseño.
- Materias con 2 horas continuas usan `colSpan={2}` (celda combinada horizontal).
- Colores suaves por materia (15% opacidad de fondo sin bordes gruesos superiores para mantener limpieza visual).
- Tabla `table-fixed` + `overflow-hidden` + `line-clamp-2` en celdas para que el texto largo nunca desborde.
- Se forzó el documento a ocupar exactamente **una (1) sola hoja** con medidas en milímetros (`w-[297mm] h-[209mm]`) y directivas de CSS estrictas: `@page { margin: 0; size: A4 landscape; }` y un override a `body, html` para bloquear los márgenes.
- La interfaz interactiva usa `print:hidden`; el componente de impresión usa `print:block` y mantiene el forzado de renderizado a color (`-webkit-print-color-adjust: exact`).

### Persistencia localStorage

| Clave | Contenido |
|-------|-----------|
| `sch_settings` | Configuración global: hora de inicio, duración de bloques, # periodos, formato 12h/24h, breaks |
| `sch_group_periods` | `{ [groupId]: maxPeriods }` — límite de horas por grupo |
| `sch_block_subjects` | Materias configuradas como bloques de 2 horas |
| `sch_active_period` | Año lectivo activo (ej. `"2026 - II"`) |

### Reglas del Motor de Generación (`RuleEngine`)

El motor de reglas duras (`HardConstraints.ts`) ha sido ampliado para soportar los casos límite de la Normal Superior:
1. **TeacherOverlapRule**: Un docente no puede dar dos clases distintas al mismo tiempo.
2. **GroupOverlapRule**: Un grupo no puede recibir dos clases distintas al mismo tiempo.
3. **TimeOffRule**: Respeta los bloqueos de disponibilidad configurados por cada profesor.
4. **GroupNoGapsRule**: *[Relajada a Soft/Penalización]* Intenta que los grupos no tengan "huecos" en su horario, descontando horas de descanso.
5. **SubjectMaxHoursPerDayRule**: Una misma materia **nunca** puede exceder las 2 horas de duración máxima diaria.
6. **TeacherRequiredRule**: *[Nueva]* Toda materia del pensum DEBE tener un docente titular asignado. Si está en blanco, el motor aborta la asignación y la materia se clasifica como "No Asignada".
7. **SubjectOncePerDayRule**: *[Nueva]* Una materia **nunca** se puede impartir en un mismo grupo dos veces el mismo día en horarios desconectados (fragmentados). Solo es válido un bloque continuo.

### Convenciones

- El prop de periodo en `SlotEditorModal` se llama **`periodId`** (no `period`).
- Los días están hardcodeados: `['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']`.
- El `<title>` del sitio se cambió a: **"Institución Educativa Escuela Normal Superior del Nordeste - ENSUNY"**.
