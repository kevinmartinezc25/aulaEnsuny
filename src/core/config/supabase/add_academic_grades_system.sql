-- Migration DDL for Academic Achievements & Grades Module

-- 1. Add group_name column to courses and profiles to support group grouping (e.g. 9°-1, 9°-2)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS group_name VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS group_name VARCHAR(50);

-- Update existing profiles and courses to default group_name '1' if they are null
UPDATE public.courses SET group_name = '1' WHERE group_name IS NULL;
UPDATE public.profiles SET group_name = '1' WHERE role_id IN (SELECT id FROM roles WHERE name = 'student') AND group_name IS NULL;

-- 2. Create academic_periods table
CREATE TABLE IF NOT EXISTS public.academic_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT academic_periods_name_year_key UNIQUE (name, year)
);

-- 2.1. Create academic_groups table
CREATE TABLE IF NOT EXISTS public.academic_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_level_id UUID NOT NULL REFERENCES public.academic_levels(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT academic_groups_level_name_key UNIQUE (academic_level_id, name)
);

-- Seed default groups (Group 1 and Group 2) for all grade levels
INSERT INTO public.academic_groups (academic_level_id, name)
SELECT id, '1' FROM public.academic_levels ON CONFLICT DO NOTHING;
INSERT INTO public.academic_groups (academic_level_id, name)
SELECT id, '2' FROM public.academic_levels ON CONFLICT DO NOTHING;

-- 3. Create academic_achievements table
CREATE TABLE IF NOT EXISTS public.academic_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    academic_period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create student_achievement_grades table
CREATE TABLE IF NOT EXISTS public.student_achievement_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.academic_achievements(id) ON DELETE CASCADE,
    grade NUMERIC(3,2) NOT NULL CHECK (grade >= 1.00 AND grade <= 5.00),
    academic_period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT student_achievement_grades_student_achievement_key UNIQUE (student_id, achievement_id)
);

-- 5. Create student_period_grades table for caching consolidated final grades
CREATE TABLE IF NOT EXISTS public.student_period_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    academic_period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE CASCADE,
    final_grade NUMERIC(3,2) NOT NULL CHECK (final_grade >= 1.00 AND final_grade <= 5.00),
    performance_level VARCHAR(50) NOT NULL CHECK (performance_level IN ('Superior', 'Alto', 'Básico', 'Bajo', 'Insuficiente')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT student_period_grades_student_course_period_key UNIQUE (student_id, course_id, academic_period_id)
);

-- 6. Create grade_audits table
CREATE TABLE IF NOT EXISTS public.grade_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    academic_period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    old_grade NUMERIC(3,2),
    new_grade NUMERIC(3,2) NOT NULL CHECK (new_grade >= 1.00 AND new_grade <= 5.00),
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create academic_reports table
CREATE TABLE IF NOT EXISTS public.academic_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE CASCADE,
    grade VARCHAR(50) NOT NULL,
    "group" VARCHAR(50) NOT NULL,
    generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('individual', 'groupal', 'institutional')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Seed academic periods
INSERT INTO public.academic_periods (name, year, start_date, end_date, status)
VALUES 
  ('Periodo 1', 2026, '2026-02-01 00:00:00+00', '2026-04-15 23:59:59+00', 'inactive'),
  ('Periodo 2', 2026, '2026-04-16 00:00:00+00', '2026-06-30 23:59:59+00', 'active'),
  ('Periodo 3', 2026, '2026-07-01 00:00:00+00', '2026-09-15 23:59:59+00', 'active'),
  ('Periodo 4', 2026, '2026-09-16 00:00:00+00', '2026-11-30 23:59:59+00', 'active')
ON CONFLICT (name, year) DO NOTHING;

-- 9. Trigger function to compute average grades automatically
CREATE OR REPLACE FUNCTION public.update_student_period_grade()
RETURNS TRIGGER AS $$
DECLARE
    v_course_id UUID;
    v_academic_period_id UUID;
    v_student_id UUID;
    v_avg NUMERIC(3,2);
    v_perf VARCHAR(50);
BEGIN
    -- Determine variables based on trigger event
    IF TG_OP = 'DELETE' THEN
        v_student_id := OLD.student_id;
        v_academic_period_id := OLD.academic_period_id;
        SELECT course_id INTO v_course_id 
        FROM public.academic_achievements 
        WHERE id = OLD.achievement_id;
    ELSE
        v_student_id := NEW.student_id;
        v_academic_period_id := NEW.academic_period_id;
        SELECT course_id INTO v_course_id 
        FROM public.academic_achievements 
        WHERE id = NEW.achievement_id;
    END IF;

    -- Compute the average grade for this student in this course & academic period
    SELECT ROUND(AVG(grade), 2) INTO v_avg
    FROM public.student_achievement_grades sag
    JOIN public.academic_achievements aa ON sag.achievement_id = aa.id
    WHERE sag.student_id = v_student_id
      AND aa.course_id = v_course_id
      AND sag.academic_period_id = v_academic_period_id;

    -- If no achievements grades exist anymore, delete the period grade
    IF v_avg IS NULL THEN
        DELETE FROM public.student_period_grades
        WHERE student_id = v_student_id
          AND course_id = v_course_id
          AND academic_period_id = v_academic_period_id;
    ELSE
        -- Classify performance level
        IF v_avg >= 4.60 AND v_avg <= 5.00 THEN
            v_perf := 'Superior';
        ELSIF v_avg >= 4.00 AND v_avg <= 4.59 THEN
            v_perf := 'Alto';
        ELSIF v_avg >= 3.00 AND v_avg <= 3.99 THEN
            v_perf := 'Básico';
        ELSE
            v_perf := 'Bajo';
        END IF;

        -- Insert or update in student_period_grades
        INSERT INTO public.student_period_grades (
            student_id,
            course_id,
            academic_period_id,
            final_grade,
            performance_level,
            updated_at
        ) VALUES (
            v_student_id,
            v_course_id,
            v_academic_period_id,
            v_avg,
            v_perf,
            NOW()
        )
        ON CONFLICT (student_id, course_id, academic_period_id)
        DO UPDATE SET
            final_grade = EXCLUDED.final_grade,
            performance_level = EXCLUDED.performance_level,
            updated_at = EXCLUDED.updated_at;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 10. Bind trigger to student_achievement_grades
