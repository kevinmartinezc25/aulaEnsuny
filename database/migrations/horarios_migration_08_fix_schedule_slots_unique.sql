-- ==============================================================================
-- Migración 08: Corregir Restricción de Unicidad en sch_schedule_slots para Co-teaching / Materias Multi-Docente
-- Proyecto: aulaEnsuny
-- Ejecutar en Supabase SQL Editor
-- ==============================================================================

-- 1. Eliminar restricciones de unicidad obsoletas que impidan múltiples docentes en la misma hora del grupo
ALTER TABLE public.sch_schedule_slots DROP CONSTRAINT IF EXISTS sch_schedule_slots_group_id_day_of_week_period_id_key;
ALTER TABLE public.sch_schedule_slots DROP CONSTRAINT IF EXISTS sch_schedule_slots_group_id_period_id_day_of_week_key;

-- 2. Asegurar unicidad por (group_id, subject_id, teacher_id, day_of_week, period_id)
-- Esto permite que varios docentes compartan el mismo grupo y hora en la misma materia (Núcleo / Comité), pero evita duplicados idénticos.
ALTER TABLE public.sch_schedule_slots DROP CONSTRAINT IF EXISTS sch_schedule_slots_unique_group_subject_teacher_slot;
ALTER TABLE public.sch_schedule_slots ADD CONSTRAINT sch_schedule_slots_unique_group_subject_teacher_slot UNIQUE (group_id, subject_id, teacher_id, day_of_week, period_id);
