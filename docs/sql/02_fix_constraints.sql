-- ==============================================================================
-- FASE 1.5: CORRECCIÓN DE LLAVES FORÁNEAS (FOREIGN KEYS)
-- ==============================================================================
-- La tabla sch_schedule_slots estaba apuntando su teacher_id a la tabla 
-- antigua de perfiles. Con la nueva arquitectura, los slots deben apuntar
-- directamente a los docentes del Archivo Maestro (academic_teachers).
-- ==============================================================================

-- 1. Eliminar la restricción antigua que apuntaba a auth.users o profiles
ALTER TABLE sch_schedule_slots 
DROP CONSTRAINT IF EXISTS sch_schedule_slots_teacher_id_fkey;

-- 2. Crear la nueva restricción apuntando a academic_teachers
ALTER TABLE sch_schedule_slots 
ADD CONSTRAINT sch_schedule_slots_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES academic_teachers(id) ON DELETE CASCADE;
