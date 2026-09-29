-- ============================================================
-- MIGRACIÓN: Módulo de Convivencia Escolar
-- aulaEnsuny — Gestión y Trazabilidad de Novedades
-- ============================================================
-- Tablas:
--   1. disciplinary_situations  — catálogo institucional configurable por admin
--   2. disciplinary_reports     — registro principal de novedades
--   3. disciplinary_report_history — trazabilidad de cambios de estado
-- ============================================================

-- 1. Catálogo institucional de situaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS public.disciplinary_situations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(20) NOT NULL,               -- Ej. 'T2-001'
  type             VARCHAR(20) NOT NULL                 -- 'Tipo I' | 'Tipo II' | 'Tipo III'
                     CHECK (type IN ('Tipo I', 'Tipo II', 'Tipo III')),
  title            TEXT NOT NULL,                       -- Nombre corto de la situación
  description      TEXT NOT NULL,                       -- Descripción oficial del Manual de Convivencia
  category         VARCHAR(100),                        -- Categoría temática (opcional)
  manual_reference TEXT,                               -- Artículo/página del Manual (opcional)
  active           BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order       INT DEFAULT 0,                       -- Orden de visualización en el catálogo
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disc_situations_type
  ON public.disciplinary_situations(type) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_disc_situations_active
  ON public.disciplinary_situations(active, sort_order);

