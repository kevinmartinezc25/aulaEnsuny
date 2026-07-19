-- ============================================================
-- SCRIPT DE DIAGNÓSTICO Y REPARACIÓN
-- Centro de Documentación Académica — aulaEnsuny
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
-- Este script es IDEMPOTENTE: se puede ejecutar múltiples veces sin errores.
-- Ejecuta PASO A PASO y revisa los resultados de cada sección.

-- ============================================================
-- PASO 1: VERIFICAR SI LAS TABLAS EXISTEN
-- ============================================================
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('doc_folders', 'documents', 'doc_tags', 'document_tag_relations', 'doc_activity_logs')
ORDER BY table_name;

-- ============================================================
-- PASO 2: CREAR TABLAS SI NO EXISTEN
-- ============================================================

-- 2a. Carpetas con jerarquía ilimitada (árbol auto-referencial)
CREATE TABLE IF NOT EXISTS doc_folders (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    parent_id   UUID REFERENCES doc_folders(id) ON DELETE CASCADE,
    created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_doc_folders_parent ON doc_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_doc_folders_created_by ON doc_folders(created_by);

-- 2b. Tabla de documentos (si no existe con el schema nuevo)
CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(500) NOT NULL,
    slug            VARCHAR(600) UNIQUE,
    content         TEXT NOT NULL DEFAULT '',
    content_html    TEXT,
    folder_id       UUID REFERENCES doc_folders(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    public_token    VARCHAR(128) UNIQUE,
    created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    last_edited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    cover_image_url TEXT,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- 2c. Columnas adicionales para Google Drive (si no existen)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drive_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_label VARCHAR(20) DEFAULT '1.0';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;

-- 2d. Etiquetas globales
CREATE TABLE IF NOT EXISTS doc_tags (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(100) UNIQUE NOT NULL,
    color      VARCHAR(20) DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2e. Relación M-N Documentos <-> Etiquetas
CREATE TABLE IF NOT EXISTS document_tag_relations (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES doc_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_doc_tag_relations_tag ON document_tag_relations(tag_id);

-- 2f. Logs de actividad
CREATE TABLE IF NOT EXISTS doc_activity_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_doc_activity_logs_created_at ON doc_activity_logs(created_at DESC);

-- ============================================================
-- PASO 3: HABILITAR RLS Y CREAR POLÍTICAS (IDEMPOTENTE)
-- ============================================================

-- doc_folders RLS
ALTER TABLE doc_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos autenticados ven carpetas" ON doc_folders;
CREATE POLICY "Todos autenticados ven carpetas"
    ON doc_folders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Publico puede ver carpetas" ON doc_folders;
CREATE POLICY "Publico puede ver carpetas"
    ON doc_folders FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Admin y docentes crean carpetas" ON doc_folders;
CREATE POLICY "Admin y docentes crean carpetas"
    ON doc_folders FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher')
        )
    );

DROP POLICY IF EXISTS "Admin y docentes actualizan sus carpetas" ON doc_folders;
CREATE POLICY "Admin y docentes actualizan sus carpetas"
    ON doc_folders FOR UPDATE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'admin')
    );

DROP POLICY IF EXISTS "Admin y creador eliminan carpetas" ON doc_folders;
CREATE POLICY "Admin y creador eliminan carpetas"
    ON doc_folders FOR DELETE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'admin')
    );

-- documents RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin ve todos los documentos" ON documents;
CREATE POLICY "Admin ve todos los documentos"
    ON documents FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'admin')
    );

DROP POLICY IF EXISTS "Docentes ven sus docs y los publicados" ON documents;
CREATE POLICY "Docentes ven sus docs y los publicados"
    ON documents FOR SELECT TO authenticated
    USING (
        auth.uid() = created_by OR status = 'published' OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'teacher')
    );

DROP POLICY IF EXISTS "Estudiantes ven solo publicados" ON documents;
CREATE POLICY "Estudiantes ven solo publicados"
    ON documents FOR SELECT TO authenticated
    USING (
        status = 'published' OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher'))
    );

DROP POLICY IF EXISTS "Publico ve documentos publicados" ON documents;
CREATE POLICY "Publico ve documentos publicados"
    ON documents FOR SELECT TO anon
    USING (status = 'published');

DROP POLICY IF EXISTS "Admin y docentes crean documentos" ON documents;
CREATE POLICY "Admin y docentes crean documentos"
    ON documents FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher'))
    );

DROP POLICY IF EXISTS "Admin y autor editan documentos" ON documents;
CREATE POLICY "Admin y autor editan documentos"
    ON documents FOR UPDATE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'admin')
    );

DROP POLICY IF EXISTS "Admin y autor eliminan documentos" ON documents;
CREATE POLICY "Admin y autor eliminan documentos"
    ON documents FOR DELETE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'admin')
    );

-- doc_tags RLS
ALTER TABLE doc_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos ven etiquetas" ON doc_tags;
CREATE POLICY "Todos ven etiquetas" ON doc_tags FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Publico ve etiquetas" ON doc_tags;
CREATE POLICY "Publico ve etiquetas" ON doc_tags FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Admin y docentes gestionan etiquetas" ON doc_tags;
CREATE POLICY "Admin y docentes gestionan etiquetas"
    ON doc_tags FOR ALL TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher'))
    );

-- document_tag_relations RLS
ALTER TABLE document_tag_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos ven relaciones etiquetas-docs" ON document_tag_relations;
CREATE POLICY "Todos ven relaciones etiquetas-docs"
    ON document_tag_relations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Publico ve relaciones etiquetas-docs" ON document_tag_relations;
CREATE POLICY "Publico ve relaciones etiquetas-docs"
    ON document_tag_relations FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Admin y docentes gestionan relaciones etiquetas" ON document_tag_relations;
CREATE POLICY "Admin y docentes gestionan relaciones etiquetas"
    ON document_tag_relations FOR ALL TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher'))
    );

-- doc_activity_logs RLS
ALTER TABLE doc_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden ver la actividad" ON doc_activity_logs;
CREATE POLICY "Todos los usuarios autenticados pueden ver la actividad"
    ON doc_activity_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin y docentes pueden registrar actividad" ON doc_activity_logs;
CREATE POLICY "Admin y docentes pueden registrar actividad"
    ON doc_activity_logs FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher')
        )
    );

-- ============================================================
-- PASO 4: VERIFICACIÓN FINAL
-- ============================================================
SELECT
    t.table_name,
    COUNT(p.policyname) AS total_policies
FROM information_schema.tables t
LEFT JOIN pg_policies p ON p.tablename = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('doc_folders', 'documents', 'doc_tags', 'document_tag_relations', 'doc_activity_logs')
GROUP BY t.table_name
ORDER BY t.table_name;
