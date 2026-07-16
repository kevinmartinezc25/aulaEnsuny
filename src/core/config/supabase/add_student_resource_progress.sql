-- 18. Tabla de Progreso de Recursos del Estudiante (PDFs, Enlaces, etc.)
CREATE TABLE IF NOT EXISTS student_resource_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_progress_student ON student_resource_progress(student_id);

-- RLS Policies
ALTER TABLE student_resource_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Estudiantes ven su propio progreso de recursos" ON student_resource_progress;
CREATE POLICY "Estudiantes ven su propio progreso de recursos" 
ON student_resource_progress FOR SELECT TO authenticated 
USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Profesores y Admin ven progreso de recursos" ON student_resource_progress;
CREATE POLICY "Profesores y Admin ven progreso de recursos" 
ON student_resource_progress FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND (p.role_id IN (SELECT id FROM roles WHERE name IN ('teacher', 'admin', 'superadmin')))
  )
);

DROP POLICY IF EXISTS "Estudiantes marcan su propio progreso de recursos" ON student_resource_progress;
CREATE POLICY "Estudiantes marcan su propio progreso de recursos" 
ON student_resource_progress FOR INSERT TO authenticated 
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Estudiantes actualizan su propio progreso de recursos" ON student_resource_progress;
CREATE POLICY "Estudiantes actualizan su propio progreso de recursos" 
ON student_resource_progress FOR UPDATE TO authenticated 
USING (student_id = auth.uid());
