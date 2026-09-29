-- 0. Función auxiliar para obtener el rol del usuario actual (evita recursión de RLS)
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

-- 1. Crear la tabla de configuración principal de Foros vinculada a Lecciones
CREATE TABLE IF NOT EXISTS public.forums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID UNIQUE NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    forum_type VARCHAR(50) NOT NULL DEFAULT 'debate', -- 'debate', 'qa', 'social'
    is_graded BOOLEAN DEFAULT FALSE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar seguridad RLS en 'forums'
ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS para 'forums'
DROP POLICY IF EXISTS "Todos pueden leer configuracion de foros" ON public.forums;
CREATE POLICY "Todos pueden leer configuracion de foros"
ON public.forums FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Docentes y admin gestionan configuracion de foros" ON public.forums;
CREATE POLICY "Docentes y admin gestionan configuracion de foros"
ON public.forums FOR ALL TO authenticated
USING (public.get_current_user_role() IN ('teacher', 'admin'))
WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

-- 4. Crear la tabla de Hilos/Temas de discusión (`forum_threads`)
CREATE TABLE IF NOT EXISTS public.forum_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forum_id UUID NOT NULL REFERENCES public.forums(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar seguridad RLS en 'forum_threads'
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para 'forum_threads'
DROP POLICY IF EXISTS "Todos pueden ver hilos de discusion" ON public.forum_threads;
CREATE POLICY "Todos pueden ver hilos de discusion"
ON public.forum_threads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Todos pueden crear hilos de discusion" ON public.forum_threads;
DROP POLICY IF EXISTS "Solo docentes y admins crean hilos de discusion" ON public.forum_threads;
DROP POLICY IF EXISTS "Estudiantes crean hilos en foros no debate, docentes en todos" ON public.forum_threads;
CREATE POLICY "Estudiantes crean hilos en foros no debate, docentes en todos"
ON public.forum_threads FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = author_id AND (
        public.get_current_user_role() IN ('teacher', 'admin') OR (
            public.get_current_user_role() = 'student' AND
            EXISTS (
                SELECT 1 FROM public.forums f
                WHERE f.id = forum_id AND f.forum_type <> 'debate'
            )
        )
    )
);

DROP POLICY IF EXISTS "Autores y docentes editan hilos" ON public.forum_threads;
CREATE POLICY "Autores y docentes editan hilos"
ON public.forum_threads FOR UPDATE TO authenticated
USING (
    auth.uid() = author_id OR
    public.get_current_user_role() IN ('teacher', 'admin')
);

DROP POLICY IF EXISTS "Autores y docentes eliminan hilos" ON public.forum_threads;
CREATE POLICY "Autores y docentes eliminan hilos"
ON public.forum_threads FOR DELETE TO authenticated
USING (
    auth.uid() = author_id OR
    public.get_current_user_role() IN ('teacher', 'admin')
);

-- 5. Crear la tabla de respuestas a hilos (`forum_replies`)
CREATE TABLE IF NOT EXISTS public.forum_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_helpful BOOLEAN DEFAULT FALSE NOT NULL,
    is_teacher_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar seguridad RLS en 'forum_replies'
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para 'forum_replies'
DROP POLICY IF EXISTS "Todos pueden ver respuestas" ON public.forum_replies;
CREATE POLICY "Todos pueden ver respuestas"
ON public.forum_replies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Todos pueden responder en hilos" ON public.forum_replies;
CREATE POLICY "Todos pueden responder en hilos"
ON public.forum_replies FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Autores y docentes editan respuestas" ON public.forum_replies;
CREATE POLICY "Autores y docentes editan respuestas"
ON public.forum_replies FOR UPDATE TO authenticated
USING (
    auth.uid() = author_id OR
    public.get_current_user_role() IN ('teacher', 'admin')
);

DROP POLICY IF EXISTS "Autores y docentes eliminan respuestas" ON public.forum_replies;
CREATE POLICY "Autores y docentes eliminan respuestas"
ON public.forum_replies FOR DELETE TO authenticated
USING (
    auth.uid() = author_id OR
    public.get_current_user_role() IN ('teacher', 'admin')
);

-- Índices para búsquedas eficientes en foros
CREATE INDEX IF NOT EXISTS idx_forums_lesson ON public.forums(lesson_id);
CREATE INDEX IF NOT EXISTS idx_threads_forum ON public.forum_threads(forum_id);
CREATE INDEX IF NOT EXISTS idx_replies_thread ON public.forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_replies_parent ON public.forum_replies(parent_id);

-- Corrección para permitir la lectura pública de roles (evita el fallo de inicio de sesión)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica de roles" ON public.roles;
CREATE POLICY "Permitir lectura publica de roles" ON public.roles
FOR SELECT TO anon, authenticated USING (true);
