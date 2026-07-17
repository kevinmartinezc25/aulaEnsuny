# 📓 Bitácora de Desarrollo — aulaEnsuny LMS

**Proyecto:** aulaEnsuny — Plataforma LMS Educativa para Colegios
**Stack:** Next.js · TypeScript · Supabase · Tailwind CSS · Framer Motion · Recharts
**Última actualización:** 16 de julio de 2026

---

## ✅ ESTADO GENERAL DEL PROYECTO

| Área | Estado | Notas |
|---|---|---|
| Autenticación | ✅ Funcional | Supabase Auth integrado |
| Middleware de sesión | ✅ Funcional | Rutas protegidas por rol |
| Conexión Supabase real | ✅ Funcional | Variables de entorno configuradas |
| Usuarios de prueba | ✅ Creados | admin / teacher / student |
| Vista Estudiante | ✅ Operativa | Progreso, calificaciones, foros |
| Vista Docente | ✅ Operativa | Módulos, recursos, calificaciones |
| Vista Admin | ✅ Operativa | Dashboard, usuarios, cursos |
| Google Drive | 🔶 En progreso | Upload/download/delete vía GAS |
| Progreso y Avance | ✅ Funcional | Sincronización BD para lecciones y recursos (PDFs), sin localStorage en desarrollo/producción |
| Cloudinary | 🔶 En progreso | Manejo en base de datos; avatares y recursos con placeholders dinámicos de iniciales |
| Configuración de Cuenta | ✅ Funcional | Seguridad (Supabase Auth), Notificaciones por ID y Apariencia Visual integradas |
| Despliegue producción | ✅ Operativo | Desplegado en Vercel con variables de entorno configuradas (compilación exitosa tras fix de TypeScript) |
| Recuperación de clave | ✅ Funcional | Flujo completo de restablecimiento de contraseña integrado con Supabase Auth |
| Email Transaccional (Resend) | 🔶 En progreso | SMTP de Resend configurado en Supabase (Sandbox); pendiente verificar dominio para producción |

---

## 🚀 IMPLEMENTACIONES ACTUALES

### Google Drive / Recursos
- [x] `GoogleDriveGasService` implementado para upload y delete.
- [x] `UploadPdfUseCase` guarda `driveUrl` y `driveDownloadUrl` en Supabase.
- [x] `TeacherCourseResourcesScreen` utiliza `downloadUrl` real para descarga directa.
- [x] Corrección de eliminación: ya no usa `URLSearchParams`, envía JSON a GAS.
- [x] Descarga de recursos dispara `window.open(downloadUrl, '_blank')`.
- [x] Recursos `link` y `forum` quedan fuera de descarga directa.

### Recursos y UI
- [x] Listado de recursos en panel docente.
- [x] Botón de descarga integrado en el dropdown de cada recurso.
- [x] Eliminación de recursos con confirmación y fallback en UI.
- [x] Mapeo de recursos desde Supabase con metadata de Drive.

### Arquitectura y calidad
- [x] Clean Architecture aplicada en `src/modules/resources`.
- [x] Separación de casos de uso, repositorios e infraestructura.
- [x] Server Actions para operaciones seguras en el backend.
- [x] Verificación de TypeScript en la capa de recursos.

### Solicitudes de Curso ("Mis solicitudes" - Estudiantes)
- [x] Se añadió la opción "Mis solicitudes" en el menú de navegación lateral del estudiante.
- [x] Acciones del servidor `getStudentJoinRequests()` y `cancelJoinRequest(id)` implementadas en `joinRequestsActions.ts`.
- [x] Listado y cancelación interactiva de solicitudes desde `StudentRequestsScreen.tsx`.

### Notificaciones y Modal Confirmación (SuperAdmin y Profesores)
- [x] Migración `update_notifications_table.sql` para añadir soporte de comunicados por rol y prioridad.
- [x] Mapeo multi-rol de comunicados en el layout principal del dashboard.
- [x] Reemplazo de la confirmación nativa del navegador (`confirm()`) al eliminar estudiantes por una modal interactiva premium.

