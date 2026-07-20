-- ==============================================================================
-- Migración 05: Tablas para el Motor de Reglas (Constraints) y Sustituciones
-- Proyecto: aulaEnsuny
-- ==============================================================================

-- 1. Tabla genérica de restricciones (Rule Engine Config)
CREATE TABLE IF NOT EXISTS public.sch_constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_type VARCHAR(50) NOT NULL,
  target_entity_type VARCHAR(20), -- 'TEACHER', 'GROUP', 'SUBJECT', 'GLOBAL'
  target_entity_id UUID,          
  parameters JSONB,               
  weight VARCHAR(20) DEFAULT 'STRICT', 
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Matriz de Tiempo Libre (Bloqueos en Rojo / Time off)
CREATE TABLE IF NOT EXISTS public.sch_time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(20) NOT NULL, -- 'TEACHER', 'GROUP', 'CLASSROOM'
  entity_id UUID NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  period_id INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'FORBIDDEN', -- 'FORBIDDEN' (rojo), 'DISCOURAGED' (amarillo)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Módulo de Sustituciones: Ausencias Diarias
CREATE TABLE IF NOT EXISTS public.sch_absences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.sch_teachers(id) ON DELETE CASCADE,
  absence_date DATE NOT NULL,
  reason VARCHAR(100),
  is_full_day BOOLEAN DEFAULT true,
  start_period INTEGER,
  end_period INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Módulo de Sustituciones: Suplencias Asignadas
CREATE TABLE IF NOT EXISTS public.sch_substitutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  absence_id UUID NOT NULL REFERENCES public.sch_absences(id) ON DELETE CASCADE,
  original_schedule_slot_id UUID NOT NULL REFERENCES public.sch_schedule_slots(id) ON DELETE CASCADE,
  substitute_teacher_id UUID REFERENCES public.sch_teachers(id) ON DELETE SET NULL, -- null si es "Lección Cancelada"
  period_id INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'COVERED', -- 'COVERED', 'CANCELLED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- RLS (Row Level Security) - Políticas de Seguridad
-- ==============================================================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.sch_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sch_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sch_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sch_substitutions ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir acceso público (alineado al esquema general de desarrollo)
DROP POLICY IF EXISTS "Permitir select a constraints" ON public.sch_constraints;
DROP POLICY IF EXISTS "Permitir insert a constraints" ON public.sch_constraints;
DROP POLICY IF EXISTS "Permitir update a constraints" ON public.sch_constraints;
DROP POLICY IF EXISTS "Permitir delete a constraints" ON public.sch_constraints;
CREATE POLICY "Permitir select a constraints" ON public.sch_constraints FOR SELECT USING (true);
CREATE POLICY "Permitir insert a constraints" ON public.sch_constraints FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update a constraints" ON public.sch_constraints FOR UPDATE USING (true);
CREATE POLICY "Permitir delete a constraints" ON public.sch_constraints FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir select a time_off" ON public.sch_time_off;
DROP POLICY IF EXISTS "Permitir insert a time_off" ON public.sch_time_off;
DROP POLICY IF EXISTS "Permitir update a time_off" ON public.sch_time_off;
DROP POLICY IF EXISTS "Permitir delete a time_off" ON public.sch_time_off;

CREATE POLICY "Permitir select a time_off" ON public.sch_time_off FOR SELECT USING (true);
CREATE POLICY "Permitir insert a time_off" ON public.sch_time_off FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update a time_off" ON public.sch_time_off FOR UPDATE USING (true);
CREATE POLICY "Permitir delete a time_off" ON public.sch_time_off FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir select a absences" ON public.sch_absences;
DROP POLICY IF EXISTS "Permitir insert a absences" ON public.sch_absences;
DROP POLICY IF EXISTS "Permitir update a absences" ON public.sch_absences;
DROP POLICY IF EXISTS "Permitir delete a absences" ON public.sch_absences;

CREATE POLICY "Permitir select a absences" ON public.sch_absences FOR SELECT USING (true);
CREATE POLICY "Permitir insert a absences" ON public.sch_absences FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update a absences" ON public.sch_absences FOR UPDATE USING (true);
CREATE POLICY "Permitir delete a absences" ON public.sch_absences FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir select a substitutions" ON public.sch_substitutions;
DROP POLICY IF EXISTS "Permitir insert a substitutions" ON public.sch_substitutions;
DROP POLICY IF EXISTS "Permitir update a substitutions" ON public.sch_substitutions;
DROP POLICY IF EXISTS "Permitir delete a substitutions" ON public.sch_substitutions;

CREATE POLICY "Permitir select a substitutions" ON public.sch_substitutions FOR SELECT USING (true);
CREATE POLICY "Permitir insert a substitutions" ON public.sch_substitutions FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update a substitutions" ON public.sch_substitutions FOR UPDATE USING (true);
CREATE POLICY "Permitir delete a substitutions" ON public.sch_substitutions FOR DELETE USING (true);
