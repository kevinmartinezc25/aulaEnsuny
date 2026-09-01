-- ============================================================
-- MÓDULO: Gestión y Trazabilidad de Novedades de Convivencia
-- aulaEnsuny — Script de creación de tablas + RLS + Storage
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 0. TABLA student_directory (Fase 0 - Directorio de estudiantes)
--    Estudiantes sin cuenta de usuario en el sistema.
--    Necesaria antes que disciplinary_reports.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_directory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  document_id      TEXT,
  grade_level      TEXT NOT NULL,
  group_name       TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
  -- Si el estudiante crea una cuenta, se vincula aquí
  profile_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Metadatos de importación
  import_source    TEXT,                         -- 'excel', 'csv', 'manual'
  academic_year    TEXT,                         -- '2025', '2026', etc.
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_dir_status
  ON public.student_directory(status);
CREATE INDEX IF NOT EXISTS idx_student_dir_grade
  ON public.student_directory(grade_level);
CREATE INDEX IF NOT EXISTS idx_student_dir_profile
  ON public.student_directory(profile_id);

-- RLS para student_directory
ALTER TABLE public.student_directory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_dir_admin_all" ON public.student_directory;
CREATE POLICY "student_dir_admin_all"
  ON public.student_directory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
        AND r.name IN ('admin', 'superadmin', 'teacher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
        AND r.name IN ('admin', 'superadmin', 'teacher')
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 1. CATÁLOGO DE SITUACIONES (Manual de Convivencia)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disciplinary_situations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,            -- Ej: "T1-03"
  type             TEXT NOT NULL                    -- 'Tipo I' | 'Tipo II' | 'Tipo III'
                     CHECK (type IN ('Tipo I', 'Tipo II', 'Tipo III')),
  title            TEXT NOT NULL,                   -- Nombre corto para el buscador
  description      TEXT NOT NULL,                   -- Descripción oficial del manual
  category         TEXT,                            -- Categoría temática (opcional)
  manual_reference TEXT,                            -- Ej: "Art. 34, Num. 2"
  active           BOOLEAN NOT NULL DEFAULT true,   -- Se puede desactivar sin borrar
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 2. REPORTES DISCIPLINARIOS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disciplinary_reports (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos del estudiante (snapshot en el momento del reporte)
  student_profile_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_directory_id    UUID REFERENCES public.student_directory(id) ON DELETE SET NULL,
  student_full_name       TEXT NOT NULL,
  student_document        TEXT,
  student_grade           TEXT NOT NULL,
  student_group           TEXT NOT NULL,

  -- Quién reporta
  teacher_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  teacher_name            TEXT NOT NULL,

  -- Situación (snapshot para garantizar trazabilidad histórica)
  situation_id            UUID REFERENCES public.disciplinary_situations(id) ON DELETE SET NULL,
  situation_snapshot      JSONB NOT NULL,  -- {code, type, title, description, manualReference}

  -- Contenido del reporte
  teacher_description     TEXT NOT NULL,   -- Observaciones del docente
  generated_report        TEXT NOT NULL,   -- Texto oficial generado automáticamente

  -- Firma
  student_signature_url   TEXT,            -- URL pública en Supabase Storage
  signature_confirmed     BOOLEAN NOT NULL DEFAULT false,

  -- Estado y trazabilidad
  status                  TEXT NOT NULL DEFAULT 'registered'
                            CHECK (status IN ('registered','reviewing','following','closed','archived')),

  -- Fecha/hora del evento
  report_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  report_time             TIME NOT NULL DEFAULT CURRENT_TIME,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ,
  deleted_by              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Al menos uno de los dos IDs debe estar presente
  CONSTRAINT student_ref_required CHECK (
    student_profile_id IS NOT NULL OR student_directory_id IS NOT NULL
  )
);

-- ──────────────────────────────────────────────────────────────
-- 3. HISTORIAL DE CAMBIOS DE ESTADO (Trazabilidad)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disciplinary_report_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID NOT NULL REFERENCES public.disciplinary_reports(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status      TEXT NOT NULL,
  changed_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  changed_by_name TEXT NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 4. ÍNDICES
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_disc_reports_teacher      ON public.disciplinary_reports(teacher_id);
CREATE INDEX IF NOT EXISTS idx_disc_reports_student_prof ON public.disciplinary_reports(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_disc_reports_student_dir  ON public.disciplinary_reports(student_directory_id);
CREATE INDEX IF NOT EXISTS idx_disc_reports_status       ON public.disciplinary_reports(status);
CREATE INDEX IF NOT EXISTS idx_disc_reports_date         ON public.disciplinary_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_disc_history_report       ON public.disciplinary_report_history(report_id);
CREATE INDEX IF NOT EXISTS idx_disc_situations_type      ON public.disciplinary_situations(type);
CREATE INDEX IF NOT EXISTS idx_disc_situations_active    ON public.disciplinary_situations(active);

-- ──────────────────────────────────────────────────────────────
-- 5. TRIGGER: updated_at automático
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_dir_updated_at ON public.student_directory;
CREATE TRIGGER trg_student_dir_updated_at
  BEFORE UPDATE ON public.student_directory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_disc_situations_updated_at ON public.disciplinary_situations;
CREATE TRIGGER trg_disc_situations_updated_at
  BEFORE UPDATE ON public.disciplinary_situations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_disc_reports_updated_at ON public.disciplinary_reports;
CREATE TRIGGER trg_disc_reports_updated_at
  BEFORE UPDATE ON public.disciplinary_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.disciplinary_situations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_report_history ENABLE ROW LEVEL SECURITY;

-- ── 6a. disciplinary_situations ──────────────────────────────

-- Todos los usuarios autenticados pueden leer situaciones activas
DROP POLICY IF EXISTS "situations_read_active" ON public.disciplinary_situations;
CREATE POLICY "situations_read_active"
  ON public.disciplinary_situations FOR SELECT
  TO authenticated
  USING (active = true);

-- Solo admin/superadmin ven todas y pueden modificar
DROP POLICY IF EXISTS "situations_admin_all" ON public.disciplinary_situations;
CREATE POLICY "situations_admin_all"
  ON public.disciplinary_situations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    )
  );

-- ── 6b. disciplinary_reports ─────────────────────────────────

-- Docentes: ver y crear sus propios reportes
DROP POLICY IF EXISTS "reports_teacher_select" ON public.disciplinary_reports;
CREATE POLICY "reports_teacher_select"
  ON public.disciplinary_reports FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "reports_teacher_insert" ON public.disciplinary_reports;
CREATE POLICY "reports_teacher_insert"
  ON public.disciplinary_reports FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = auth.uid());