### Progreso y Avance del Curso (Estudiantes)
- [x] Desconexión total de `localStorage` para el registro del progreso en recursos y lecciones en producción y desarrollo.
- [x] Migración completa a Supabase (`student_resource_progress`) como única fuente de verdad.
- [x] Corrección de carga inicial automática no deseada del avance (17%) en nuevos alumnos matriculados.

### Configuración, Seguridad y Apariencia Visual
- [x] Soporte de Apariencia Visual (Tema Claro, Oscuro y Sincronizar con el Sistema) en la configuración del docente y estudiante, alternando reactivamente el Layout.
- [x] Seguridad real implementada con Supabase Auth (`supabase.auth.updateUser`) para el cambio de contraseñas.
- [x] Persistencia de las opciones del panel de notificaciones en el almacenamiento local bajo la ID del usuario correspondiente.
- [x] Corrección del error de consola en React ("An empty string was passed to the src attribute") al añadir fallbacks para avatares vacíos basados en la inicial del estudiante.

### Recuperación de Contraseña & Resend SMTP
- [x] Flujo de "Olvidar contraseña" completado de extremo a extremo: `/recovery` (solicitud) -> `/auth/callback` (intercambio de token) -> `/recovery/reset` (nueva contraseña).
- [x] Configuración de SMTP personalizado en Supabase Auth utilizando Resend para evitar el límite de 3 correos por hora.
- [x] Diseño de pantallas premium con orbes verdes y grid que heredan el estilo visual de aulaEnsuny.
- [x] Validaciones robustas con Zod para los formularios de restablecimiento de contraseña.

### Lógica de Matrículas y Asignación de Cursos
- [x] Se eliminó la lógica de "fallback" que autocompletaba las listas de estudiantes de un curso basándose únicamente en el `grade_level`.
- [x] Los dashboards del SuperAdmin y de los Docentes ahora reflejan estrictamente el número de estudiantes a partir de inscripciones formales en la tabla `student_courses`.
- [x] Los cursos nuevos inician con `0` estudiantes, resolviendo el problema visual de estudiantes "robados" de otros cursos.
- [x] Limpieza de código y resolución de error de compilación de TypeScript (`hasExplicitEnrollments`) en la vista del docente (`TeacherStudentsScreen`).

---

## ✅ CHECKLIST VIGENTE

### Alta prioridad
- [x] Corregir `ReferenceError: URLSearchParams is not defined` en delete Drive.
- [x] Implementar descarga real de archivos en `TeacherCourseResourcesScreen`.
- [ ] Validar flujo end-to-end: upload → preview → download → delete.
- [ ] Verificar `GOOGLE_DRIVE_GAS_URL` y `GOOGLE_DRIVE_SECURITY_TOKEN` en `.env.local`.
- [ ] Confirmar que el proxy Apps Script responde correctamente a POST JSON.

### Media prioridad
- [ ] Completar integración de Cloudinary para avatares e imágenes de curso.
- [ ] Auditar RLS y permisos en Supabase para `resources` y `forums`.
- [ ] Verificar experiencia de descarga en móviles y navegadores con bloqueadores.
- [ ] Revisar manejo de recursos `link` en listas de docentes y estudiantes.

### Baja prioridad
- [x] Configurar despliegue en Vercel con variables de entorno.
- [ ] Reemplazar imágenes placeholder de Unsplash con Cloudinary real.
- [ ] Probar la aplicación completa en móvil y tablet.
- [ ] Documentar el flujo de Google Drive y recursos en README interno.

---

## 🧭 PLAN DE TRABAJO — AUTOINSCRIPCIÓN A CURSOS

### Validación inicial
- La propuesta es viable y encaja con la arquitectura actual de Next.js App Router, módulos por dominio y el uso de Supabase + RLS.
- El proyecto ya cuenta con puntos de integración clave: tabla de cursos, tabla de matrículas via student_courses, panel docente de gestión de curso, tabla de notificaciones y flujo de autenticación con Supabase Auth.
- El trabajo principal no será construir la base desde cero, sino extender los módulos actuales con nuevas tablas, reglas de negocio y vistas para solicitud, aprobación y matrícula automática.

### Fases propuestas
1. Base de datos y seguridad
   - Crear la tabla course_join_requests.
   - Extender courses con join_code, join_enabled y require_teacher_approval.
   - Definir políticas RLS para estudiantes, docentes y admin.
   - Preparar la auditoría de acciones de solicitud, aprobación y rechazo.

