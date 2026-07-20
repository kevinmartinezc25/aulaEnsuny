-- ==============================================================================
-- Migración 06: Integración de Docentes Globales (profiles) al Motor de Horarios
-- Proyecto: aulaEnsuny
-- ==============================================================================

-- 1. Eliminar referencias Foreign Key a sch_teachers
ALTER TABLE public.sch_schedule_slots DROP CONSTRAINT IF EXISTS sch_schedule_slots_teacher_id_fkey;
ALTER TABLE public.sch_absences DROP CONSTRAINT IF EXISTS sch_absences_teacher_id_fkey;
ALTER TABLE public.sch_substitutions DROP CONSTRAINT IF EXISTS sch_substitutions_substitute_teacher_id_fkey;
ALTER TABLE public.sch_curriculum DROP CONSTRAINT IF EXISTS sch_curriculum_teacher_id_fkey;

-- Si existe otra tabla como sch_groups que referencie a sch_teachers, 
ALTER TABLE public.sch_groups DROP CONSTRAINT IF EXISTS sch_groups_director_id_fkey;

-- 2. Limpiar registros huérfanos
-- ATENCIÓN: Esto eliminará del horario cualquier bloque, ausencia o sustitución
-- asignada a un docente que NO EXISTA en la tabla global `profiles`.
DELETE FROM public.sch_schedule_slots WHERE teacher_id NOT IN (SELECT id FROM public.profiles) AND teacher_id IS NOT NULL;
DELETE FROM public.sch_absences WHERE teacher_id NOT IN (SELECT id FROM public.profiles) AND teacher_id IS NOT NULL;
DELETE FROM public.sch_substitutions WHERE substitute_teacher_id NOT IN (SELECT id FROM public.profiles) AND substitute_teacher_id IS NOT NULL;

-- Para sch_groups y sch_curriculum, en lugar de borrar el grupo o la materia, solo quitamos al docente huérfano
UPDATE public.sch_groups SET director_id = NULL WHERE director_id NOT IN (SELECT id FROM public.profiles) AND director_id IS NOT NULL;
UPDATE public.sch_curriculum SET teacher_id = NULL WHERE teacher_id NOT IN (SELECT id FROM public.profiles) AND teacher_id IS NOT NULL;

-- 3. Crear nuevas dependencias Foreign Key hacia public.profiles
ALTER TABLE public.sch_schedule_slots ADD CONSTRAINT sch_schedule_slots_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sch_absences ADD CONSTRAINT sch_absences_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.sch_substitutions ADD CONSTRAINT sch_substitutions_substitute_teacher_id_fkey FOREIGN KEY (substitute_teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sch_groups ADD CONSTRAINT sch_groups_director_id_fkey FOREIGN KEY (director_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sch_curriculum ADD CONSTRAINT sch_curriculum_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Eliminar la tabla sch_teachers redundante
DROP TABLE IF EXISTS public.sch_teachers CASCADE;

-- 5. Crear tabla para configuraciones específicas de horario por docente
CREATE TABLE IF NOT EXISTS public.sch_teacher_settings (
  teacher_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_hours INTEGER DEFAULT 40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.sch_teacher_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir select a sch_teacher_settings" ON public.sch_teacher_settings;
CREATE POLICY "Permitir select a sch_teacher_settings" ON public.sch_teacher_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insert a sch_teacher_settings" ON public.sch_teacher_settings;
CREATE POLICY "Permitir insert a sch_teacher_settings" ON public.sch_teacher_settings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update a sch_teacher_settings" ON public.sch_teacher_settings;
CREATE POLICY "Permitir update a sch_teacher_settings" ON public.sch_teacher_settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete a sch_teacher_settings" ON public.sch_teacher_settings;
CREATE POLICY "Permitir delete a sch_teacher_settings" ON public.sch_teacher_settings FOR DELETE USING (true);
