-- ============================================================
-- MIGRACIÓN: Módulo de Solicitud de Permisos para Docentes
-- aulaEnsuny — Proceso Institucional Digital y Trazable
-- ============================================================
-- Tablas:
--   1. permission_types             — Catálogo configurable por el Administrador
--   2. permission_requests          — Registro principal de solicitudes
--   3. permission_request_history  — Línea de tiempo y trazabilidad inmutable
-- ============================================================

-- 1. Catálogo de tipos de permiso institucional
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permission_types (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 VARCHAR(50) UNIQUE NOT NULL,       -- Ej: 'CALAMIDAD', 'CITA_MEDICA', 'PERSONAL'
  name                 VARCHAR(150) NOT NULL,              -- Nombre visible
  description          TEXT,                               -- Orientación al docente
  requires_attachment  BOOLEAN DEFAULT FALSE NOT NULL,     -- ¿Exige soporte documental obligatorio?
  affects_classes      BOOLEAN DEFAULT TRUE NOT NULL,      -- ¿Por defecto suele afectar jornada?
  active               BOOLEAN DEFAULT TRUE NOT NULL,      -- Activo para solicitudes
  sort_order           INT DEFAULT 0 NOT NULL,             -- Orden de visualización
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_perm_types_active 
  ON public.permission_types(active, sort_order);

-- 2. Secuencia para número de solicitud consecutivo (PER-YYYY-XXXX)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.seq_permission_request_number START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_permission_request_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_val BIGINT;
  formatted_num TEXT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  next_val := nextval('public.seq_permission_request_number');
  formatted_num := 'PER-' || current_year || '-' || lpad(next_val::TEXT, 4, '0');
  RETURN formatted_num;
END;
$$ LANGUAGE plpgsql;

-- 3. Tabla principal de solicitudes de permisos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permission_requests (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number            VARCHAR(30) UNIQUE NOT NULL DEFAULT public.generate_permission_request_number(),

  -- ── Docente Solicitante ─────────────────────────────────────
  teacher_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  teacher_snapshot          JSONB NOT NULL DEFAULT '{}'::jsonb, 
  -- Contiene snapshot inmutable: { full_name, email, document, role, campus, main_subject, phone }

  -- ── Clasificación del Permiso ──────────────────────────────
  type_id                   UUID NOT NULL REFERENCES public.permission_types(id) ON DELETE RESTRICT,
  type_snapshot             JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Contiene snapshot: { code, name, requires_attachment, affects_classes }

  -- ── Fechas y Horario ────────────────────────────────────────
  start_date                DATE NOT NULL,
  end_date                  DATE NOT NULL,
  is_full_day               BOOLEAN DEFAULT TRUE NOT NULL,
  start_time                TIME,                                -- Requerido si is_full_day = false
  end_time                  TIME,                                -- Requerido si is_full_day = false

  -- ── Motivo / Justificación ──────────────────────────────────
  reason                    TEXT NOT NULL,

  -- ── Soportes Adjuntos ───────────────────────────────────────
  attachment_url            TEXT,                                -- URL en Storage o Drive
  attachment_name           TEXT,
  attachment_type           VARCHAR(50),                         -- 'pdf', 'image', 'doc', etc.

  -- ── Impacto Académico ───────────────────────────────────────
  affects_academic_duty     BOOLEAN DEFAULT FALSE NOT NULL,
  academic_impact           JSONB DEFAULT '[]'::jsonb NOT NULL,
  -- Array de objetos: [{ date, start_time, end_time, course_id, course_name, grade_group, subject, hours_count }]

  -- ── Plan de Contingencia Académica ──────────────────────────
  leaves_student_activities BOOLEAN DEFAULT FALSE NOT NULL,
  student_activities        JSONB DEFAULT '[]'::jsonb NOT NULL,
  -- Array: [{ title, course_id, course_name, group_name, instructions, resources_links }]

  -- ── Gestión de Cobertura (Coordinación Académica) ───────────
  coverage_plan             JSONB DEFAULT '[]'::jsonb NOT NULL,
  -- Array: [{ academic_item_index, group_name, subject, period_or_time, substitute_teacher_id, substitute_teacher_name, observations }]

  -- ── Estado y Trazabilidad de Aprobaciones ───────────────────
  status                    VARCHAR(40) DEFAULT 'submitted' NOT NULL
    CHECK (status IN (
      'draft',
      'submitted',
      'reviewing_rector',
      'approved_rector',
      'reviewing_coordinator',
      'approved',
      'rejected',
      'returned_correction',
      'cancelled'
    )),

  -- Rectoría
  rector_id                 UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rector_approval_date      TIMESTAMP WITH TIME ZONE,
  rector_notes              TEXT,

  -- Coordinación Académica
  coordinator_id            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  coordinator_approval_date TIMESTAMP WITH TIME ZONE,
  coordinator_notes          TEXT,

  -- Justificaciones de Rechazo o Devolución
  rejection_reason          TEXT,
  correction_notes          TEXT,

  -- Código de verificación único para validación pública / constancia PDF
  verification_code         VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Fechas de auditoría
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de consulta eficiente
CREATE INDEX IF NOT EXISTS idx_perm_requests_teacher 
  ON public.permission_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_perm_requests_status 
  ON public.permission_requests(status);
CREATE INDEX IF NOT EXISTS idx_perm_requests_dates 
  ON public.permission_requests(start_date DESC, end_date DESC);
CREATE INDEX IF NOT EXISTS idx_perm_requests_req_num 
  ON public.permission_requests(request_number);

-- 4. Historial de eventos y transiciones (Línea de tiempo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permission_request_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.permission_requests(id) ON DELETE CASCADE,
  changed_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action          VARCHAR(50) NOT NULL,
  -- 'created', 'submitted', 'rector_opened', 'rector_approved', 'rector_rejected', 'rector_returned',
  -- 'resubmitted', 'coord_opened', 'coord_coverage_set', 'coord_approved', 'coord_rejected', 'cancelled'
  from_status     VARCHAR(40),
  to_status       VARCHAR(40) NOT NULL,
  notes           TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_perm_history_request 
  ON public.permission_request_history(request_id, created_at ASC);

-- 5. Triggers para updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_permission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_perm_types_update ON public.permission_types;
CREATE TRIGGER on_perm_types_update
  BEFORE UPDATE ON public.permission_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_permission_updated_at();

DROP TRIGGER IF EXISTS on_perm_requests_update ON public.permission_requests;
CREATE TRIGGER on_perm_requests_update
  BEFORE UPDATE ON public.permission_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_permission_updated_at();

-- 6. Semillero de Tipos de Permisos por Defecto
-- ============================================================
INSERT INTO public.permission_types (code, name, description, requires_attachment, affects_classes, sort_order)
VALUES
  ('CALAMIDAD', 'Calamidad doméstica', 'Grave suceso familiar o doméstico que afecta al docente.', false, true, 1),
  ('CITA_MEDICA', 'Cita médica', 'Atención médica o especializada programada EPS o medicina prepagada.', true, true, 2),
  ('CITA_ODONTOLOGICA', 'Cita odontológica', 'Consulta o procedimiento odontológico programado.', true, true, 3),
  ('INCAPACIDAD', 'Incapacidad médica', 'Incapacidad expedida por la EPS o médico tratante.', true, true, 4),
  ('ASUNTO_PERSONAL', 'Asunto personal', 'Diligencia o compromiso de índole estrictamente particular.', false, true, 5),
  ('CAPACITACION', 'Capacitación académica', 'Eventos, cursos o talleres de formación y cualificación docente.', true, true, 6),
  ('REPRESENTACION', 'Representación institucional', 'Comisión o representación oficial en nombre de la Normal Superior.', true, true, 7),
  ('LICENCIA', 'Licencia reglamentaria', 'Licencias contempladas en la normativa laboral y estatuto docente.', true, true, 8),
  ('OTRO', 'Otro tipo de permiso', 'Otro motivo justificado no listado anteriormente.', false, true, 9)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  requires_attachment = EXCLUDED.requires_attachment,
  affects_classes = EXCLUDED.affects_classes,
  sort_order = EXCLUDED.sort_order;

-- 7. Registro del módulo en admin_module_permissions
-- ============================================================
INSERT INTO public.admin_module_permissions (module_key, module_name, is_enabled)
VALUES ('permissions', 'Permisos Docentes', true)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  is_enabled = true;

-- 8. Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.permission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_request_history ENABLE ROW LEVEL SECURITY;

-- ── permission_types: todos pueden leer activos, admin gestiona ─────
DROP POLICY IF EXISTS "Lectura de tipos de permisos" ON public.permission_types;
CREATE POLICY "Lectura de tipos de permisos"
  ON public.permission_types FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin gestiona tipos de permisos" ON public.permission_types;
CREATE POLICY "Admin gestiona tipos de permisos"
  ON public.permission_types FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
    )
  );

-- ── permission_requests ──────────────────────────────────────────
-- Docente: Puede ver sus propias solicitudes
DROP POLICY IF EXISTS "Docente ve sus propias solicitudes" ON public.permission_requests;
CREATE POLICY "Docente ve sus propias solicitudes"
  ON public.permission_requests FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
    )
  );