2. Dominio y casos de uso
   - Modelar entidades para solicitud de ingreso, invitación y decisión de aprobación.
   - Implementar reglas de negocio: una solicitud activa por curso, no volver a solicitar si ya está matriculado, control por docente asignado y generación de códigos únicos.
   - Separar estas reglas en casos de uso claros bajo una estructura modular y escalable.

3. Infraestructura y backend
   - Crear repositorios para cursos, solicitudes y matrículas.
   - Implementar server actions para crear solicitud, aprobar, rechazar, regenerar código y consultar solicitudes pendientes.
   - Integrar notificaciones internas y eventos de auditoría.

4. Experiencia de estudiante
   - [x] Agregar la entrada “Mis solicitudes” y “Unirse a un curso” en el menú lateral del estudiante.
   - [x] Crear la vista para ingresar código de invitación y solicitar ingreso.
   - [x] Mostrar el listado completo de solicitudes, estados (activo/aprobado, pendiente, rechazado) y permitir la cancelación en tiempo real.

5. Experiencia de docente
   - Añadir una sección “Solicitudes de ingreso” dentro de la gestión del curso.
   - Mostrar datos del estudiante, fecha de solicitud y estado.
   - Permitir aprobar, rechazar y ver perfil desde un panel único.

6. Configuración del curso
   - Extender la configuración del curso con opciones de acceso: solicitudes habilitadas, invitación directa y aprobación manual o automática.
   - Añadir generación y regeneración de join_code desde la configuración.

7. QA y validación
   - Probar el flujo completo: solicitud → notificación docente → aprobación/rechazo → matrícula automática → acceso al curso.
   - Verificar permisos con RLS y asegurar que solo el docente del curso pueda gestionar solicitudes.

### Priorización recomendada
- Alta prioridad: base de datos, reglas de negocio y flujo de aprobación.
- Media prioridad: notificaciones y auditoría.
- Baja prioridad: opciones avanzadas de aprobación automática y mejoras de UX visual.

---

## 🔧 ESTADO DE INTEGRACIONES

### Supabase
- Conexión real establecida.
- Auth, perfiles, cursos, recursos y foros funcionando.
- RLS en revisión para garantizar permisos correctos.
- Se aplicó la migración de `course_join_requests` y columnas de acceso en cursos.
- Se ajustaron políticas de acceso para estudiantes, docentes y administración.

### Google Drive (Apps Script)
- Proxy GAS integrado en la app.
- Upload y delete en desarrollo final.
- Descarga local activada con `drive_download_url`.
- Requiere verificación de token y endpoint en entorno real.

### Cloudinary
- Todavía pendiente.
- Planeado para avatares, banners y recursos de imagen.

### Email transaccional
- [x] SMTP personalizado configurado con **Resend** en Supabase.
- [ ] Pendiente: Vincular y verificar el dominio institucional (ej. `ensuny.edu.co`) en Resend para permitir el envío de correos a cualquier dirección (actualmente en modo Sandbox restringido a `kevin.martinez@ensuny.edu.co`).

---

## 📌 NOTAS IMPORTANTES

- El proyecto correrá bajo el subdominio oficial solicitado: `https://aula.ensuny.edu.co`.
  * **Requisito**: Configurar `NEXT_PUBLIC_SITE_URL=https://aula.ensuny.edu.co` en las variables de entorno de producción.
  * **Requisito**: Registrar `https://aula.ensuny.edu.co/auth/callback` en la lista de *Redirect URLs* permitidas en la consola de Supabase Auth.
  * **Requisito**: Verificar el dominio `ensuny.edu.co` (o el subdominio `aula.ensuny.edu.co`) en Resend para autorizar envíos generales.
- Las descargas de recursos usan `drive_download_url` y, si no está disponible, hacen fallback a `drive_url`.
- La eliminación de Drive exige que el Apps Script acepte JSON y devuelva un JSON válido.
- El despliegue en producción se realizará cuando las integraciones externas estén validadas.
- Esta bitácora se centra en el estado actual de recursos/Drive y la lista de prioridades.
