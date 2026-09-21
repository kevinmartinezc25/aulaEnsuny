-- ==============================================================================
-- FASE 1 & 2: BACKUP, TABLAS MAESTRAS Y VISTAS PARA EL NUEVO MÓDULO DE HORARIOS
-- ==============================================================================
-- Este script realiza las modificaciones estructurales para que el módulo
-- de horarios funcione basado en la importación de XML como Master Data.
-- ==============================================================================

-- 1. BACKUP DE SEGURIDAD (Opcional, pero recomendado)
CREATE TABLE IF NOT EXISTS backup_sch_groups AS SELECT * FROM sch_groups;
CREATE TABLE IF NOT EXISTS backup_sch_subjects AS SELECT * FROM sch_subjects;
CREATE TABLE IF NOT EXISTS backup_sch_schedule_slots AS SELECT * FROM sch_schedule_slots;

-- 2. TABLA DE AUDITORÍA Y CONTROL DE VERSIONES XML
CREATE TABLE IF NOT EXISTS academic_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_hash TEXT,
    version INT NOT NULL DEFAULT 1,
    uploaded_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL CHECK (status IN ('BORRADOR', 'VALIDADO', 'PUBLICADO', 'ARCHIVADO')),
    records_detected JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para academic_imports
ALTER TABLE academic_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can full access academic_imports" ON academic_imports FOR ALL USING (true); -- Ajusta según roles reales

-- 3. ACTUALIZACIÓN DE ENTIDADES EXISTENTES (Añadir external_id para UPSERT)
ALTER TABLE sch_subjects 
ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE sch_groups 
ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. TABLA INTERMEDIA DE DOCENTES ACADÉMICOS
-- Relaciona el "Docente del XML" con el "Perfil real de AulaEnsuny"
CREATE TABLE IF NOT EXISTS academic_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id), -- Vinculado al perfil autenticado
    external_id TEXT UNIQUE NOT NULL,        -- ID del XML
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academic_teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read academic_teachers" ON academic_teachers FOR SELECT USING (true);

-- 5. TABLA CENTRAL DE CARGA ACADÉMICA
-- Esta es la fuente de verdad. El horario y convivencia consumen de aquí.
CREATE TABLE IF NOT EXISTS academic_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID REFERENCES academic_imports(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES academic_teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES sch_subjects(id) ON DELETE CASCADE,
    group_id UUID REFERENCES sch_groups(id) ON DELETE CASCADE,
    external_id TEXT, -- ID de la lección en el XML
    hours_per_week INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academic_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read academic_assignments" ON academic_assignments FOR SELECT USING (true);

-- 6. ACTUALIZACIÓN DE SLOTS HORARIOS (Vincularlos al Master Data)
ALTER TABLE sch_schedule_slots
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES academic_assignments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES academic_imports(id) ON DELETE CASCADE;

-- 7. CREACIÓN DE VISTAS (Views) PARA EL FRONTEND
-- Vista 1: Carga Académica de Docentes
CREATE OR REPLACE VIEW v_teacher_academic_load AS
SELECT 
    aa.id as assignment_id,
    t.id as teacher_id,
    t.profile_id,
    t.full_name as teacher_name,
    s.id as subject_id,
    s.name as subject_name,
    g.id as group_id,
    g.name as group_name,
    aa.hours_per_week
FROM academic_assignments aa
JOIN academic_teachers t ON aa.teacher_id = t.id
JOIN sch_subjects s ON aa.subject_id = s.id
JOIN sch_groups g ON aa.group_id = g.id
WHERE t.is_active = true;

-- Vista 2: Grupos asignados a docentes (Ideal para Convivencia)
CREATE OR REPLACE VIEW v_teacher_groups AS
SELECT DISTINCT
    t.id as teacher_id,
    t.profile_id,
    g.id as group_id,
    g.name as group_name
FROM academic_assignments aa
JOIN academic_teachers t ON aa.teacher_id = t.id
JOIN sch_groups g ON aa.group_id = g.id
WHERE t.is_active = true;

-- 8. DEPRECACIÓN DE TABLAS DE REGLAS (Opcional por ahora)
COMMENT ON TABLE sch_constraints IS 'DEPRECATED: Módulo de generación reemplazado por XML Import.';
