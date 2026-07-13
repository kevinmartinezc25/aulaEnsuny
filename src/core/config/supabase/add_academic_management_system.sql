-- Migration DDL for Colombian Academic Management System (SIS)

-- 1. Tabla de detalles personales del estudiante
CREATE TABLE IF NOT EXISTS public.student_details (
    student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'RC', 'TI', 'CC', 'NES', etc.
    document_number VARCHAR(100) UNIQUE NOT NULL,
    expedition_date DATE,
    expedition_place VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    second_name VARCHAR(100),
    first_surname VARCHAR(100) NOT NULL,
    second_surname VARCHAR(100),
    birth_date DATE NOT NULL,
    gender VARCHAR(20) NOT NULL, -- 'M', 'F', 'Otro'
    blood_type VARCHAR(10),
    rh VARCHAR(10), -- '+', '-'
    nationality VARCHAR(100) DEFAULT 'Colombiana',
    birth_municipality VARCHAR(150),
    birth_department VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de información de residencia y contacto
CREATE TABLE IF NOT EXISTS public.student_contacts (
    student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    neighborhood VARCHAR(150),
    municipality VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    zone VARCHAR(50) DEFAULT 'Urbana' CHECK (zone IN ('Urbana', 'Rural')),
    phone VARCHAR(50),
    student_cellphone VARCHAR(50),
    student_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de información familiar (padres y acudientes)
CREATE TABLE IF NOT EXISTS public.student_guardians (
    student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Padre
    father_name VARCHAR(255),
    father_document VARCHAR(100),
    father_phone VARCHAR(50),
    father_email VARCHAR(255),
    father_occupation VARCHAR(150),
    -- Madre
    mother_name VARCHAR(255),
    mother_document VARCHAR(100),
    mother_phone VARCHAR(50),
    mother_email VARCHAR(255),
    mother_occupation VARCHAR(150),
    -- Acudiente Principal
    guardian_name VARCHAR(255) NOT NULL,
    guardian_document VARCHAR(100) NOT NULL,
    guardian_relationship VARCHAR(100) NOT NULL, -- 'Padre', 'Madre', 'Tío/a', 'Abuelo/a', 'Otro'
    guardian_phone VARCHAR(50) NOT NULL,
    guardian_email VARCHAR(255),
    guardian_address TEXT,
    guardian_occupation VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de información médica y de salud
CREATE TABLE IF NOT EXISTS public.student_medical_info (
    student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    eps VARCHAR(150) NOT NULL,
    affiliation_type VARCHAR(100), -- 'Contributivo', 'Subsidiado', 'Especial'
    ips VARCHAR(255),
    allergies TEXT,
    diseases TEXT,
    medicines TEXT,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de soportes documentales
CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_category VARCHAR(100) NOT NULL, -- 'identificacion', 'academico', 'salud', 'foto', 'otro'
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabla de registro de matrículas anuales (para SIMAT e información académica)
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    academic_year INT NOT NULL,
    enrollment_date DATE NOT NULL,
    enrollment_status VARCHAR(50) DEFAULT 'active' CHECK (enrollment_status IN ('active', 'pending', 'withdrawn', 'cancelled')),
    sede VARCHAR(150) DEFAULT 'Principal',
    jornada VARCHAR(50) DEFAULT 'Única' CHECK (jornada IN ('Mañana', 'Tarde', 'Completa', 'Única', 'Nocturna')),
    grade_level VARCHAR(50) NOT NULL,
    group_name VARCHAR(50) NOT NULL,
    enrollment_number VARCHAR(100),
    simat_beneficiary BOOLEAN DEFAULT FALSE,
    estrato INT CHECK (estrato >= 0 AND estrato <= 6),
    sisben VARCHAR(50),
    conflict_victim BOOLEAN DEFAULT FALSE,
    special_population VARCHAR(100), -- 'Discapacidad', 'Indígena', 'Ninguna', etc.
    previous_institution VARCHAR(255),
    previous_municipality VARCHAR(150),
    previous_department VARCHAR(150),
    previous_grade VARCHAR(50),
    previous_year INT,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT student_enrollments_student_year_key UNIQUE (student_id, academic_year)
);

-- 7. Tabla de historial académico externo o consolidado de años anteriores
CREATE TABLE IF NOT EXISTS public.student_academic_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    year INT NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    group_name VARCHAR(50) NOT NULL,
    final_status VARCHAR(100) NOT NULL, -- 'Aprobado', 'Reprobado', 'Desertó'
    final_average NUMERIC(3,2), -- Escala de 1.00 a 5.00
    result TEXT, -- Observación o logro obtenido
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabla de relación explícita estudiante-curso para matrícula LMS específica
CREATE TABLE IF NOT EXISTS public.student_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT student_courses_student_course_key UNIQUE (student_id, course_id)
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.student_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_medical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_academic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;

-- Políticas de Lectura (Select) para usuarios autenticados
DROP POLICY IF EXISTS "Lectura student_details" ON public.student_details;
CREATE POLICY "Lectura student_details" ON public.student_details FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura student_contacts" ON public.student_contacts;
CREATE POLICY "Lectura student_contacts" ON public.student_contacts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura student_guardians" ON public.student_guardians;
CREATE POLICY "Lectura student_guardians" ON public.student_guardians FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura student_medical_info" ON public.student_medical_info;
CREATE POLICY "Lectura student_medical_info" ON public.student_medical_info FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura student_documents" ON public.student_documents;
CREATE POLICY "Lectura student_documents" ON public.student_documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura student_enrollments" ON public.student_enrollments;
CREATE POLICY "Lectura student_enrollments" ON public.student_enrollments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura student_academic_history" ON public.student_academic_history;
CREATE POLICY "Lectura student_academic_history" ON public.student_academic_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura student_courses" ON public.student_courses;
CREATE POLICY "Lectura student_courses" ON public.student_courses FOR SELECT TO authenticated USING (true);

-- Políticas de Gestión Total (ALL) para rol Administrador
DROP POLICY IF EXISTS "Gestion student_details admin" ON public.student_details;
CREATE POLICY "Gestion student_details admin" ON public.student_details FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin')
);

DROP POLICY IF EXISTS "Gestion student_contacts admin" ON public.student_contacts;
CREATE POLICY "Gestion student_contacts admin" ON public.student_contacts FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin')
);

DROP POLICY IF EXISTS "Gestion student_guardians admin" ON public.student_guardians;
CREATE POLICY "Gestion student_guardians admin" ON public.student_guardians FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin')
);

DROP POLICY IF EXISTS "Gestion student_medical_info admin" ON public.student_medical_info;
CREATE POLICY "Gestion student_medical_info admin" ON public.student_medical_info FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin')
);

DROP POLICY IF EXISTS "Gestion student_documents admin" ON public.student_documents;
CREATE POLICY "Gestion student_documents admin" ON public.student_documents FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin')
);

DROP POLICY IF EXISTS "Gestion student_enrollments admin" ON public.student_enrollments;
CREATE POLICY "Gestion student_enrollments admin" ON public.student_enrollments FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin')
);

DROP POLICY IF EXISTS "Gestion student_academic_history admin" ON public.student_academic_history;
CREATE POLICY "Gestion student_academic_history admin" ON public.student_academic_history FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin')
);

DROP POLICY IF EXISTS "Gestion student_courses admin" ON public.student_courses;
CREATE POLICY "Gestion student_courses admin" ON public.student_courses FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin')
);