-- Docente: Puede crear sus solicitudes
DROP POLICY IF EXISTS "Docente crea sus solicitudes" ON public.permission_requests;
CREATE POLICY "Docente crea sus solicitudes"
  ON public.permission_requests FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid());

-- Docente y Admin: Actualizar solicitud según estado
DROP POLICY IF EXISTS "Actualización de solicitudes según rol" ON public.permission_requests;
CREATE POLICY "Actualización de solicitudes según rol"
  ON public.permission_requests FOR UPDATE TO authenticated
  USING (
    -- El docente puede actualizar si está en borrador o devuelta para corrección o cancelarla
    (teacher_id = auth.uid() AND status IN ('draft', 'returned_correction', 'submitted')) OR
    -- Los directivos/administradores pueden gestionar cualquier solicitud
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
    )
  );

-- ── permission_request_history ──────────────────────────────────
DROP POLICY IF EXISTS "Lectura de historial de permisos" ON public.permission_request_history;
CREATE POLICY "Lectura de historial de permisos"
  ON public.permission_request_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.permission_requests pr
      WHERE pr.id = permission_request_history.request_id AND (
        pr.teacher_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.roles r ON p.role_id = r.id
          WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Creación de eventos de historial" ON public.permission_request_history;
CREATE POLICY "Creación de eventos de historial"
  ON public.permission_request_history FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());
