-- ============================================================
-- Fix RLS Policies for 'calendars' table
-- Ejecutar en: Supabase → SQL Editor
-- Fecha: 2026-06-09
-- Problema: new row violates row-level security policy for table "calendars"
-- Causa: La tabla tiene RLS activo pero no tiene políticas definidas,
--        lo que bloquea todas las operaciones de INSERT/UPDATE/DELETE.
-- ============================================================

-- Paso 1: Asegurarse de que RLS esté habilitado en la tabla
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Paso 2: Limpiar políticas anteriores (si existen) para evitar conflictos
DROP POLICY IF EXISTS "Todos pueden ver eventos del calendario" ON public.calendars;
DROP POLICY IF EXISTS "Docentes y admins pueden crear eventos" ON public.calendars;
DROP POLICY IF EXISTS "Docentes y admins pueden editar eventos" ON public.calendars;
DROP POLICY IF EXISTS "Docentes y admins pueden eliminar eventos" ON public.calendars;

-- Paso 3: Política de LECTURA — todos los usuarios autenticados pueden ver eventos
-- (estudiantes ven el calendario de sus cursos, docentes ven el de los suyos)
CREATE POLICY "Todos pueden ver eventos del calendario"
ON public.calendars FOR SELECT TO authenticated
USING (true);

-- Paso 4: Política de INSERCIÓN — docentes y admins pueden crear eventos
CREATE POLICY "Docentes y admins pueden crear eventos"
ON public.calendars FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
          AND r.name IN ('teacher', 'admin')
    )
);

-- Paso 5: Política de ACTUALIZACIÓN — docentes y admins pueden editar eventos
CREATE POLICY "Docentes y admins pueden editar eventos"
ON public.calendars FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
          AND r.name IN ('teacher', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
          AND r.name IN ('teacher', 'admin')
    )
);

-- Paso 6: Política de ELIMINACIÓN — docentes y admins pueden borrar eventos
CREATE POLICY "Docentes y admins pueden eliminar eventos"
ON public.calendars FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
          AND r.name IN ('teacher', 'admin')
    )
);
