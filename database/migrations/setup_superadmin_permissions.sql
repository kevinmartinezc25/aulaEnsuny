-- ============================================================
-- SUPERADMIN MODULE PERMISSIONS SETUP
-- ============================================================

-- 1. Insert 'superadmin' role
INSERT INTO public.roles (name) VALUES ('superadmin') ON CONFLICT (name) DO NOTHING;

-- 2. Create modules permission table
CREATE TABLE IF NOT EXISTS public.admin_module_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key VARCHAR(100) UNIQUE NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_module_permissions ENABLE ROW LEVEL SECURITY;

-- Select policy: all authenticated users can read (needed for sidebar rendering)
DROP POLICY IF EXISTS "Todos pueden ver permisos de modulos" ON public.admin_module_permissions;
CREATE POLICY "Todos pueden ver permisos de modulos" 
ON public.admin_module_permissions FOR SELECT TO authenticated USING (true);

-- Manage policy: only superadmins can edit
DROP POLICY IF EXISTS "Superadmins gestionan permisos de modulos" ON public.admin_module_permissions;
CREATE POLICY "Superadmins gestionan permisos de modulos" 
ON public.admin_module_permissions FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name = 'superadmin'
    )
);

-- 3. Seed admin modules
INSERT INTO public.admin_module_permissions (module_key, module_name, is_enabled) VALUES
('users', 'Usuarios', true),
('grade-levels', 'Grados', true),
('courses', 'Cursos', true),
('teachers', 'Docentes', true),
('students', 'Estudiantes', true),
('evaluations', 'Evaluaciones', true),
('academic-registry', 'Registro Académico', true),
('academic-reports', 'Reportes Académicos', true),
('analytics', 'Analíticas', true),
('calendar', 'Calendario', true),
('institutional-agenda', 'Agenda', true),
('notifications', 'Notificaciones', true),
('resources', 'Recursos', true),
('settings', 'Configuración', true),
('roles', 'Roles y Permisos', true),
('elections', 'Elecciones', true)
ON CONFLICT (module_key) DO UPDATE SET
    module_name = EXCLUDED.module_name;

-- 4. Assign 'superadmin' role to 'admin@ensuny.edu.co'
DO $$
DECLARE
    superadmin_role_id UUID;
    target_user_id UUID;
BEGIN
    -- Get superadmin role ID
    SELECT id INTO superadmin_role_id FROM public.roles WHERE name = 'superadmin';

    -- Get target user ID from auth.users
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'admin@ensuny.edu.co';

    IF target_user_id IS NOT NULL AND superadmin_role_id IS NOT NULL THEN
        -- Update public profile
        UPDATE public.profiles 
        SET role_id = superadmin_role_id 
        WHERE id = target_user_id;
        
        -- Update auth metadata for JWT claims
        UPDATE auth.users 
        SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role_name', 'superadmin')
        WHERE id = target_user_id;
    END IF;
END $$;
