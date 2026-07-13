# 📓 Bitácora de Desarrollo — aulaEnsuny LMS

**Proyecto:** aulaEnsuny — Plataforma LMS Educativa para Colegios
**Stack:** Next.js · TypeScript · Supabase · Tailwind CSS · Framer Motion · Recharts
**Última actualización:** 13 de julio de 2026

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
| Cloudinary | ⚪ Pendiente | Integración por implementar |
| Despliegue producción | ❌ Pendiente | Vercel no configurado |

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
- [ ] Configurar despliegue en Vercel con variables de entorno.
- [ ] Reemplazar imágenes placeholder de Unsplash con Cloudinary real.
- [ ] Probar la aplicación completa en móvil y tablet.
- [ ] Documentar el flujo de Google Drive y recursos en README interno.

---

## 🔧 ESTADO DE INTEGRACIONES

### Supabase
- Conexión real establecida.
- Auth, perfiles, cursos, recursos y foros funcionando.
- RLS en revisión para garantizar permisos correctos.

### Google Drive (Apps Script)
- Proxy GAS integrado en la app.
- Upload y delete en desarrollo final.
- Descarga local activada con `drive_download_url`.
- Requiere verificación de token y endpoint en entorno real.

### Cloudinary
- Todavía pendiente.
- Planeado para avatares, banners y recursos de imagen.

### Email transaccional
- Pendiente.
- Recomendado: Resend.

---

## 📌 NOTAS IMPORTANTES

- Las descargas de recursos usan `drive_download_url` y, si no está disponible, hacen fallback a `drive_url`.
- La eliminación de Drive exige que el Apps Script acepte JSON y devuelva un JSON válido.
- El despliegue en producción se realizará cuando las integraciones externas estén validadas.
- Esta bitácora se centra en el estado actual de recursos/Drive y la lista de prioridades.
