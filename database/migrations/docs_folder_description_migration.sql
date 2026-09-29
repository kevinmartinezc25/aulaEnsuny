-- ============================================================
-- MIGRACIÓN: Agregar columna description a las carpetas (doc_folders)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE doc_folders ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
