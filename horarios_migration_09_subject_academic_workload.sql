-- ==============================================================================
-- Migración 09: Campo de Carga Académica en Catálogo de Materias (sch_subjects)
-- Proyecto: aulaEnsuny
-- Ejecutar en Supabase SQL Editor
-- ==============================================================================

-- 1. Agregar columna is_academic_workload con valor por defecto true
ALTER TABLE public.sch_subjects 
ADD COLUMN IF NOT EXISTS is_academic_workload BOOLEAN NOT NULL DEFAULT true;

-- 2. Asegurar que todas las materias existentes tengan valor booleano explícito
UPDATE public.sch_subjects 
SET is_academic_workload = true 
WHERE is_academic_workload IS NULL;

-- 3. Marcar automáticamente materias institucionales o núcleos ya existentes
UPDATE public.sch_subjects 
SET is_academic_workload = false 
WHERE name ILIKE '%nucleo%' 
   OR name ILIKE '%comité%' 
   OR name ILIKE '%comite%' 
   OR name ILIKE '%coord.%'
   OR name ILIKE '%coordinación%';

-- 4. Comentario explicativo en la columna para documentación en la base de datos
COMMENT ON COLUMN public.sch_subjects.is_academic_workload IS 'Indica si las horas de la materia computan como carga académica lectiva docente (true) o si corresponden a actividades institucionales / núcleos de área / comités docentes (false).';
