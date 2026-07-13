-- Habilitar RLS en la tabla course_grade_categories si no lo está
ALTER TABLE public.course_grade_categories ENABLE ROW LEVEL SECURITY;

-- 1. Eliminar políticas previas para evitar duplicidad
DROP POLICY IF EXISTS "Todos pueden ver categorías de notas" ON public.course_grade_categories;
DROP POLICY IF EXISTS "Docentes y admin gestionan categorías de notas" ON public.course_grade_categories;

-- 2. Política para que todos los usuarios autenticados puedan ver las categorías de notas
CREATE POLICY "Todos pueden ver categorías de notas"
ON public.course_grade_categories FOR SELECT TO authenticated
USING (true);

-- 3. Política para que los docentes y administradores puedan gestionar categorías de notas
CREATE POLICY "Docentes y admin gestionan categorías de notas"
ON public.course_grade_categories FOR ALL TO authenticated
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
