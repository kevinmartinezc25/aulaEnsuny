-- ============================================================
-- ADMIN USER MODULE PERMISSIONS SETUP
-- ============================================================

-- 1. Tabla de permisos específicos por usuario administrador
CREATE TABLE IF NOT EXISTS public.admin_user_module_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    module_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_admin_user_module UNIQUE (user_id, module_key)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.admin_user_module_permissions ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de seguridad
-- Todos los usuarios autenticados pueden ver sus propios permisos
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios permisos de modulo" ON public.admin_user_module_permissions;
CREATE POLICY "Usuarios pueden ver sus propios permisos de modulo" 
ON public.admin_user_module_permissions FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name = 'superadmin'
    )
);

-- Superadmin puede insertar, actualizar o borrar permisos
DROP POLICY IF EXISTS "Superadmin gestiona permisos por usuario" ON public.admin_user_module_permissions;
CREATE POLICY "Superadmin gestiona permisos por usuario" 
ON public.admin_user_module_permissions FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name = 'superadmin'
    )
);

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_admin_user_module_perms_user ON public.admin_user_module_permissions(user_id);
