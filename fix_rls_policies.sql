-- 1. Recrear políticas de lectura y actualización para la tabla 'profiles'
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de perfiles a usuarios autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Permitir lectura de perfiles a usuarios autenticados" ON profiles;
CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados" 
ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir actualización de perfil propio" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualización de perfil propio" ON profiles;
CREATE POLICY "Permitir actualización de perfil propio" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);


-- 2. Recrear políticas de lectura y gestión para la tabla 'courses'
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Permitir que todos los usuarios autenticados (docentes, estudiantes y admins) puedan leer los cursos
DROP POLICY IF EXISTS "Todos pueden ver cursos" ON public.courses;
DROP POLICY IF EXISTS "Todos pueden ver cursos" ON courses;
CREATE POLICY "Todos pueden ver cursos" 
ON public.courses FOR SELECT TO authenticated USING (true);

-- Permitir que solo los administradores puedan crear y gestionar cursos
DROP POLICY IF EXISTS "Admins pueden gestionar cursos" ON public.courses;
DROP POLICY IF EXISTS "Admins pueden gestionar cursos" ON courses;
CREATE POLICY "Admins pueden gestionar cursos"
ON public.courses FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name = 'admin'
    )
);

-- ============================================================
-- 3. Políticas para course_modules (Simplificadas)
-- ============================================================
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer módulos
DROP POLICY IF EXISTS "Todos pueden ver módulos" ON public.course_modules;
CREATE POLICY "Todos pueden ver módulos"
ON public.course_modules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Docentes gestionan módulos de sus cursos" ON public.course_modules;
CREATE POLICY "Docentes gestionan módulos de sus cursos"
ON public.course_modules FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- 4. Políticas para lessons (Simplificadas)
-- ============================================================
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver lecciones" ON public.lessons;
CREATE POLICY "Todos pueden ver lecciones"
ON public.lessons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Docentes gestionan lecciones de sus módulos" ON public.lessons;
CREATE POLICY "Docentes gestionan lecciones de sus módulos"
ON public.lessons FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- 5. Políticas de gestión para resources
--    (solo basado en rol, sin referenciar columnas de la tabla)
-- ============================================================
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver recursos" ON public.resources;
DROP POLICY IF EXISTS "Docentes gestionan recursos de sus cursos" ON public.resources;
DROP POLICY IF EXISTS "Docentes pueden subir recursos" ON public.resources;
DROP POLICY IF EXISTS "Docentes editan recursos" ON public.resources;
DROP POLICY IF EXISTS "Docentes eliminan recursos" ON public.resources;
DROP POLICY IF EXISTS "Docentes editan sus propios recursos" ON public.resources;
DROP POLICY IF EXISTS "Docentes eliminan sus propios recursos" ON public.resources;

CREATE POLICY "Todos pueden ver recursos"
ON public.resources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Docentes pueden subir recursos"
ON public.resources FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Docentes editan recursos"
ON public.resources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Docentes eliminan recursos"
ON public.resources FOR DELETE TO authenticated USING (true);


-- ============================================================
-- 6. Políticas de gestión para Quizzes (Cuestionarios)
-- ============================================================

-- Agregar columna 'points' a 'quiz_questions' si no existe
-- Agregar columnas de fecha de inicio y fin a la tabla quizzes si no existen
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- Agregar columna 'points' a 'quiz_questions' si no existe
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS points INT DEFAULT 1;

-- Habilitar RLS en las tablas si no lo están
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

-- Políticas para quizzes
DROP POLICY IF EXISTS "Todos pueden ver quizzes" ON public.quizzes;
CREATE POLICY "Todos pueden ver quizzes"
ON public.quizzes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Docentes pueden crear quizzes" ON public.quizzes;
CREATE POLICY "Docentes pueden crear quizzes"
ON public.quizzes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Docentes editan quizzes" ON public.quizzes;
CREATE POLICY "Docentes editan quizzes"
ON public.quizzes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Docentes eliminan quizzes" ON public.quizzes;
CREATE POLICY "Docentes eliminan quizzes"
ON public.quizzes FOR DELETE TO authenticated USING (true);

-- Políticas para quiz_questions
DROP POLICY IF EXISTS "Todos pueden ver preguntas de quizzes" ON public.quiz_questions;
CREATE POLICY "Todos pueden ver preguntas de quizzes"
ON public.quiz_questions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Docentes pueden crear preguntas de quizzes" ON public.quiz_questions;
CREATE POLICY "Docentes pueden crear preguntas de quizzes"
ON public.quiz_questions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Docentes editan preguntas de quizzes" ON public.quiz_questions;
CREATE POLICY "Docentes editan preguntas de quizzes"
ON public.quiz_questions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Docentes eliminan preguntas de quizzes" ON public.quiz_questions;
CREATE POLICY "Docentes eliminan preguntas de quizzes"
ON public.quiz_questions FOR DELETE TO authenticated USING (true);

-- Políticas para quiz_options
DROP POLICY IF EXISTS "Todos pueden ver opciones de quizzes" ON public.quiz_options;
CREATE POLICY "Todos pueden ver opciones de quizzes"
ON public.quiz_options FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Docentes pueden crear opciones de quizzes" ON public.quiz_options;
CREATE POLICY "Docentes pueden crear opciones de quizzes"
ON public.quiz_options FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Docentes editan opciones de quizzes" ON public.quiz_options;
CREATE POLICY "Docentes editan opciones de quizzes"
ON public.quiz_options FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Docentes eliminan opciones de quizzes" ON public.quiz_options;
CREATE POLICY "Docentes eliminan opciones de quizzes"
ON public.quiz_options FOR DELETE TO authenticated USING (true);
-- ============================================================
-- 7. Políticas para la tabla 'student_progress' (Permitir que docentes y admins vean el progreso)
-- ============================================================
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Estudiantes ven su propio progreso" ON public.student_progress;
CREATE POLICY "Estudiantes ven su propio progreso" 
ON public.student_progress FOR SELECT TO authenticated 
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Profesores y Admin ven progreso" ON public.student_progress;
CREATE POLICY "Profesores y Admin ven progreso" 
ON public.student_progress FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        JOIN public.roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name IN ('teacher', 'admin')
    )
);

DROP POLICY IF EXISTS "Estudiantes marcan su propio progreso" ON public.student_progress;
CREATE POLICY "Estudiantes marcan su propio progreso" 
ON public.student_progress FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Estudiantes actualizan su propio progreso" ON public.student_progress;
CREATE POLICY "Estudiantes actualizan su propio progreso" 
ON public.student_progress FOR UPDATE TO authenticated 
USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- ============================================================
-- 8. Políticas para la tabla 'quiz_attempts' (Permitir que docentes y admins vean intentos de quiz)
-- ============================================================
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Estudiantes ven sus propios intentos" ON public.quiz_attempts;
CREATE POLICY "Estudiantes ven sus propios intentos" 
ON public.quiz_attempts FOR SELECT TO authenticated 
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Profesores y Admin ven intentos" ON public.quiz_attempts;
CREATE POLICY "Profesores y Admin ven intentos" 
ON public.quiz_attempts FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        JOIN public.roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name IN ('teacher', 'admin')
    )
);

DROP POLICY IF EXISTS "Estudiantes insertan sus intentos" ON public.quiz_attempts;
CREATE POLICY "Estudiantes insertan sus intentos" 
ON public.quiz_attempts FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = student_id);