-- Admin/superadmin: acceso total
DROP POLICY IF EXISTS "reports_admin_all" ON public.disciplinary_reports;
CREATE POLICY "reports_admin_all"
  ON public.disciplinary_reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    )
  );

-- ── 6c. disciplinary_report_history ──────────────────────────

-- Docentes: ver el historial de sus propios reportes
DROP POLICY IF EXISTS "history_teacher_select" ON public.disciplinary_report_history;
CREATE POLICY "history_teacher_select"
  ON public.disciplinary_report_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disciplinary_reports dr
      WHERE dr.id = report_id
        AND dr.teacher_id = auth.uid()
    )
  );

-- Admin/superadmin: acceso total al historial
DROP POLICY IF EXISTS "history_admin_all" ON public.disciplinary_report_history;
CREATE POLICY "history_admin_all"
  ON public.disciplinary_report_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 7. STORAGE BUCKET: signatures
-- ──────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signatures',
  'signatures',
  true,
  524288,  -- 512 KB
  ARRAY['image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "signatures_upload" ON storage.objects;
CREATE POLICY "signatures_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'signatures');

DROP POLICY IF EXISTS "signatures_read_public" ON storage.objects;
CREATE POLICY "signatures_read_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'signatures');

-- ──────────────────────────────────────────────────────────────
-- 8. VERIFICACIÓN FINAL
-- ──────────────────────────────────────────────────────────────
SELECT 'student_directory'           AS tabla, COUNT(*) AS filas FROM public.student_directory
UNION ALL
SELECT 'disciplinary_situations'     AS tabla, COUNT(*) AS filas FROM public.disciplinary_situations
UNION ALL
SELECT 'disciplinary_reports'        AS tabla, COUNT(*) AS filas FROM public.disciplinary_reports
UNION ALL
SELECT 'disciplinary_report_history' AS tabla, COUNT(*) AS filas FROM public.disciplinary_report_history;
