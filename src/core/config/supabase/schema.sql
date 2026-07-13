-- Schema DDL para aulaEnsuny - LMS Moderno para Colegios

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'teacher', 'student'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Inserción de roles básicos si no existen
INSERT INTO roles (name) VALUES ('admin'), ('teacher'), ('student') ON CONFLICT (name) DO NOTHING;

-- 2. Tabla de Perfiles (Se vincula con auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT, -- Almacenado en Cloudinary
    role_id UUID NOT NULL REFERENCES roles(id),
    grade_level VARCHAR(50), -- Ej. '10°', '11°' (Aplica solo a estudiantes)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabla de Cursos
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    banner_url TEXT, -- Almacenado en Cloudinary
    subject VARCHAR(100) NOT NULL, -- Ej. 'Física', 'Matemáticas'
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabla de Módulos del Curso
CREATE TABLE IF NOT EXISTS course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tabla de Lecciones
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT, -- Markdown o HTML limpio
    video_url TEXT, -- URL de YouTube únicamente
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Tabla de Recursos Adicionales (PDFs)
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    drive_file_id VARCHAR(255) NOT NULL,
    drive_url TEXT NOT NULL,
    drive_download_url TEXT,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    file_size INT,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Tabla de Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID UNIQUE NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    duration_minutes INT, -- NULL significa ilimitado
    max_attempts INT DEFAULT 3 NOT NULL,
    passing_grade NUMERIC(3,2) DEFAULT 3.00 NOT NULL CHECK (passing_grade >= 1.0 AND passing_grade <= 5.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Tabla de Preguntas del Quiz
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'single_choice', -- 'single_choice', 'boolean'
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Tabla de Opciones/Respuestas de las Preguntas
CREATE TABLE IF NOT EXISTS quiz_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Tabla de Progreso del Estudiante
CREATE TABLE IF NOT EXISTS student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, lesson_id)
);

-- 11. Tabla de Intentos de Quiz de Estudiantes
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score NUMERIC(3,2) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
    is_passed BOOLEAN NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12. Tabla de Categorías de Calificación por Curso
CREATE TABLE IF NOT EXISTS course_grade_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Ej. 'Quizzes', 'Parcial', 'Talleres'
    weight NUMERIC(3,2) NOT NULL CHECK (weight > 0.0 AND weight <= 1.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12.1 Tabla de Calificaciones Consolidadas (Escala 1.0 a 5.0)
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES course_grade_categories(id) ON DELETE CASCADE,
    score NUMERIC(3,2) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
    feedback TEXT,
    graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, course_id, category_id)
);

-- 13. Tabla de Logros/Gamificación
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    badge_icon VARCHAR(50) NOT NULL, -- Nombre del icono de Lucide (ej. 'award', 'zap')
    achievement_type VARCHAR(50) NOT NULL UNIQUE, -- Código identificador único
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 14. Tabla de Logros Obtenidos por Estudiantes
CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, achievement_id)
);

-- 15. Tabla de Calendario Académico (Tareas, Evaluaciones y Eventos)
CREATE TABLE IF NOT EXISTS calendars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- NULL indica evento global del colegio
    event_type VARCHAR(50) NOT NULL DEFAULT 'homework', -- 'homework', 'exam', 'event'
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 16. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices de Rendimiento para Consultas Frecuentes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_modules_course ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_progress_student ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_course ON grades(student_id, course_id);

-- 17. Función de Trigger para Sincronización Automática de Perfiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
    meta_role_name VARCHAR(50);
    assigned_role_id UUID;
