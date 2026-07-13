-- Script de migración para habilitar la ordenación de recursos vinculados a módulos.
-- Ejecutar este script en el editor SQL de Supabase (SQL Editor).

ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
