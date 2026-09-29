-- Refactorización de Calificaciones y Evaluación Académica
-- 1. Eliminar tablas relacionadas con logros/competencias académias
DROP TABLE IF EXISTS public.student_achievement_grades CASCADE;
DROP TABLE IF EXISTS public.academic_achievements CASCADE;

-- 2. Eliminar funciones y disparadores obsoletos
DROP FUNCTION IF EXISTS public.update_student_period_grade() CASCADE;

-- 3. Crear la nueva tabla para almacenar calificaciones individuales de lecciones (Tareas y Talleres)
CREATE TABLE IF NOT EXISTS public.student_lesson_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    score NUMERIC(3,2) NOT NULL CHECK (score >= 1.00 AND score <= 5.00),
    feedback TEXT,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT student_lesson_grades_student_lesson_key UNIQUE (student_id, lesson_id)
);

-- 4. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.student_lesson_grades ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de seguridad RLS
-- Estudiantes pueden ver sus propias calificaciones
DROP POLICY IF EXISTS "Estudiantes ven sus propias notas de lecciones" ON public.student_lesson_grades;
CREATE POLICY "Estudiantes ven sus propias notas de lecciones"
ON public.student_lesson_grades FOR SELECT TO authenticated
USING (auth.uid() = student_id);

-- Docentes y administradores pueden hacer todo sobre las calificaciones
DROP POLICY IF EXISTS "Docentes y admin gestionan notas de lecciones" ON public.student_lesson_grades;
CREATE POLICY "Docentes y admin gestionan notas de lecciones"
ON public.student_lesson_grades FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name IN ('teacher', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name IN ('teacher', 'admin')
    )
);
