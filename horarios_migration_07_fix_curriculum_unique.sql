-- ==============================================================================
-- Migración 07: Corregir Restricción de Asignación Docente en Mallas Curriculares
-- Proyecto: aulaEnsuny
-- Ejecutar en Supabase SQL Editor
-- ==============================================================================

-- 1. Eliminar la restricción de unicidad restrictiva que impide múltiples docentes por materia/grupo
ALTER TABLE public.sch_curriculum DROP CONSTRAINT IF EXISTS sch_curriculum_group_id_subject_id_key;

-- 2. Agregar una nueva restricción para evitar duplicar el mismo docente en la misma materia del grupo
-- Nota: Esto permite múltiples docentes distintos para una misma materia en el mismo grupo.
ALTER TABLE public.sch_curriculum ADD CONSTRAINT sch_curriculum_group_subject_teacher_key UNIQUE (group_id, subject_id, teacher_id);
