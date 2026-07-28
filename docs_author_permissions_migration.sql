-- ============================================================
-- MIGRACIÓN DE POLÍTICAS RLS: CENTRO DE CONOCIMIENTO INSTITUCIONAL
-- Garantiza que cada carpeta, subcarpeta y archivo únicamente sea
-- modificable/eliminable por su autor (created_by), admin o superadmin.
-- ============================================================

-- 1. POLÍTICAS PARA CARPETAS (doc_folders)
ALTER TABLE doc_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos autenticados ven carpetas" ON doc_folders;
CREATE POLICY "Todos autenticados ven carpetas"
    ON doc_folders FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin y docentes crean carpetas" ON doc_folders;
CREATE POLICY "Admin y docentes crean carpetas"
    ON doc_folders FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin', 'teacher')
        )
    );

DROP POLICY IF EXISTS "Admin y docentes actualizan sus carpetas" ON doc_folders;
DROP POLICY IF EXISTS "Autor o admin actualizan carpetas" ON doc_folders;
CREATE POLICY "Autor o admin actualizan carpetas"
    ON doc_folders FOR UPDATE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "Admin y creador eliminan carpetas" ON doc_folders;
DROP POLICY IF EXISTS "Autor o admin eliminan carpetas" ON doc_folders;
CREATE POLICY "Autor o admin eliminan carpetas"
    ON doc_folders FOR DELETE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    );

-- 2. POLÍTICAS PARA DOCUMENTOS (documents)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin y docentes crean documentos" ON documents;
CREATE POLICY "Admin y docentes crean documentos"
    ON documents FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin', 'teacher')
        )
    );

DROP POLICY IF EXISTS "Admin y autor editan documentos" ON documents;
DROP POLICY IF EXISTS "Autor o admin editan documentos" ON documents;
CREATE POLICY "Autor o admin editan documentos"
    ON documents FOR UPDATE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "Admin y autor eliminan documentos" ON documents;
DROP POLICY IF EXISTS "Autor o admin eliminan documentos" ON documents;
CREATE POLICY "Autor o admin eliminan documentos"
    ON documents FOR DELETE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    );