BEGIN
    -- Obtener el rol predeterminado ('student')
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'student';
    
    -- Obtener el rol enviado en los metadatos de usuario (si existe)
    meta_role_name := new.raw_user_meta_data->>'role_name';
    
    -- Buscar el ID de ese rol
    IF meta_role_name IS NOT NULL THEN
        SELECT id INTO assigned_role_id FROM public.roles WHERE name = meta_role_name;
    END IF;
    
    -- Si no se encuentra el rol asignado, usar el de estudiante por defecto
    IF assigned_role_id IS NULL THEN
        assigned_role_id := default_role_id;
    END IF;

    -- Crear el perfil de usuario con metadatos
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        avatar_url,
        role_id,
        grade_level
    ) VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'first_name', 'Nuevo'),
        COALESCE(new.raw_user_meta_data->>'last_name', 'Usuario'),
        new.raw_user_meta_data->>'avatar_url',
        assigned_role_id,
        new.raw_user_meta_data->>'grade_level'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que ejecuta la función al insertar en auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 17b. Función auxiliar para obtener el rol del usuario actual (SECURITY DEFINER evita recursión de RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- ==========================================
-- 18. Row Level Security (RLS) Policies
-- ==========================================

-- Tabla: profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de perfiles a usuarios autenticados" ON profiles;
CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados" 
ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Permitir actualización de perfil propio" ON profiles;
CREATE POLICY "Permitir actualización de perfil propio" 
ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Tabla: student_progress
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Estudiantes ven su propio progreso" ON student_progress;
CREATE POLICY "Estudiantes ven su propio progreso" 
ON student_progress FOR SELECT TO authenticated 
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Profesores y Admin ven progreso" ON student_progress;
CREATE POLICY "Profesores y Admin ven progreso" 
ON student_progress FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name IN ('teacher', 'admin')
    )
);

DROP POLICY IF EXISTS "Estudiantes marcan su propio progreso" ON student_progress;
CREATE POLICY "Estudiantes marcan su propio progreso" 
ON student_progress FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS "Estudiantes actualizan su propio progreso" ON student_progress;
CREATE POLICY "Estudiantes actualizan su propio progreso" 
ON student_progress FOR UPDATE TO authenticated 
USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- Tabla: grades
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Estudiantes ven sus propias notas" ON grades;
CREATE POLICY "Estudiantes ven sus propias notas"
ON grades FOR SELECT TO authenticated
USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Profesores y Admin ven notas" ON grades;
CREATE POLICY "Profesores y Admin ven notas"
ON grades FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name IN ('teacher', 'admin')
    )
);

-- Tabla: courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver cursos" ON courses;
CREATE POLICY "Todos pueden ver cursos"
ON courses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Docentes pueden crear cursos" ON courses;
DROP POLICY IF EXISTS "Admins pueden gestionar cursos" ON courses;
CREATE POLICY "Admins pueden gestionar cursos"
ON courses FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.name = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.name = 'admin'
    )
);

-- Tabla: course_modules
-- Política: cualquier usuario autenticado puede gestionar módulos
-- (la UI ya filtra por teacher_id en el dashboard del docente)
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver módulos" ON course_modules;
CREATE POLICY "Todos pueden ver módulos"
ON course_modules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Docentes gestionan módulos de sus cursos" ON course_modules;
CREATE POLICY "Docentes gestionan módulos de sus cursos"
ON course_modules FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Tabla: lessons
-- Política: cualquier usuario autenticado puede gestionar lecciones
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver lecciones" ON lessons;
CREATE POLICY "Todos pueden ver lecciones"
ON lessons FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Docentes gestionan lecciones de sus módulos" ON lessons;
CREATE POLICY "Docentes gestionan lecciones de sus módulos"
ON lessons FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Tabla: quizzes y quiz_questions
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver quizzes" ON quizzes;
CREATE POLICY "Todos pueden ver quizzes"
ON quizzes FOR SELECT TO authenticated USING (true);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver preguntas de quizzes" ON quiz_questions;
CREATE POLICY "Todos pueden ver preguntas de quizzes"
ON quiz_questions FOR SELECT TO authenticated USING (true);

-- Tabla: quiz_attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Estudiantes ven sus propios intentos" ON quiz_attempts;
CREATE POLICY "Estudiantes ven sus propios intentos"
ON quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Profesores y Admin ven intentos" ON quiz_attempts;
CREATE POLICY "Profesores y Admin ven intentos" 
ON quiz_attempts FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name IN ('teacher', 'admin')
    )
);

DROP POLICY IF EXISTS "Estudiantes insertan sus intentos" ON quiz_attempts;
CREATE POLICY "Estudiantes insertan sus intentos"
ON quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver recursos" ON resources;
CREATE POLICY "Todos pueden ver recursos"
ON resources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Docentes pueden subir recursos" ON resources;
CREATE POLICY "Docentes pueden subir recursos"
ON resources FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Docentes editan recursos" ON resources;
CREATE POLICY "Docentes editan recursos"
ON resources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Docentes eliminan recursos" ON resources;
CREATE POLICY "Docentes eliminan recursos"
ON resources FOR DELETE TO authenticated USING (true);

