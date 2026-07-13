-- ============================================================
-- MIGRACIÓN: Centro de Documentación Académica — aulaEnsuny
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Carpetas con jerarquía ilimitada (árbol auto-referencial)
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

-- 2. Documentos principales
CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(500) NOT NULL,
    slug            VARCHAR(600) UNIQUE,           -- para URL pública
    content         TEXT NOT NULL DEFAULT '',      -- Markdown enriquecido
    content_html    TEXT,                          -- cache HTML renderizado
    folder_id       UUID REFERENCES doc_folders(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
    is_public       BOOLEAN NOT NULL DEFAULT FALSE, -- publicación URL pública
    public_token    VARCHAR(128) UNIQUE,            -- token para URL pública
    created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    last_edited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    cover_image_url TEXT,                          -- Cloudinary (Fase 3)
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_slug ON documents(slug);
-- Full-text search en PostgreSQL
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents
    USING GIN(to_tsvector('spanish', COALESCE(title, '') || ' ' || COALESCE(content, '')));

-- 3. Historial de versiones
CREATE TABLE IF NOT EXISTS document_versions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_num INT NOT NULL,
    title       VARCHAR(500) NOT NULL,
    content     TEXT NOT NULL,
    saved_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    change_note VARCHAR(500),                      -- resumen opcional del cambio
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(document_id, version_num)
);
CREATE INDEX IF NOT EXISTS idx_doc_versions_document ON document_versions(document_id);

-- 4. Etiquetas globales
CREATE TABLE IF NOT EXISTS doc_tags (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(100) UNIQUE NOT NULL,
    color      VARCHAR(20) DEFAULT '#6366f1',      -- color hex para badge
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. Relación M-N Documentos ↔ Etiquetas
CREATE TABLE IF NOT EXISTS document_tag_relations (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES doc_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_doc_tag_relations_tag ON document_tag_relations(tag_id);

-- 6. Vinculación de documentos a cursos (sin duplicar contenido)
CREATE TABLE IF NOT EXISTS course_document_refs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    added_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(course_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_course_doc_refs_course ON course_document_refs(course_id);
CREATE INDEX IF NOT EXISTS idx_course_doc_refs_doc ON course_document_refs(document_id);

-- ============================================================
-- Función: auto-incrementar versión al guardar
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_document_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version INT;
BEGIN
    -- Solo crear versión si el contenido cambió
    IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
        SELECT COALESCE(MAX(version_num), 0) + 1
            INTO next_version
            FROM document_versions
            WHERE document_id = NEW.id;

        INSERT INTO document_versions (document_id, version_num, title, content, saved_by)
        VALUES (NEW.id, next_version, NEW.title, NEW.content, NEW.last_edited_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_document_updated
    AFTER UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION public.create_document_version();

-- ============================================================
-- Row Level Security
-- ============================================================

-- doc_folders
ALTER TABLE doc_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos autenticados ven carpetas"
    ON doc_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin y docentes crean carpetas"
    ON doc_folders FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher')
        )
    );
CREATE POLICY "Admin y docentes actualizan sus carpetas"
    ON doc_folders FOR UPDATE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'admin')
    );
CREATE POLICY "Admin y creador eliminan carpetas"
    ON doc_folders FOR DELETE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'admin')
    );

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin ve todos los documentos"
    ON documents FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'admin')
    );
CREATE POLICY "Docentes ven sus docs y los publicados"
    ON documents FOR SELECT TO authenticated
    USING (
        auth.uid() = created_by OR status = 'published' OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'teacher')
    );
CREATE POLICY "Estudiantes ven solo publicados"
    ON documents FOR SELECT TO authenticated
    USING (
        status = 'published' OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher'))
    );
CREATE POLICY "Admin y docentes crean documentos"
    ON documents FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher'))
    );
CREATE POLICY "Admin y autor editan documentos"
    ON documents FOR UPDATE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'admin')
    );
CREATE POLICY "Admin y autor eliminan documentos"
    ON documents FOR DELETE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'admin')
    );

-- document_versions
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados ven versiones de docs visibles"
    ON document_versions FOR SELECT TO authenticated USING (true);

-- doc_tags
ALTER TABLE doc_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos ven etiquetas" ON doc_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin y docentes gestionan etiquetas"
    ON doc_tags FOR ALL TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher'))
    );

-- document_tag_relations
ALTER TABLE document_tag_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos ven relaciones etiquetas-docs"
    ON document_tag_relations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin y docentes gestionan relaciones etiquetas"
    ON document_tag_relations FOR ALL TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher'))
    );

-- course_document_refs
ALTER TABLE course_document_refs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos ven refs de documentos en cursos"
    ON course_document_refs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin y docentes vinculan docs a cursos"
    ON course_document_refs FOR ALL TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher'))
    );

-- ============================================================
-- Registrar Módulo en Permisos Admin
-- ============================================================
INSERT INTO public.admin_module_permissions (module_key, module_name, is_enabled)
VALUES ('docs', 'Centro de Docs', true)
ON CONFLICT (module_key) DO UPDATE SET
    module_name = EXCLUDED.module_name;
