-- ============================================================
-- MIGRACIÓN: Agregar color a las carpetas del Centro de Docs
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Añadir columna color a doc_folders (nullable, hex o nombre de color)
ALTER TABLE doc_folders ADD COLUMN IF NOT EXISTS color VARCHAR(30) DEFAULT NULL;