CREATE OR REPLACE TRIGGER trg_student_achievement_grades_upsert_delete
AFTER INSERT OR UPDATE OR DELETE ON public.student_achievement_grades
FOR EACH ROW EXECUTE FUNCTION public.update_student_period_grade();

-- 11. Row Level Security (RLS) policies
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de periodos academicos a todos" ON public.academic_periods;
DROP POLICY IF EXISTS "Permitir lectura de periodos academicos a todos" ON academic_periods;
CREATE POLICY "Permitir lectura de periodos academicos a todos"
ON academic_periods FOR SELECT TO authenticated USING (true);

ALTER TABLE public.academic_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de logros academicos a todos" ON public.academic_achievements;
DROP POLICY IF EXISTS "Permitir lectura de logros academicos a todos" ON academic_achievements;
CREATE POLICY "Permitir lectura de logros academicos a todos"
ON academic_achievements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir creacion/edicion de logros academicos a docentes y admins" ON public.academic_achievements;
DROP POLICY IF EXISTS "Permitir creacion/edicion de logros academicos a docentes y admins" ON academic_achievements;
CREATE POLICY "Permitir creacion/edicion de logros academicos a docentes y admins"
ON academic_achievements FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name IN ('teacher', 'admin')
    )
);

ALTER TABLE public.student_achievement_grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Estudiantes ven sus propias calificaciones de logros" ON public.student_achievement_grades;
DROP POLICY IF EXISTS "Estudiantes ven sus propias calificaciones de logros" ON student_achievement_grades;
CREATE POLICY "Estudiantes ven sus propias calificaciones de logros"
ON student_achievement_grades FOR SELECT TO authenticated
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Docentes y admin ven y modifican todas las calificaciones de logros" ON public.student_achievement_grades;
DROP POLICY IF EXISTS "Docentes y admin ven y modifican todas las calificaciones de logros" ON student_achievement_grades;
CREATE POLICY "Docentes y admin ven y modifican todas las calificaciones de logros"
ON student_achievement_grades FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name IN ('teacher', 'admin')
    )
);

ALTER TABLE public.student_period_grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Estudiantes ven sus consolidados" ON public.student_period_grades;
DROP POLICY IF EXISTS "Estudiantes ven sus consolidados" ON student_period_grades;
CREATE POLICY "Estudiantes ven sus consolidados"
ON student_period_grades FOR SELECT TO authenticated
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Docentes y admin ven consolidados" ON public.student_period_grades;
DROP POLICY IF EXISTS "Docentes y admin ven consolidados" ON student_period_grades;
CREATE POLICY "Docentes y admin ven consolidados"
ON student_period_grades FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name IN ('teacher', 'admin')
    )
);

ALTER TABLE public.grade_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin ve toda la auditoria de notas" ON public.grade_audits;
DROP POLICY IF EXISTS "Admin ve toda la auditoria de notas" ON grade_audits;
CREATE POLICY "Admin ve toda la auditoria de notas"
ON grade_audits FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name = 'admin'
    )
);

DROP POLICY IF EXISTS "Docente ve auditoria de notas creadas por el" ON public.grade_audits;
DROP POLICY IF EXISTS "Docente ve auditoria de notas creadas por el" ON grade_audits;
CREATE POLICY "Docente ve auditoria de notas creadas por el"
ON grade_audits FOR SELECT TO authenticated
USING (teacher_id = auth.uid());

ALTER TABLE public.academic_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin ve e inserta reportes academicos" ON public.academic_reports;
DROP POLICY IF EXISTS "Admin ve e inserta reportes academicos" ON academic_reports;
CREATE POLICY "Admin ve e inserta reportes academicos"
ON academic_reports FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name = 'admin'
    )
);

ALTER TABLE public.academic_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de grupos a todos" ON public.academic_groups;
DROP POLICY IF EXISTS "Permitir lectura de grupos a todos" ON academic_groups;
CREATE POLICY "Permitir lectura de grupos a todos"
ON academic_groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir gestion de grupos a admins" ON public.academic_groups;
DROP POLICY IF EXISTS "Permitir gestion de grupos a admins" ON academic_groups;
CREATE POLICY "Permitir gestion de grupos a admins"
ON academic_groups FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name = 'admin'
    )
);

-- 12. Adjust courses creation policy (Only Admin can create courses, not teachers)
DROP POLICY IF EXISTS "Docentes pueden crear cursos" ON public.courses;
DROP POLICY IF EXISTS "Docentes pueden crear cursos" ON courses;
DROP POLICY IF EXISTS "Admins pueden gestionar cursos" ON public.courses;
DROP POLICY IF EXISTS "Admins pueden gestionar cursos" ON courses;
CREATE POLICY "Admins pueden gestionar cursos"
ON courses FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name = 'admin'
    )
);
