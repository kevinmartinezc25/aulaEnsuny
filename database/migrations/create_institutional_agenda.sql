-- ============================================================
-- AGENDA INSTITUCIONAL DATABASE SCHEMA & SEED
-- ============================================================

-- 1. Tabla de Categorías de Eventos
CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(50) NOT NULL, -- Ej: 'blue', 'emerald', 'amber', etc.
    icon VARCHAR(50) NOT NULL, -- Nombre de icono Lucide (ej: 'BookOpen')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Eventos Institucionales
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    category_id UUID REFERENCES public.event_categories(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Relación de Responsables (N:M con profiles)
CREATE TABLE IF NOT EXISTS public.event_responsibles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT event_responsibles_event_user_key UNIQUE (event_id, user_id)
);

-- 4. Tabla de Logs/Historial de Notificaciones de Correo
CREATE TABLE IF NOT EXISTS public.email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'weekly_summary', '24h_reminder', '1h_reminder', 'creation'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(50) NOT NULL -- 'sent', 'failed'
);

-- Habilitar Row Level Security (RLS) en todas las nuevas tablas
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS DE ACCESO (RLS)
-- ============================================================

-- A. Políticas para event_categories
DROP POLICY IF EXISTS "Todos pueden ver categorías de eventos" ON public.event_categories;
CREATE POLICY "Todos pueden ver categorías de eventos" 
ON public.event_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins gestionan categorías de eventos" ON public.event_categories;
CREATE POLICY "Admins gestionan categorías de eventos" 
ON public.event_categories FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name = 'admin'
    )
);

-- B. Políticas para events
DROP POLICY IF EXISTS "Todos pueden ver eventos" ON public.events;
CREATE POLICY "Todos pueden ver eventos" 
ON public.events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins gestionan eventos" ON public.events;
CREATE POLICY "Admins gestionan eventos" 
ON public.events FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name = 'admin'
    )
);

-- C. Políticas para event_responsibles
DROP POLICY IF EXISTS "Todos pueden ver responsables" ON public.event_responsibles;
CREATE POLICY "Todos pueden ver responsables" 
ON public.event_responsibles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins gestionan responsables" ON public.event_responsibles;
CREATE POLICY "Admins gestionan responsables" 
ON public.event_responsibles FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name = 'admin'
    )
);

-- D. Políticas para email_notifications
DROP POLICY IF EXISTS "Usuarios ven sus propios registros de notificaciones" ON public.email_notifications;
CREATE POLICY "Usuarios ven sus propios registros de notificaciones" 
ON public.email_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins ven todos los registros de notificaciones" ON public.email_notifications;
CREATE POLICY "Admins ven todos los registros de notificaciones" 
ON public.email_notifications FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name = 'admin'
    )
);

-- ============================================================
-- SEED DE CATEGORÍAS POR DEFECTO
-- ============================================================
INSERT INTO public.event_categories (name, color, icon) VALUES
('Académica', 'blue', 'BookOpen'),
('Administrativa', 'emerald', 'ClipboardList'),
('Capacitación', 'amber', 'GraduationCap'),
('Reunión', 'purple', 'Users'),
('Convivencia', 'rose', 'Heart'),
('Evento Institucional', 'violet', 'Flag'),
('Tecnología', 'cyan', 'Laptop'),
('Evaluación', 'orange', 'FileCheck'),
('Otra', 'slate', 'Calendar')
ON CONFLICT (name) DO UPDATE SET 
    color = EXCLUDED.color,
    icon = EXCLUDED.icon;
