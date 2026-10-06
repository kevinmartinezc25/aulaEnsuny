-- ==============================================================================
-- MIGRACIÓN: Expansión de Población Estudiantil, Sedes, Modalidades y Docentes
-- aulaEnsuny — SuperAdmin
-- ==============================================================================
-- 1. Catálogo Institucional de Sedes (Sede Principal, Sedes Rurales, etc.)
-- 2. Modalidades pedagógicas: Tradicional, Escuela Nueva, Aula Multigrado
-- 3. Nuevos atributos para Docentes de Primaria, Preescolar y Escuela Nueva
-- 4. Extensión de campos en student_directory y student_enrollments
-- ==============================================================================

-- 1. CREACIÓN DE TABLA institutional_sedes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.institutional_sedes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL UNIQUE,
    dane_code VARCHAR(50),
    zone VARCHAR(50) DEFAULT 'Urbana' CHECK (zone IN ('Urbana', 'Rural')),
    has_multigrade BOOLEAN DEFAULT false,
    address TEXT,
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para institutional_sedes
ALTER TABLE public.institutional_sedes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Lectura de sedes para usuarios autenticados" ON public.institutional_sedes;
CREATE POLICY "Lectura de sedes para usuarios autenticados"
    ON public.institutional_sedes FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Gestión de sedes para administradores" ON public.institutional_sedes;
CREATE POLICY "Gestión de sedes para administradores"
    ON public.institutional_sedes FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    );

-- Poblar sedes iniciales oficiales si no existen
INSERT INTO public.institutional_sedes (name, zone, has_multigrade)
VALUES 
    ('Sede Principal', 'Urbana', false),
    ('Sede San José', 'Rural', true),
    ('Sede La Ceiba', 'Rural', true),
    ('Sede El Porvenir', 'Rural', true)
ON CONFLICT (name) DO NOTHING;

-- 2. EXTENSIÓN DE TABLA student_directory (Directorio Institucional)
-- ==============================================================================
ALTER TABLE public.student_directory 
ADD COLUMN IF NOT EXISTS sede VARCHAR(150) DEFAULT 'Sede Principal',
ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50) DEFAULT 'Tradicional',
ADD COLUMN IF NOT EXISTS jornada VARCHAR(50) DEFAULT 'Mañana';

-- Índice para búsquedas por sede y modalidad en el directorio
CREATE INDEX IF NOT EXISTS idx_student_directory_sede ON public.student_directory(sede);
CREATE INDEX IF NOT EXISTS idx_student_directory_modalidad ON public.student_directory(modalidad);

-- 3. EXTENSIÓN DE TABLA student_enrollments (Ficha de Matrícula SIMAT)
-- ==============================================================================
ALTER TABLE public.student_enrollments
ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50) DEFAULT 'Tradicional',
ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES public.institutional_sedes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_enrollments_sede_id ON public.student_enrollments(sede_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_modalidad ON public.student_enrollments(modalidad);

-- 4. EXTENSIÓN DE TABLA profiles (Para Docentes de Primaria, Preescolar y Escuela Nueva)
-- ==============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS teaching_level VARCHAR(50) DEFAULT 'secundaria_media',
ADD COLUMN IF NOT EXISTS sede VARCHAR(150) DEFAULT 'Sede Principal',
ADD COLUMN IF NOT EXISTS is_multigrade_teacher BOOLEAN DEFAULT false;

-- 5. EXTENSIÓN DE TABLA sch_groups (Módulo de Horarios y Convivencia)
-- ==============================================================================
ALTER TABLE public.sch_groups
ADD COLUMN IF NOT EXISTS sede VARCHAR(150) DEFAULT 'Sede Principal',
ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50) DEFAULT 'Tradicional';
