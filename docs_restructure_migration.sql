-- ============================================================
-- MIGRACIÓN: Reestructuración del Centro de Documentación Académica
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columnas a la tabla documents para el soporte de Google Drive
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drive_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_label VARCHAR(20) DEFAULT '1.0';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;

-- 2. Crear tabla para registrar la actividad del repositorio
CREATE TABLE IF NOT EXISTS doc_activity_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'create_folder', 'delete_folder'
    description TEXT NOT NULL,         -- e.g. "Kevin Martínez agregó 'Guía Movimiento Rectilíneo'"
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexar los logs para obtenerlos de forma rápida ordenados por fecha
CREATE INDEX IF NOT EXISTS idx_doc_activity_logs_created_at ON doc_activity_logs(created_at DESC);

-- 3. Habilitar RLS en doc_activity_logs
ALTER TABLE doc_activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Políticas para doc_activity_logs
CREATE POLICY "Todos los usuarios autenticados pueden ver la actividad"
    ON doc_activity_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin y docentes pueden registrar actividad"
    ON doc_activity_logs FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher')
        )
    );
