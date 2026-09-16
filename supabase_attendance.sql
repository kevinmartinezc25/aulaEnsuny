-- SQL Migration para el Módulo de Asistencia en Planilla Asistida
-- Por favor, ejecuta este script en el SQL Editor de tu proyecto en Supabase

-- 1. Crear tabla assisted_sessions
CREATE TABLE IF NOT EXISTS public.assisted_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.assisted_subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Crear tabla assisted_attendance
CREATE TABLE IF NOT EXISTS public.assisted_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.assisted_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.assisted_students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('A', 'I', 'E')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, student_id) -- Un estudiante solo puede tener un registro de asistencia por sesión
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.assisted_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assisted_attendance ENABLE ROW LEVEL SECURITY;

-- 4. Crear Políticas de Seguridad (Policies)
-- Política para assisted_sessions: Los usuarios autenticados pueden leer/escribir.
CREATE POLICY "Enable ALL for authenticated users on assisted_sessions" 
ON public.assisted_sessions FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);

-- Política para assisted_attendance: Los usuarios autenticados pueden leer/escribir.
CREATE POLICY "Enable ALL for authenticated users on assisted_attendance" 
ON public.assisted_attendance FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);
