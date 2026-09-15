-- ========================================================================================
-- ESQUEMA PLANILLA ASISTIDA
-- Herramienta independiente para docentes
-- ========================================================================================

-- 1. Tabla de Materias (Subjects)
CREATE TABLE IF NOT EXISTS public.assisted_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    grade_group VARCHAR(100),
    period VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Estudiantes (Students)
CREATE TABLE IF NOT EXISTS public.assisted_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.assisted_subjects(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Logros (Achievements)
CREATE TABLE IF NOT EXISTS public.assisted_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.assisted_subjects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    position_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Actividades (Activities)
CREATE TABLE IF NOT EXISTS public.assisted_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_id UUID NOT NULL REFERENCES public.assisted_achievements(id) ON DELETE CASCADE,
    component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('hacer', 'saber', 'ser')),
    name VARCHAR(255) NOT NULL,
    position_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Calificaciones (Grades)
CREATE TABLE IF NOT EXISTS public.assisted_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.assisted_students(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES public.assisted_activities(id) ON DELETE CASCADE,
    grade_value NUMERIC(3,2) NOT NULL CHECK (grade_value >= 1.00 AND grade_value <= 5.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, activity_id) -- Un estudiante solo tiene una nota por actividad
);

-- ========================================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY)
-- Asegurando que cada docente solo vea y modifique SU información
-- ========================================================================================

ALTER TABLE public.assisted_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assisted_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assisted_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assisted_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assisted_grades ENABLE ROW LEVEL SECURITY;

-- Políticas para assisted_subjects
CREATE POLICY "Docentes ven sus propias materias" ON public.assisted_subjects FOR SELECT TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Docentes crean sus materias" ON public.assisted_subjects FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Docentes actualizan sus materias" ON public.assisted_subjects FOR UPDATE TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Docentes eliminan sus materias" ON public.assisted_subjects FOR DELETE TO authenticated USING (auth.uid() = teacher_id);

-- Políticas para assisted_students (depende del subject_id)
CREATE POLICY "Docentes gestionan estudiantes de sus materias" ON public.assisted_students FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.assisted_subjects WHERE id = subject_id AND teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.assisted_subjects WHERE id = subject_id AND teacher_id = auth.uid()));

-- Políticas para assisted_achievements
CREATE POLICY "Docentes gestionan logros de sus materias" ON public.assisted_achievements FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.assisted_subjects WHERE id = subject_id AND teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.assisted_subjects WHERE id = subject_id AND teacher_id = auth.uid()));

-- Políticas para assisted_activities
CREATE POLICY "Docentes gestionan actividades de sus materias" ON public.assisted_activities FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.assisted_achievements a
    JOIN public.assisted_subjects s ON a.subject_id = s.id
    WHERE a.id = achievement_id AND s.teacher_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.assisted_achievements a
    JOIN public.assisted_subjects s ON a.subject_id = s.id
    WHERE a.id = achievement_id AND s.teacher_id = auth.uid()
));

-- Políticas para assisted_grades
CREATE POLICY "Docentes gestionan notas de sus materias" ON public.assisted_grades FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.assisted_students st
    JOIN public.assisted_subjects s ON st.subject_id = s.id
    WHERE st.id = student_id AND s.teacher_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.assisted_students st
    JOIN public.assisted_subjects s ON st.subject_id = s.id
    WHERE st.id = student_id AND s.teacher_id = auth.uid()
));

-- Funciones para updated_at automático
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Manejando la creación condicional de triggers
DROP TRIGGER IF EXISTS trigger_update_assisted_subjects_updated_at ON public.assisted_subjects;
CREATE TRIGGER trigger_update_assisted_subjects_updated_at BEFORE UPDATE ON public.assisted_subjects FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_update_assisted_students_updated_at ON public.assisted_students;
CREATE TRIGGER trigger_update_assisted_students_updated_at BEFORE UPDATE ON public.assisted_students FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_update_assisted_achievements_updated_at ON public.assisted_achievements;
CREATE TRIGGER trigger_update_assisted_achievements_updated_at BEFORE UPDATE ON public.assisted_achievements FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_update_assisted_activities_updated_at ON public.assisted_activities;
CREATE TRIGGER trigger_update_assisted_activities_updated_at BEFORE UPDATE ON public.assisted_activities FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_update_assisted_grades_updated_at ON public.assisted_grades;
CREATE TRIGGER trigger_update_assisted_grades_updated_at BEFORE UPDATE ON public.assisted_grades FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();