-- 2. Reportes de novedad (registro principal)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.disciplinary_reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ── Quién registra ────────────────────────────────────────
  teacher_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- ── Sobre quién (snapshot + referencia) ──────────────────
  -- El estudiante puede venir de profiles (con cuenta) o student_directory (sin cuenta)
  student_profile_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_directory_id  UUID REFERENCES public.student_directory(id) ON DELETE SET NULL,
  -- Snapshot inmutable: se guarda aunque el perfil cambie
  student_full_name     TEXT NOT NULL,
  student_document      TEXT,
  student_grade         VARCHAR(50) NOT NULL,
  student_group         VARCHAR(50) NOT NULL,

  -- ── Situación (snapshot + referencia) ────────────────────
  situation_id          UUID NOT NULL REFERENCES public.disciplinary_situations(id) ON DELETE RESTRICT,
  situation_snapshot    JSONB NOT NULL,
  -- Guarda: { code, type, title, description, manual_reference }
  -- Protege el reporte si la situación se edita posteriormente

  -- ── Narrativa del docente ─────────────────────────────────
  teacher_description   TEXT NOT NULL,
  generated_report      TEXT NOT NULL,   -- Texto final generado automáticamente por el sistema

  -- ── Firma manuscrita ──────────────────────────────────────
  student_signature_url TEXT,            -- URL en Supabase Storage bucket 'signatures'
  signature_confirmed   BOOLEAN DEFAULT FALSE NOT NULL,

  -- ── Estado y trazabilidad ─────────────────────────────────
  status VARCHAR(30) DEFAULT 'registered' NOT NULL
    CHECK (status IN ('registered', 'reviewing', 'following', 'closed', 'archived')),

  report_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  report_time           TIME NOT NULL DEFAULT CURRENT_TIME,

  -- Eliminación lógica: nunca borrar físicamente un reporte institucional
  deleted_at            TIMESTAMP WITH TIME ZONE,
  deleted_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- El estudiante debe estar referenciado desde al menos una fuente
  CONSTRAINT chk_student_source CHECK (
    student_profile_id IS NOT NULL OR student_directory_id IS NOT NULL
  )
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_disc_reports_teacher
  ON public.disciplinary_reports(teacher_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_disc_reports_profile
  ON public.disciplinary_reports(student_profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_disc_reports_directory
  ON public.disciplinary_reports(student_directory_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_disc_reports_status
  ON public.disciplinary_reports(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_disc_reports_date
  ON public.disciplinary_reports(report_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_disc_reports_situation
  ON public.disciplinary_reports(situation_id);

-- 3. Historial de cambios de estado (trazabilidad completa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.disciplinary_report_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id   UUID NOT NULL REFERENCES public.disciplinary_reports(id) ON DELETE CASCADE,
  changed_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  old_status  VARCHAR(30),
  new_status  VARCHAR(30) NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disc_history_report
  ON public.disciplinary_report_history(report_id, created_at DESC);

-- 4. Triggers para updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_disciplinary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_disc_situations_update ON public.disciplinary_situations;
CREATE TRIGGER on_disc_situations_update
  BEFORE UPDATE ON public.disciplinary_situations
  FOR EACH ROW EXECUTE FUNCTION public.handle_disciplinary_updated_at();

DROP TRIGGER IF EXISTS on_disc_reports_update ON public.disciplinary_reports;
CREATE TRIGGER on_disc_reports_update
  BEFORE UPDATE ON public.disciplinary_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_disciplinary_updated_at();

-- 5. Row Level Security (RLS)
-- ============================================================

-- ── disciplinary_situations ──────────────────────────────────
ALTER TABLE public.disciplinary_situations ENABLE ROW LEVEL SECURITY;

-- Docentes y admins: leer situaciones activas
DROP POLICY IF EXISTS "Leer situaciones activas" ON public.disciplinary_situations;
CREATE POLICY "Leer situaciones activas"
  ON public.disciplinary_situations
  FOR SELECT TO authenticated
  USING (active = TRUE);

-- Admin: gestión completa del catálogo (incluye inactivos)
DROP POLICY IF EXISTS "Admin gestiona catálogo de situaciones" ON public.disciplinary_situations;
CREATE POLICY "Admin gestiona catálogo de situaciones"
  ON public.disciplinary_situations
  FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin', 'superadmin'))
  WITH CHECK (public.get_current_user_role() IN ('admin', 'superadmin'));

-- ── disciplinary_reports ──────────────────────────────────────
ALTER TABLE public.disciplinary_reports ENABLE ROW LEVEL SECURITY;

-- Docente: ve solo sus reportes no eliminados
DROP POLICY IF EXISTS "Docente ve sus reportes" ON public.disciplinary_reports;
CREATE POLICY "Docente ve sus reportes"
  ON public.disciplinary_reports
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() AND deleted_at IS NULL);

-- Docente: crear reportes (solo como teacher_id propio)
DROP POLICY IF EXISTS "Docente crea reportes" ON public.disciplinary_reports;
CREATE POLICY "Docente crea reportes"
  ON public.disciplinary_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND
    public.get_current_user_role() = 'teacher'
  );

-- Docente: actualizar SOLO el campo de firma (antes de guardar definitivamente)
DROP POLICY IF EXISTS "Docente actualiza firma" ON public.disciplinary_reports;
CREATE POLICY "Docente actualiza firma"
  ON public.disciplinary_reports
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() AND status = 'registered');

-- Admin: ver TODOS los reportes (incluye eliminados lógicamente para auditoría)
DROP POLICY IF EXISTS "Admin ve todos los reportes" ON public.disciplinary_reports;
CREATE POLICY "Admin ve todos los reportes"
  ON public.disciplinary_reports
  FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin', 'superadmin'));

-- Admin: actualizar estado y datos del reporte
DROP POLICY IF EXISTS "Admin actualiza reportes" ON public.disciplinary_reports;
CREATE POLICY "Admin actualiza reportes"
  ON public.disciplinary_reports
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() IN ('admin', 'superadmin'))
  WITH CHECK (public.get_current_user_role() IN ('admin', 'superadmin'));

-- ── disciplinary_report_history ───────────────────────────────
ALTER TABLE public.disciplinary_report_history ENABLE ROW LEVEL SECURITY;

-- Docente: leer historial de sus propios reportes
DROP POLICY IF EXISTS "Leer historial de reportes propios" ON public.disciplinary_report_history;
CREATE POLICY "Leer historial de reportes propios"
  ON public.disciplinary_report_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disciplinary_reports r
      WHERE r.id = report_id
        AND (
          r.teacher_id = auth.uid()
          OR public.get_current_user_role() IN ('admin', 'superadmin')
        )
    )
  );

-- Usuarios autenticados pueden insertar historial (el control real es en la Server Action)
DROP POLICY IF EXISTS "Insertar historial" ON public.disciplinary_report_history;
CREATE POLICY "Insertar historial"
  ON public.disciplinary_report_history
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- 6. Storage: bucket 'signatures' para firmas manuscritas
-- ============================================================
-- NOTA: Ejecutar en Supabase Dashboard > Storage > New bucket
-- Nombre: signatures
-- Public: false
-- Max file size: 2MB
-- Allowed MIME types: image/png, image/jpeg, image/webp
--
-- O ejecutar via Supabase Management API si se prefiere automatizar.
-- Las instrucciones de creación de bucket via SQL son:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signatures',
  'signatures',
  false,
  2097152,  -- 2MB en bytes
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS para bucket 'signatures'
CREATE POLICY "Docente sube firmas propias"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'signatures' AND
    public.get_current_user_role() IN ('teacher', 'admin', 'superadmin')
  );

CREATE POLICY "Autenticados leen firmas"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'signatures');

CREATE POLICY "Admin elimina firmas"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'signatures' AND
    public.get_current_user_role() IN ('admin', 'superadmin')
  );
