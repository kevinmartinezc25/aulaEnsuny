-- ============================================================
-- MIGRACIÓN: Directorio de Estudiantes (student_directory)
-- aulaEnsuny — Módulo de Convivencia
-- ============================================================
-- Propósito: Almacenar el padrón estudiantil completo de la institución
-- independientemente de si el estudiante tiene cuenta en Supabase Auth.
-- Esto permite al módulo de Convivencia buscar cualquier estudiante.
-- ============================================================

-- 1. Tabla principal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_directory (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  document_id   VARCHAR(50),                    -- Cédula/TI (opcional, único si se provee)
  grade_level   VARCHAR(50) NOT NULL,           -- Ej. '10°'
  group_name    VARCHAR(50) NOT NULL,           -- Ej. '2' o 'A'
  email         TEXT,                           -- Email institucional (opcional)
  status        VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  -- Trazabilidad de importación
  imported_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  imported_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Vínculo opcional con perfil de Auth (si el estudiante crea cuenta)
  profile_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices
-- ============================================================
-- Único por documento (solo donde se proporcionó)
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_directory_doc_unique
  ON public.student_directory(document_id)
  WHERE document_id IS NOT NULL AND document_id != '';

-- Búsqueda por grado y grupo (filtros frecuentes)
CREATE INDEX IF NOT EXISTS idx_student_directory_grade_group
  ON public.student_directory(grade_level, group_name);

-- Búsqueda por nombre (para el buscador del módulo)
CREATE INDEX IF NOT EXISTS idx_student_directory_name
  ON public.student_directory(last_name, first_name);

-- Vínculo con perfil Auth
CREATE INDEX IF NOT EXISTS idx_student_directory_profile
  ON public.student_directory(profile_id)
  WHERE profile_id IS NOT NULL;

-- 3. Trigger: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_student_directory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_student_directory_update ON public.student_directory;
CREATE TRIGGER on_student_directory_update
  BEFORE UPDATE ON public.student_directory
  FOR EACH ROW EXECUTE FUNCTION public.handle_student_directory_updated_at();

-- 4. Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.student_directory ENABLE ROW LEVEL SECURITY;

-- Admin y superadmin: acceso total
DROP POLICY IF EXISTS "Admin gestiona directorio de estudiantes" ON public.student_directory;
CREATE POLICY "Admin gestiona directorio de estudiantes"
  ON public.student_directory
  FOR ALL
  TO authenticated
  USING (public.get_current_user_role() IN ('admin', 'superadmin'))
  WITH CHECK (public.get_current_user_role() IN ('admin', 'superadmin'));

-- Docente: solo lectura (para búsqueda en formulario de novedad)
DROP POLICY IF EXISTS "Docente lee directorio de estudiantes" ON public.student_directory;
CREATE POLICY "Docente lee directorio de estudiantes"
  ON public.student_directory
  FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() = 'teacher');
