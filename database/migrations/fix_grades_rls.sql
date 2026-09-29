-- Habilitar RLS en la tabla grades si no lo está
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- 1. Eliminar políticas previas para evitar duplicidad
DROP POLICY IF EXISTS "Estudiantes ven sus propias notas" ON public.grades;
DROP POLICY IF EXISTS "Profesores y Admin ven notas" ON public.grades;
DROP POLICY IF EXISTS "Docentes y admin gestionan notas" ON public.grades;

-- 2. Política para que los estudiantes puedan ver sus propias notas consolidada por categoría
CREATE POLICY "Estudiantes ven sus propias notas"
ON public.grades FOR SELECT TO authenticated
USING (auth.uid() = student_id);

-- 3. Política para que los docentes y administradores puedan ver todas las notas
CREATE POLICY "Profesores y Admin ven notas"
ON public.grades FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name IN ('teacher', 'admin')
    )
);

-- 4. Política para que los docentes y administradores puedan gestionar (crear, actualizar, eliminar) notas
CREATE POLICY "Docentes y admin gestionan notas"
ON public.grades FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name IN ('teacher', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name IN ('teacher', 'admin')
    )
);
