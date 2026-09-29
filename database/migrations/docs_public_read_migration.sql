-- ============================================================
-- MIGRACIÓN: Habilitar lectura pública para el Centro de Documentación
-- Ejecutar en Supabase SQL Editor para permitir visualización a usuarios no autenticados
-- ============================================================

-- 1. Categorías/Carpetas (doc_folders)
-- Permitir que cualquier usuario (incluso anónimos) pueda consultar la estructura de carpetas
DROP POLICY IF EXISTS "Todos autenticados ven carpetas" ON doc_folders;
DROP POLICY IF EXISTS "Lectura pública de carpetas" ON doc_folders;

CREATE POLICY "Lectura pública de carpetas"
    ON doc_folders FOR SELECT TO public USING (true);

-- 2. Documentos (documents)
-- Permitir que cualquier usuario (incluso anónimos) pueda consultar los documentos que estén publicados
DROP POLICY IF EXISTS "Lectura pública de documentos publicados" ON documents;

CREATE POLICY "Lectura pública de documentos publicados"
    ON documents FOR SELECT TO public USING (status = 'published');

-- 3. Etiquetas (doc_tags)
-- Permitir que cualquier usuario (incluso anónimos) pueda ver las etiquetas
DROP POLICY IF EXISTS "Todos ven etiquetas" ON doc_tags;
DROP POLICY IF EXISTS "Lectura pública de etiquetas" ON doc_tags;

CREATE POLICY "Lectura pública de etiquetas"
    ON doc_tags FOR SELECT TO public USING (true);

-- 4. Relaciones de etiquetas (document_tag_relations)
-- Permitir que cualquier usuario (incluso anónimos) vea la asociación de etiquetas y documentos
DROP POLICY IF EXISTS "Todos ven relaciones etiquetas-docs" ON document_tag_relations;
DROP POLICY IF EXISTS "Lectura pública de relaciones etiquetas-documentos" ON document_tag_relations;

CREATE POLICY "Lectura pública de relaciones etiquetas-documentos"
    ON document_tag_relations FOR SELECT TO public USING (true);
