-- ==============================================================================
-- TABLA DE NOVEDADES DIARIAS (HORARIO TEMPORAL)
-- ==============================================================================
-- Esta tabla almacena los slots del horario importado mediante XML
-- que aplican de forma exclusiva a una fecha determinada (target_date).
-- Al llegar esa fecha, este horario sobrescribe al maestro (sch_schedule_slots).

CREATE TABLE IF NOT EXISTS public.sch_daily_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_date DATE NOT NULL,
    teacher_id UUID REFERENCES academic_teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES sch_subjects(id) ON DELETE CASCADE,
    group_id UUID REFERENCES sch_groups(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES academic_assignments(id) ON DELETE CASCADE,
    import_id UUID REFERENCES academic_imports(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL,
    period_id TEXT NOT NULL,
    duration INT DEFAULT 1,
    classroom TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar las consultas diarias
CREATE INDEX IF NOT EXISTS idx_sch_daily_overrides_date ON public.sch_daily_overrides(target_date);
CREATE INDEX IF NOT EXISTS idx_sch_daily_overrides_teacher ON public.sch_daily_overrides(teacher_id, target_date);
CREATE INDEX IF NOT EXISTS idx_sch_daily_overrides_group ON public.sch_daily_overrides(group_id, target_date);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.sch_daily_overrides ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
-- 1. Lectura pública para que estudiantes y docentes puedan ver su horario
CREATE POLICY "Public read sch_daily_overrides" ON public.sch_daily_overrides FOR SELECT USING (true);

-- 2. Acceso completo (Insert/Update/Delete) para administradores
-- (Esta política asume que las rutas protegidas por server-actions usan service_role o adminClient)
CREATE POLICY "Admin full access sch_daily_overrides" ON public.sch_daily_overrides FOR ALL USING (true);
